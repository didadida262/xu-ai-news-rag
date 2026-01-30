# 模型预下载指南

## 问题说明

项目使用的 `sentence-transformers/all-MiniLM-L6-v2` 模型首次使用时需要从 Hugging Face 下载（约80MB），如果网络较慢或无法访问，会导致超时错误。

## 解决方案：预先下载模型到本地

### 方法一：使用下载脚本（推荐）

#### 使用镜像源下载（推荐，解决网络问题）

1. **使用镜像源脚本（最简单）**：
   ```bash
   cd backend
   ./download_model_mirror.sh
   ```

2. **或手动设置镜像源环境变量**：
   ```bash
   cd backend
   export HF_ENDPOINT=https://hf-mirror.com
   python download_model.py
   ```

3. **直接运行（会自动使用镜像源）**：
   ```bash
   cd backend
   python download_model.py
   ```

4. **指定模型目录**：
   ```bash
   python download_model.py --model-dir ./models
   ```

3. **配置环境变量**：
   在 `backend/.env` 文件中添加：
   ```env
   EMBEDDING_MODEL_PATH=./models/sentence-transformers_all-MiniLM-L6-v2
   ```

### 方法二：手动下载

1. **使用 Python 交互式下载**：
   ```python
   from sentence_transformers import SentenceTransformer
   
   # 下载模型
   model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
   
   # 保存到本地
   model.save('./models/sentence-transformers_all-MiniLM-L6-v2')
   ```

2. **配置环境变量**（同上）

### 方法三：使用 Hugging Face CLI

```bash
# 安装 huggingface_hub
pip install huggingface_hub

# 下载模型
huggingface-cli download sentence-transformers/all-MiniLM-L6-v2 --local-dir ./models/sentence-transformers_all-MiniLM-L6-v2
```

## 配置说明

### 环境变量

- `EMBEDDING_MODEL_PATH`: 本地模型路径（绝对路径或相对路径）
- `EMBEDDING_MODEL`: 模型名称（如果未设置 `EMBEDDING_MODEL_PATH`，将使用此名称从 Hugging Face 下载）

### 优先级

1. 如果设置了 `EMBEDDING_MODEL_PATH` 且路径存在，使用本地模型
2. 否则使用 `EMBEDDING_MODEL` 指定的模型名称（从 Hugging Face 下载）

## 验证

下载完成后，重启后端服务，查看日志应该显示：
```
从本地路径加载模型: ./models/sentence-transformers_all-MiniLM-L6-v2
✅ 本地模型加载成功
```

## 注意事项

1. 模型文件大小约 80MB，确保有足够的磁盘空间
2. 下载时间取决于网络速度，通常需要 1-5 分钟
3. 如果使用镜像源，可以设置环境变量：
   ```bash
   export HF_ENDPOINT=https://hf-mirror.com
   ```

## 故障排查

### 问题：下载失败

**原因**：网络无法访问 Hugging Face

**解决方案**：
1. 使用镜像源（见上方）
2. 使用代理
3. 手动下载模型文件并放置到指定目录

### 问题：模型路径找不到

**原因**：路径配置错误

**解决方案**：
1. 检查路径是否正确（使用绝对路径更可靠）
2. 确保模型目录包含 `config.json` 文件
3. 检查文件权限

### 问题：仍然从网络下载

**原因**：环境变量未正确加载

**解决方案**：
1. 确认 `.env` 文件在 `backend/` 目录下
2. 重启后端服务
3. 检查日志确认配置是否加载
