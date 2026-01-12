/*
用途：输入框翻译（input-translate.js）相关通用样式注入（toast / quick-send 动效等）。
说明：把 input-translate.js 中的大段 toastStyles 文本抽离，避免主文件过大；并使用 styleId 防止重复注入。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.inputTranslateStylesFallback) return;

  const STYLE_ID = 'waap-input-translate-styles';

  const CSS_TEXT = `
  .translate-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    animation: toastFade 0.3s ease;
  }

  .translate-toast-error {
    background: rgba(220, 38, 38, 0.9);
  }

  @keyframes toastFade {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @keyframes waaiQuickSendFlash {
    0% { background: rgba(0, 168, 132, 0.06); }
    100% { background: transparent; }
  }

  .waai-quick-send-flash {
    animation: waaiQuickSendFlash 0.6s ease;
  }

  @keyframes waaiQuickSendGlow {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
    }
    18% {
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.55), 0 0 18px rgba(0, 168, 132, 0.35);
    }
    32% {
      box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
    }
    58% {
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.55), 0 0 18px rgba(0, 168, 132, 0.35);
    }
    72% {
      box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
    }
  }

  .waai-quick-send-glow {
    border-radius: 10px;
    animation: waaiQuickSendGlow 0.95s ease-in-out;
  }
`;

  function ensureStyles(deps = {}) {
    try {
      const doc = deps.document || window.document;
      if (!doc || !doc.head) return false;

      if (doc.getElementById(STYLE_ID)) return true;

      const style = doc.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS_TEXT;
      doc.head.appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.inputTranslateStylesFallback = {
    ensureStyles
  };
})();
