# 智能新闻RAG系统 - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位
智能新闻RAG（Retrieval-Augmented Generation）系统是一个基于大语言模型的智能新闻聚合、存储、检索和分析平台。系统通过多种数据源获取新闻信息，构建本地知识库，为用户提供智能化的新闻查询和数据分析服务。

### 1.2 目标用户
- 新闻从业者和媒体工作者
- 研究人员和学者
- 企业信息收集人员
- 对新闻信息有深度分析需求的个人用户

### 1.3 核心价值
- **智能聚合**：自动从多个渠道获取最新新闻信息
- **知识存储**：构建结构化的本地知识库
- **智能检索**：基于语义理解的精准信息查询
- **数据分析**：提供关键词分布和聚类分析
- **安全可靠**：本地化部署，数据安全可控

## 2. 功能需求

### 2.1 数据获取模块

#### 2.1.1 定时任务机制
- **功能描述**：实现自动化数据采集，支持多种数据源
- **具体要求**：
  - 支持RSS订阅源配置和管理
  - 支持网页抓取功能，可配置抓取规则
  - 支持智能代理工具集成
  - 可配置定时任务执行频率（小时/天/周）
  - 支持任务执行状态监控和日志记录

#### 2.1.2 数据源支持
- **RSS订阅**：支持标准RSS/Atom格式
- **网页抓取**：支持静态和动态网页内容抓取
- **API接口**：支持第三方新闻API接入
- **文件上传**：支持用户手动上传新闻文件

### 2.2 大模型集成模块

#### 2.2.1 模型部署
- **推荐模型**：qwen2.5::3b
- **部署方式**：基于Ollama本地部署
- **功能支持**：
  - 文本理解和生成
  - 语义分析和推理
  - 多轮对话支持
  - 模型性能监控

#### 2.2.2 API接口
- **标准化接口**：提供RESTful API
- **认证机制**：支持API Key认证
- **限流控制**：防止API滥用
- **错误处理**：完善的异常处理机制

### 2.3 知识库系统

#### 2.3.1 嵌入模型配置
- **推荐模型**：all-MiniLM-L6-v2
- **功能特性**：
  - 多语言文本嵌入支持
  - 高维向量表示（384维）
  - 快速相似度计算
  - 模型版本管理

#### 2.3.2 重排模型配置
- **推荐模型**：ms-marco-MiniLM-L-6-v2
- **功能特性**：
  - 检索结果重排序
  - 相关性评分优化
  - 多候选结果排序

#### 2.3.3 数据存储架构
- **关系型数据库**：MySQL存储元数据
  - 数据ID、类型、来源、时间戳
  - 用户信息、权限管理
  - 系统配置、日志记录
- **向量数据库**：FAISS存储向量数据
  - 文档向量索引
  - 相似度检索优化
  - 增量更新支持

### 2.4 数据管理模块

#### 2.4.1 数据入库
- **API接口**：提供数据写入API
- **数据格式支持**：
  - 结构化数据（Excel、CSV、JSON）
  - 非结构化数据（文本、HTML、PDF）
- **数据处理流程**：
  - 数据清洗和预处理
  - 文本分块和向量化
  - 元数据提取和存储
  - 向量索引构建

#### 2.4.2 邮件通知
- **触发条件**：数据入库成功后自动发送
- **邮件内容**：
  - 自定义标题和内容模板
  - 数据统计信息
  - 处理结果摘要
- **配置选项**：
  - 收件人列表管理
  - 发送频率控制
  - 邮件模板自定义

### 2.5 用户认证模块

#### 2.5.1 登录功能
- **认证方式**：用户名/密码登录
- **技术方案**：JWT（JSON Web Token）
- **安全特性**：
  - 密码加密存储
  - Token过期机制
  - 登录状态管理
  - 异常登录检测

#### 2.5.2 权限管理
- **用户角色**：管理员、普通用户
- **功能权限**：
  - 数据查看权限
  - 数据管理权限
  - 系统配置权限

### 2.6 知识库管理模块

#### 2.6.1 数据列表管理
- **查看功能**：
  - 数据列表展示（分页）
  - 按类型筛选（新闻、报告、文档等）
  - 按时间筛选（日期范围选择）
  - 按来源筛选（RSS、网页、上传等）
- **搜索功能**：
  - 关键词搜索
  - 高级搜索（多条件组合）
  - 搜索结果高亮显示

#### 2.6.2 数据操作
- **删除操作**：
  - 单条数据删除
  - 批量数据删除
  - 删除确认机制
  - 删除日志记录
- **编辑功能**：
  - 元数据编辑（标签、来源、分类）
  - 内容预览和编辑
  - 版本历史记录
  - 修改权限控制

#### 2.6.3 数据上传
- **支持格式**：
  - 文本文件（.txt, .md）
  - 文档文件（.pdf, .docx）
  - 表格文件（.xlsx, .csv）
  - 网页文件（.html）
- **上传功能**：
  - 拖拽上传支持
  - 批量文件上传
  - 上传进度显示
  - 文件格式验证

### 2.7 智能查询模块

#### 2.7.1 语义查询
- **查询方式**：
  - 自然语言查询
  - 关键词查询
  - 布尔查询
- **检索流程**：
  - 查询向量化
  - 向量相似度检索
  - 结果重排序
  - 相关性评分
- **结果展示**：
  - 按相似度排序
  - 高亮显示匹配内容
  - 相关度评分显示
  - 结果分页展示

#### 2.7.2 联网查询
- **触发条件**：知识库未匹配到相关数据
- **查询方式**：调用百度搜索API
- **处理流程**：
  - 获取前3条搜索结果
  - 大语言模型推理分析
  - 结果整合和格式化
  - 缓存机制优化

### 2.8 数据分析模块

#### 2.8.1 聚类分析
- **分析维度**：
  - 关键词Top10分布
  - 主题聚类分析
  - 时间趋势分析
  - 来源分布统计
- **可视化展示**：
  - 词云图展示
  - 柱状图/饼图
  - 时间线图表
  - 交互式图表

#### 2.8.2 报告生成
- **报告类型**：
  - 关键词分析报告
  - 内容聚类报告
  - 数据统计报告
  - 趋势分析报告
- **导出功能**：
  - PDF格式导出
  - Excel格式导出
  - 图表图片导出
  - 报告模板自定义

## 3. 技术架构

### 3.1 技术栈选型

#### 3.1.1 前端技术
- **框架**：React 18+
- **UI库**：Aceternity UI
- **语言**：TypeScript
- **状态管理**：Redux Toolkit / Zustand
- **路由**：React Router
- **HTTP客户端**：Axios
- **图表库**：Chart.js / D3.js

#### 3.1.2 后端技术
- **框架**：Flask 2.0+
- **语言**：Python 3.8+
- **ORM**：SQLAlchemy
- **API文档**：Flask-RESTX
- **任务队列**：Celery + Redis
- **缓存**：Redis
- **日志**：Loguru

#### 3.1.3 数据库技术
- **关系型数据库**：MySQL 8.0+
- **向量数据库**：FAISS
- **缓存数据库**：Redis
- **搜索引擎**：Elasticsearch（可选）

#### 3.1.4 AI/ML技术
- **大语言模型**：qwen2.5::3b (Ollama)
- **嵌入模型**：all-MiniLM-L6-v2
- **重排模型**：ms-marco-MiniLM-L-6-v2
- **框架**：LangChain
- **向量化**：Sentence Transformers

### 3.2 系统架构设计

#### 3.2.1 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API       │    │   数据存储      │
│   React + TS    │◄──►│   Flask         │◄──►│   MySQL + FAISS │
│   Aceternity UI │    │   LangChain     │    │   Redis         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   AI模型服务    │
                    │   Ollama        │
                    │   Embedding     │
                    └─────────────────┘
```

#### 3.2.2 数据流架构
```
数据源 → 数据采集 → 数据清洗 → 向量化 → 存储 → 检索 → 展示
  ↓         ↓         ↓        ↓      ↓      ↓      ↓
 RSS/网页 → 定时任务 → 预处理 → 嵌入模型 → FAISS → 查询 → 前端
```

### 3.3 核心模块设计

#### 3.3.1 数据采集模块
- **定时任务调度**：Celery Beat
- **数据源适配器**：RSS、网页、API适配器
- **数据清洗**：去重、格式化、标准化
- **异常处理**：重试机制、错误日志

#### 3.3.2 知识库模块
- **文档处理**：分块、向量化、索引
- **检索引擎**：FAISS索引管理
- **元数据管理**：MySQL存储
- **版本控制**：文档版本管理

#### 3.3.3 查询模块
- **查询解析**：自然语言理解
- **向量检索**：相似度计算
- **结果重排**：相关性优化
- **结果整合**：多源结果合并

## 4. 数据模型设计

### 4.1 关系型数据库设计

#### 4.1.1 用户表 (users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 4.1.2 文档表 (documents)
```sql
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL,
    source_type ENUM('rss', 'web', 'upload', 'api') NOT NULL,
    source_url VARCHAR(1000),
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 4.1.3 查询日志表 (query_logs)
```sql
CREATE TABLE query_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    query_text TEXT NOT NULL,
    query_type ENUM('semantic', 'keyword', 'boolean') NOT NULL,
    results_count INT DEFAULT 0,
    response_time DECIMAL(10,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.2 向量数据库设计

#### 4.2.1 FAISS索引结构
- **索引类型**：IndexFlatIP（内积相似度）
- **向量维度**：384（all-MiniLM-L6-v2）
- **索引管理**：增量更新、批量构建
- **持久化**：索引文件存储

#### 4.2.2 向量数据映射
```python
# 向量数据映射关系
{
    "document_id": int,      # 对应MySQL中的文档ID
    "chunk_id": str,         # 文档分块ID
    "vector": np.array,     # 384维向量
    "metadata": dict        # 分块元数据
}
```

## 5. API接口设计

### 5.1 认证接口

#### 5.1.1 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "string",
    "password": "string"
}

Response:
{
    "token": "string",
    "user": {
        "id": int,
        "username": "string",
        "role": "string"
    }
}
```

### 5.2 数据管理接口

#### 5.2.1 文档列表查询
```http
GET /api/documents?page=1&size=20&type=news&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <token>

Response:
{
    "data": [
        {
            "id": int,
            "title": "string",
            "content": "string",
            "source_type": "string",
            "created_at": "string",
            "tags": []
        }
    ],
    "total": int,
    "page": int,
    "size": int
}
```

#### 5.2.2 文档删除
```http
DELETE /api/documents/{id}
Authorization: Bearer <token>

Response:
{
    "success": true,
    "message": "Document deleted successfully"
}
```

### 5.3 查询接口

#### 5.3.1 语义查询
```http
POST /api/query/semantic
Content-Type: application/json
Authorization: Bearer <token>

{
    "query": "string",
    "limit": 10,
    "threshold": 0.7
}

Response:
{
    "results": [
        {
            "document_id": int,
            "title": "string",
            "content": "string",
            "similarity": float,
            "source": "string"
        }
    ],
    "total": int,
    "query_time": float
}
```

### 5.4 分析接口

#### 5.4.1 关键词分析
```http
GET /api/analysis/keywords?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <token>

Response:
{
    "keywords": [
        {
            "word": "string",
            "count": int,
            "frequency": float
        }
    ],
    "total_documents": int
}
```

## 6. 部署方案

### 6.1 环境要求

#### 6.1.1 硬件要求
- **CPU**：8核心以上
- **内存**：32GB以上
- **存储**：500GB以上SSD
- **GPU**：可选，用于加速推理

#### 6.1.2 软件环境
- **操作系统**：Ubuntu 20.04+ / CentOS 8+
- **Python**：3.8+
- **Node.js**：16+
- **MySQL**：8.0+
- **Redis**：6.0+

### 6.2 部署架构

#### 6.2.1 容器化部署
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=mysql://user:pass@mysql:3306/db
      - REDIS_URL=redis://redis:6379
  
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=news_rag
  
  redis:
    image: redis:6.0
  
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
```

#### 6.2.2 服务配置
- **Nginx**：反向代理和负载均衡
- **SSL证书**：HTTPS加密
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack

### 6.3 性能优化

#### 6.3.1 数据库优化
- **索引优化**：关键字段索引
- **查询优化**：SQL语句优化
- **连接池**：数据库连接池配置
- **缓存策略**：Redis缓存热点数据

#### 6.3.2 向量检索优化
- **索引优化**：FAISS索引参数调优
- **批量处理**：批量向量化处理
- **缓存机制**：查询结果缓存
- **异步处理**：异步任务处理

## 7. 安全方案

### 7.1 认证安全
- **JWT Token**：安全的Token机制
- **密码加密**：bcrypt加密存储
- **会话管理**：Token过期和刷新
- **多因素认证**：可选的双因素认证

### 7.2 数据安全
- **数据加密**：敏感数据加密存储
- **访问控制**：基于角色的权限控制
- **审计日志**：操作日志记录
- **数据备份**：定期数据备份

### 7.3 网络安全
- **HTTPS**：SSL/TLS加密传输
- **防火墙**：网络访问控制
- **API限流**：防止API滥用
- **输入验证**：防止注入攻击

## 8. 测试方案

### 8.1 单元测试
- **覆盖率要求**：代码覆盖率≥80%
- **测试框架**：pytest (Python) / Jest (JavaScript)
- **测试数据**：Mock数据和测试用例
- **自动化**：CI/CD集成测试

### 8.2 集成测试
- **API测试**：接口功能测试
- **数据库测试**：数据一致性测试
- **性能测试**：负载和压力测试
- **安全测试**：安全漏洞扫描

### 8.3 用户测试
- **功能测试**：核心功能验证
- **用户体验**：界面和交互测试
- **兼容性**：浏览器兼容性测试
- **性能测试**：响应时间和并发测试

## 9. 运维方案

### 9.1 监控告警
- **系统监控**：CPU、内存、磁盘使用率
- **应用监控**：API响应时间、错误率
- **业务监控**：用户活跃度、查询量
- **告警机制**：邮件、短信、钉钉通知

### 9.2 日志管理
- **日志收集**：集中化日志收集
- **日志分析**：ELK Stack分析
- **日志存储**：日志轮转和归档
- **日志查询**：快速日志检索

### 9.3 备份恢复
- **数据备份**：数据库定期备份
- **配置备份**：系统配置备份
- **恢复测试**：定期恢复演练
- **灾难恢复**：异地备份方案

## 10. 项目计划

### 10.1 开发阶段

#### 第一阶段（4周）：基础架构搭建
- 项目初始化和环境搭建
- 数据库设计和基础API开发
- 用户认证和权限管理
- 基础前端框架搭建

#### 第二阶段（4周）：核心功能开发
- 数据采集模块开发
- 知识库系统构建
- 向量检索功能实现
- 基础查询功能开发

#### 第三阶段（3周）：高级功能开发
- 智能查询优化
- 数据分析功能
- 用户界面完善
- 系统集成测试

#### 第四阶段（2周）：测试和部署
- 全面功能测试
- 性能优化
- 部署和上线
- 用户培训和文档

### 10.2 里程碑计划
- **Week 4**：基础架构完成
- **Week 8**：核心功能完成
- **Week 11**：高级功能完成
- **Week 13**：系统上线

## 11. 风险评估

### 11.1 技术风险
- **模型性能**：大模型推理性能不足
- **数据质量**：数据源质量不稳定
- **系统稳定性**：高并发下的系统稳定性
- **技术选型**：技术栈兼容性问题

### 11.2 业务风险
- **用户需求**：需求变更频繁
- **数据安全**：数据泄露风险
- **性能要求**：系统性能不达标
- **用户体验**：界面和交互体验不佳

### 11.3 风险应对
- **技术预研**：关键技术提前验证
- **原型开发**：核心功能原型验证
- **分阶段交付**：降低项目风险
- **持续测试**：全流程质量保证

## 12. 成功标准

### 12.1 功能指标
- **数据采集**：支持5+数据源，日采集量1000+条
- **查询性能**：查询响应时间<2秒
- **准确率**：语义查询准确率>85%
- **可用性**：系统可用性>99%

### 12.2 性能指标
- **并发用户**：支持100+并发用户
- **数据容量**：支持100万+文档存储
- **查询吞吐**：支持1000+次/分钟查询
- **响应时间**：API响应时间<500ms

### 12.3 用户体验指标
- **界面友好**：直观易用的用户界面
- **操作便捷**：核心功能3步内完成
- **响应及时**：用户操作即时反馈
- **稳定可靠**：系统运行稳定无故障

---

**文档版本**：v1.0  
**创建日期**：2024年12月  
**最后更新**：2024年12月  
**文档状态**：待审核
