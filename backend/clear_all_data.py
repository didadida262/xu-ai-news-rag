#!/usr/bin/env python
"""删除数据库中所有数据（保留表结构）"""
import sys
import os

# 添加项目路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import sys
import importlib.util

# 动态导入 app.py 中的 create_app
app_path = os.path.join(backend_dir, 'app.py')
spec = importlib.util.spec_from_file_location("app_module", app_path)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
create_app = app_module.create_app
from models.database import db
from models.user import User
from models.document import Document
from models.query_log import QueryLog
from models.data_source import DataSource

def clear_all_data():
    """删除所有表的数据"""
    app = create_app()
    
    with app.app_context():
        try:
            print("开始删除数据库中的所有数据...")
            
            # 按顺序删除（考虑外键约束）
            deleted_counts = {}
            
            # 1. 删除查询日志（可能有外键引用）
            count = QueryLog.query.delete()
            deleted_counts['QueryLog'] = count
            print(f"  删除查询日志: {count} 条")
            
            # 2. 删除文档（可能有外键引用）
            count = Document.query.delete()
            deleted_counts['Document'] = count
            print(f"  删除文档: {count} 条")
            
            # 3. 删除数据源
            count = DataSource.query.delete()
            deleted_counts['DataSource'] = count
            print(f"  删除数据源: {count} 条")
            
            # 4. 删除用户（最后删除，因为可能有其他表引用）
            count = User.query.delete()
            deleted_counts['User'] = count
            print(f"  删除用户: {count} 条")
            
            # 提交事务
            db.session.commit()
            
            print("\n删除完成！")
            print("=" * 50)
            print("删除统计:")
            total = 0
            for table, count in deleted_counts.items():
                print(f"  {table}: {count} 条")
                total += count
            print(f"  总计: {total} 条")
            print("=" * 50)
            print("\n注意: 表结构已保留，可以重新创建默认数据源。")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n错误: 删除数据失败 - {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    clear_all_data()
