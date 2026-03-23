/*
用途：工具栏/分析按钮的 legacy orchestrator（从 content.js 迁移出来）。
说明：当 MVP toolbarPresenter 不可用时：
  1) 如果 toolbarView 可用，则使用 view 在 header 注入工具栏（设置/批量翻译/AI分析）。
  2) 否则回退到 legacy-add-analysis-button 的 DOM 注入方案。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.toolbarOrchestrator) return;

  function ensureToolbar(messageContainer, retryCount = 0, maxRetries = 5, deps = {}) {
    try {
      if (messageContainer?.querySelector && messageContainer.querySelector('.analysis-btn-container')) {
        return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      const fallback = window.WAAP?.legacy?.addAnalysisButtonFallback;
      if (fallback?.addAnalysisButton) {
        return fallback.addAnalysisButton(messageContainer, retryCount, maxRetries, deps);
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  window.WAAP.legacy.toolbarOrchestrator = {
    ensureToolbar
  };
})();
