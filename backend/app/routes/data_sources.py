"""数据源管理API"""
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
import sys
import os

# 添加项目路径
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models.data_source import DataSource
from models.user import User
from services.tasks import fetch_data_source

# 从 app.py 导入 db（通过 sys.modules 绕过 app 目录的冲突）
try:
    import sys as sys_module
    # 如果 app.py 已经被执行，db 会在 sys.modules 中
    if 'app' in sys_module.modules and hasattr(sys_module.modules['app'], 'db'):
        db = sys_module.modules['app'].db
    else:
        # 否则直接导入 app.py 模块（需要重命名避免冲突）
        import importlib.util
        app_py_path = os.path.join(backend_dir, 'app.py')
        spec = importlib.util.spec_from_file_location("app_py_module", app_py_path)
        app_py_module = importlib.util.module_from_spec(spec)
        sys_module.modules['app_py_module'] = app_py_module
        spec.loader.exec_module(app_py_module)
        db = app_py_module.db
except Exception:
    # 如果导入失败，尝试从 flask_sqlalchemy 导入（延迟导入）
    from flask_sqlalchemy import SQLAlchemy
    db = SQLAlchemy()

data_sources_ns = Namespace('data-sources', description='数据源管理相关操作')

# 数据模型
data_source_model = data_sources_ns.model('DataSource', {
    'id': fields.Integer(description='数据源ID'),
    'name': fields.String(description='数据源名称'),
    'source_type': fields.String(description='数据源类型: rss/web/api'),
    'url': fields.String(description='数据源URL'),
    'description': fields.String(description='描述'),
    'is_active': fields.Boolean(description='是否激活'),
    'fetch_interval': fields.Integer(description='抓取间隔(秒)'),
    'last_fetch': fields.String(description='最后抓取时间'),
    'last_success': fields.String(description='最后成功时间'),
    'fetch_count': fields.Integer(description='抓取次数'),
    'success_count': fields.Integer(description='成功次数'),
    'error_count': fields.Integer(description='失败次数'),
    'config': fields.Raw(description='配置信息')
})

create_data_source_model = data_sources_ns.model('CreateDataSource', {
    'name': fields.String(required=True, description='数据源名称'),
    'source_type': fields.String(required=True, description='数据源类型: rss/web/api'),
    'url': fields.String(required=True, description='数据源URL'),
    'description': fields.String(description='描述'),
    'fetch_interval': fields.Integer(description='抓取间隔(秒)', default=3600),
    'config': fields.Raw(description='配置信息(JSON)')
})


@data_sources_ns.route('')
class DataSourcesList(Resource):
    @jwt_required()
    @data_sources_ns.marshal_list_with(data_source_model)
    def get(self):
        """获取数据源列表"""
        sources = DataSource.query.order_by(DataSource.created_at.desc()).all()
        return [source.to_dict() for source in sources]
    
    @jwt_required()
    @data_sources_ns.expect(create_data_source_model)
    @data_sources_ns.marshal_with(data_source_model)
    def post(self):
        """创建数据源"""
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('name') or not data.get('url') or not data.get('source_type'):
            return {'error': '名称、URL和类型为必填项'}, 400
        
        # 验证类型
        if data['source_type'] not in ['rss', 'web', 'api']:
            return {'error': '数据源类型必须是: rss, web, api'}, 400
        
        # 检查URL是否已存在
        existing = DataSource.query.filter_by(url=data['url']).first()
        if existing:
            return {'error': '该URL已存在'}, 400
        
        # 创建数据源
        source = DataSource(
            name=data['name'],
            source_type=data['source_type'],
            url=data['url'],
            description=data.get('description', ''),
            fetch_interval=data.get('fetch_interval', 3600),
            config=data.get('config', {})
        )
        
        try:
            db.session.add(source)
            db.session.commit()
            return source.to_dict(), 201
        except Exception as e:
            db.session.rollback()
            return {'error': f'创建失败: {str(e)}'}, 500


@data_sources_ns.route('/<int:source_id>')
class DataSourceDetail(Resource):
    @jwt_required()
    @data_sources_ns.marshal_with(data_source_model)
    def get(self, source_id):
        """获取数据源详情"""
        source = DataSource.query.get_or_404(source_id)
        return source.to_dict()
    
    @jwt_required()
    @data_sources_ns.expect(create_data_source_model)
    @data_sources_ns.marshal_with(data_source_model)
    def put(self, source_id):
        """更新数据源"""
        source = DataSource.query.get_or_404(source_id)
        data = request.get_json()
        
        if 'name' in data:
            source.name = data['name']
        if 'description' in data:
            source.description = data['description']
        if 'fetch_interval' in data:
            source.fetch_interval = data['fetch_interval']
        if 'is_active' in data:
            source.is_active = data['is_active']
        if 'config' in data:
            source.config = data['config']
        
        try:
            db.session.commit()
            return source.to_dict()
        except Exception as e:
            db.session.rollback()
            return {'error': f'更新失败: {str(e)}'}, 500
    
    @jwt_required()
    def delete(self, source_id):
        """删除数据源"""
        source = DataSource.query.get_or_404(source_id)
        
        try:
            db.session.delete(source)
            db.session.commit()
            return {'message': '删除成功'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': f'删除失败: {str(e)}'}, 500


@data_sources_ns.route('/<int:source_id>/fetch')
class FetchDataSource(Resource):
    @jwt_required()
    def post(self, source_id):
        """手动触发数据源抓取"""
        source = DataSource.query.get_or_404(source_id)
        
        if not source.is_active:
            return {'error': '数据源未激活'}, 400
        
        # 异步执行抓取任务
        task = fetch_data_source.delay(source_id)
        
        return {
            'message': '抓取任务已启动',
            'task_id': task.id,
            'source_id': source_id
        }, 202


@data_sources_ns.route('/stats')
class DataSourceStats(Resource):
    @jwt_required()
    def get(self):
        """获取数据源统计"""
        stats = DataSource.get_stats()
        return stats, 200