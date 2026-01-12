/*
用途：为 content.js 提供“扩展上下文失效（context invalidated）”提示的桥接层。
说明：优先使用 legacy extensionInvalidatedFallback（覆盖层 + 刷新按钮）；否则回退到 alert + reload 的极简提示。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.contentExtensionInvalidatedBridgeService) return;

  function showExtensionInvalidatedError(deps = {}) {
    const documentRef = deps.document || window.document;
    const locationRef = deps.location || window.location;
    const alertRef = deps.alert || window.alert;

    try {
      const fallback = window.WAAP?.legacy?.extensionInvalidatedFallback;
      if (fallback?.showExtensionInvalidatedError) {
        const ok = fallback.showExtensionInvalidatedError({
          document: documentRef,
          location: locationRef
        });
        if (ok) return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      alertRef && alertRef('扩展上下文已失效，请刷新页面或重新加载扩展后重试');
    } catch (e) {
      // ignore
    }

    try {
      locationRef && locationRef.reload && locationRef.reload();
    } catch (e2) {
      // ignore
    }

    return true;
  }

  window.WAAP.services.contentExtensionInvalidatedBridgeService = {
    showExtensionInvalidatedError
  };
})();
