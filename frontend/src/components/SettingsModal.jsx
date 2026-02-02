import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './SettingsModal.css';

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const RUNTIME_SETTINGS_KEYS = [
  'stage1_prompt_template',
  'stage2_prompt_template',
  'stage3_prompt_template',
  'council_temperature',
  'stage2_temperature',
  'chairman_temperature',
  'web_search_provider',
  'web_max_results',
  'web_full_content_results',
];

function sanitizeRuntimeSettingsJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('设置文件无效：应为 JSON 对象');
  }

  const droppedKeys = [];
  const sanitized = {};
  for (const [k, v] of Object.entries(value)) {
    if (!RUNTIME_SETTINGS_KEYS.includes(k)) {
      droppedKeys.push(k);
      continue;
    }
    sanitized[k] = v;
  }

  return { sanitized, droppedKeys };
}

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('prompts'); // prompts | temps | search | backup
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const fileInputRef = useRef(null);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(original) !== JSON.stringify(draft);
  }, [original, draft]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const settings = await api.getRuntimeSettings();
      setOriginal(settings);
      setDraft(settings);
    } catch (e) {
      setError(e.message || '加载设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
    } else {
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!draft || !hasChanges) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const patch = {};
      for (const [k, v] of Object.entries(draft)) {
        if (!original || original[k] !== v) {
          patch[k] = v;
        }
      }
      const updated = await api.updateRuntimeSettings(patch);
      setOriginal(updated);
      setDraft(updated);
      setSuccess('已保存');
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      setError(e.message || '保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确认重置为默认设置？')) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.resetRuntimeSettings();
      setOriginal(updated);
      setDraft(updated);
      setSuccess('已重置为默认');
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      setError(e.message || '重置设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setError('');
    try {
      const config = await api.exportRuntimeSettings();
      const { sanitized } = sanitizeRuntimeSettingsJson(config);
      downloadJson(`llm-council-settings-${new Date().toISOString().slice(0, 10)}.json`, sanitized);
    } catch (e) {
      setError(e.message || '导出设置失败');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const { sanitized, droppedKeys } = sanitizeRuntimeSettingsJson(json);
      if (droppedKeys.length) {
        setSuccess(`已导入（已忽略 ${droppedKeys.length} 个不支持的字段）`);
      }
      const updated = await api.importRuntimeSettings(sanitized);
      setOriginal(updated);
      setDraft(updated);
      if (!droppedKeys.length) setSuccess('已导入');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err.message || '导入失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>设置</h2>
          <button className="settings-close" onClick={onClose} aria-label="关闭设置">
            ×
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            提示词
          </button>
          <button
            className={`settings-tab ${activeTab === 'temps' ? 'active' : ''}`}
            onClick={() => setActiveTab('temps')}
          >
            温度
          </button>
          <button
            className={`settings-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            网页搜索
          </button>
          <button
            className={`settings-tab ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            备份
          </button>
        </div>

        <div className="settings-modal-body">
          {isLoading && <div className="settings-loading">加载中…</div>}
          {!isLoading && !draft && <div className="settings-loading">未加载到设置</div>}

          {!isLoading && draft && activeTab === 'prompts' && (
            <div className="settings-section">
              <div className="settings-field">
                <label>阶段 1 提示词模板</label>
                <div className="settings-hint">可用占位符：{'{user_query}'}、{'{full_query}'}</div>
                <textarea
                  value={draft.stage1_prompt_template || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, stage1_prompt_template: e.target.value }))}
                  rows={6}
                />
              </div>
              <div className="settings-field">
                <label>阶段 2 提示词模板</label>
                <div className="settings-hint">可用占位符：{'{user_query}'}、{'{responses_text}'}</div>
                <textarea
                  value={draft.stage2_prompt_template || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, stage2_prompt_template: e.target.value }))}
                  rows={10}
                />
              </div>
              <div className="settings-field">
                <label>阶段 3 提示词模板</label>
                <div className="settings-hint">
                  可用占位符：{'{user_query}'}、{'{stage1_text}'}、{'{stage2_text}'}、{'{rankings_block}'}、{'{tools_text}'}
                </div>
                <textarea
                  value={draft.stage3_prompt_template || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, stage3_prompt_template: e.target.value }))}
                  rows={10}
                />
              </div>
            </div>
          )}

          {!isLoading && draft && activeTab === 'temps' && (
            <div className="settings-section">
              <div className="settings-field">
                <label>委员会温度: <span className="settings-value">{Number(draft.council_temperature).toFixed(2)}</span></label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={clampNumber(draft.council_temperature, 0, 2)}
                  onChange={(e) => setDraft((p) => ({ ...p, council_temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field">
                <label>阶段 2 温度: <span className="settings-value">{Number(draft.stage2_temperature).toFixed(2)}</span></label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={clampNumber(draft.stage2_temperature, 0, 2)}
                  onChange={(e) => setDraft((p) => ({ ...p, stage2_temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field">
                <label>主席温度: <span className="settings-value">{Number(draft.chairman_temperature).toFixed(2)}</span></label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={clampNumber(draft.chairman_temperature, 0, 2)}
                  onChange={(e) => setDraft((p) => ({ ...p, chairman_temperature: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}

          {!isLoading && draft && activeTab === 'search' && (
            <div className="settings-section">
              <div className="settings-field">
                <label>默认提供方</label>
                <div className="settings-hint">
                  提供方选择与抓取上限存储于此，API Key 不会被存储或导出。
                </div>
                <select
                  value={draft.web_search_provider || 'duckduckgo'}
                  onChange={(e) => setDraft((p) => ({ ...p, web_search_provider: e.target.value }))}
                  className="settings-select"
                >
                  <option value="off">关闭</option>
                  <option value="duckduckgo">DuckDuckGo（免费）</option>
                  <option value="tavily">Tavily</option>
                  <option value="exa">Exa</option>
                  <option value="brave">Brave</option>
                </select>
              </div>

              <div className="settings-field">
                <label>最大结果数: <span className="settings-value">{Number(draft.web_max_results ?? 5)}</span></label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={clampNumber(draft.web_max_results ?? 5, 1, 10)}
                  onChange={(e) => setDraft((p) => ({ ...p, web_max_results: Number(e.target.value) }))}
                />
              </div>

              <div className="settings-field">
                <label>
                  全文抓取（Jina Reader）: <span className="settings-value">{Number(draft.web_full_content_results ?? 0)}</span>
                </label>
                <div className="settings-hint">
                  使用 DuckDuckGo/Brave 时，为前 N 条结果抓取全文；设为 0 表示关闭。
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={clampNumber(draft.web_full_content_results ?? 0, 0, 10)}
                  onChange={(e) => setDraft((p) => ({ ...p, web_full_content_results: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}

          {!isLoading && draft && activeTab === 'backup' && (
            <div className="settings-section">
              <p className="settings-hint">
                导入/导出仅包含非敏感的运行设置，API Key 等密钥不会被包含。
              </p>
              <div className="settings-actions-row">
                <button className="settings-btn" onClick={handleExport}>导出 JSON</button>
                <button className="settings-btn" onClick={handleImportClick}>导入 JSON</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="settings-divider" />
              <button className="settings-btn danger" onClick={handleReset}>
                重置为默认
              </button>
            </div>
          )}
        </div>

        <div className="settings-modal-footer">
          <div className="settings-status">
            {error && <span className="settings-error">{error}</span>}
            {!error && success && <span className="settings-success">{success}</span>}
          </div>
          <div className="settings-footer-actions">
            <button className="settings-btn secondary" onClick={load} disabled={isLoading || isSaving}>
              重新加载
            </button>
            <button className="settings-btn primary" onClick={handleSave} disabled={!hasChanges || isSaving || isLoading}>
              {isSaving ? '保存中…' : (hasChanges ? '保存' : '已保存')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
