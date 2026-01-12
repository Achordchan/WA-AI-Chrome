/*
用途：AI 分析结果渲染 legacy fallback（从 content.js 迁移出来）。
当 MVP analysisPresenter.showResult/showError 不可用时，使用最小 DOM 渲染错误提示并提供关闭按钮。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.analysisRenderFallback) return;

  function showAnalysisResult(container, analysis, deps = {}) {
    try {
      const view = window.WAAP?.views?.analysisView;
      if (!view?.ensurePanel || !view?.renderError) return false;
      view.ensurePanel(container);
      view.renderError(container, '分析结果渲染失败，请刷新页面后重试');
      return true;
    } catch (e) {
      return false;
    }
  }

  function showAnalysisError(container, message, deps = {}) {
    try {
      const view = window.WAAP?.views?.analysisView;
      if (!view?.ensurePanel || !view?.renderError) return false;
      view.ensurePanel(container);
      view.renderError(container, String(message ?? ''));
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.analysisRenderFallback = {
    showAnalysisResult,
    showAnalysisError
  };
})();
