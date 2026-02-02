# 如何运行 LLM Council

本指南用于快速在本地运行 LLM Council。

---

## 前置条件

### 必需：
- **Python 3.10+**（[下载](https://python.org)）
- **Node.js 18+**（[下载](https://nodejs.org)）
- **uv** - Python 包管理器（[安装](https://docs.astral.sh/uv/)）

### 可选（数据库）：
- **PostgreSQL 12+**（使用 PostgreSQL 存储时）
- **MySQL 8+**（使用 MySQL 存储时）

---

## 快速开始（约 5 分钟）

### 1. 准备 New API 地址与 Key
- 准备 OpenAI 兼容的 API 地址（`chat/completions` 端点）
- 准备对应的 API Key

### 2. 克隆并安装依赖
```bash
# 克隆仓库
git clone <your-repo-url>
cd llm-council

# 安装后端依赖
uv sync

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 3. 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 并填写 API 地址与 Key
nano .env  # 或使用任意文本编辑器
```

**.env 中必填：**
```bash
OPENROUTER_API_URL=http://host:3000/v1/chat/completions
OPENROUTER_API_KEY=sk-your-key-here
```

### 4. 启动服务

**方案 A：两个终端（推荐）**

终端 1（后端）：
```bash
uv run python -m backend.main
```

终端 2（前端）：
```bash
cd frontend
npm run dev
```

**方案 B：后台进程**
```bash
# 后端后台启动
uv run python -m backend.main &

# 启动前端
cd frontend
npm run dev
```

### 5. 打开应用
- 开发模式访问：**http://localhost:5173**
- Docker 模式访问：**http://localhost:8088**

---

## 配置选项

### 存储方式

**JSON（默认，零配置）：**
```bash
DATABASE_TYPE=json
```

**PostgreSQL：**
```bash
DATABASE_TYPE=postgresql
POSTGRESQL_URL=postgresql+psycopg2://user:password@localhost:5432/llmcouncil
```

**MySQL：**
```bash
DATABASE_TYPE=mysql
MYSQL_URL=mysql+pymysql://user:password@localhost:3306/llmcouncil
```

### 功能开关

**功能 4：工具与记忆系统**
```bash
# 免费工具默认启用
#（计算器、Wikipedia、ArXiv、DuckDuckGo、Yahoo Finance）

# 可选：付费搜索工具
ENABLE_TAVILY=false
TAVILY_API_KEY=

# 记忆系统（本地向量）
ENABLE_MEMORY=true

# 可选：更高质量 Embeddings
ENABLE_OPENAI_EMBEDDINGS=false
OPENAI_API_KEY=

# 高级：LangGraph 工作流
ENABLE_LANGGRAPH=false
```

---

## 详细配置

### 数据库（可选）

若使用 PostgreSQL 或 MySQL：

**PostgreSQL：**
```bash
# 安装 PostgreSQL
brew install postgresql  # macOS
# 或 apt-get install postgresql  # Linux

# 启动 PostgreSQL
brew services start postgresql

# 创建数据库
createdb llmcouncil

# 更新 .env
DATABASE_TYPE=postgresql
POSTGRESQL_URL=postgresql+psycopg2://your_user:your_password@localhost:5432/llmcouncil
```

**MySQL：**
```bash
# 安装 MySQL
brew install mysql  # macOS
# 或 apt-get install mysql-server  # Linux

# 启动 MySQL
brew services start mysql

# 创建数据库
mysql -u root -p
CREATE DATABASE llmcouncil;
exit;

# 更新 .env
DATABASE_TYPE=mysql
MYSQL_URL=mysql+pymysql://root:your_password@localhost:3306/llmcouncil
```

**自动初始化：**
- 首次运行会自动创建表
- 无需手动建表

---

## 开发模式

### 后端开发
```bash
# 启用热更新
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8001
```

### 前端开发
```bash
cd frontend
npm run dev
```

### 查看日志
```bash
# 后端日志
uv run python -m backend.main 2>&1 | tee backend.log

# 实时查看
tail -f backend.log
```

---

## 测试

### 测试后端 API
```bash
# 健康检查
curl http://localhost:8001/

# 列出对话
curl http://localhost:8001/api/conversations

# 创建对话
curl -X POST http://localhost:8001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 测试前端
1. 打开 http://localhost:5173
2. 点击“新建对话”
3. 输入问题
4. 观察三阶段流程
5. 查看最终答复

### 测试功能

**删除：**
1. 鼠标悬停对话 → 点击菜单
2. 选择“删除”
3. 确认

**编辑标题：**
1. 鼠标悬停对话 → 点击菜单
2. 选择“编辑标题”
3. 输入新标题并回车

**工具调用：**
- 提问：“AAPL 股价是多少？”
- 提问：“计算 12345 * 67890”
- 提问：“搜索最新 AI 新闻”

---

## 故障排查

### 端口被占用
```bash
# 结束占用 8001 端口的进程（后端）
lsof -ti:8001 | xargs kill -9

# 结束占用 5173 端口的进程（前端）
lsof -ti:5173 | xargs kill -9
```

### 后端无法启动
```bash
# 检查 Python 版本
python --version  # 必须 >= 3.10

# 重新安装依赖
rm -rf .venv
uv sync
```

### 前端无法启动
```bash
# 检查 Node 版本
node --version  # 必须 >= 18

# 重新安装依赖
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接错误
```bash
# 检查数据库是否运行
psql -l  # PostgreSQL
mysql -u root -p  # MySQL

# 校验 .env 连接串
# 格式: protocol://user:password@host:port/database
```

### API Key 问题
```bash
# 检查 .env
cat .env | grep OPENROUTER_API_

# 手动验证 API Key（示例）
curl http://host:3000/v1/models \
  -H "Authorization: Bearer YOUR_KEY_HERE"
```

### 记忆/工具不可用
```bash
# 检查依赖安装情况
uv pip list | grep -E "langchain|chromadb|sentence-transformers"

# 缺失则重新安装
uv sync
```

---

## 生产部署

### 环境变量示例
```bash
# 使用生产 API Key 与地址
OPENROUTER_API_URL=http://host:3000/v1/chat/completions
OPENROUTER_API_KEY=your-production-key

# 启用数据库
DATABASE_TYPE=postgresql
POSTGRESQL_URL=your-production-db-url

# 安全配置
SECRET_KEY=your-secret-key  # 如需自定义认证
```

### 构建前端
```bash
cd frontend
npm run build
```

### 运行后端
```bash
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

### 前端静态服务
```bash
# 方案 1：Nginx
# 配置 Nginx 指向 frontend/dist

# 方案 2：Node 静态服务
npm install -g serve
serve -s frontend/dist -l 5173
```

---

## Docker 部署（可选）

### 后端 Dockerfile
```dockerfile
FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install uv && uv sync
CMD ["uv", "run", "python", "-m", "backend.main"]
EXPOSE 8001
```

### 前端 Dockerfile
```dockerfile
FROM node:18
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build
CMD ["npm", "run", "preview"]
EXPOSE 5173
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8001:8001"
    env_file:
      - .env
    depends_on:
      - db

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: llmcouncil
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

运行：
```bash
docker-compose up -d
```

---

## 性能建议

### 后端：
- 使用 PostgreSQL/MySQL 替代 JSON
- 启用数据库连接池
- 视需要启用缓存（可选）
- 不使用记忆功能可设置 `ENABLE_MEMORY=false`

### 前端：
- 生产环境使用 `npm run build`
- 启用 gzip 压缩
- 静态资源可接入 CDN
- 可逐步引入懒加载优化

---

## 监控

### 系统状态
```bash
# 后端健康检查
curl http://localhost:8001/

# 数据库连接
# PostgreSQL: SELECT * FROM pg_stat_activity;
# MySQL: SHOW PROCESSLIST;
```

### 存储信息
```bash
# JSON 模式
ls -lh data/conversations/

# 数据库模式
# 使用 psql/mysql 客户端查看
```

### API 使用监控
- 在你的 API 平台控制台查看用量
- 监控 Token 消耗
- 跟踪 TOON 节省比例

---

## 常用命令汇总

```bash
uv sync                                    # 安装后端依赖
cd frontend && npm install && cd ..        # 安装前端依赖
cp .env.example .env                       # 生成配置文件
# 编辑 .env 并填写 OPENROUTER_API_URL / OPENROUTER_API_KEY
uv run python -m backend.main &            # 启动后端
cd frontend && npm run dev                 # 启动前端（开发模式）
```

访问地址：**http://localhost:5173**

---

## 系统要求

**最低配置：**
- 2 核 CPU
- 4GB 内存
- 2GB 磁盘

**推荐配置：**
- 4 核以上 CPU
- 8GB 以上内存
- 10GB 磁盘（数据库模式）

**平台：**
- macOS / Linux / Windows（WSL2）
- Docker（可选）
