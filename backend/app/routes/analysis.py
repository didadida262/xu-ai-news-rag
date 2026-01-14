from flask_restx import Namespace, Resource, fields

analysis_ns = Namespace('analysis', description='数据分析相关操作')

# TODO: 实现数据分析接口
@analysis_ns.route('/keywords')
class KeywordsAnalysis(Resource):
    def get(self):
        """关键词分析"""
        return {'message': '关键词分析接口待实现'}, 200

