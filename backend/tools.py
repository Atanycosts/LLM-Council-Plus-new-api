"""LangChain tool integrations with flag-based enablement.

Implements a small set of always-free tools plus optional paid search (Tavily).
Use `get_available_tools()` to fetch the enabled tools list based on environment flags.
"""

from __future__ import annotations

import os
import logging
from typing import List

logger = logging.getLogger(__name__)

# Tool import: prefer langchain_core, fall back to langchain.tools for older installs
try:
    from langchain_core.tools import Tool  # type: ignore
except ImportError:  # pragma: no cover
    from langchain.tools import Tool  # type: ignore

# Optional: langchain_community (tools)
try:  # pragma: no cover
    from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun, ArxivQueryRun
    from langchain_community.utilities import WikipediaAPIWrapper
except ImportError:  # pragma: no cover
    DuckDuckGoSearchRun = None
    WikipediaQueryRun = None
    ArxivQueryRun = None
    WikipediaAPIWrapper = None

# Optional: yfinance (used by stock tool)
try:  # pragma: no cover
    import yfinance as yf
except ImportError:  # pragma: no cover
    yf = None

# Note: PythonREPLTool removed for security - using safe AST-based calculator instead

# Optional: Tavily (paid, flag + key)
try:
    from langchain_community.tools.tavily_search import TavilySearchResults
except Exception:  # pragma: no cover
    TavilySearchResults = None

# Optional: Exa (paid, flag + key)
try:
    from exa_py import Exa
except Exception:  # pragma: no cover
    Exa = None


def calculator_tool() -> Tool:
    """
    Safe calculator tool using AST-based evaluation.

    Only allows mathematical expressions - no arbitrary code execution.
    Supports: +, -, *, /, **, //, %, parentheses, and math module functions.
    """
    import ast
    import math
    import operator

    # Allowed binary operators
    _OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    # Allowed math functions (safe subset)
    _MATH_FUNCS = {
        'abs': abs,
        'round': round,
        'min': min,
        'max': max,
        'sum': sum,
        'len': len,
        'sqrt': math.sqrt,
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'log': math.log,
        'log10': math.log10,
        'exp': math.exp,
        'floor': math.floor,
        'ceil': math.ceil,
        'pi': math.pi,
        'e': math.e,
    }

    def _safe_eval_node(node):
        """Recursively evaluate an AST node safely."""
        if isinstance(node, ast.Constant):  # Python 3.8+
            if isinstance(node.value, (int, float, complex)):
                return node.value
            raise ValueError(f"不支持的常量类型: {type(node.value)}")

        elif isinstance(node, ast.Num):  # Python 3.7 compatibility
            return node.n

        elif isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in _OPERATORS:
                raise ValueError(f"不支持的运算符: {op_type.__name__}")
            left = _safe_eval_node(node.left)
            right = _safe_eval_node(node.right)
            return _OPERATORS[op_type](left, right)

        elif isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in _OPERATORS:
                raise ValueError(f"不支持的一元运算符: {op_type.__name__}")
            operand = _safe_eval_node(node.operand)
            return _OPERATORS[op_type](operand)

        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
                if func_name not in _MATH_FUNCS:
                    raise ValueError(f"不支持的函数: {func_name}")
                func = _MATH_FUNCS[func_name]
                args = [_safe_eval_node(arg) for arg in node.args]
                return func(*args)
            raise ValueError("仅支持直接函数调用")

        elif isinstance(node, ast.Name):
            # Allow math constants
            if node.id in _MATH_FUNCS:
                val = _MATH_FUNCS[node.id]
                if isinstance(val, (int, float)):
                    return val
            raise ValueError(f"不支持的变量: {node.id}")

        elif isinstance(node, ast.List):
            return [_safe_eval_node(elem) for elem in node.elts]

        elif isinstance(node, ast.Tuple):
            return tuple(_safe_eval_node(elem) for elem in node.elts)

        elif isinstance(node, ast.Expression):
            return _safe_eval_node(node.body)

        else:
            raise ValueError(f"不支持的表达式类型: {type(node).__name__}")

    def safe_calculate(expr: str) -> str:
        """Safely evaluate a mathematical expression."""
        try:
            # Parse expression into AST
            tree = ast.parse(expr.strip(), mode='eval')
            # Evaluate AST safely
            result = _safe_eval_node(tree)
            return str(result)
        except SyntaxError as e:
            return f"语法错误: {e}"
        except ValueError as e:
            return f"错误: {e}"
        except ZeroDivisionError:
            return "错误: 除零"
        except Exception as e:
            return f"错误: {e}"

    return Tool(
        name="calculator",
        func=safe_calculate,
        description="安全的数学计算器（例如 '2+2'、'sqrt(16)'、'sum([1,2,3])'）。",
    )


def wikipedia_tool() -> Tool:
    """Wikipedia lookup (free)."""
    if WikipediaQueryRun is None or WikipediaAPIWrapper is None:  # pragma: no cover
        logger.warning("Wikipedia tool unavailable: missing langchain_community")
        return None
    wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())
    return Tool(
        name="wikipedia",
        func=wikipedia.run,
        description="在 Wikipedia 中检索事实信息（例如 'Python 编程简介'）。",
    )


def arxiv_tool() -> Tool:
    """ArXiv search (free)."""
    if ArxivQueryRun is None:  # pragma: no cover
        logger.warning("ArXiv tool unavailable: missing langchain_community")
        return None
    arxiv = ArxivQueryRun()
    return Tool(
        name="arxiv",
        func=arxiv.run,
        description="在 ArXiv 中检索论文（例如 '大型语言模型 论文'）。",
    )


def duckduckgo_tool() -> Tool:
    """DuckDuckGo web search (free)."""
    if DuckDuckGoSearchRun is None:  # pragma: no cover
        logger.warning("DuckDuckGo tool unavailable: missing langchain_community")
        return None

    # DuckDuckGoSearchRun depends on the third-party `ddgs` package at runtime.
    # If it's missing, leave the tool unavailable rather than crashing chat.
    try:
        from ddgs import DDGS  # noqa: F401
    except Exception:  # pragma: no cover
        logger.warning("DuckDuckGo tool unavailable: missing ddgs (install via `pip install -U ddgs`).")
        return None

    search = DuckDuckGoSearchRun()
    return Tool(
        name="web_search",
        func=search.run,
        description="通用网页搜索（例如 '最新 AI 新闻'）。",
    )


def yahoo_finance_tool() -> Tool:
    """Yahoo Finance stock data (free)."""
    if yf is None:  # pragma: no cover
        logger.warning("Stock data tool unavailable: missing yfinance")
        return None

    def get_stock_price(ticker: str) -> str:
        symbol = (ticker or "").strip().split()[0].upper()
        if not symbol:
            return "错误: 缺少股票代码"

        try:
            stock = yf.Ticker(ticker)
            price = None
            market_cap = None

            # Prefer fast_info when available
            fast_info = getattr(stock, "fast_info", None)
            if fast_info:
                price = getattr(fast_info, "last_price", None)
                market_cap = getattr(fast_info, "market_cap", None)

            if price is None:
                info = stock.info
                price = info.get("currentPrice")
                market_cap = info.get("marketCap")

            # Format price if present
            if isinstance(price, (int, float)):
                price_str = f"${price:,.2f}"
            else:
                price_str = "N/A"

            return f"{symbol}: {price_str}"
        except Exception as exc:  # pragma: no cover
            return f"获取 {ticker} 失败: {exc}"

    return Tool(
        name="stock_data",
        func=get_stock_price,
        description="通过 Yahoo Finance 获取股价/市值（例如 'AAPL'）。",
    )


def tavily_tool(api_key: str) -> Tool:
    """Tavily search (paid, requires key + flag)."""
    if TavilySearchResults is None:
        raise RuntimeError("未安装 Tavily；请确认 langchain_community 已可用。")

    search = TavilySearchResults(
        api_key=api_key,
        max_results=3,
        search_depth="advanced",
        include_answer=True,
    )
    return Tool(
        name="tavily_search",
        func=search.invoke,
        description="高级网页搜索（付费），用于获取更丰富的实时信息。",
    )


def exa_tool(api_key: str) -> Tool:
    """Exa AI search (paid, requires key + flag)."""
    if Exa is None:
        raise RuntimeError("未安装 Exa；请执行: pip install exa-py")

    logger.info("Initializing Exa client")
    exa_client = Exa(api_key=api_key)

    def exa_search(query: str) -> str:
        """Search using Exa AI with neural search and content retrieval."""
        logger.info(f"[Exa] Searching for: {query}")
        try:
            # Use search_and_contents for combined search + content in one call
            response = exa_client.search_and_contents(
                query,
                num_results=3,
                type="neural",  # Neural search for semantic understanding
                text={"max_characters": 5000},  # Get text content
            )

            logger.info(f"[Exa] Got {len(response.results)} results")

            # Format results similar to Tavily output
            results = []
            for i, result in enumerate(response.results):
                logger.info(f"[Exa] Result {i+1}: {result.title} - {result.url}")
                result_text = f"**{result.title}**\n"
                result_text += f"URL: {result.url}\n"
                if hasattr(result, 'text') and result.text:
                    text_len = len(result.text)
                    logger.info(f"[Exa] Result {i+1} text length: {text_len} chars")
                    result_text += result.text
                results.append(result_text)

            if not results:
                logger.warning("[Exa] No results found")
                return "未找到结果。"

            return "\n\n---\n\n".join(results)
        except Exception as e:
            logger.error(f"[Exa] Search error: {str(e)}")
            return f"Exa 搜索错误: {str(e)}"

    return Tool(
        name="exa_search",
        func=exa_search,
        description="AI 驱动的 Exa 搜索，用于更精准的语义检索。",
    )


def get_available_tools() -> List[Tool]:
    """Return enabled tools based on environment flags."""
    tools: List[Tool] = [
        calculator_tool(),
        wikipedia_tool(),
        arxiv_tool(),
        duckduckgo_tool(),
        yahoo_finance_tool(),
    ]

    # Drop any None entries (e.g., missing ddgs dependency)
    tools = [t for t in tools if t is not None]

    # Tavily (paid web search)
    enable_tavily = os.getenv("ENABLE_TAVILY", "false").lower() == "true"
    tavily_key = os.getenv("TAVILY_API_KEY")

    if enable_tavily and tavily_key:
        try:
            tools.append(tavily_tool(tavily_key))
        except Exception:
            # Fail silently here; downstream can log if desired
            pass

    # Exa (paid AI-powered web search)
    enable_exa = os.getenv("ENABLE_EXA", "false").lower() == "true"
    exa_key = os.getenv("EXA_API_KEY")

    if enable_exa and exa_key:
        try:
            tools.append(exa_tool(exa_key))
        except Exception:
            # Fail silently here; downstream can log if desired
            pass

    return tools
