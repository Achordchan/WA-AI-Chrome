/*
用途：翻译结果渲染 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP translationRenderService.displayTranslationResult 不可用时，用最基础的 DOM + inline style 渲染翻译文本，并支持滚动到底部。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.displayTranslationResultFallback) return;

  function legacyDisplayTranslationResult(container, translationText, isDarkMode, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const maybeScrollChatToBottom = deps.maybeScrollChatToBottom || window.maybeScrollChatToBottom;

      if (!container || !documentRef) return false;

      const translationElement = documentRef.createElement('div');
      translationElement.className = 'translation-content';

      if (isDarkMode) {
        translationElement.style.cssText = `
          background-color: rgba(60, 150, 80, 0.2);
          border-left: 3px solid #4ade80;
          padding: 10px;
          margin-top: 5px;
          font-size: 0.95em;
          white-space: pre-wrap;
          border-radius: 0 5px 5px 0;
          color: #e0e0e0;
        `;
      } else {
        translationElement.style.cssText = `
          background-color: rgba(232, 245, 233, 0.8);
          border-left: 3px solid #4CAF50;
          padding: 10px;
          margin-top: 5px;
          font-size: 0.95em;
          white-space: pre-wrap;
          border-radius: 0 5px 5px 0;
          color: #333;
        `;
      }

      translationElement.textContent = String(translationText ?? '');
      container.appendChild(translationElement);

      try {
        if (typeof maybeScrollChatToBottom === 'function') {
          maybeScrollChatToBottom(container);
        }
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function minimalAppendFallback(container, translationText, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const maybeScrollChatToBottom = deps.maybeScrollChatToBottom || window.maybeScrollChatToBottom;

      if (!container || !documentRef) return false;

      const el = documentRef.createElement('div');
      el.className = 'translation-content';
      el.textContent = String(translationText ?? '');
      container.appendChild(el);

      try {
        if (typeof maybeScrollChatToBottom === 'function') {
          maybeScrollChatToBottom(container);
        }
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.displayTranslationResultFallback = {
    legacyDisplayTranslationResult,
    minimalAppendFallback
  };
})();
