#!/bin/bash

# ===========================================
# 智能新闻RAG系统 - 依赖安装脚本
# ===========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="$PROJECT_ROOT/logs"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message "$RED" "错误: $1 未安装，请先安装 $1"
        return 1
    fi
    return 0
}

# 检查pip（尝试pip3和pip）
check_pip() {
    if command -v pip3 &> /dev/null; then
        return 0
    elif command -v pip &> /dev/null; then
        return 0
    else
        print_message "$RED" "错误: pip 未安装，请先安装 pip (pip3)"
        return 1
    fi
}

# 安装后端依赖
install_backend() {
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  安装后端依赖 (Python)"
    print_message "$BLUE" "=========================================="
    echo ""
    
    # 检查必要的命令
    print_message "$BLUE" "检查依赖..."
    check_command "python3" || return 1
    check_pip || return 1
    echo ""
    
    cd "$BACKEND_DIR"
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        print_message "$YELLOW" "创建Python虚拟环境..."
        python3 -m venv venv
        if [ $? -ne 0 ]; then
            print_message "$RED" "✗ 虚拟环境创建失败"
            return 1
        fi
        print_message "$GREEN" "✓ 虚拟环境创建成功"
    else
        print_message "$GREEN" "✓ 虚拟环境已存在"
    fi
    echo ""
    
    # 升级pip
    print_message "$YELLOW" "升级pip..."
    "$BACKEND_DIR/venv/bin/pip" install --upgrade pip > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_message "$GREEN" "✓ pip升级完成"
    else
        print_message "$YELLOW" "⚠ pip升级失败，继续安装依赖..."
    fi
    echo ""
    
    # 检查requirements.txt
    if [ ! -f "requirements.txt" ]; then
        print_message "$RED" "✗ 未找到 requirements.txt 文件"
        return 1
    fi
    
    # 安装依赖
    print_message "$YELLOW" "安装Python依赖包（这可能需要几分钟）..."
    INSTALL_LOG="$LOG_DIR/pip_install.log"
    
    print_message "$BLUE" "依赖安装日志: $INSTALL_LOG"
    print_message "$BLUE" "正在安装，请稍候..."
    echo ""
    
    if "$BACKEND_DIR/venv/bin/pip" install -r requirements.txt > "$INSTALL_LOG" 2>&1; then
        # 验证安装是否成功
        if "$BACKEND_DIR/venv/bin/python" -c "import flask" 2>/dev/null; then
            print_message "$GREEN" "✓ 后端依赖安装成功"
            echo ""
            print_message "$BLUE" "已安装的主要包:"
            "$BACKEND_DIR/venv/bin/pip" list | grep -E "(Flask|celery|redis|sqlalchemy|langchain|torch|sentence)" | sed 's/^/  /'
            return 0
        else
            print_message "$RED" "✗ 依赖安装后验证失败"
            print_message "$YELLOW" "请查看日志: $INSTALL_LOG"
            return 1
        fi
    else
        print_message "$RED" "✗ 依赖安装失败"
        print_message "$YELLOW" "错误日志: $INSTALL_LOG"
        print_message "$YELLOW" "最后几行错误信息:"
        tail -30 "$INSTALL_LOG" | sed 's/^/  /'
        return 1
    fi
}

# 安装前端依赖
install_frontend() {
    print_message "$BLUE" ""
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  安装前端依赖 (Node.js)"
    print_message "$BLUE" "=========================================="
    echo ""
    
    # 检查Node.js和npm
    if ! check_command "node"; then
        print_message "$YELLOW" "⚠ 跳过前端依赖安装（Node.js未安装）"
        return 0
    fi
    
    if ! check_command "npm"; then
        print_message "$YELLOW" "⚠ 跳过前端依赖安装（npm未安装）"
        return 0
    fi
    
    cd "$FRONTEND_DIR"
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        print_message "$YELLOW" "⚠ 未找到package.json，前端项目未初始化"
        print_message "$BLUE" "如需初始化前端项目，可以运行:"
        print_message "$BLUE" "  cd frontend"
        print_message "$BLUE" "  npx create-react-app . --template typescript"
        print_message "$BLUE" "  或者使用 Vite:"
        print_message "$BLUE" "  npm create vite@latest . -- --template react-ts"
        echo ""
        return 0
    fi
    
    # 检查node_modules
    if [ -d "node_modules" ]; then
        print_message "$YELLOW" "检测到node_modules目录已存在"
        read -p "是否重新安装? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_message "$BLUE" "跳过前端依赖安装"
            return 0
        fi
        print_message "$YELLOW" "删除旧的node_modules..."
        rm -rf node_modules
    fi
    
    # 检查package-lock.json或yarn.lock
    if [ -f "package-lock.json" ]; then
        LOCK_FILE="package-lock.json"
    elif [ -f "yarn.lock" ]; then
        LOCK_FILE="yarn.lock"
        if ! command -v yarn &> /dev/null; then
            print_message "$YELLOW" "检测到yarn.lock但yarn未安装，使用npm安装"
            LOCK_FILE=""
        fi
    else
        LOCK_FILE=""
    fi
    
    # 安装依赖
    print_message "$YELLOW" "安装Node.js依赖包（这可能需要几分钟）..."
    INSTALL_LOG="$LOG_DIR/npm_install.log"
    
    print_message "$BLUE" "依赖安装日志: $INSTALL_LOG"
    print_message "$BLUE" "正在安装，请稍候..."
    echo ""
    
    if [ -n "$LOCK_FILE" ] && [[ "$LOCK_FILE" == *"yarn.lock"* ]] && command -v yarn &> /dev/null; then
        # 使用yarn安装
        if yarn install > "$INSTALL_LOG" 2>&1; then
            print_message "$GREEN" "✓ 前端依赖安装成功 (yarn)"
            return 0
        else
            print_message "$RED" "✗ 前端依赖安装失败"
            print_message "$YELLOW" "错误日志: $INSTALL_LOG"
            tail -30 "$INSTALL_LOG" | sed 's/^/  /'
            return 1
        fi
    else
        # 使用npm安装
        if npm install > "$INSTALL_LOG" 2>&1; then
            print_message "$GREEN" "✓ 前端依赖安装成功 (npm)"
            return 0
        else
            print_message "$RED" "✗ 前端依赖安装失败"
            print_message "$YELLOW" "错误日志: $INSTALL_LOG"
            tail -30 "$INSTALL_LOG" | sed 's/^/  /'
            return 1
        fi
    fi
}

# 主函数
main() {
    clear
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  智能新闻RAG系统 - 依赖安装脚本"
    print_message "$BLUE" "=========================================="
    echo ""
    
    # 选择安装选项
    print_message "$BLUE" "请选择要安装的依赖:"
    echo ""
    print_message "$BLUE" "  1) 仅安装后端依赖"
    print_message "$BLUE" "  2) 仅安装前端依赖"
    print_message "$BLUE" "  3) 安装前后端依赖（默认）"
    echo ""
    read -p "请选择 [1-3] (默认: 3): " choice
    choice=${choice:-3}
    echo ""
    
    BACKEND_SUCCESS=true
    FRONTEND_SUCCESS=true
    
    # 安装后端依赖
    if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
        install_backend
        BACKEND_SUCCESS=$?
        echo ""
    fi
    
    # 安装前端依赖
    if [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
        install_frontend
        FRONTEND_SUCCESS=$?
        echo ""
    fi
    
    # 显示安装结果
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  安装结果"
    print_message "$BLUE" "=========================================="
    echo ""
    
    if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
        if [ $BACKEND_SUCCESS -eq 0 ]; then
            print_message "$GREEN" "✓ 后端依赖: 安装成功"
        else
            print_message "$RED" "✗ 后端依赖: 安装失败"
        fi
    fi
    
    if [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
        if [ $FRONTEND_SUCCESS -eq 0 ]; then
            print_message "$GREEN" "✓ 前端依赖: 安装成功"
        else
            print_message "$RED" "✗ 前端依赖: 安装失败"
        fi
    fi
    
    echo ""
    
    # 如果后端安装成功，创建标记文件
    if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
        if [ $BACKEND_SUCCESS -eq 0 ]; then
            touch "$BACKEND_DIR/venv/.dependencies_installed"
        fi
    fi
    
    # 最终状态
    if [ $BACKEND_SUCCESS -eq 0 ] && ([ "$choice" != "1" ] || [ "$choice" = "3" ]); then
        if [ $FRONTEND_SUCCESS -eq 0 ] || [ "$choice" = "1" ]; then
            print_message "$GREEN" "依赖安装完成！"
            print_message "$BLUE" "现在可以运行 ./start.sh 启动服务"
        fi
    elif [ $FRONTEND_SUCCESS -eq 0 ] && [ "$choice" = "2" ]; then
        print_message "$GREEN" "依赖安装完成！"
    else
        print_message "$RED" "依赖安装失败，请查看上面的错误信息"
        exit 1
    fi
}

# 运行主函数
main

