#!/usr/bin/env python3
"""
预先下载 sentence-transformers 模型到本地目录
使用方法：
    python download_model.py
或指定目录：
    python download_model.py --model-dir ./models
或使用镜像源：
    HF_ENDPOINT=https://hf-mirror.com python download_model.py
"""

import os
import sys
import argparse
from sentence_transformers import SentenceTransformer
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 检查并设置镜像源
def setup_mirror():
    """设置 Hugging Face 镜像源"""
    mirror = os.environ.get('HF_ENDPOINT') or os.environ.get('HF_MIRROR')
    if not mirror:
        # 默认使用国内镜像
        mirror = 'https://hf-mirror.com'
        os.environ['HF_ENDPOINT'] = mirror
        logger.info(f"使用 Hugging Face 镜像源: {mirror}")
        logger.info("提示：如果仍然无法下载，可以手动设置环境变量:")
        logger.info("  export HF_ENDPOINT=https://hf-mirror.com")
    else:
        logger.info(f"使用指定的镜像源: {mirror}")
    return mirror

def download_model(model_name: str = 'sentence-transformers/all-MiniLM-L6-v2', model_dir: str = None, use_mirror: bool = True):
    """
    下载模型到指定目录
    
    Args:
        model_name: 模型名称
        model_dir: 本地模型目录，如果为None则使用默认缓存目录
        use_mirror: 是否使用镜像源
    """
    try:
        # 设置镜像源
        if use_mirror:
            setup_mirror()
        
        logger.info(f"开始下载模型: {model_name}")
        logger.info("这可能需要几分钟时间，请耐心等待...")
        logger.info("如果下载缓慢，可以尝试使用镜像源或手动下载")
        
        if model_dir:
            # 如果指定了目录，先创建目录
            os.makedirs(model_dir, exist_ok=True)
            logger.info(f"模型将保存到: {os.path.abspath(model_dir)}")
            # 使用本地路径加载/保存模型
            model_path = os.path.join(model_dir, model_name.replace('/', '_'))
            
            # 检查模型是否已存在
            if os.path.exists(model_path) and os.path.exists(os.path.join(model_path, 'config.json')):
                logger.info(f"模型已存在于: {model_path}")
                logger.info("跳过下载，使用已有模型")
                model = SentenceTransformer(model_path)
            else:
                # 下载模型
                model = SentenceTransformer(model_name)
                # 保存到本地
                model.save(model_path)
                logger.info(f"模型已保存到: {model_path}")
        else:
            # 使用默认缓存目录（Hugging Face 默认缓存）
            logger.info("使用 Hugging Face 默认缓存目录")
            model = SentenceTransformer(model_name)
            cache_dir = model._model_card_vars.get('_model_card_vars', {}).get('cache_dir')
            logger.info(f"模型已缓存到 Hugging Face 默认目录")
        
        # 测试模型
        logger.info("测试模型加载...")
        test_text = "这是一个测试文本"
        embedding = model.encode(test_text)
        logger.info(f"✅ 模型测试成功！嵌入向量维度: {len(embedding)}")
        
        return model_path if model_dir else None
        
    except Exception as e:
        logger.error(f"❌ 下载模型失败: {e}")
        logger.error("")
        logger.error("解决方案：")
        logger.error("1. 使用镜像源（推荐）:")
        logger.error("   export HF_ENDPOINT=https://hf-mirror.com")
        logger.error("   python download_model.py")
        logger.error("")
        logger.error("2. 手动下载模型文件:")
        logger.error("   访问: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2")
        logger.error("   下载所有文件到: ./models/sentence-transformers_all-MiniLM-L6-v2/")
        logger.error("")
        logger.error("3. 使用 Git LFS 克隆:")
        logger.error("   git lfs install")
        logger.error("   git clone https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 ./models/sentence-transformers_all-MiniLM-L6-v2")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='下载 sentence-transformers 模型')
    parser.add_argument(
        '--model-name',
        type=str,
        default='sentence-transformers/all-MiniLM-L6-v2',
        help='模型名称（默认: sentence-transformers/all-MiniLM-L6-v2）'
    )
    parser.add_argument(
        '--model-dir',
        type=str,
        default='./models',
        help='本地模型目录（默认: ./models）'
    )
    parser.add_argument(
        '--no-mirror',
        action='store_true',
        help='不使用镜像源（直接连接 Hugging Face）'
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("模型下载工具")
    logger.info("=" * 60)
    
    model_path = download_model(args.model_name, args.model_dir, use_mirror=not args.no_mirror)
    
    if model_path:
        logger.info("=" * 60)
        logger.info("✅ 模型下载完成！")
        logger.info(f"模型路径: {os.path.abspath(model_path)}")
        logger.info("")
        logger.info("使用方法：")
        logger.info(f"  1. 在 .env 文件中设置: EMBEDDING_MODEL_PATH={os.path.abspath(model_path)}")
        logger.info("  2. 或者在 config.py 中配置模型路径")
        logger.info("=" * 60)
    else:
        logger.info("=" * 60)
        logger.info("✅ 模型已缓存到 Hugging Face 默认目录")
        logger.info("模型将在首次使用时自动加载")
        logger.info("=" * 60)

if __name__ == '__main__':
    main()
