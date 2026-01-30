from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from flask import request
from datetime import datetime
import logging

# 依赖：sentence-transformers 已在 requirements.txt 中安装
from sentence_transformers import SentenceTransformer, util

# 为了避免重复加载，使用懒加载单例
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        # 与需求中配置一致：all-MiniLM-L6-v2
        _embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    return _embedding_model

query_ns = Namespace('query', description='查询相关操作')

result_model = query_ns.model('SemanticResult', {
    'id': fields.Integer(description='文档ID'),
    'title': fields.String(description='标题'),
    'summary': fields.String(description='摘要'),
    'score': fields.Float(description='相似度得分（0-1）'),
    'source_type': fields.String(description='来源类型'),
    'source_name': fields.String(description='来源名称'),
    'created_at': fields.String(description='创建时间')
})

@query_ns.route('/semantic')
class SemanticQuery(Resource):
    @jwt_required()
    @query_ns.expect(query_ns.model('SemanticQueryInput', {
        'query': fields.String(required=True, description='用户查询'),
        'top_k': fields.Integer(description='返回条数，默认5')
    }))
    @query_ns.marshal_list_with(result_model)
    def post(self):
        """语义查询：基于向量相似度返回最相关文档"""
        try:
            from models.document import Document
            from models.database import db

            data = request.get_json() or {}
            query_text = (data.get('query') or '').strip()
            top_k = int(data.get('top_k') or 5)
            top_k = max(1, min(top_k, 20))  # 限制范围，避免过大开销

            if not query_text:
                return {'error': 'query 不能为空'}, 400

            # 获取最近的部分文档，减少计算量（可视情况调整）
            candidate_docs = Document.query.order_by(Document.created_at.desc()).limit(300).all()
            logger = logging.getLogger(__name__)
            logger.info(f"找到 {len(candidate_docs)} 个候选文档")
            
            if not candidate_docs:
                logger.warning("没有找到任何文档，请先添加文档到知识库")
                return [], 200

            logger.info("开始加载嵌入模型...")
            model = get_embedding_model()
            logger.info("嵌入模型加载成功")

            # 编码查询和文档
            query_emb = model.encode(query_text, convert_to_tensor=True)
            doc_texts = []
            doc_refs = []
            for doc in candidate_docs:
                text_parts = [doc.title or '', doc.summary or '', doc.content or '']
                doc_texts.append('\n'.join(text_parts)[:2000])  # 截断以减少计算量
                doc_refs.append(doc)

            doc_embs = model.encode(doc_texts, convert_to_tensor=True)

            # 相似度计算
            scores = util.cos_sim(query_emb, doc_embs)[0]
            scored = [(float(scores[i]), doc_refs[i]) for i in range(len(doc_refs))]
            scored.sort(key=lambda x: x[0], reverse=True)

            results = []
            for score, doc in scored[:top_k]:
                results.append({
                    'id': doc.id,
                    'title': doc.title,
                    'summary': doc.summary or (doc.content[:200] + '...' if doc.content else ''),
                    'score': round(score, 4),
                    'source_type': doc.source_type,
                    'source_name': doc.source_name,
                    'created_at': doc.created_at.isoformat() + 'Z' if doc.created_at else None
                })

            # 记录日志
            logger = logging.getLogger(__name__)
            logger.info(f"语义查询: query='{query_text[:100]}', top_k={top_k}, candidates={len(candidate_docs)}")

            return results, 200

        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"语义查询失败: {e}")
            return {'error': f'语义查询失败: {str(e)}'}, 500

