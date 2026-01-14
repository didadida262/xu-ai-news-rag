from flask_restx import Namespace, Resource, fields

admin_ns = Namespace('admin', description='管理员相关操作')

# TODO: 实现管理员接口
@admin_ns.route('')
class AdminInfo(Resource):
    def get(self):
        """获取管理员信息"""
        return {'message': '管理员接口待实现'}, 200

