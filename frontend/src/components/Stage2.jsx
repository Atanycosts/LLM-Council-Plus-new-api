import { useState, memo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDuration, formatTimestamp } from '../utils/timing';
import './Stage2.css';

// 错误类型到可读提示的映射
const ERROR_MESSAGES = {
  rate_limit: '触发限流：请求过多',
  not_found: '模型不可用',
  auth: '认证失败',
  timeout: '请求超时',
  connection: '连接失败',
  empty: '空响应',
  unknown: '未知错误',
};

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // 将 "Response X" 替换为实际模型名
  // 使用 split/join 替代正则，避免 ReDoS 风险
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    // 安全替换（不使用正则以避免 ReDoS）
    result = result.split(label).join(`**${modelShortName}**`);
  });
  return result;
}

const Stage2 = memo(function Stage2({ rankings, labelToModel, aggregateRankings, timings }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  const currentRanking = rankings[activeTab];
  const hasError = currentRanking?.error;

  return (
    <div className="stage stage2">
      {timings && (timings.start || timings.end) && (
        <div className="stage-timing-top-right">
          {timings.start && (
            <span className="timing-start">开始: {formatTimestamp(timings.start)}</span>
          )}
          {timings.end && (
            <span className="timing-end">结束: {formatTimestamp(timings.end)}</span>
          )}
          {timings.duration !== null && timings.duration !== undefined && (
            <span className="timing-duration">耗时: {formatDuration(timings.duration)}</span>
          )}
        </div>
      )}
      <div className="stage-header">
        <h3 className="stage-title">阶段 2：互评排序</h3>
      </div>

      <h4>原始评审</h4>
      <p className="stage-description">
        每个模型会评估全部回答（以 Response A、B、C 等匿名标签表示）并给出排序。
        为便于阅读，下方将模型名以<strong>加粗</strong>显示，但原始评审使用的是匿名标签。
      </p>

      <div className="tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''} ${rank.error ? 'tab-error' : ''}`}
            onClick={() => setActiveTab(index)}
            title={rank.error ? rank.error_message : undefined}
          >
            {rank.error && <span className="error-icon">!</span>}
            {rank.model.split('/')[1] || rank.model}
          </button>
        ))}
      </div>

      <div className={`tab-content ${hasError ? 'tab-content-error' : ''}`}>
        <div className="ranking-model">
          {currentRanking.model}
        </div>
        {hasError ? (
          <div className="error-content">
            <div className="error-badge">
              {ERROR_MESSAGES[currentRanking.error_type] || '错误'}
            </div>
            <div className="error-message">
              {currentRanking.error_message}
            </div>
          </div>
        ) : (
          <>
            <div className="ranking-content markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={true}>
                {deAnonymizeText(currentRanking.ranking, labelToModel)}
              </ReactMarkdown>
            </div>

            {currentRanking.parsed_ranking &&
             currentRanking.parsed_ranking.length > 0 && (
              <div className="parsed-ranking">
                <strong>解析出的排序：</strong>
                <ol>
                  {currentRanking.parsed_ranking.map((label, i) => (
                    <li key={i}>
                      {labelToModel && labelToModel[label]
                        ? labelToModel[label].split('/')[1] || labelToModel[label]
                        : label}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>综合排序（综合评价）</h4>
          <p className="stage-description">
            汇总所有互评结果（分数越低越好）：
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {agg.model.split('/')[1] || agg.model}
                </span>
                <span className="rank-score">
                  平均: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  （{agg.rankings_count} 票）
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

Stage2.propTypes = {
  rankings: PropTypes.arrayOf(
    PropTypes.shape({
      model: PropTypes.string.isRequired,
      ranking: PropTypes.string,
      parsed_ranking: PropTypes.arrayOf(PropTypes.string),
      error: PropTypes.bool,
      error_type: PropTypes.string,
      error_message: PropTypes.string,
    })
  ),
  labelToModel: PropTypes.objectOf(PropTypes.string),
  aggregateRankings: PropTypes.arrayOf(
    PropTypes.shape({
      model: PropTypes.string.isRequired,
      average_rank: PropTypes.number.isRequired,
      rankings_count: PropTypes.number.isRequired,
    })
  ),
  timings: PropTypes.shape({
    start: PropTypes.number,
    end: PropTypes.number,
    duration: PropTypes.number,
  }),
};

Stage2.defaultProps = {
  rankings: [],
  labelToModel: null,
  aggregateRankings: [],
  timings: null,
};

export default Stage2;
