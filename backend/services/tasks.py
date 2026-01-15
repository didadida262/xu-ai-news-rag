"""Celery定时任务"""
import sys
import os
from datetime import datetime
import logging

# 添加项目路径
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery
from services.fetchers import RSSFetcher, WebFetcher, AgentFetcher

logger = logging.getLogger(__name__)


@celery.task(name='services.tasks.fetch_all_data_sources')
def fetch_all_data_sources():
    """定时任务：获取所有活跃的数据源"""
    from app import create_app
    from models.data_source import DataSource
    
    app = create_app()
    with app.app_context():
        try:
            sources = DataSource.get_active_sources()
            logger.info(f"开始获取 {len(sources)} 个数据源")
            
            for source in sources:
                # 检查是否需要抓取（基于fetch_interval）
                if source.last_fetch:
                    time_since_last = (datetime.utcnow() - source.last_fetch).total_seconds()
                    if time_since_last < source.fetch_interval:
                        continue
                
                # 异步执行单个数据源抓取
                fetch_data_source.delay(source.id)
            
            return {'status': 'success', 'sources_queued': len(sources)}
            
        except Exception as e:
            logger.error(f"获取数据源失败: {e}")
            return {'status': 'error', 'message': str(e)}


@celery.task(name='services.tasks.fetch_data_source', bind=True, max_retries=3)
def fetch_data_source(self, source_id: int):
    """抓取单个数据源"""
    from app import create_app
    from models.data_source import DataSource
    from models.document import Document
    from app import db
    
    app = create_app()
    with app.app_context():
        try:
            source = DataSource.query.get(source_id)
            if not source or not source.is_active:
                return {'status': 'skipped', 'reason': 'source not active'}
            
            logger.info(f"开始抓取数据源: {source.name} ({source.source_type})")
            
            articles = []
            
            # 根据类型选择抓取器
            if source.source_type == 'rss':
                fetcher = RSSFetcher()
                articles = fetcher.fetch(source.url)
                
            elif source.source_type == 'web':
                fetcher = WebFetcher()
                config = source.config or {}
                article = fetcher.fetch(source.url, config)
                if article:
                    articles = [article]
                    
            elif source.source_type == 'api':
                # API类型暂不实现
                logger.warning(f"API类型数据源暂不支持: {source.name}")
                source.update_fetch_result(success=False, error_message="API类型暂不支持")
                return {'status': 'skipped', 'reason': 'API type not supported'}
            
            # 保存文章到数据库
            saved_count = 0
            for article_data in articles:
                try:
                    # 检查是否已存在（基于URL）
                    link = article_data.get('link', '')
                    if link:
                        existing = Document.query.filter_by(source_url=link).first()
                        if existing:
                            continue
                    
                    # 创建文档
                    doc = Document(
                        title=article_data.get('title', '未命名'),
                        content=article_data.get('content', '') or article_data.get('summary', ''),
                        summary=article_data.get('summary', '') or article_data.get('content', '')[:200],
                        source_type=source.source_type,
                        source_url=link or source.url,
                        source_name=source.name,
                        tags=article_data.get('tags', []),
                        extra_metadata={
                            'author': article_data.get('author', ''),
                            'published': article_data.get('published', ''),
                            'meta': article_data.get('meta', {})
                        }
                    )
                    
                    db.session.add(doc)
                    saved_count += 1
                    
                except Exception as e:
                    logger.error(f"保存文章失败: {e}")
                    continue
            
            # 提交事务
            db.session.commit()
            
            # 更新数据源状态
            source.update_fetch_result(
                success=True,
                error_message=None
            )
            
            logger.info(f"数据源 {source.name} 抓取完成，保存 {saved_count} 篇文章")
            
            return {
                'status': 'success',
                'source_id': source_id,
                'articles_found': len(articles),
                'articles_saved': saved_count
            }
            
        except Exception as e:
            logger.error(f"抓取数据源 {source_id} 失败: {e}")
            
            # 更新数据源错误状态
            try:
                source = DataSource.query.get(source_id)
                if source:
                    source.update_fetch_result(success=False, error_message=str(e))
            except:
                pass
            
            # 重试
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))


@celery.task(name='services.tasks.fetch_with_agent')
def fetch_with_agent(url: str, query: str = None):
    """使用智能代理抓取指定URL"""
    from app import create_app
    from config.config import config
    import os
    
    app = create_app()
    with app.app_context():
        try:
            config_name = os.environ.get('FLASK_ENV', 'development')
            app_config = config[config_name]
            
            fetcher = AgentFetcher(
                ollama_url=app_config.OLLAMA_BASE_URL,
                model=app_config.OLLAMA_MODEL
            )
            
            result = fetcher.fetch(url, query)
            
            if result:
                # 保存到数据库
                doc = Document(
                    title=result.get('title', '未命名'),
                    content=result.get('content', ''),
                    summary=result.get('summary', ''),
                    source_type='web',
                    source_url=url,
                    source_name='智能代理',
                    tags=result.get('keywords', []),
                    extra_metadata={
                        'entities': result.get('entities', []),
                        'meta': result.get('meta', {})
                    }
                )
                
                db.session.add(doc)
                db.session.commit()
                
                logger.info(f"智能代理抓取成功: {url}")
                return {'status': 'success', 'document_id': doc.id}
            else:
                return {'status': 'failed', 'message': 'No content extracted'}
                
        except Exception as e:
            logger.error(f"智能代理抓取失败: {e}")
            return {'status': 'error', 'message': str(e)}
