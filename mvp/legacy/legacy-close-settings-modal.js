/*
用途：关闭设置弹窗 legacy fallback（从 content.js 迁移出来）。提供关闭动画并在动画后移除 settings modal。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.closeSettingsModalFallback) return;

  function closeSettingsModal(deps = {}) {
    const documentRef = deps.document || window.document;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    const modal = documentRef.getElementById('settings-modal');
    if (modal) {
      // 添加关闭动画
      modal.classList.add('closing');
      // 动画完成后移除模态框
      setTimeoutRef(() => {
        try {
          modal.remove();
        } catch (e) {
          // ignore
        }
      }, 300);
      return true;
    }

    return false;
  }

  window.WAAP.legacy.closeSettingsModalFallback = {
    closeSettingsModal
  };
})();
