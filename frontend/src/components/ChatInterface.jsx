import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import TokenStats from './TokenStats';
import SearchContext from './SearchContext';
import { api } from '../api';
import { exportToMarkdown, downloadMarkdown, generateFilename } from '../utils/exportMarkdown';
import { formatDuration, formatTimestamp } from '../utils/timing';
import './ChatInterface.css';

// 文件大小限制（字节）
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 普通文件 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 图片 5MB

const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  md: 'MD',
  txt: 'TXT',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 实时耗时显示组件
function RealtimeTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [actualStartTime, setActualStartTime] = useState(() => startTime || null);
  const animationTimeoutRef = useRef(null);

  useEffect(() => {
    let timer;
    if (startTime && startTime !== actualStartTime) {
      timer = setTimeout(() => setActualStartTime(startTime), 0);
    } else if (!startTime && !actualStartTime) {
      timer = setTimeout(() => setActualStartTime(Date.now() / 1000), 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [startTime, actualStartTime]);

  useEffect(() => {
    if (!actualStartTime) return undefined;

    const updateElapsed = () => {
      const baseStart = actualStartTime;

      const now = Date.now() / 1000;
      const newElapsed = now - baseStart;
      setElapsed(Math.max(0, newElapsed));
      setIsAnimating(true);
      // 设置新计时器前先清理上一个
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 100);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 50);

    return () => {
      clearInterval(interval);
      // 组件卸载时清理动画计时器
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [actualStartTime]);

  return (
    <div className="realtime-timing">
      {actualStartTime && (
        <span className="timing-start">开始时间: {formatTimestamp(actualStartTime)}</span>
      )}
      <span className={`timing-elapsed ${isAnimating ? 'pulse' : ''}`}>
        已耗时: {formatDuration(elapsed) || '0.0秒'}
      </span>
    </div>
  );
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  onAbort,
  onUploadFile,
  isLoading,
  webSearchAvailable = false,
  tavilyEnabled = false,
  exaEnabled = false,
  duckduckgoEnabled = false,
  braveEnabled = false,
}) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [webSearchProvider, setWebSearchProvider] = useState('off'); // 'off', 'duckduckgo', 'tavily', 'exa', 'brave'
  const [driveStatus, setDriveStatus] = useState({ enabled: false, configured: false });
  const [driveUploading, setDriveUploading] = useState({});
  const [driveUploaded, setDriveUploaded] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // 挂载时检查 Google Drive 状态
  useEffect(() => {
    api.getDriveStatus()
      .then(setDriveStatus)
      .catch((err) => console.log('Google Drive 未配置:', err));
  }, []);

  // 上传到 Google Drive
  const uploadToDrive = async (index, userContent, assistantMessage) => {
    if (driveUploading[index]) return;

    setDriveUploading((prev) => ({ ...prev, [index]: true }));
    try {
      const md = exportToMarkdown(userContent, assistantMessage);
      const result = await api.uploadToDrive(generateFilename(index), md);
      setDriveUploaded((prev) => ({
        ...prev,
        [index]: result.file.webViewLink
      }));
    } catch (error) {
      console.error('上传到 Google Drive 失败:', error);
      alert(`上传到 Google Drive 失败: ${error.message}`);
    } finally {
      setDriveUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // 根据内容自动调整输入框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isUploading) {
      onSendMessage(input, attachments.length > 0 ? attachments : null, webSearchProvider);
      setInput('');
      setAttachments([]);
      // Keep webSearchProvider value for next query
    }
  };

  const handleKeyDown = (e) => {
    // Enter 直接发送（不含 Shift）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 上传前校验文件大小
    const invalidFiles = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
      if (file.size > maxSize) {
        invalidFiles.push({
          name: file.name,
          size: file.size,
          maxSize,
          isImage,
        });
      }
    }

    if (invalidFiles.length > 0) {
      const messages = invalidFiles.map(
        (f) => `"${f.name}" (${formatFileSize(f.size)}) 超过${f.isImage ? '图片' : '文件'}大小上限 ${formatFileSize(f.maxSize)}`
      );
      alert(`文件大小超限:\n\n${messages.join('\n')}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await onUploadFile(file);
        setAttachments((prev) => [...prev, result]);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert(`文件上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
      // 清空文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>欢迎使用 LLM Council Plus</h2>
          <p>创建新对话开始使用</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>开始新对话</h2>
            <p>提出问题以咨询 LLM Council Plus</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">你</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM Council Plus</div>

                  <SearchContext toolOutputs={msg.metadata?.tool_outputs || msg.tool_outputs} />

                  {/* 阶段 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="loading-content">
                        <div className="spinner"></div>
                        <span>阶段 1 执行中：收集各模型回答...（已收到 {msg.stage1?.length || 0}）</span>
                      </div>
                      <RealtimeTimer startTime={msg.timings?.stage1?.start} />
                    </div>
                  )}
                  {/* 加载中也渲染 Stage1，以展示流式响应 */}
                  {msg.stage1 && msg.stage1.length > 0 && (
                    <Stage1 responses={msg.stage1} timings={msg.timings?.stage1} isStreaming={msg.loading?.stage1} />
                  )}

                  {/* 阶段 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="loading-content">
                        <div className="spinner"></div>
                        <span>阶段 2 执行中：互评排序...</span>
                      </div>
                      <RealtimeTimer startTime={msg.timings?.stage2?.start} />
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                      timings={msg.timings?.stage2}
                    />
                  )}

                  {/* 阶段 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="loading-content">
                        <div className="spinner"></div>
                        <span>阶段 3 执行中：最终综合...</span>
                      </div>
                      <RealtimeTimer startTime={msg.timings?.stage3?.start} />
                    </div>
                  )}
                  {msg.stage3 && <Stage3 finalResponse={msg.stage3} timings={msg.timings?.stage3} />}

                  {/* Token 统计：阶段 3 后显示 TOON 节省 */}
                  {msg.stage3 && msg.metadata?.token_stats && (
                    <TokenStats tokenStats={msg.metadata.token_stats} />
                  )}

                  {/* 导出按钮：阶段 3 完成后显示 */}
                  {msg.stage3 && (
                    <div className="export-actions">
                      <button
                        className="export-button"
                        onClick={() => {
                          // 读取对应的用户消息（上一条）
                          const userMsg = conversation.messages[index - 1];
                          const userContent = userMsg?.content || '问题';
                          const md = exportToMarkdown(userContent, msg);
                          downloadMarkdown(md, generateFilename(index));
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        导出为 MD
                      </button>

                      {/* Google Drive 上传按钮 */}
                      {driveStatus.configured && (
                        driveUploaded[index] ? (
                          <a
                            href={driveUploaded[index]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="export-button drive-uploaded"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            在 Drive 中查看
                          </a>
                        ) : (
                          <button
                            className="export-button drive-button"
                            onClick={() => {
                              const userMsg = conversation.messages[index - 1];
                              const userContent = userMsg?.content || '问题';
                              uploadToDrive(index, userContent, msg);
                            }}
                            disabled={driveUploading[index]}
                          >
                            {driveUploading[index] ? (
                              <>
                                <div className="spinner-small"></div>
                                上传中...
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 19V5M5 12l7-7 7 7"/>
                                </svg>
                                上传到 Drive
                              </>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>正在咨询委员会...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
          {/* 附件展示 */}
          {attachments.length > 0 && (
            <div className="attachments-list">
              {attachments.map((att, index) => (
                <div key={index} className={`attachment-item ${att.file_type === 'image' ? 'attachment-image' : ''}`}>
                  {att.file_type === 'image' ? (
                    <img
                      src={att.content}
                      alt={att.filename}
                      className="attachment-thumbnail"
                    />
                  ) : (
                    <span className="attachment-icon">
                      {FILE_TYPE_LABELS[att.file_type] || '文件'}
                    </span>
                  )}
                  <span className="attachment-name">{att.filename}</span>
                  <span className="attachment-size">
                    {att.file_type === 'image'
                      ? `(${Math.round((att.byte_size || 0) / 1024)}KB)`
                      : `(${Math.round(att.char_count / 1000)}k 字符)`
                    }
                  </span>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => handleRemoveAttachment(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
          {/* 隐藏的文件输入 */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
              multiple
              style={{ display: 'none' }}
            />

          {/* 添加附件按钮 */}
            <button
              type="button"
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              title="添加附件（PDF、TXT、MD、JPG、PNG、GIF、WebP）"
            >
              {isUploading ? (
                <div className="spinner-small"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>

            <textarea
              ref={textareaRef}
              className="message-input"
              placeholder={conversation.messages.length === 0
                ? "输入问题…（Shift+Enter 换行，Enter 发送）"
                : "输入追问…（Shift+Enter 换行，Enter 发送）"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isUploading}
              rows={1}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading || isUploading}
              aria-label={conversation.messages.length === 0 ? '发送' : '发送追问'}
              title={conversation.messages.length === 0 ? '发送' : '发送追问'}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
            {webSearchAvailable && (
              <div className="web-search-dropdown" title="选择网页搜索提供方">
                <span className="dropdown-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <select
                  value={webSearchProvider}
                  onChange={(e) => setWebSearchProvider(e.target.value)}
                  disabled={isLoading || isUploading}
                  className="search-provider-select"
                >
                  <option value="off">关闭</option>
                  {duckduckgoEnabled && <option value="duckduckgo">DuckDuckGo</option>}
                  {tavilyEnabled && <option value="tavily">Tavily</option>}
                  {exaEnabled && <option value="exa">Exa AI</option>}
                  {braveEnabled && <option value="brave">Brave</option>}
                </select>
              </div>
            )}
            {onAbort && isLoading && (
              <button
                type="button"
                className="stop-button"
                onClick={onAbort}
                title="停止/取消当前请求"
              >
                停止
              </button>
            )}
          </div>
        </form>
    </div>
  );
}
