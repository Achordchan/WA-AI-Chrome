(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.toastService) return;

  function showToast(message, type = 'success', duration = 3000) {
    const toastId = 'toast-' + Date.now();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;

    const contentElement = document.createElement('div');
    contentElement.className = 'toast-content';
    contentElement.textContent = message;
    toast.appendChild(contentElement);

    if (duration === 0) {
      const closeButton = document.createElement('button');
      closeButton.className = 'toast-close-btn';
      closeButton.innerHTML = '×';
      closeButton.onclick = () => {
        document.getElementById(toastId)?.remove();
      };
      toast.appendChild(closeButton);
    }

    const style = document.createElement('style');
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

    document.head.appendChild(style);
    document.body.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
          toastElement.style.animation = 'toast-out 0.3s ease forwards';
        }
      }, duration - 300);

      setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
          toastElement.remove();
        }
      }, duration);
    }

    return toastId;
  }

  window.WAAP.services.toastService = {
    showToast
  };
})();
