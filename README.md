# LLM Council Plus

来源：基于 https://github.com/DmitryBMsk/llm-council-plus 修改而来。

![llmcouncil](header.jpg)

## 功能

- 三阶段流程：阶段 1 并行收集多模型回答；阶段 2 互评排序（匿名避免偏好）；阶段 3 主席综合输出最终答复。
- 容器化 Web 应用 + 初始化向导，便于本地运行与配置。

## Plus 做的差异

| 功能 | 原版 | 本仓库（LLM Council Plus） |
| --- | --- | --- |
| 部署 | 手动 Python/npm 配置 | Docker Compose（一键启动） |
| 配置 | 手动编辑 config.py | 初始化向导可视化配置 |
| 模型 | 4 个硬编码模型 | OpenAI 兼容 New API 模型目录 |
| 本地模型 | ❌ | ❌ |
| 认证 | ❌ | ✅ JWT 多用户认证 |
| 存储 | 仅 JSON 文件 | JSON / PostgreSQL / MySQL |
| Token 优化 | ❌ | ✅ TOON 格式（20-60% 节省） |
| 网页搜索 | ❌ | ✅ DuckDuckGo + Tavily + Exa + Brave |
| 文件附件 | ❌ | ✅ PDF / TXT / MD / 图片 |
| 工具 | ❌ | ✅ 计算器 / Wikipedia / ArXiv / Yahoo Finance |
| 实时流式 | 基础 | SSE + 心跳 + 状态持久化 |
| 错误处理 | 静默失败 | Toast 提示 + 可视化状态 |
| 热更新 | ❌ | ✅ 配置变更无需重启 |
| 对话搜索 | ❌ | ✅ 按标题过滤 + 相对时间 |
| 阶段超时 | ❌ | ✅ 90s 阶段级超时（优先完成） |

## 运行

### Docker（推荐）
```bash
cp .env.example .env
# 编辑 .env，配置如下：
# OPENROUTER_API_URL=http://host:3000/v1/chat/completions
# OPENROUTER_API_KEY=sk-...
docker compose up --build
```

- 前端：http://localhost:8088
- 后端：http://localhost:8001

> API 地址需为 OpenAI 兼容的 `chat/completions` 端点。模型列表默认从 `/v1/models` 获取，若端点不支持，可在 `.env` 中配置 `COUNCIL_MODELS` 与 `CHAIRMAN_MODEL` 作为回退。

### 开发模式（不使用 Docker）
```bash
uv run python -m backend.main
```

```bash
cd frontend
npm run dev
```

前端默认访问地址：http://localhost:8088

## 技术栈

- 后端：FastAPI（Python 3.10+）、httpx
- 前端：React + Vite
- 存储：JSON（默认），可选 PostgreSQL / MySQL
- 运行方式：Docker Compose / 本地开发

## 贡献

请参考 `CONTRIBUTING.md`。

## 安全

- 请勿提交真实 API Key 或敏感配置到仓库
- 使用 `.env` 管理本地配置

## 许可

MIT License，详见 `LICENSE`。
