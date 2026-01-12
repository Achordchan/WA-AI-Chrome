/*
用途：为 content.js 提供统一的“fallback 通知/错误提示”文案与展示方法。
说明：当某个 legacy 模块未加载或不可用时，统一通过 showToast 给用户提示，避免 content.js 到处散落重复文案。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.contentFallbackNoticeService) return;

  function showModuleLoadFailed(moduleName, deps = {}) {
    try {
      const showToast = deps.showToast || window.showToast;
      if (typeof showToast !== 'function') return false;

      const name = String(moduleName || '').trim();
      const prefix = name ? `${name}模块加载失败` : '模块加载失败';
      showToast(`${prefix}，请刷新页面或重新加载扩展后重试`, 'error', 3000);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.contentFallbackNoticeService = {
    showModuleLoadFailed
  };
})();
