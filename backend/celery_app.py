"""Celery应用配置"""
from celery import Celery
from config.config import config
import os

def make_celery(app=None):
    """创建Celery应用"""
    config_name = os.environ.get('FLASK_ENV', 'development')
    app_config = config[config_name]
    
    celery = Celery(
        'news_rag',
        broker=app_config.CELERY_BROKER_URL,
        backend=app_config.CELERY_RESULT_BACKEND,
        include=['services.tasks']
    )
    
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Asia/Shanghai',
        enable_utc=True,
        beat_schedule={
            'fetch-all-sources': {
                'task': 'services.tasks.fetch_all_data_sources',
                'schedule': 30.0,  # 每30秒检查一次
            },
        },
    )
    
    return celery

# 创建Celery实例
celery = make_celery()
