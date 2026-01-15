"""数据获取服务 - RSS、网页抓取、智能代理"""
import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.robotparser import RobotFileParser
from urllib.parse import urljoin, urlparse
import time
import logging
from typing import List, Dict, Optional
import re

logger = logging.getLogger(__name__)

class RSSFetcher:
    """RSS订阅源获取器"""
    
    def __init__(self, respect_robots=True, delay=1.0):
        self.respect_robots = respect_robots
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; NewsRAG/1.0; +http://example.com/bot)'
        })
    
    def fetch(self, url: str) -> List[Dict]:
        """获取RSS源内容"""
        try:
            # 检查robots.txt
            if self.respect_robots:
                if not self._check_robots(url):
                    logger.warning(f"RSS源 {url} 被robots.txt禁止访问")
                    return []
            
            # 获取RSS内容
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # 解析RSS
            feed = feedparser.parse(response.content)
            
            if feed.bozo:
                logger.warning(f"RSS解析警告: {feed.bozo_exception}")
            
            articles = []
            for entry in feed.entries:
                article = {
                    'title': entry.get('title', ''),
                    'content': entry.get('summary', '') or entry.get('description', ''),
                    'link': entry.get('link', ''),
                    'published': entry.get('published', '') or entry.get('updated', ''),
                    'author': entry.get('author', ''),
                    'tags': [tag.get('term', '') for tag in entry.get('tags', [])]
                }
                articles.append(article)
            
            # 遵守爬虫规范：延迟
            time.sleep(self.delay)
            
            logger.info(f"成功获取RSS源 {url}，共 {len(articles)} 篇文章")
            return articles
            
        except Exception as e:
            logger.error(f"获取RSS源 {url} 失败: {e}")
            return []
    
    def _check_robots(self, url: str) -> bool:
        """检查robots.txt"""
        try:
            parsed = urlparse(url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            rp = RobotFileParser()
            rp.set_url(robots_url)
            rp.read()
            return rp.can_fetch(self.session.headers['User-Agent'], url)
        except Exception as e:
            logger.warning(f"检查robots.txt失败: {e}，允许访问")
            return True


class WebFetcher:
    """网页抓取器"""
    
    def __init__(self, respect_robots=True, delay=2.0):
        self.respect_robots = respect_robots
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; NewsRAG/1.0; +http://example.com/bot)'
        })
    
    def fetch(self, url: str, config: Optional[Dict] = None) -> Dict:
        """抓取网页内容"""
        try:
            # 检查robots.txt
            if self.respect_robots:
                if not self._check_robots(url):
                    logger.warning(f"网页 {url} 被robots.txt禁止访问")
                    return {}
            
            # 获取网页
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # 解析HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取内容（支持配置选择器）
            config = config or {}
            title_selector = config.get('title_selector', 'h1, title')
            content_selector = config.get('content_selector', 'article, .content, main, .post-content')
            
            # 提取标题
            title_elem = soup.select_one(title_selector) or soup.find('title')
            title = title_elem.get_text(strip=True) if title_elem else ''
            
            # 提取正文
            content_elem = soup.select_one(content_selector)
            if content_elem:
                # 移除脚本和样式
                for script in content_elem(['script', 'style', 'nav', 'footer', 'aside']):
                    script.decompose()
                content = content_elem.get_text(separator='\n', strip=True)
            else:
                # 回退：提取所有段落
                paragraphs = soup.find_all('p')
                content = '\n'.join([p.get_text(strip=True) for p in paragraphs])
            
            # 清理内容
            content = self._clean_text(content)
            
            # 提取元数据
            meta = {
                'description': self._extract_meta(soup, 'description'),
                'keywords': self._extract_meta(soup, 'keywords'),
                'author': self._extract_meta(soup, 'author'),
                'published_time': self._extract_meta(soup, 'article:published_time') or 
                                 self._extract_meta(soup, 'og:published_time')
            }
            
            # 遵守爬虫规范：延迟
            time.sleep(self.delay)
            
            result = {
                'title': title,
                'content': content,
                'link': url,
                'meta': meta
            }
            
            logger.info(f"成功抓取网页 {url}")
            return result
            
        except Exception as e:
            logger.error(f"抓取网页 {url} 失败: {e}")
            return {}
    
    def _check_robots(self, url: str) -> bool:
        """检查robots.txt"""
        try:
            parsed = urlparse(url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            rp = RobotFileParser()
            rp.set_url(robots_url)
            rp.read()
            return rp.can_fetch(self.session.headers['User-Agent'], url)
        except Exception as e:
            logger.warning(f"检查robots.txt失败: {e}，允许访问")
            return True
    
    def _extract_meta(self, soup: BeautifulSoup, name: str) -> Optional[str]:
        """提取meta标签内容"""
        meta = soup.find('meta', attrs={'name': name}) or \
               soup.find('meta', attrs={'property': name})
        return meta.get('content', '').strip() if meta else None
    
    def _clean_text(self, text: str) -> str:
        """清理文本"""
        # 移除多余空白
        text = re.sub(r'\s+', ' ', text)
        # 移除特殊字符
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        return text.strip()


class AgentFetcher:
    """智能代理工具 - 使用AI辅助的智能抓取"""
    
    def __init__(self, ollama_url: str = None, model: str = None):
        self.ollama_url = ollama_url or 'http://localhost:11434'
        self.model = model or 'qwen2.5:3b'
        self.web_fetcher = WebFetcher()
    
    def fetch(self, url: str, query: Optional[str] = None) -> Dict:
        """使用智能代理抓取并提取关键信息"""
        try:
            # 先使用普通网页抓取获取内容
            raw_content = self.web_fetcher.fetch(url)
            
            if not raw_content:
                return {}
            
            # 使用AI提取关键信息
            if query:
                # 基于查询提取相关信息
                extracted = self._extract_with_ai(raw_content['content'], query)
            else:
                # 提取摘要和关键信息
                extracted = self._summarize_with_ai(raw_content['content'])
            
            result = {
                'title': raw_content.get('title', ''),
                'content': raw_content.get('content', ''),
                'link': url,
                'summary': extracted.get('summary', ''),
                'keywords': extracted.get('keywords', []),
                'entities': extracted.get('entities', []),
                'meta': raw_content.get('meta', {})
            }
            
            logger.info(f"智能代理成功处理网页 {url}")
            return result
            
        except Exception as e:
            logger.error(f"智能代理处理 {url} 失败: {e}")
            return {}
    
    def _extract_with_ai(self, content: str, query: str) -> Dict:
        """使用AI提取相关信息"""
        try:
            prompt = f"""请从以下新闻内容中提取与"{query}"相关的关键信息：

内容：
{content[:2000]}

请以JSON格式返回：
{{
    "summary": "摘要",
    "keywords": ["关键词1", "关键词2"],
    "entities": ["实体1", "实体2"],
    "relevant_text": "相关文本片段"
}}"""
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    'model': self.model,
                    'prompt': prompt,
                    'stream': False
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                # 解析AI返回的JSON（简化处理）
                return {
                    'summary': result.get('response', '')[:200],
                    'keywords': [],
                    'entities': []
                }
            else:
                return {}
                
        except Exception as e:
            logger.warning(f"AI提取失败，使用默认处理: {e}")
            return {}
    
    def _summarize_with_ai(self, content: str) -> Dict:
        """使用AI生成摘要"""
        try:
            prompt = f"""请为以下新闻内容生成摘要和提取关键词：

内容：
{content[:2000]}

请以JSON格式返回：
{{
    "summary": "摘要（100-200字）",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "entities": ["实体1", "实体2"]
}}"""
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    'model': self.model,
                    'prompt': prompt,
                    'stream': False
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'summary': result.get('response', '')[:200],
                    'keywords': [],
                    'entities': []
                }
            else:
                return {}
                
        except Exception as e:
            logger.warning(f"AI摘要生成失败: {e}")
            return {
                'summary': content[:200] + '...',
                'keywords': [],
                'entities': []
            }
