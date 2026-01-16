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
CELERY_LOG="$LOG_DIR/celery.log"
CELERY_BEAT_LOG="$LOG_DIR/celery_beat.log"
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
    pkill -f "celery.*worker" 2>/dev/null
    pkill -f "celery.*beat" 2>/dev/null
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
    local pid=$(lsof -ti:$port -sTCP:LISTEN 2>/dev/null)
    if [ -n "$pid" ]; then
        # 检查是否是我们的进程
        if [ -f "$PID_FILE" ]; then
            if grep -q "^$pid$" "$PID_FILE" 2>/dev/null; then
                print_message "$YELLOW" "⚠ 端口 $port 被我们的进程占用 (PID: $pid)，将终止旧进程..."
                kill $pid 2>/dev/null
                sleep 1
                # 再次检查
                if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                    return 0
                fi
            fi
        fi
        print_message "$YELLOW" "⚠ 端口 $port 已被占用 (PID: $pid)"
        print_message "$YELLOW" "   如果是macOS，可能是AirPlay Receiver占用了该端口"
        print_message "$YELLOW" "   解决方法：系统设置 -> 通用 -> AirDrop与隔空播放 -> 关闭'隔空播放接收器'"
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
    
    # 检查依赖是否已安装（验证Flask是否能导入）
    DEPENDENCIES_INSTALLED=false
    if [ -f "venv/.dependencies_installed" ]; then
        if "$BACKEND_DIR/venv/bin/python" -c "import flask" 2>/dev/null; then
            DEPENDENCIES_INSTALLED=true
        else
            print_message "$YELLOW" "检测到依赖未正确安装，将重新安装..."
            rm -f "venv/.dependencies_installed"
        fi
    fi
    
    # 安装依赖（使用虚拟环境中的pip）
    if [ "$DEPENDENCIES_INSTALLED" = false ]; then
        print_message "$YELLOW" "安装Python依赖..."
        
        # 升级pip（显示错误）
        if ! "$BACKEND_DIR/venv/bin/pip" install --upgrade pip 2>&1; then
            print_message "$RED" "✗ pip升级失败"
            return 1
        fi
        
        # 安装依赖（显示错误）
        INSTALL_LOG="$LOG_DIR/pip_install.log"
        if ! "$BACKEND_DIR/venv/bin/pip" install -r requirements.txt > "$INSTALL_LOG" 2>&1; then
            print_message "$RED" "✗ 依赖安装失败"
            print_message "$YELLOW" "错误日志已保存到: $INSTALL_LOG"
            print_message "$YELLOW" "最后几行错误信息:"
            tail -20 "$INSTALL_LOG" | sed 's/^/  /'
            return 1
        fi
        
        # 验证安装是否成功
        if "$BACKEND_DIR/venv/bin/python" -c "import flask" 2>/dev/null; then
            touch "$BACKEND_DIR/venv/.dependencies_installed"
            print_message "$GREEN" "✓ 依赖安装成功"
        else
            print_message "$RED" "✗ 依赖安装后验证失败，请检查 requirements.txt"
            return 1
        fi
    else
        print_message "$GREEN" "✓ 依赖已安装"
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
    
    # 检查并清理端口5000
    local port_pid=$(lsof -ti:5000 -sTCP:LISTEN 2>/dev/null)
    if [ -n "$port_pid" ]; then
        # 检查是否是我们的进程
        if [ -f "$PID_FILE" ]; then
            if grep -q "^$port_pid$" "$PID_FILE" 2>/dev/null; then
                print_message "$YELLOW" "检测到旧的后端进程占用端口5000 (PID: $port_pid)，正在终止..."
                kill $port_pid 2>/dev/null
                sleep 2
            else
                print_message "$RED" "端口5000被其他进程占用 (PID: $port_pid)"
                print_message "$YELLOW" "如果是macOS，可能是AirPlay Receiver占用了该端口"
                print_message "$YELLOW" "解决方法：系统设置 -> 通用 -> AirDrop与隔空播放 -> 关闭'隔空播放接收器'"
                print_message "$YELLOW" "或者运行: sudo lsof -ti:5000 | xargs kill -9"
                return 1
            fi
        else
            print_message "$RED" "端口5000被其他进程占用 (PID: $port_pid)"
            print_message "$YELLOW" "如果是macOS，可能是AirPlay Receiver占用了该端口"
            print_message "$YELLOW" "解决方法：系统设置 -> 通用 -> AirDrop与隔空播放 -> 关闭'隔空播放接收器'"
            print_message "$YELLOW" "或者运行: sudo lsof -ti:5000 | xargs kill -9"
            return 1
        fi
    fi
    
    # 启动Flask应用（使用虚拟环境中的Python）
    print_message "$GREEN" "后端服务启动中 (http://localhost:5000)..."
    nohup "$BACKEND_DIR/venv/bin/python" app.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID >> "$PID_FILE"
    
    # 等待后端启动，检查进程和端口
    sleep 3
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        # 检查端口是否在监听
        for i in {1..10}; do
            if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_message "$GREEN" "✓ 后端服务已启动 (PID: $BACKEND_PID)"
        return 0
            fi
            sleep 1
        done
        # 进程存在但端口未监听，可能启动中或出错
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_message "$YELLOW" "⚠ 后端进程运行中，但端口5000未监听（可能正在启动或数据库连接失败）"
            print_message "$BLUE" "请查看日志: $BACKEND_LOG"
            return 0
        else
            print_message "$RED" "✗ 后端服务启动失败，请查看日志: $BACKEND_LOG"
            tail -20 "$BACKEND_LOG" | sed 's/^/  /'
            return 1
        fi
    else
        print_message "$RED" "✗ 后端服务启动失败，请查看日志: $BACKEND_LOG"
        tail -20 "$BACKEND_LOG" | sed 's/^/  /'
        return 1
    fi
}

# 启动Celery服务
start_celery() {
    print_message "$BLUE" "正在启动Celery服务..."
    
    cd "$BACKEND_DIR"
    
    # 检查Redis是否可用（可选）
    if ! redis-cli ping > /dev/null 2>&1; then
        print_message "$YELLOW" "⚠ Redis未运行，Celery任务可能无法正常工作"
    fi
    
    # 启动Celery Worker
    print_message "$GREEN" "启动Celery Worker..."
    nohup "$BACKEND_DIR/venv/bin/python" -m celery -A celery_app worker --loglevel=info > "$CELERY_LOG" 2>&1 &
    CELERY_PID=$!
    echo $CELERY_PID >> "$PID_FILE"
    
    # 启动Celery Beat
    print_message "$GREEN" "启动Celery Beat调度器..."
    nohup "$BACKEND_DIR/venv/bin/python" -m celery -A celery_app beat --loglevel=info > "$CELERY_BEAT_LOG" 2>&1 &
    CELERY_BEAT_PID=$!
    echo $CELERY_BEAT_PID >> "$PID_FILE"
    
    # 等待启动
    sleep 2
    if ps -p $CELERY_PID > /dev/null 2>&1 && ps -p $CELERY_BEAT_PID > /dev/null 2>&1; then
        print_message "$GREEN" "✓ Celery服务已启动 (Worker PID: $CELERY_PID, Beat PID: $CELERY_BEAT_PID)"
        return 0
    else
        print_message "$YELLOW" "⚠ Celery服务可能启动失败，请查看日志: $CELERY_LOG"
        return 0
    fi
}

# 启动前端服务
start_frontend() {
    print_message "$BLUE" "正在启动前端服务..."
    
    cd "$FRONTEND_DIR"
    
    # 检查是否有package.json
    if [ ! -f "package.json" ]; then
        print_message "$YELLOW" "⚠ 未找到package.json，前端项目未初始化"
        print_message "$BLUE" "前端目录存在但未初始化React项目"
        print_message "$BLUE" "如需初始化前端项目，可以运行:"
        print_message "$BLUE" "  cd frontend && npx create-react-app . --template typescript"
        print_message "$BLUE" "  或者使用 Vite:"
        print_message "$BLUE" "  cd frontend && npm create vite@latest . -- --template react-ts"
        echo ""
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
    start_celery
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
    print_message "$BLUE" "  Celery Worker: $CELERY_LOG"
    print_message "$BLUE" "  Celery Beat: $CELERY_BEAT_LOG"
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

