from flask_restx import Namespace, Resource, fields

data_sources_ns = Namespace('data-sources', description='数据源管理相关操作')

# TODO: 实现数据源管理接口
@data_sources_ns.route('')
class DataSourcesList(Resource):
    def get(self):
        """获取数据源列表"""
        return {'message': '数据源列表接口待实现'}, 200

