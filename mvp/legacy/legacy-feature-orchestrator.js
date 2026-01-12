/*
用途：批量翻译 / AI 分析等功能的 legacy orchestrator（从 content.js 迁移出来）。
说明：当 MVP presenter 不可用时，统一：
  1) 调用对应 legacy fallback（batchTranslateFallback / analyzeConversationFallback）；
  2) 若 legacy fallback 不存在/失败，则给用户统一的“模块加载失败”提示。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.featureOrchestrator) return;

  function showModuleLoadFailed(moduleName, deps = {}) {
    try {
      const notice = deps.noticeService || window.WAAP?.services?.contentFallbackNoticeService;
      if (notice?.showModuleLoadFailed) {
        const ok = notice.showModuleLoadFailed(moduleName, { showToast: deps.showToast });
        if (ok) return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (typeof deps.showToast === 'function') {
        const name = String(moduleName || '').trim();
        const prefix = name ? `${name}模块加载失败` : '模块加载失败';
        deps.showToast(`${prefix}，请刷新页面或重新加载扩展后重试`, 'error', 3000);
        return true;
      }
    } catch (e2) {
      // ignore
    }

    return false;
  }

  async function legacyTranslateAllMessages(messageContainer, deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.batchTranslateFallback;
      if (fallback?.legacyTranslateAllMessages) {
        return await fallback.legacyTranslateAllMessages(messageContainer, deps);
      }
    } catch (e) {
      // ignore
    }

    try {
      showModuleLoadFailed('批量翻译', deps);
    } catch (e2) {
      // ignore
    }

    return false;
  }

  async function legacyAnalyzeConversation(messageContainer, deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.analyzeConversationFallback;
      if (fallback?.analyzeConversation) {
        await fallback.analyzeConversation(messageContainer, deps);
        return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      showModuleLoadFailed('AI 分析', deps);
    } catch (e2) {
      // ignore
    }

    return false;
  }

  window.WAAP.legacy.featureOrchestrator = {
    legacyTranslateAllMessages,
    legacyAnalyzeConversation
  };
})();
