#!/bin/bash

# ===========================================
# 智能新闻RAG系统 - 一键启动脚本
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

# 日志文件
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
PID_FILE="$LOG_DIR/startup.pid"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}正在停止服务...${NC}"
    
    # 读取PID文件并终止进程
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            if ps -p $pid > /dev/null 2>&1; then
                kill $pid 2>/dev/null
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # 查找并终止相关进程
    pkill -f "python.*app.py" 2>/dev/null
    pkill -f "node.*react" 2>/dev/null
    pkill -f "npm start" 2>/dev/null
    
    echo -e "${GREEN}服务已停止${NC}"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

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

# 检查服务是否运行
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" &> /dev/null; then
        print_message "$GREEN" "✓ $service_name 正在运行"
        return 0
    else
        print_message "$YELLOW" "⚠ $service_name 未运行（可选，某些功能可能不可用）"
        return 1
    fi
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_message "$YELLOW" "⚠ 端口 $port 已被占用"
        return 1
    fi
    return 0
}

# 启动后端服务
start_backend() {
    print_message "$BLUE" "正在启动后端服务..."
    
    cd "$BACKEND_DIR"
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        print_message "$YELLOW" "创建Python虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    if [ ! -f "venv/.dependencies_installed" ]; then
        print_message "$YELLOW" "安装Python依赖..."
        pip install --upgrade pip > /dev/null 2>&1
        pip install -r requirements.txt > /dev/null 2>&1
        touch venv/.dependencies_installed
    fi
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        print_message "$YELLOW" "创建.env文件（使用默认配置）..."
        cat > .env << EOF
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=mysql+pymysql://root:password@localhost/news_rag
JWT_SECRET_KEY=jwt-secret-string
REDIS_URL=redis://localhost:6379/0
OLLAMA_BASE_URL=http://localhost:11434
EOF
    fi
    
    # 启动Flask应用
    print_message "$GREEN" "后端服务启动中 (http://localhost:5000)..."
    nohup python app.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID >> "$PID_FILE"
    
    # 等待后端启动
    sleep 3
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        print_message "$GREEN" "✓ 后端服务已启动 (PID: $BACKEND_PID)"
        return 0
    else
        print_message "$RED" "✗ 后端服务启动失败，请查看日志: $BACKEND_LOG"
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    print_message "$BLUE" "正在启动前端服务..."
    
    cd "$FRONTEND_DIR"
    
    # 检查是否有package.json
    if [ ! -f "package.json" ]; then
        print_message "$YELLOW" "⚠ 未找到package.json，跳过前端启动"
        print_message "$YELLOW" "如需启动前端，请先初始化React项目"
        return 0
    fi
    
    # 检查node_modules
    if [ ! -d "node_modules" ]; then
        print_message "$YELLOW" "安装Node.js依赖..."
        npm install
    fi
    
    # 检查端口
    check_port 3000
    
    # 启动React应用
    print_message "$GREEN" "前端服务启动中 (http://localhost:3000)..."
    nohup npm start > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID >> "$PID_FILE"
    
    # 等待前端启动
    sleep 5
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        print_message "$GREEN" "✓ 前端服务已启动 (PID: $FRONTEND_PID)"
        return 0
    else
        print_message "$YELLOW" "⚠ 前端服务可能正在启动中，请查看日志: $FRONTEND_LOG"
        return 0
    fi
}

# 主函数
main() {
    clear
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  智能新闻RAG系统 - 启动脚本"
    print_message "$BLUE" "=========================================="
    echo ""
    
    # 检查必要的命令
    print_message "$BLUE" "检查依赖..."
    check_command "python3" || exit 1
    check_pip || exit 1
    
    # 检查可选服务
    print_message "$BLUE" "检查服务状态..."
    check_service "MySQL" "mysqladmin ping -h localhost 2>/dev/null"
    check_service "Redis" "redis-cli ping 2>/dev/null"
    check_service "Ollama" "curl -s http://localhost:11434/api/tags > /dev/null"
    
    echo ""
    
    # 检查端口
    print_message "$BLUE" "检查端口..."
    check_port 5000
    check_port 3000
    echo ""
    
    # 启动服务
    start_backend
    echo ""
    start_frontend
    echo ""
    
    # 显示启动信息
    print_message "$GREEN" "=========================================="
    print_message "$GREEN" "  服务启动完成！"
    print_message "$GREEN" "=========================================="
    echo ""
    print_message "$BLUE" "后端API: ${GREEN}http://localhost:5000"
    print_message "$BLUE" "API文档: ${GREEN}http://localhost:5000/api/docs/"
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        print_message "$BLUE" "前端应用: ${GREEN}http://localhost:3000"
    fi
    
    echo ""
    print_message "$YELLOW" "日志文件:"
    print_message "$BLUE" "  后端: $BACKEND_LOG"
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        print_message "$BLUE" "  前端: $FRONTEND_LOG"
    fi
    
    echo ""
    print_message "$YELLOW" "按 Ctrl+C 停止所有服务"
    echo ""
    
    # 保持脚本运行
    while true; do
        sleep 1
        # 检查后端进程是否还在运行
        if [ -f "$PID_FILE" ]; then
            all_running=true
            while read pid; do
                if ! ps -p $pid > /dev/null 2>&1; then
                    all_running=false
                fi
            done < "$PID_FILE"
            
            if [ "$all_running" = false ]; then
                print_message "$RED" "检测到服务已停止"
                cleanup
            fi
        fi
    done
}

# 运行主函数
main

