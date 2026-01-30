from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from flask import request, current_app
from datetime import datetime
import logging
import os

# 依赖：sentence-transformers 已在 requirements.txt 中安装
from sentence_transformers import SentenceTransformer, util

# 为了避免重复加载，使用懒加载单例
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        logger = logging.getLogger(__name__)
        try:
            # 优先使用本地模型路径
            model_path = None
            model_name = 'sentence-transformers/all-MiniLM-L6-v2'
            
            # 尝试从 Flask app context 获取配置
            try:
                from flask import has_app_context
                if has_app_context():
                    model_path = current_app.config.get('EMBEDDING_MODEL_PATH')
                    model_name = current_app.config.get('EMBEDDING_MODEL', model_name)
            except:
                pass
            
            # 如果不在 app context 中或配置为空，从环境变量读取
            if not model_path:
                model_path = os.environ.get('EMBEDDING_MODEL_PATH')
            if model_name == 'sentence-transformers/all-MiniLM-L6-v2':
                model_name = os.environ.get('EMBEDDING_MODEL', model_name)
            
            if model_path and os.path.exists(model_path):
                logger.info(f"从本地路径加载模型: {os.path.abspath(model_path)}")
                _embedding_model = SentenceTransformer(model_path)
                logger.info("✅ 本地模型加载成功")
            else:
                logger.info(f"从 Hugging Face 加载模型: {model_name}")
                if not model_path:
                    logger.info("提示：可以预先下载模型到本地，设置 EMBEDDING_MODEL_PATH 环境变量")
                    logger.info("运行: python backend/download_model.py")
                _embedding_model = SentenceTransformer(model_name)
                logger.info("✅ 模型加载成功")
        except Exception as e:
            logger.error(f"❌ 加载嵌入模型失败: {e}")
            logger.error("")
            logger.error("解决方案：")
            logger.error("1. 预先下载模型: python backend/download_model.py")
            logger.error("2. 设置环境变量: EMBEDDING_MODEL_PATH=./models/sentence-transformers_all-MiniLM-L6-v2")
            logger.error("3. 或检查网络连接，确保可以访问 Hugging Face")
            raise
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

            model = get_embedding_model()

            # 编码查询和文档
            logger.info(f"编码查询文本: '{query_text}'")
            query_emb = model.encode(query_text, convert_to_tensor=True, show_progress_bar=False)
            
            doc_texts = []
            doc_refs = []
            for doc in candidate_docs:
                # 构建文档文本用于向量化
                # 策略：标题 + 摘要（如果有）+ 内容开头部分
                text_parts = []
                
                # 1. 标题（最重要，通常包含关键信息）
                if doc.title:
                    text_parts.append(doc.title)
                
                # 2. 摘要（如果有，通常包含关键信息）
                if doc.summary:
                    text_parts.append(doc.summary)
                
                # 3. 内容开头部分（保留更多上下文）
                if doc.content:
                    # 如果已经有摘要，内容可以短一些；如果没有摘要，保留更多内容
                    content_length = 1000 if doc.summary else 2000
                    content_preview = doc.content[:content_length]
                    text_parts.append(content_preview)
                
                doc_text = '\n'.join(text_parts)
                doc_texts.append(doc_text)
                doc_refs.append(doc)

            logger.info(f"开始编码 {len(doc_texts)} 个文档...")
            doc_embs = model.encode(doc_texts, convert_to_tensor=True, show_progress_bar=False, batch_size=32)

            # 相似度计算
            scores = util.cos_sim(query_emb, doc_embs)[0]
            scored = [(float(scores[i]), doc_refs[i]) for i in range(len(doc_refs))]
            scored.sort(key=lambda x: x[0], reverse=True)

            # 设置相似度阈值，过滤掉相关性太低的文档
            # 从配置中读取阈值，如果没有则使用默认值
            try:
                similarity_threshold = current_app.config.get('SIMILARITY_THRESHOLD', 0.3)
            except:
                similarity_threshold = float(os.environ.get('SIMILARITY_THRESHOLD', '0.3'))
            
            # 如果最高相似度都很低，说明可能没有相关文档，降低阈值
            max_score = scored[0][0] if scored else 0
            if max_score < 0.5:
                # 如果最高相似度都低于0.5，说明可能没有真正相关的文档
                # 但仍然返回结果，但降低阈值到0.2
                similarity_threshold = min(similarity_threshold, 0.2)
                logger.warning(f"最高相似度较低 ({max_score:.4f})，降低阈值到 {similarity_threshold}")
            
            filtered_scored = [(score, doc) for score, doc in scored if score >= similarity_threshold]
            
            if not filtered_scored:
                logger.warning(f"没有找到相似度 >= {similarity_threshold} 的文档，返回前 {top_k} 个结果（即使相似度较低）")
                filtered_scored = scored[:top_k]

            results = []
            for score, doc in filtered_scored[:top_k]:
                results.append({
                    'id': doc.id,
                    'title': doc.title,
                    'summary': doc.summary or (doc.content[:200] + '...' if doc.content else ''),
                    'score': round(score, 4),
                    'source_type': doc.source_type,
                    'source_name': doc.source_name,
                    'created_at': doc.created_at.isoformat() + 'Z' if doc.created_at else None
                })

            # 记录详细日志
            logger.info(f"语义查询完成: query='{query_text[:100]}', top_k={top_k}, candidates={len(candidate_docs)}")
            if results:
                logger.info(f"返回结果数: {len(results)}, 最高相似度: {results[0]['score']:.4f}, 最低相似度: {results[-1]['score']:.4f}")
                logger.info(f"前3个结果标题: {[r['title'][:30] for r in results[:3]]}")
            else:
                logger.warning("未找到相关文档")

            return results, 200

        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"语义查询失败: {e}")
            return {'error': f'语义查询失败: {str(e)}'}, 500

