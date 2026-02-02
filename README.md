# LLM Council Plus

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

前端默认访问地址：http://localhost:5173

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
