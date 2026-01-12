/*
用途：为 content.js 提供 toast 的统一桥接层。
说明：优先使用 MVP toastService；不可用时回退到 legacy toastFallback；再不行则静默失败（避免影响主流程）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.contentToastBridgeService) return;

  function legacyShowToast(message, type = 'success', duration = 3000, deps = {}) {
    try {
      const fallback = window.WAAP?.legacy?.toastFallback;
      if (fallback?.legacyShowToast) {
        return fallback.legacyShowToast(message, type, duration, {
          document: deps.document || window.document,
          setTimeout: deps.setTimeout || window.setTimeout
        });
      }
    } catch (e) {
      // ignore
    }

    try {
      return '';
    } catch (e2) {
      return '';
    }
  }

  function showToast(message, type = 'success', duration = 3000, deps = {}) {
    try {
      const svc = window.WAAP?.services?.toastService;
      if (svc?.showToast) {
        return svc.showToast(message, type, duration);
      }
    } catch (e) {
      // ignore
    }

    return legacyShowToast(message, type, duration, deps);
  }

  window.WAAP.services.contentToastBridgeService = {
    showToast,
    legacyShowToast
  };
})();
