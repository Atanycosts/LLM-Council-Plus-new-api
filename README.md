# LLM-Council-Plus-new-api

来源：基于 [![Upstream](https://img.shields.io/badge/Upstream-llm--council--plus-2f80ed?style=flat-square)](https://github.com/DmitryBMsk/llm-council-plus) 修改而来。

![llmcouncil](header.jpg)

## 功能

这个仓库的理念是，与其向您常用的逻辑模型提供商（例如 OpenAI GPT 5.1、Google Gemini 3.0 Pro、Anthropic Claude Sonnet 4.5、xAI Grok 4 等）提问，不如将它们组合成一个“逻辑模型委员会”。这是一个容器化的 Web 应用，带有设置向导，引导您完成配置。它使用 OpenRouter 将您的查询发送给多个逻辑模型，要求它们互相审查和排名，最终由主席逻辑模型生成最终答案。

具体来说，提交查询后会发生什么：

1. **第一阶段：初步意见收集**。用户查询将分别发送给所有LLM（语言学习硕士），并收集他们的回复。所有回复将以“标签页视图”的形式显示，以便用户可以逐一查看。
2. **第二阶段：审核**。每位LLM都会收到其他LLM的反馈。为了避免LLM在评判其他LLM的输出时出现偏袒，系统会对LLM的身份进行匿名化处理。LLM需要根据准确性和洞察力对这些反馈进行排名。
3. **第三阶段：最终答复**。LLM委员会的指定主席收集模型的所有答复，并将它们汇总成一个最终答案，提交给用户。

## Plus 做的差异

| 功能 | 原版 | 本仓库（LLM-Council-Plus-new-api） |
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
