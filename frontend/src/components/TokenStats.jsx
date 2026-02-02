import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import './TokenStats.css';

const TokenStats = memo(function TokenStats({ tokenStats }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!tokenStats || !tokenStats.total) {
    return null;
  }

  const { total, stage1, stage2, stage3 } = tokenStats;
  const savedPercent = total.saved_percent || 0;
  const jsonTokens = total.json_tokens || 0;
  const toonTokens = total.toon_tokens || 0;

  // Only show if there are actual savings
  if (savedPercent <= 0 || jsonTokens === 0) {
    return null;
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div
      className="token-stats"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="token-stats-badge">
        <svg
          className="token-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span className="token-text">
          节省 {savedPercent.toFixed(0)}% token（{formatNumber(jsonTokens)} → {formatNumber(toonTokens)}）
        </span>
      </div>

      {showTooltip && (
        <div className="token-stats-tooltip">
          <div className="tooltip-header">TOON Token 节省</div>
          <div className="tooltip-content">
            <div className="tooltip-row">
              <span className="tooltip-label">总计:</span>
              <span className="tooltip-value">{jsonTokens.toLocaleString()} → {toonTokens.toLocaleString()} ({savedPercent.toFixed(1)}%)</span>
            </div>
            {stage1 && stage1.json_tokens > 0 && (
              <div className="tooltip-row">
                <span className="tooltip-label">阶段 1（历史）:</span>
                <span className="tooltip-value">{stage1.json_tokens.toLocaleString()} → {stage1.toon_tokens.toLocaleString()} ({stage1.saved_percent.toFixed(1)}%)</span>
              </div>
            )}
            {stage2 && stage2.json_tokens > 0 && (
              <div className="tooltip-row">
                <span className="tooltip-label">阶段 2（回答）:</span>
                <span className="tooltip-value">{stage2.json_tokens.toLocaleString()} → {stage2.toon_tokens.toLocaleString()} ({stage2.saved_percent.toFixed(1)}%)</span>
              </div>
            )}
            {stage3 && stage3.json_tokens > 0 && (
              <div className="tooltip-row">
                <span className="tooltip-label">阶段 3（排序）:</span>
                <span className="tooltip-value">{stage3.json_tokens.toLocaleString()} → {stage3.toon_tokens.toLocaleString()} ({stage3.saved_percent.toFixed(1)}%)</span>
              </div>
            )}
          </div>
          <div className="tooltip-footer">
            TOON 格式相比 JSON 可减少 token 使用量
          </div>
        </div>
      )}
    </div>
  );
});

TokenStats.propTypes = {
  tokenStats: PropTypes.shape({
    total: PropTypes.shape({
      json_tokens: PropTypes.number,
      toon_tokens: PropTypes.number,
      saved_percent: PropTypes.number,
    }),
    stage1: PropTypes.shape({
      json_tokens: PropTypes.number,
      toon_tokens: PropTypes.number,
      saved_percent: PropTypes.number,
    }),
    stage2: PropTypes.shape({
      json_tokens: PropTypes.number,
      toon_tokens: PropTypes.number,
      saved_percent: PropTypes.number,
    }),
    stage3: PropTypes.shape({
      json_tokens: PropTypes.number,
      toon_tokens: PropTypes.number,
      saved_percent: PropTypes.number,
    }),
  }),
};

TokenStats.defaultProps = {
  tokenStats: null,
};

export default TokenStats;
