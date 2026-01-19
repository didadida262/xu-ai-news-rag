from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_restx import Api
from config.config import config
from sqlalchemy.exc import OperationalError
import os
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 初始化扩展
from models.database import db
jwt = JWTManager()
mail = Mail()
api = Api(
    title='智能新闻RAG系统 API',
    version='1.0',
    description='基于大语言模型的智能新闻聚合、存储、检索和分析平台',
    doc='/api/docs/'
)

def create_app(config_name=None):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 配置
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # 应用数据库连接池配置
    if hasattr(config[config_name], 'SQLALCHEMY_ENGINE_OPTIONS'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = config[config_name].SQLALCHEMY_ENGINE_OPTIONS
    
    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app, origins=['http://localhost:3000'], supports_credentials=True)
    
    # 注册API命名空间
    from app.routes.auth import auth_ns
    from app.routes.documents import documents_ns
    from app.routes.query import query_ns
    from app.routes.analysis import analysis_ns
    from app.routes.data_sources import data_sources_ns
    from app.routes.admin import admin_ns
    
    api.add_namespace(auth_ns, path='/api/auth')
    api.add_namespace(documents_ns, path='/api/documents')
    api.add_namespace(query_ns, path='/api/query')
    api.add_namespace(analysis_ns, path='/api/analysis')
    api.add_namespace(data_sources_ns, path='/api/data-sources')
    api.add_namespace(admin_ns, path='/api/admin')
    
    api.init_app(app)
    
    # 导入所有模型（确保在db初始化后导入，以便正确建立关系）
    from models.user import User
    from models.document import Document
    from models.query_log import QueryLog
    from models.data_source import DataSource
    
    # 创建数据库表（带错误处理）
    with app.app_context():
        try:
            # 测试数据库连接
            db.engine.connect()
            db.create_all()
            
            # 创建默认管理员用户
            try:
                User.create_admin()
            except Exception as e:
                logger.warning(f"创建默认管理员用户失败: {e}")
            
            # 创建默认数据源
            try:
                create_default_data_sources()
            except Exception as e:
                logger.warning(f"创建默认数据源失败: {e}")
                
        except OperationalError as e:
            logger.error(f"MySQL数据库连接失败: {e}")
            logger.warning("=" * 50)
            logger.warning("数据库连接失败，请检查以下配置：")
            logger.warning("")
            logger.warning("1. MySQL服务是否运行:")
            logger.warning("   macOS: brew services start mysql")
            logger.warning("   Linux: sudo systemctl start mysql")
            logger.warning("")
            logger.warning("2. 数据库配置 (backend/.env 文件):")
            logger.warning("   DATABASE_URL=mysql+pymysql://用户名:密码@localhost/数据库名")
            logger.warning("   示例: DATABASE_URL=mysql+pymysql://root:yourpassword@localhost/news_rag")
            logger.warning("")
            logger.warning("3. 创建数据库:")
            logger.warning("   mysql -u root -p")
            logger.warning("   CREATE DATABASE news_rag CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            logger.warning("")
            logger.warning("4. 检查用户权限:")
            logger.warning("   GRANT ALL PRIVILEGES ON news_rag.* TO 'root'@'localhost';")
            logger.warning("   FLUSH PRIVILEGES;")
            logger.warning("")
            logger.warning("应用将继续启动，但登录等数据库相关功能将不可用")
            logger.warning("=" * 50)
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            logger.warning("应用将继续启动，但数据库相关功能可能不可用")
    
    # 注册错误处理器
    register_error_handlers(app)
    
    return app

def create_default_data_sources():
    """创建默认数据源"""
    from models.data_source import DataSource
    
    default_sources = [
        {
            'name': '人民网（RSS示例）',
            'source_type': 'rss',
            'url': 'http://www.people.com.cn/rss/politics.xml',
            'description': '人民网时政新闻RSS源',
            'fetch_interval': 30
        },
        {
            'name': '人民网首页（网页示例）',
            'source_type': 'web',
            'url': 'https://www.people.com.cn/',
            'description': '示例网页抓取：人民网首页要闻',
            'fetch_interval': 30
        }
    ]
    
    for source_data in default_sources:
        existing = DataSource.query.filter_by(url=source_data['url']).first()
        if not existing:
            source = DataSource(**source_data)
            db.session.add(source)
    
    db.session.commit()

def register_error_handlers(app):
    """注册错误处理器"""
    from flask import jsonify
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad Request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'Access denied'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not Found', 'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        try:
            db.session.rollback()
        except Exception:
            pass  # 如果数据库不可用，忽略回滚错误
        return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
