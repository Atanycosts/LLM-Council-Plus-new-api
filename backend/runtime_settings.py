"""Runtime (non-secret) settings persisted to disk.

This module stores editable prompt templates, per-stage temperatures, and other non-secret runtime options.

Design goals:
- Safe to persist inside Docker volumes (`data/`).
- No API keys or secrets stored here.
- Backwards compatible: missing file -> defaults.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


SETTINGS_FILE = Path(
    os.getenv(
        "RUNTIME_SETTINGS_FILE",
        str(Path(__file__).parent.parent / "data" / "runtime_settings.json"),
    )
)


DEFAULT_STAGE1_PROMPT_TEMPLATE = "{full_query}"

DEFAULT_STAGE2_PROMPT_TEMPLATE = """你正在评估以下问题的不同回答：

问题：{user_query}

以下是不同模型的回答（已匿名）：

{responses_text}

你的任务：
1. 先分别评估每个回答，说明其做得好的地方与不足之处。
2. 最后在回答末尾给出最终排序。

重要：最终排序必须严格采用如下格式：
- 以 "FINAL RANKING:" 开头（全大写，带冒号）
- 按从好到差列出编号
- 每行格式：数字 + 点 + 空格 + 仅包含响应标签（例如 "1. Response A"）
- 排序部分不要添加任何其他文字或解释

完整示例（包含评审与排序）：

Response A 在 X 上细节充分，但遗漏了 Y...
Response B 准确，但对 Z 的深度不够...
Response C 提供了最全面的答案...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

现在请给出你的评估与排序："""


DEFAULT_STAGE3_PROMPT_TEMPLATE = """你是 LLM 委员会主席。多个 AI 模型已经针对用户问题给出回答，并对彼此的回答进行了排序。

原始问题：{user_query}

阶段 1 - 模型回答：
{stage1_text}

{rankings_block}{tools_text}

你的任务是将上述信息综合为一份完整、准确的最终答复。请考虑：
- 各模型回答的观点与细节
- 互评排序所反映的质量差异（若有）
- 一致或分歧之处

请输出清晰、条理化的最终答复，代表委员会的综合结论："""


class RuntimeSettings(BaseModel):
    """Non-secret runtime settings that users can edit in-app."""

    stage1_prompt_template: str = Field(default=DEFAULT_STAGE1_PROMPT_TEMPLATE)
    stage2_prompt_template: str = Field(default=DEFAULT_STAGE2_PROMPT_TEMPLATE)
    stage3_prompt_template: str = Field(default=DEFAULT_STAGE3_PROMPT_TEMPLATE)

    council_temperature: float = Field(default=0.5, ge=0.0, le=2.0)
    stage2_temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    chairman_temperature: float = Field(default=0.4, ge=0.0, le=2.0)

    # Web search (non-secret). API keys stay in env / setup wizard.
    web_search_provider: str = Field(default="duckduckgo")  # off | duckduckgo | tavily | exa | brave
    web_max_results: int = Field(default=5, ge=1, le=10)
    web_full_content_results: int = Field(default=0, ge=0, le=10)  # Jina Reader fetches for top N


def default_runtime_settings() -> RuntimeSettings:
    return RuntimeSettings()


def _read_json_file(path: Path) -> Optional[dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # pragma: no cover
        logger.warning("Failed reading runtime settings file %s: %s", path, e)
        return None


def _atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp_path, path)


def get_runtime_settings() -> RuntimeSettings:
    """Load runtime settings from disk, returning defaults if missing/invalid."""
    raw = _read_json_file(SETTINGS_FILE)
    if not raw:
        return default_runtime_settings()
    try:
        return RuntimeSettings(**raw)
    except Exception as e:  # pragma: no cover
        logger.warning("Invalid runtime settings in %s, using defaults: %s", SETTINGS_FILE, e)
        return default_runtime_settings()


def save_runtime_settings(settings: RuntimeSettings) -> None:
    _atomic_write_json(SETTINGS_FILE, settings.model_dump())


def update_runtime_settings(**patch: Any) -> RuntimeSettings:
    """Apply a partial update and persist."""
    current = get_runtime_settings()
    merged = {**current.model_dump(), **patch}
    updated = RuntimeSettings(**merged)
    save_runtime_settings(updated)
    return updated


def reset_runtime_settings() -> RuntimeSettings:
    """Reset persisted settings back to defaults."""
    settings = default_runtime_settings()
    save_runtime_settings(settings)
    return settings
