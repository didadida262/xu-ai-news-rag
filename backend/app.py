from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_restx import Api
from config.config import config
import os

# 初始化扩展
db = SQLAlchemy()
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
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
        
        # 创建默认管理员用户
        from models.user import User
        User.create_admin()
        
        # 创建默认数据源
        from models.data_source import DataSource
        create_default_data_sources()
    
    # 注册错误处理器
    register_error_handlers(app)
    
    return app

def create_default_data_sources():
    """创建默认数据源"""
    default_sources = [
        {
            'name': '新浪新闻',
            'source_type': 'rss',
            'url': 'http://rss.sina.com.cn/news/china/focus15.xml',
            'description': '新浪新闻焦点RSS源',
            'fetch_interval': 3600
        },
        {
            'name': '网易新闻',
            'source_type': 'rss',
            'url': 'http://news.163.com/special/00011K6L/rss_newstop.xml',
            'description': '网易新闻头条RSS源',
            'fetch_interval': 3600
        },
        {
            'name': '腾讯新闻',
            'source_type': 'rss',
            'url': 'http://news.qq.com/newsgn/rss_newsgn.xml',
            'description': '腾讯新闻国内RSS源',
            'fetch_interval': 3600
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
        db.session.rollback()
        return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
