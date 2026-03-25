/*
用途：为 content.js 提供“设置弹窗相关”的桥接层。
说明：目前只封装 closeSettingsModal，直接做最小 DOM 清理，避免 content.js 挂太多细节。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.contentSettingsBridgeService) return;

  function closeSettingsModal(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const modal = documentRef.getElementById('settings-modal');
      if (modal) {
        try {
          modal.classList.remove('closing');
        } catch (e) {
          // ignore
        }
        modal.remove?.();
      }

      // 保护性清理：极端情况下 admin 预设遮罩可能残留，导致页面像“卡死”一样无法点击
      try {
        const overlays = documentRef.querySelectorAll('.admin-preset-overlay');
        overlays?.forEach?.((el) => {
          try {
            el.remove?.();
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.contentSettingsBridgeService = {
    closeSettingsModal
  };
})();
