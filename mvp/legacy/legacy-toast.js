/*
用途：Toast 提示 legacy fallback（从 content.js 迁移出来）。当 MVP toastService 不可用时，提供旧版 DOM + CSS toast 方案，并返回 toastId 以支持进度更新。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.toastFallback) return;

  function legacyShowToast(message, type = 'success', duration = 3000, deps = {}) {
    const documentRef = deps.document || window.document;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    // 生成唯一ID
    const toastId = 'toast-' + Date.now();

    // 创建toast元素
    const toast = documentRef.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;

    // 创建内容元素，使其可以单独更新
    const contentElement = documentRef.createElement('div');
    contentElement.className = 'toast-content';
    contentElement.textContent = message;
    toast.appendChild(contentElement);

    // 如果是持久性消息（duration为0），添加关闭按钮
    if (duration === 0) {
      const closeButton = documentRef.createElement('button');
      closeButton.className = 'toast-close-btn';
      closeButton.innerHTML = '×';
      closeButton.onclick = () => {
        documentRef.getElementById(toastId)?.remove();
      };
      toast.appendChild(closeButton);
    }

    // 添加toast样式
    const style = documentRef.createElement('style');
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: toast-in 0.3s ease;
      }

      .toast-success {
        background-color: #2ecc71;
      }

      .toast-error {
        background-color: #e74c3c;
      }

      .toast-info {
        background-color: #3498db;
      }

      .toast-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        margin-left: 12px;
        padding: 0 4px;
        cursor: pointer;
        opacity: 0.8;
      }

      .toast-close-btn:hover {
        opacity: 1;
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translate(-50%, 20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      @keyframes toast-out {
        from {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        to {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
      }
    `;

    // 添加样式和toast到文档
    documentRef.head.appendChild(style);
    documentRef.body.appendChild(toast);

    // 如果不是持久性消息，设置定时器自动移除toast
    if (duration > 0) {
      // 在持续时间结束前添加淡出动画
      setTimeoutRef(() => {
        const toastElement = documentRef.getElementById(toastId);
        if (toastElement) {
          toastElement.style.animation = 'toast-out 0.3s ease forwards';
        }
      }, duration - 300);

      // 设置定时器自动移除toast
      setTimeoutRef(() => {
        const toastElement = documentRef.getElementById(toastId);
        if (toastElement) {
          toastElement.remove();
        }
      }, duration);
    }

    // 返回toast的ID，以便后续更新其内容
    return toastId;
  }

  window.WAAP.legacy.toastFallback = {
    legacyShowToast
  };
})();
