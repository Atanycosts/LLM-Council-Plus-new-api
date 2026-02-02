/**
 * 将问答导出为 Markdown 格式
 */
export function exportToMarkdown(userMessage, assistantMessage) {
  const timestamp = new Date().toISOString().split('T')[0];
  let md = `# LLM Council Plus 回复\n\n`;
  md += `**日期:** ${timestamp}\n\n`;
  md += `---\n\n`;

  // 用户问题
  md += `## 问题\n\n${userMessage}\n\n`;

  // 阶段 1：模型回答
  if (assistantMessage.stage1 && assistantMessage.stage1.length > 0) {
    md += `---\n\n## 阶段 1：模型回答\n\n`;
    assistantMessage.stage1.forEach((resp) => {
      const modelName = resp.model.split('/')[1] || resp.model;
      md += `### ${modelName}\n\n${resp.response}\n\n`;
    });
  }

  // 阶段 2：互评排序
  if (assistantMessage.stage2 && assistantMessage.stage2.length > 0) {
    md += `---\n\n## 阶段 2：互评排序\n\n`;

    const labelToModel = assistantMessage.metadata?.label_to_model || {};

    assistantMessage.stage2.forEach((rank) => {
      const modelName = rank.model.split('/')[1] || rank.model;
      md += `### 评审：${modelName}\n\n`;

      // De-anonymize the ranking text
      let rankingText = rank.ranking;
      Object.entries(labelToModel).forEach(([label, model]) => {
        const shortName = model.split('/')[1] || model;
        rankingText = rankingText.replace(new RegExp(label, 'g'), `**${shortName}**`);
      });
      md += `${rankingText}\n\n`;
    });

    // 综合排序
    const aggregateRankings = assistantMessage.metadata?.aggregate_rankings;
    if (aggregateRankings && aggregateRankings.length > 0) {
      md += `### 综合排序（综合评分）\n\n`;
      md += `| 排名 | 模型 | 平均名次 | 票数 |\n`;
      md += `|------|------|----------|------|\n`;
      aggregateRankings.forEach((agg, index) => {
        const modelName = agg.model.split('/')[1] || agg.model;
        md += `| #${index + 1} | ${modelName} | ${agg.average_rank.toFixed(2)} | ${agg.rankings_count} |\n`;
      });
      md += `\n`;
    }
  }

  // 阶段 3：最终综合答复
  if (assistantMessage.stage3) {
    md += `---\n\n## 阶段 3：最终综合答复\n\n`;
    const chairmanName = assistantMessage.stage3.model.split('/')[1] || assistantMessage.stage3.model;
    md += `**主席:** ${chairmanName}\n\n`;
    md += `${assistantMessage.stage3.response}\n`;
  }

  return md;
}

export function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(index) {
  return `llm-council-${new Date().toISOString().slice(0, 10)}-${index}.md`;
}
