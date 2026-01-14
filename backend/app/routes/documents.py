from flask_restx import Namespace, Resource, fields

documents_ns = Namespace('documents', description='文档管理相关操作')

# TODO: 实现文档管理接口
@documents_ns.route('')
class DocumentsList(Resource):
    def get(self):
        """获取文档列表"""
        return {'message': '文档列表接口待实现'}, 200

