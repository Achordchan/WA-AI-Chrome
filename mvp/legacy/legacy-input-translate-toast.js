/*
用途：输入框翻译（input-translate.js）错误提示的 legacy UI 兜底。
说明：把 toast / style 注入逻辑从 input-translate.js 中抽离，便于主文件瘦身；保持可回滚。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.inputTranslateToastFallback) return;

  function ensureStyleInjected(doc) {
    try {
      if (!doc || !doc.head) return;

      const styleId = 'waap-input-translate-toast-style';
      if (doc.getElementById(styleId)) return;

      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = `
        .translate-toast.waap-fallback-toast {
          position: fixed;
          right: 16px;
          bottom: 16px;
          max-width: 360px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.35;
          z-index: 2147483647;
          color: #fff;
          background: rgba(28, 28, 30, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
        }
        .translate-toast.waap-fallback-toast.translate-toast-error {
          background: rgba(176, 0, 32, 0.92);
        }
      `;
      doc.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  }

  function showToast(message, type = 'info', durationMs = 3000, deps = {}) {
    try {
      const doc = deps.document || window.document;
      const setTimeoutFn = deps.setTimeout || window.setTimeout;

      ensureStyleInjected(doc);

      const toast = doc.createElement('div');
      const isError = type === 'error';
      toast.className = `translate-toast waap-fallback-toast${isError ? ' translate-toast-error' : ''}`;
      toast.textContent = String(message || '');
      doc.body.appendChild(toast);

      try {
        const d = Number(durationMs);
        const ms = Number.isFinite(d) ? d : 3000;
        if (typeof setTimeoutFn === 'function') {
          setTimeoutFn(() => {
            try {
              toast.remove();
            } catch (e) {
              // ignore
            }
          }, ms);
        }
      } catch (e) {
        // ignore
      }

      return toast;
    } catch (e) {
      return null;
    }
  }

  function showTranslationError(message, code, deps = {}) {
    try {
      const doc = deps.document || window.document;
      const setTimeoutFn = deps.setTimeout || window.setTimeout;

      const text = code ? `${message} (${code})` : message;
      return showToast(text, 'error', 3000, { document: doc, setTimeout: setTimeoutFn });
    } catch (e) {
      return null;
    }
  }

  window.WAAP.legacy.inputTranslateToastFallback = {
    showToast,
    showTranslationError
  };
})();
