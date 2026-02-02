import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import './SearchContext.css';

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const TITLE_PREFIXES = ['Title: ', '标题: ', '标题：'];
const URL_PREFIXES = ['URL: ', '链接: ', '链接：'];
const SUMMARY_PREFIXES = ['Summary: ', '摘要: ', '摘要：'];
const CONTENT_PREFIXES = ['Content:', '内容: ', '内容：'];

function stripPrefix(line, prefixes) {
  if (!line) return '';
  for (const p of prefixes) {
    if (line.startsWith(p)) {
      return line.slice(p.length).trim();
    }
  }
  return line.trim();
}

function parseResultBlock(block) {
  const lines = block.split('\n');
  const titleLine = lines.find((l) => TITLE_PREFIXES.some((p) => l.startsWith(p)));
  const urlLine = lines.find((l) => URL_PREFIXES.some((p) => l.startsWith(p)));
  const summaryIdx = lines.findIndex((l) => SUMMARY_PREFIXES.some((p) => l.startsWith(p)));
  const contentIdx = lines.findIndex((l) => CONTENT_PREFIXES.some((p) => l.startsWith(p)));

  const title = titleLine ? stripPrefix(titleLine, TITLE_PREFIXES) : '';
  const url = urlLine ? stripPrefix(urlLine, URL_PREFIXES) : '';

  let kind = '';
  let body = '';
  if (contentIdx >= 0) {
    kind = 'content';
    body = lines.slice(contentIdx + 1).join('\n').trim();
  } else if (summaryIdx >= 0) {
    kind = 'summary';
    body = stripPrefix(lines.slice(summaryIdx).join('\n'), SUMMARY_PREFIXES);
  }

  return { title, url, kind, body };
}

function parseWebSearchText(text) {
  if (!text || typeof text !== 'string') return null;

  // 按 “Result N:” 或 “结果 N:” 边界拆分块
  const blocks = text
    .split(/\n\n(?=(Result\s+\d+:|结果\s+\d+[:：]))/g)
    .map((b) => b.trim())
    .filter(Boolean);

  const parsed = [];
  for (const block of blocks) {
    if (!(block.startsWith('Result ') || block.startsWith('结果 '))) continue;
    parsed.push(parseResultBlock(block));
  }

  return parsed.length ? parsed : null;
}

function getDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    // Fallback for non-URL strings
    return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  }
}

function normalizeToolName(tool) {
  if (!tool) return '';
  // e.g. "web_search:duckduckgo" -> "DuckDuckGo"
  if (tool.startsWith('web_search:')) {
    const p = tool.split(':')[1] || '';
    return p ? `${p[0].toUpperCase()}${p.slice(1)}` : tool;
  }
  if (tool === 'tavily_search') return 'Tavily';
  if (tool === 'exa_search') return 'Exa';
  if (tool === 'web_search') return '网页搜索';
  return tool;
}

export default function SearchContext({ toolOutputs }) {
  const [isOpen, setIsOpen] = useState(false);

  const entries = useMemo(() => {
    const list = Array.isArray(toolOutputs) ? toolOutputs : [];
    return list
      .map((t) => ({
        tool: t.tool,
        label: normalizeToolName(t.tool),
        raw: typeof t.result === 'string' ? t.result : JSON.stringify(t.result, null, 2),
      }))
      .filter((t) => t.raw && t.raw.trim().length > 0);
  }, [toolOutputs]);

  const parsedByTool = useMemo(() => {
    return entries.map((e) => {
      // Try structured parsing first (our formatted DuckDuckGo/Brave output)
      const parsed = parseWebSearchText(e.raw);
      if (parsed) return { ...e, parsed, parsedKind: 'results' };

      // If it looks like JSON (tavily/exa), pretty render raw
      const j = safeParseJson(e.raw);
      if (j) return { ...e, parsed: j, parsedKind: 'json' };

      return { ...e, parsed: null, parsedKind: 'raw' };
    });
  }, [entries]);

  if (!entries.length) return null;

  return (
    <div className="search-context">
      <button
        type="button"
        className="search-context-toggle"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="search-context-title">搜索上下文</span>
        <span className="search-context-meta">
          {entries.length} 个来源
        </span>
        <span className="search-context-caret">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div className="search-context-body">
          {parsedByTool.map((e, idx) => (
            <div key={`${e.tool}-${idx}`} className="search-context-block">
              <div className="search-context-block-header">
                <span className="search-context-provider">{e.label}</span>
              </div>

              {e.parsedKind === 'results' && (
                <div className="search-context-results">
                  {e.parsed.map((r, i) => {
                    const domain = getDomain(r.url);
                    return (
                      <details key={i} className="search-context-result">
                        <summary className="search-context-result-summary">
                          <span className="search-context-result-title">
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                {r.title || r.url}
                              </a>
                            ) : (
                              <span>{r.title || '未命名结果'}</span>
                            )}
                          </span>
                          {domain && <span className="search-context-result-domain">{domain}</span>}
                        </summary>
                        {r.body && (
                          <pre className="search-context-result-body">{r.body}</pre>
                        )}
                      </details>
                    );
                  })}
                </div>
              )}

              {e.parsedKind === 'json' && (
                <pre className="search-context-raw">{JSON.stringify(e.parsed, null, 2)}</pre>
              )}

              {e.parsedKind === 'raw' && (
                <pre className="search-context-raw">{e.raw}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

SearchContext.propTypes = {
  toolOutputs: PropTypes.arrayOf(
    PropTypes.shape({
      tool: PropTypes.string,
      result: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    })
  ),
};
