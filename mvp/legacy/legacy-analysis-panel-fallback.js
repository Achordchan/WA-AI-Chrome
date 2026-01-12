/*
用途：AI 分析面板渲染的最小兜底（从 content.js 迁移出来）。
说明：当 analysisPresenter 与 analysisRenderFallback 都不可用时，仍能在 .analysis-panel 中展示基础错误/占位信息。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.analysisPanelFallback) return;

  function showAnalysisResult(container, analysis, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      if (!documentRef) return false;
      const panel = container?.querySelector?.('.analysis-panel');
      if (!panel) return false;

      panel.innerHTML = `
        <div class="analysis-error">
          <span>分析结果渲染失败，请刷新页面后重试</span>
          <button class="close-btn">×</button>
        </div>
      `;
      panel.querySelector('.close-btn')?.addEventListener('click', () => panel.remove());
      return true;
    } catch (e) {
      return false;
    }
  }

  function showAnalysisError(container, message, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      if (!documentRef) return false;
      const panel = container?.querySelector?.('.analysis-panel');
      if (!panel) return false;

      const msg = String(message || '');
      panel.innerHTML = `
        <div class="analysis-error">
          <span>分析失败: ${msg}</span>
          <button class="close-btn">×</button>
        </div>
      `;
      panel.querySelector('.close-btn')?.addEventListener('click', () => panel.remove());
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.analysisPanelFallback = {
    showAnalysisResult,
    showAnalysisError
  };
})();
