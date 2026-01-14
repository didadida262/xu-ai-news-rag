from flask_restx import Namespace, Resource, fields

query_ns = Namespace('query', description='查询相关操作')

# TODO: 实现查询接口
@query_ns.route('/semantic')
class SemanticQuery(Resource):
    def post(self):
        """语义查询"""
        return {'message': '语义查询接口待实现'}, 200

