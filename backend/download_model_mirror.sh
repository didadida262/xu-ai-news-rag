#!/bin/bash
# 使用镜像源下载模型的便捷脚本

echo "=========================================="
echo "使用 Hugging Face 镜像源下载模型"
echo "=========================================="
echo ""

# 检测 Python 命令
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
elif [ -f "./venv/bin/python" ]; then
    PYTHON_CMD=./venv/bin/python
    echo "使用虚拟环境中的 Python"
else
    echo "错误: 未找到 Python 解释器"
    echo "请确保已安装 Python 3，或激活虚拟环境"
    exit 1
fi

# 设置镜像源
export HF_ENDPOINT=https://hf-mirror.com

echo "已设置镜像源: $HF_ENDPOINT"
echo "使用 Python: $PYTHON_CMD"
echo "开始下载模型..."
echo ""

# 运行下载脚本
$PYTHON_CMD download_model.py "$@"
