#!/usr/bin/env python
"""启动Celery Beat调度器"""
import sys
import os

# 添加项目路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery
from celery.bin import beat

if __name__ == '__main__':
    beat_app = beat.beat(app=celery)
    beat_app.run()
