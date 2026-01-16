from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
import sys
import os

# 添加项目路径
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models.data_source import DataSource
from models.document import Document
from models.query_log import QueryLog
from models.database import db

admin_ns = Namespace('admin', description='管理员相关操作')

@admin_ns.route('/dashboard')
class DashboardStats(Resource):
    @jwt_required()
    def get(self):
        """获取仪表板综合统计"""
        # 数据源统计
        data_source_stats = DataSource.get_stats()
        
        # 文档统计
        document_stats = Document.get_stats()
        
        # 查询统计
        query_stats = QueryLog.get_stats()
        
        # 计算总抓取次数和成功率
        all_sources = DataSource.query.all()
        total_fetches = sum(s.fetch_count for s in all_sources)
        total_success = sum(s.success_count for s in all_sources)
        overall_success_rate = (total_success / total_fetches * 100) if total_fetches > 0 else 0
        
        return {
            'data_sources': {
                'total': data_source_stats['total'],
                'active': data_source_stats['active'],
                'inactive': data_source_stats['inactive'],
                'total_fetches': total_fetches,
                'total_success': total_success,
                'overall_success_rate': round(overall_success_rate, 2)
            },
            'documents': {
                'total': document_stats['total'],
                'processed': document_stats['processed'],
                'vectorized': document_stats['vectorized'],
                'by_source': document_stats.get('by_source', {})
            },
            'queries': {
                'total': query_stats['total_queries'],
                'successful': query_stats['successful_queries'],
                'success_rate': round(query_stats['success_rate'], 2),
                'avg_response_time': round(query_stats['avg_response_time'], 2)
            }
        }, 200

# TODO: 实现管理员接口
@admin_ns.route('')
class AdminInfo(Resource):
    def get(self):
        """获取管理员信息"""
        return {'message': '管理员接口待实现'}, 200

