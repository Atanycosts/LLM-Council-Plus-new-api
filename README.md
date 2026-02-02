# LLM Council Plus

![llmcouncil](header.jpg)

> **灵感来源：[Andrej Karpathy 的 LLM Council](https://github.com/karpathy/llm-council)** - 可参考其关于该概念的 [原始推文](https://x.com/karpathy/status/1992381094667411768)。

本项目将多个 LLM 组织为“委员会”，用于对同一问题进行多模型回答、互评与综合。它是一个容器化的 Web 应用，内置初始化向导用于配置，并通过 OpenAI 兼容 new-api 发送请求到多个模型。随后各模型对彼此的回答进行排序，最终由主席模型给出综合答复。

当你提交问题时，流程如下：

1. **阶段 1：模型回答**。将问题分别发送给多个模型，收集每个模型的回答，并以标签页形式展示。
2. **阶段 2：互评排序**。每个模型基于其他模型的回答进行评审与排序；评审时使用匿名标签以避免偏好。
3. **阶段 3：最终综合**。主席模型综合所有回答与互评结果，输出最终答复。

## 上游仓库与本仓库改动

- 上游仓库（原地址）：https://github.com/DmitryBMsk/llm-council-plus
- 本仓库基于上游仓库，主要调整：
  - 仅保留 OpenAI 兼容 new-api 接入，统一以 API 地址 + Key 进行配置
  - 初始化向导新增 API 地址输入；模型列表自动尝试 `/v1/models` 与 `/api/v1/models`，失败回退 `.env` 配置
  - 前端与文档中文化、提示口径统一；缺少配置时给出明确指引
  - 修复前端 hooks 依赖 lint 警告

## 与原版的差异

该分支在原版基础上补齐了更完整的生产级功能：

| 功能 | 原版 | LLM Council Plus |
|------|------|------------------|
| **部署** | 手动 Python/npm 配置 | Docker Compose（一键启动） |
| **配置** | 手动修改 config.py | 初始化向导可视化配置 |
| **模型** | 固定 4 个模型 | 基于 New API 返回的模型目录 |
| **本地模型** | 不支持 | 暂不支持 |
| **认证** | 不支持 | 支持 JWT 多用户认证 |
| **存储** | 仅 JSON 文件 | JSON / PostgreSQL / MySQL |
| **Token 优化** | 不支持 | 支持 TOON 格式（节省 20-60%） |
| **网页搜索** | 不支持 | DuckDuckGo + Tavily + Exa + Brave |
| **文件附件** | 不支持 | PDF / TXT / MD / 图片 |
| **工具** | 不支持 | 计算器、Wikipedia、ArXiv、Yahoo Finance |
| **实时流式** | 基础 | SSE + 心跳 + 状态持久化 |
| **错误处理** | 静默失败 | Toast 提示 + 可视化状态 |
| **热更新** | 不支持 | 配置变更无需重启 |
| **对话搜索** | 不支持 | 标题过滤 + 相对时间 |
| **阶段超时** | 不支持 | 90 秒阶段级超时（优先完成） |

### 近期更新（v1.3.1）

| 新功能 | 说明 | 位置 |
|---|---|---|
| **模型来源** | 固定为 **New API（OpenAI 兼容）** | 模型选择器 |
| **模型预设 + 委员会规模** | 内置预设 + 自定义预设，委员会规模可配置，支持“随机推荐” | 模型选择器 |
| **运行时设置** | 编辑提示词与温度；支持 **保存 / 重置 / 导出 / 导入**（不含密钥） | 设置 → 提示词/温度/备份 |
| **停止/中止流式** | 可安全中止请求（前端中止 + 后端任务取消） | 输入区“停止”按钮 |
| **搜索提供方选择** | DuckDuckGo（免费）+ Tavily + Exa + Brave，按消息选择 | 输入区搜索选择 |
| **全文抓取（可选）** | 使用 Jina Reader 抓取 Top-N 页面，提高上下文质量 | 设置 → 网页搜索 |
| **搜索上下文面板** | 结果紧凑展示（标题+域名），支持展开查看内容 | 助手消息区域 |
| **UI 细节优化** | 下拉菜单样式、侧边栏操作、输入区布局优化 | 全局 UI |

### 近期更新（v1.3.0）

- **对话搜索**：按标题实时过滤
- **相对时间**：侧边栏显示“今天 14:30 / 昨天 / 周一 / 1 月 2 日”等
- **阶段超时**：阶段 2/3 在 90 秒后基于已完成结果继续
- **Toast 提示**：模型超时与错误的可视化提示
- **错误处理改进**：模型失败时保持流程可用

## 快速开始

**推荐方式：使用初始化向导**
```bash
cp .env.example .env
docker compose up --build
# 打开 http://localhost:8088
# 初始化向导将引导你完成配置
```

初始化向导支持：
- 配置 API 地址与 Key（OpenAI 兼容 new-api）
- 可选开启认证
- 可选配置网页搜索（Tavily / Exa / Brave）

**备用方式：手动配置**
```bash
cp .env.example .env
# 编辑 .env（示例如下）
docker compose up --build
# 打开 http://localhost:8088
```

> **注意**：默认关闭认证以降低配置门槛。如需多用户认证，请参考 [SECURITY.md](SECURITY.md)。

## 维护说明

本项目以工程实践为目标，按现状提供。你可以基于此仓库按需扩展与定制功能。

## 详细配置

### 1. 安装依赖

项目使用 [uv](https://docs.astral.sh/uv/) 进行 Python 依赖管理。

**后端：**
```bash
uv sync
```

**前端：**
```bash
cd frontend
npm install
cd ..
```

### 2. 配置 API 地址与 Key

在项目根目录创建 `.env`：

```bash
OPENROUTER_API_URL=http://host:3000/v1/chat/completions
OPENROUTER_API_KEY=sk-...
```

API 地址需为 OpenAI 兼容的 `chat/completions` 端点。
模型列表默认从 `/v1/models` 拉取；若端点不支持，可在 `.env` 中配置 `COUNCIL_MODELS` 与 `CHAIRMAN_MODEL` 作为回退。

## 运行方式

### Docker（推荐）

```bash
# 启动服务
docker compose up --build

# 访问应用：http://localhost:8088
```

后端 API：`http://localhost:8001`

### 开发模式（不使用 Docker）

终端 1（后端）：
```bash
uv run python -m backend.main
```

终端 2（前端）：
```bash
cd frontend
npm run dev
```

打开 `http://localhost:5173`。

## 常用配置

### New API（OpenAI 兼容）
```bash
ROUTER_TYPE=openrouter
OPENROUTER_API_URL=http://host:3000/v1/chat/completions
OPENROUTER_API_KEY=sk-...
```

## 网页搜索（可选）

前端可在阶段 1 将搜索结果作为上下文。你可以按消息选择搜索提供方，或在设置中指定默认值。

支持的提供方：
- **DuckDuckGo（免费）**：默认可用，无需 API Key
- **Tavily / Exa / Brave**：需配置 API Key

启用示例：
```bash
ENABLE_TAVILY=true
TAVILY_API_KEY=tvly-...
```
或：
```bash
ENABLE_EXA=true
EXA_API_KEY=...
```
或：
```bash
ENABLE_BRAVE=true
BRAVE_API_KEY=...
```

## 存储

默认使用本地 JSON 文件（`data/conversations/`）。

如需数据库存储，可使用：
```bash
DATABASE_TYPE=postgresql
# 或
DATABASE_TYPE=mysql
```

## 技术栈

- **后端：** FastAPI（Python 3.10+）、async httpx、OpenAI 兼容 API
- **前端：** React + Vite、react-markdown
- **存储：** JSON（默认，可选数据库）
- **依赖管理：** Python 使用 uv，前端使用 npm

## 贡献

开发规范与流程请参考 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

安全注意事项与漏洞报告请参考 [SECURITY.md](SECURITY.md)。

## 许可

MIT License，详见 [LICENSE](LICENSE)。
