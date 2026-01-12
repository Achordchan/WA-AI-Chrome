/*
用途：AI 分析结果/错误渲染的 legacy orchestrator（从 content.js 迁移出来）。
说明：当 analysisPresenter.showResult/showError 不可用时，按顺序尝试：
  1) analysisRenderFallback（更完整的渲染）
  2) analysisPanelFallback（更小的兜底渲染）
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.analysisRenderOrchestrator) return;

  function showAnalysisResult(container, analysis, deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.analysisRenderFallback;
      if (fallback?.showAnalysisResult) {
        const ok = fallback.showAnalysisResult(container, analysis, deps);
        if (ok) return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      const panelFallback = window.WAAP?.legacy?.analysisPanelFallback;
      if (panelFallback?.showAnalysisResult) {
        const ok = panelFallback.showAnalysisResult(container, analysis, deps);
        if (ok) return true;
      }
    } catch (e2) {
      // ignore
    }

    return false;
  }

  function showAnalysisError(container, message, deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.analysisRenderFallback;
      if (fallback?.showAnalysisError) {
        const ok = fallback.showAnalysisError(container, message, deps);
        if (ok) return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      const panelFallback = window.WAAP?.legacy?.analysisPanelFallback;
      if (panelFallback?.showAnalysisError) {
        const ok = panelFallback.showAnalysisError(container, message, deps);
        if (ok) return true;
      }
    } catch (e2) {
      // ignore
    }

    return false;
  }

  window.WAAP.legacy.analysisRenderOrchestrator = {
    showAnalysisResult,
    showAnalysisError
  };
})();
