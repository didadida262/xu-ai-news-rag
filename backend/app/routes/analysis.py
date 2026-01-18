"""数据分析API"""
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
import sys
import os
import re
import jieba
import jieba.analyse
from collections import Counter
from typing import Dict, List

# 添加项目路径
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models.document import Document
from models.database import db
from sqlalchemy import func, extract

analysis_ns = Namespace('analysis', description='数据分析相关操作')

# 数据模型
keyword_model = analysis_ns.model('Keyword', {
    'word': fields.String(description='关键词'),
    'count': fields.Integer(description='出现次数'),
    'frequency': fields.Float(description='频率')
})

source_distribution_model = analysis_ns.model('SourceDistribution', {
    'source_type': fields.String(description='来源类型'),
    'count': fields.Integer(description='数量'),
    'percentage': fields.Float(description='百分比')
})

time_trend_model = analysis_ns.model('TimeTrend', {
    'date': fields.String(description='日期'),
    'count': fields.Integer(description='数量')
})

analysis_result_model = analysis_ns.model('AnalysisResult', {
    'keywords': fields.List(fields.Nested(keyword_model)),
    'source_distribution': fields.List(fields.Nested(source_distribution_model)),
    'time_trend': fields.List(fields.Nested(time_trend_model)),
    'total_documents': fields.Integer(description='总文档数'),
    'date_range': fields.Raw(description='日期范围')
})


def extract_keywords(text: str, top_k: int = 10) -> List[Dict]:
    """提取关键词"""
    if not text:
        return []
    
    # 使用jieba提取关键词
    keywords = jieba.analyse.extract_tags(text, topK=top_k, withWeight=True)
    
    # 转换为字典格式
    result = []
    total_weight = sum(weight for _, weight in keywords)
    
    for word, weight in keywords:
        result.append({
            'word': word,
            'count': int(weight * 1000),  # 转换为整数计数
            'frequency': round(weight / total_weight * 100 if total_weight > 0 else 0, 2)
        })
    
    return result


def clean_text(text: str) -> str:
    """清理文本，移除HTML标签和特殊字符"""
    if not text:
        return ''
    # 移除HTML标签
    text = re.sub(r'<[^>]+>', '', text)
    # 移除特殊字符，保留中文、英文、数字
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', '', text)
    return text


@analysis_ns.route('/keywords')
class KeywordsAnalysis(Resource):
    @jwt_required()
    @analysis_ns.doc(params={
        'start_date': '开始日期（YYYY-MM-DD）',
        'end_date': '结束日期（YYYY-MM-DD）',
        'source_type': '来源类型筛选（rss/web/api/upload）',
        'top_k': '返回关键词数量（默认10）'
    })
    @analysis_ns.marshal_list_with(keyword_model)
    def get(self):
        """关键词Top10分析"""
        try:
            # 获取查询参数
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            source_type = request.args.get('source_type')
            top_k = request.args.get('top_k', 10, type=int)
            
            # 构建查询
            query = Document.query
            
            # 日期筛选
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    query = query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    query = query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            # 来源类型筛选
            if source_type:
                query = query.filter(Document.source_type == source_type)
            
            # 获取所有文档
            documents = query.all()
            
            # 合并所有文本内容
            all_text = ''
            for doc in documents:
                # 合并标题、摘要和内容
                text_parts = []
                if doc.title:
                    text_parts.append(doc.title)
                if doc.summary:
                    text_parts.append(doc.summary)
                if doc.content:
                    # 只取前5000字符，避免文本过长
                    text_parts.append(doc.content[:5000])
                
                all_text += ' '.join(text_parts) + ' '
            
            # 清理文本
            all_text = clean_text(all_text)
            
            # 提取关键词
            keywords = extract_keywords(all_text, top_k=top_k)
            
            return keywords, 200
            
        except Exception as e:
            return {'error': f'关键词分析失败: {str(e)}'}, 500


@analysis_ns.route('/source-distribution')
class SourceDistributionAnalysis(Resource):
    @jwt_required()
    @analysis_ns.doc(params={
        'start_date': '开始日期（YYYY-MM-DD）',
        'end_date': '结束日期（YYYY-MM-DD）'
    })
    @analysis_ns.marshal_list_with(source_distribution_model)
    def get(self):
        """来源分布统计"""
        try:
            # 获取查询参数
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # 构建查询
            query = Document.query
            
            # 日期筛选
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    query = query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    query = query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            # 按来源类型分组统计
            # 直接使用query的where条件
            results = db.session.query(
                Document.source_type,
                func.count(Document.id).label('count')
            )
            
            # 应用日期筛选条件
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    results = results.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    results = results.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            results = results.group_by(Document.source_type).all()
            
            # 计算总数
            total = sum(count for _, count in results)
            
            # 转换为字典格式
            distribution = []
            for source_type, count in results:
                percentage = round(count / total * 100, 2) if total > 0 else 0
                distribution.append({
                    'source_type': source_type,
                    'count': count,
                    'percentage': percentage
                })
            
            return distribution, 200
            
        except Exception as e:
            return {'error': f'来源分布分析失败: {str(e)}'}, 500


@analysis_ns.route('/time-trend')
class TimeTrendAnalysis(Resource):
    @jwt_required()
    @analysis_ns.doc(params={
        'start_date': '开始日期（YYYY-MM-DD）',
        'end_date': '结束日期（YYYY-MM-DD）',
        'group_by': '分组方式（day/week/month，默认day）'
    })
    @analysis_ns.marshal_list_with(time_trend_model)
    def get(self):
        """时间趋势分析"""
        try:
            # 获取查询参数
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            group_by = request.args.get('group_by', 'day')
            
            # 构建查询
            query = Document.query
            
            # 日期筛选
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    query = query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            else:
                # 默认最近30天
                start = datetime.now() - timedelta(days=30)
                query = query.filter(Document.created_at >= start)
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    query = query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            # 根据分组方式提取日期部分
            if group_by == 'day':
                date_expr = func.date(Document.created_at)
            elif group_by == 'week':
                date_expr = func.date_format(Document.created_at, '%Y-%u')
            elif group_by == 'month':
                date_expr = func.date_format(Document.created_at, '%Y-%m')
            else:
                date_expr = func.date(Document.created_at)
            
            # 按日期分组统计
            results = db.session.query(
                date_expr.label('date'),
                func.count(Document.id).label('count')
            )
            
            # 应用日期筛选条件
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    results = results.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    results = results.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            results = results.group_by(date_expr).order_by(date_expr).all()
            
            # 转换为字典格式
            trend = []
            for date, count in results:
                trend.append({
                    'date': str(date),
                    'count': count
                })
            
            return trend, 200
            
        except Exception as e:
            return {'error': f'时间趋势分析失败: {str(e)}'}, 500


@analysis_ns.route('/overview')
class AnalysisOverview(Resource):
    @jwt_required()
    @analysis_ns.doc(params={
        'start_date': '开始日期（YYYY-MM-DD）',
        'end_date': '结束日期（YYYY-MM-DD）',
        'source_type': '来源类型筛选（rss/web/api/upload）',
        'top_k': '返回关键词数量（默认10）'
    })
    @analysis_ns.marshal_with(analysis_result_model)
    def get(self):
        """综合分析概览"""
        try:
            # 获取查询参数
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            source_type = request.args.get('source_type')
            top_k = request.args.get('top_k', 10, type=int)
            
            # 构建查询
            query = Document.query
            
            # 日期筛选
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    query = query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    query = query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            # 来源类型筛选
            if source_type:
                query = query.filter(Document.source_type == source_type)
            
            # 获取所有文档
            documents = query.all()
            total_documents = len(documents)
            
            # 1. 关键词分析
            all_text = ''
            for doc in documents:
                text_parts = []
                if doc.title:
                    text_parts.append(doc.title)
                if doc.summary:
                    text_parts.append(doc.summary)
                if doc.content:
                    text_parts.append(doc.content[:5000])
                all_text += ' '.join(text_parts) + ' '
            
            all_text = clean_text(all_text)
            keywords = extract_keywords(all_text, top_k=top_k)
            
            # 2. 来源分布统计
            source_query = db.session.query(
                Document.source_type,
                func.count(Document.id).label('count')
            )
            
            # 应用筛选条件
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    source_query = source_query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    source_query = source_query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            if source_type:
                source_query = source_query.filter(Document.source_type == source_type)
            
            source_results = source_query.group_by(Document.source_type).all()
            
            total_sources = sum(count for _, count in source_results)
            source_distribution = []
            for source_type, count in source_results:
                percentage = round(count / total_sources * 100, 2) if total_sources > 0 else 0
                source_distribution.append({
                    'source_type': source_type,
                    'count': count,
                    'percentage': percentage
                })
            
            # 3. 时间趋势分析（按天）
            date_expr = func.date(Document.created_at)
            time_query = db.session.query(
                date_expr.label('date'),
                func.count(Document.id).label('count')
            )
            
            # 应用筛选条件
            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    time_query = time_query.filter(Document.created_at >= start)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    end = end.replace(hour=23, minute=59, second=59)
                    time_query = time_query.filter(Document.created_at <= end)
                except ValueError:
                    pass
            
            if source_type:
                time_query = time_query.filter(Document.source_type == source_type)
            
            time_results = time_query.group_by(date_expr).order_by(date_expr).all()
            
            time_trend = []
            for date, count in time_results:
                time_trend.append({
                    'date': str(date),
                    'count': count
                })
            
            return {
                'keywords': keywords,
                'source_distribution': source_distribution,
                'time_trend': time_trend,
                'total_documents': total_documents,
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            }, 200
            
        except Exception as e:
            return {'error': f'综合分析失败: {str(e)}'}, 500
