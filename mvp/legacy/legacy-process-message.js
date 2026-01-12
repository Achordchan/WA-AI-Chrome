/*
用途：处理消息 DOM 的 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP 的 messageProcessingPresenter 不可用时，仍然给消息打标记、加 wrapper class、设置定位，并尝试添加翻译按钮。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.processMessageFallback) return;

  function legacyProcessMessage(message, deps = {}) {
    if (!message) return false;

    try {
      if (!message.dataset.processed) {
        // 为消息添加包装器类
        try {
          message.classList.add('message-wrapper');
          message.classList.add('waai-message');
        } catch (e) {
          // ignore
        }

        // 确保消息容器有相对定位
        try {
          message.style.position = 'relative';
        } catch (e) {
          // ignore
        }

        // 添加翻译按钮（以 data-pre-plain-text 根节点为锚点，避免 WhatsApp DOM 变动影响）
        try {
          deps.addTranslateButton?.(message);
        } catch (e) {
          // ignore
        }

        try {
          message.dataset.processed = 'true';
        } catch (e) {
          // ignore
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.processMessageFallback = {
    legacyProcessMessage
  };
})();
