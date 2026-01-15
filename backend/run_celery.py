#!/usr/bin/env python
"""启动Celery Worker和Beat"""
import sys
import os

# 添加项目路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery

if __name__ == '__main__':
    # 启动Celery worker
    celery.start()
