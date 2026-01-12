/*
用途：消息观察/输入框观察的 legacy orchestrator（从 content.js 迁移出来）。
说明：当 MVP presenters 不可用时，统一调用 legacy observeMessagesFallback / observeInputAreaFallback，减少 content.js 体积。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.observerOrchestrator) return;

  function observeMessages(deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.observeMessagesFallback;
      if (fallback?.legacyObserveMessages) {
        return fallback.legacyObserveMessages(deps);
      }
    } catch (e) {
      // ignore
    }

    try {
      console.warn('[WAAP] observeMessages fallback module missing; skip observing.');
    } catch (e2) {
      // ignore
    }

    return () => {};
  }

  function observeInputArea(deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.observeInputAreaFallback;
      if (fallback?.legacyObserveInputArea) {
        return fallback.legacyObserveInputArea(deps);
      }
    } catch (e) {
      // ignore
    }

    try {
      console.warn('[WAAP] observeInputArea fallback module missing; skip observing.');
    } catch (e2) {
      // ignore
    }

    return () => {};
  }

  window.WAAP.legacy.observerOrchestrator = {
    observeMessages,
    observeInputArea
  };
})();
