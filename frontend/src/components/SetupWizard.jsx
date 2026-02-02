import { useState } from 'react';
import { api } from '../api';
import './SetupWizard.css';

export default function SetupWizard() {
  const routerType = 'openrouter';
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [exaKey, setExaKey] = useState('');
  const [braveKey, setBraveKey] = useState('');
  // 认证相关状态
  const [authEnabled, setAuthEnabled] = useState(false);
  const [jwtSecret, setJwtSecret] = useState('');
  const [users, setUsers] = useState([{ username: '', password: '' }]);
  // UI 状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // 生成 JWT 密钥
  const handleGenerateJwt = async () => {
    try {
      const { secret } = await api.generateSecret('jwt');
      setJwtSecret(secret);
    } catch {
      setError('生成 JWT 密钥失败');
    }
  };

  // 为指定用户生成密码
  const handleGeneratePassword = async (index) => {
    try {
      const { secret } = await api.generateSecret('password');
      const newUsers = [...users];
      newUsers[index].password = secret;
      setUsers(newUsers);
    } catch {
      setError('生成密码失败');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text, fieldId) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 新增用户
  const addUser = () => {
    setUsers([...users, { username: '', password: '' }]);
  };

  // 删除用户
  const removeUser = (index) => {
    if (users.length > 1) {
      setUsers(users.filter((_, i) => i !== index));
    }
  };

  // 更新用户字段
  const updateUser = (index, field, value) => {
    const newUsers = [...users];
    newUsers[index][field] = value;
    setUsers(newUsers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!apiBaseUrl) {
      setError('请输入 API 地址');
      return;
    }
    if (!apiKey) {
      setError('请输入 API Key');
      return;
    }

    // 开启认证时校验配置
    if (authEnabled) {
      if (!jwtSecret) {
        setError('请生成 JWT 密钥');
        return;
      }
      const validUsers = users.filter(u => u.username && u.password);
      if (validUsers.length === 0) {
        setError('请至少添加一个用户');
        return;
      }
    }

    setIsLoading(true);

    try {
      const config = { router_type: routerType };
      config.openrouter_api_key = apiKey;
      config.openrouter_api_url = apiBaseUrl;
      // 可选：配置 Tavily Key
      if (tavilyKey) {
        config.tavily_api_key = tavilyKey;
      }
      // 可选：配置 Exa Key
      if (exaKey) {
        config.exa_api_key = exaKey;
      }
      // 可选：配置 Brave Key
      if (braveKey) {
        config.brave_api_key = braveKey;
      }
      // 认证配置
      config.auth_enabled = authEnabled;
      if (authEnabled) {
        config.jwt_secret = jwtSecret;
        // 将用户数组转为对象
        const usersObj = {};
        users.forEach(u => {
          if (u.username && u.password) {
            usersObj[u.username] = u.password;
          }
        });
        config.auth_users = usersObj;
      }

      await api.saveSetupConfig(config);
      setSuccess(true);

      // Wait a moment then trigger reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.message || '保存配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="setup-container">
        <div className="setup-box">
          <div className="setup-success">
            <div className="success-icon">&#10003;</div>
            <h2>配置已保存</h2>
            <p>正在重新加载…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-box setup-box-wide">
        <div className="setup-header">
          <h1 className="setup-title">欢迎使用 LLM Council Plus</h1>
          <p className="setup-subtitle">请完成初始化配置</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Step 1: Provider */}
          <div className="form-group">
            <label className="form-label">LLM 提供方</label>
            <div className="router-options">
              <div className="router-option selected">
                <div className="router-name">New API（OpenAI 兼容）</div>
                <div className="router-desc">仅使用你配置的地址与 Key</div>
              </div>
            </div>
            <p className="form-hint">当前版本仅支持 OpenAI 兼容接口。</p>
          </div>

          {/* Step 2: API Address */}
          <div className="form-group">
            <label htmlFor="apiBaseUrl" className="form-label">
              API 地址（OpenAI 兼容）
            </label>
            <input
              id="apiBaseUrl"
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:3000/v1/chat/completions"
              className="form-input"
              disabled={isLoading}
            />
            <p className="form-hint">
              填写完整的 chat/completions 地址，例如 <span>http://host:3000/v1/chat/completions</span>。
            </p>
          </div>

          {/* Step 3: API Key */}
          <div className="form-group">
            <label htmlFor="apiKey" className="form-label">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="form-input"
              disabled={isLoading}
            />
            <p className="form-hint">用于鉴权，未配置将无法拉取模型列表。</p>
          </div>

          {/* Optional: Tavily API Key for Web Search */}
          <div className="form-group">
            <label htmlFor="tavilyKey" className="form-label">
              Tavily API Key <span className="optional-badge">可选</span>
            </label>
            <input
              id="tavilyKey"
              type="password"
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              placeholder="tvly-..."
              className="form-input"
              disabled={isLoading}
            />
            <p className="form-hint">
              启用高级网页搜索。获取 Key：{' '}
              <a href="https://tavily.com" target="_blank" rel="noopener noreferrer">
                tavily.com
              </a>
            </p>
          </div>

          {/* Optional: Exa API Key for AI-powered Web Search */}
          <div className="form-group">
            <label htmlFor="exaKey" className="form-label">
              Exa API Key <span className="optional-badge">可选</span>
            </label>
            <input
              id="exaKey"
              type="password"
              value={exaKey}
              onChange={(e) => setExaKey(e.target.value)}
              placeholder="..."
              className="form-input"
              disabled={isLoading}
            />
            <p className="form-hint">
              AI 驱动的网页搜索方案。获取 Key：{' '}
              <a href="https://exa.ai" target="_blank" rel="noopener noreferrer">
                exa.ai
              </a>
            </p>
          </div>

          {/* Optional: Brave API Key for Web Search */}
          <div className="form-group">
            <label htmlFor="braveKey" className="form-label">
              Brave Search API Key <span className="optional-badge">可选</span>
            </label>
            <input
              id="braveKey"
              type="password"
              value={braveKey}
              onChange={(e) => setBraveKey(e.target.value)}
              placeholder="..."
              className="form-input"
              disabled={isLoading}
            />
            <p className="form-hint">
              启用 Brave Search，请填写 API Key。
            </p>
          </div>

          {/* Authentication Section */}
          <div className="form-group">
            <label className="form-label">
              认证 <span className="optional-badge">可选</span>
            </label>
            <label className="auth-toggle">
              <input
                type="checkbox"
                checked={authEnabled}
                onChange={(e) => setAuthEnabled(e.target.checked)}
                disabled={isLoading}
              />
              <span className="auth-toggle-label">启用用户认证</span>
            </label>
          </div>

          {/* Auth Config (shown when enabled) */}
          {authEnabled && (
            <div className="auth-config">
              {/* JWT 密钥 */}
              <div className="form-group">
                <label htmlFor="jwtSecret" className="form-label">
                  JWT 密钥
                </label>
                <div className="input-with-button">
                  <input
                    id="jwtSecret"
                    type="text"
                    value={jwtSecret}
                    onChange={(e) => setJwtSecret(e.target.value)}
                    placeholder="点击生成安全密钥"
                    className="form-input"
                    disabled={isLoading}
                    readOnly
                  />
                  <button
                    type="button"
                    className="generate-btn"
                    onClick={handleGenerateJwt}
                    disabled={isLoading}
                  >
                    生成
                  </button>
                  {jwtSecret && (
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => copyToClipboard(jwtSecret, 'jwt')}
                      disabled={isLoading}
                      title={copiedField === 'jwt' ? '已复制' : '复制密钥'}
                    >
                      {copiedField === 'jwt' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <rect x="2" y="2" width="13" height="13" rx="2" ry="2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Users */}
              <div className="form-group">
                <label className="form-label">用户</label>
                <div className="users-list">
                  {users.map((user, index) => (
                    <div key={index} className="user-row">
                      <input
                        type="text"
                        value={user.username}
                        onChange={(e) => updateUser(index, 'username', e.target.value)}
                        placeholder="用户名"
                        className="form-input user-input"
                        disabled={isLoading}
                      />
                      <div className="password-field">
                        <input
                          type="text"
                          value={user.password}
                          onChange={(e) => updateUser(index, 'password', e.target.value)}
                          placeholder="密码"
                          className="form-input user-input"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className="generate-btn small"
                          onClick={() => handleGeneratePassword(index)}
                          disabled={isLoading}
                          title="生成密码"
                        >
                          生成
                        </button>
                        {user.password && (
                          <button
                            type="button"
                            className="copy-btn small"
                            onClick={() => copyToClipboard(user.password, `pwd-${index}`)}
                            disabled={isLoading}
                            title={copiedField === `pwd-${index}` ? '已复制' : '复制密码'}
                          >
                            {copiedField === `pwd-${index}` ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <rect x="2" y="2" width="13" height="13" rx="2" ry="2" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                      {users.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeUser(index)}
                          disabled={isLoading}
                          title="移除用户"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-user-btn"
                  onClick={addUser}
                  disabled={isLoading}
                >
                  + 添加用户
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || !apiKey || !apiBaseUrl}
            className="submit-button"
          >
            {isLoading ? '保存中...' : '完成配置'}
          </button>
        </form>

        <p className="setup-footer">
          配置将保存到 .env 文件
        </p>
      </div>
    </div>
  );
}
