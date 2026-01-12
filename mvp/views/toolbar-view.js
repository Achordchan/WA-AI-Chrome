(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.toolbarView) return;

  function ensureStyles() {
    try {
      if (document.querySelector('#waap-toolbar-style')) return;
      const style = document.createElement('style');
      style.id = 'waap-toolbar-style';
      style.textContent = `
        .analysis-btn-container.waap-toolbar {
          display: flex;
          align-items: center;
          margin-left: 12px;
          gap: 4px;
        }

        .analysis-btn-container.waap-toolbar .settings-btn,
        .analysis-btn-container.waap-toolbar .translate-all-btn,
        .analysis-btn-container.waap-toolbar .analysis-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #8696a0;
          border-radius: 50%;
          transition: all 0.2s;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .analysis-btn-container.waap-toolbar .settings-btn:hover,
        .analysis-btn-container.waap-toolbar .translate-all-btn:hover,
        .analysis-btn-container.waap-toolbar .analysis-btn:hover {
          background-color: rgba(134, 150, 160, 0.1);
          color: #1296db;
        }
      `;
      document.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  }

  function createToolbar(handlers = {}) {
    ensureStyles();

    const el = document.createElement('div');
    el.className = 'analysis-btn-container waap-toolbar';

    el.innerHTML = `
      <button class="settings-btn" title="设置" type="button">
        <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
          <path d="M998.4 358.4c-12.8 6.4-32 12.8-44.8 12.8-38.4 0-76.8-19.2-96-57.6-32-51.2-12.8-115.2 32-147.2-70.4-76.8-160-128-262.4-153.6-6.4 57.6-57.6 102.4-115.2 102.4S403.2 70.4 396.8 12.8c-102.4 25.6-192 76.8-262.4 153.6 44.8 32 57.6 96 32 147.2-19.2 38.4-57.6 57.6-96 57.6-12.8 0-32 0-44.8-12.8C6.4 409.6 0 460.8 0 512s6.4 102.4 25.6 153.6c12.8-6.4 32-12.8 44.8-12.8 38.4 0 76.8 19.2 96 57.6 32 51.2 12.8 115.2-32 147.2 70.4 76.8 160 128 262.4 153.6 6.4-57.6 51.2-102.4 115.2-102.4s108.8 44.8 115.2 102.4c102.4-25.6 192-76.8 262.4-153.6-44.8-32-57.6-96-32-147.2 19.2-38.4 57.6-57.6 96-57.6 12.8 0 32 0 44.8 12.8 19.2-51.2 25.6-102.4 25.6-153.6s-6.4-102.4-25.6-153.6z m-44.8 230.4c-64 0-121.6 32-153.6 89.6-32 57.6-32 121.6 0 172.8-38.4 32-89.6 64-134.4 76.8-32-44.8-89.6-83.2-153.6-83.2s-121.6 32-153.6 89.6c-51.2-19.2-96-44.8-134.4-76.8 32-51.2 32-121.6 0-172.8-32-57.6-89.6-96-153.6-96C64 563.2 64 537.6 64 512s0-51.2 6.4-76.8c64 0 121.6-32 153.6-89.6 32-57.6 32-121.6 0-172.8 38.4-32 83.2-64 134.4-76.8 32 44.8 89.6 83.2 153.6 83.2s121.6-32 153.6-89.6c51.2 19.2 96 44.8 134.4 76.8-32 51.2-32 121.6 0 172.8 32 51.2 89.6 89.6 153.6 89.6 6.4 32 6.4 57.6 6.4 83.2s0 51.2-6.4 76.8zM512 320C403.2 320 320 403.2 320 512s83.2 192 192 192 192-83.2 192-192-83.2-192-192-192z m0 320c-70.4 0-128-57.6-128-128s57.6-128 128-128 128 57.6 128 128-57.6 128-128 128z"/>
        </svg>
      </button>
      <button class="translate-all-btn" title="翻译全部消息" type="button">
        <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
          <path d="M666.296 824.08c-12.56-30.72-54.224-83.312-123.576-156.384-18.616-19.552-17.456-34.448-10.704-78.896v-5.12c4.424-30.48 12.104-48.4 114.504-64.696 52.128-8.144 65.624 12.56 84.712 41.424l6.28 9.544a101 101 0 0 0 51.44 41.656c9.072 4.192 20.24 9.312 35.368 17.92 36.768 20.24 36.768 43.28 36.768 94.024v5.816a215.28 215.28 0 0 1-41.424 139.632 472.44 472.44 0 0 1-152.2 88.208c27.92-52.368 6.512-114.504 0-132.424l-1.168-0.696zM512 40.96a468.016 468.016 0 0 1 203.872 46.544 434.504 434.504 0 0 0-102.872 82.616c-7.44 10.24-13.728 19.784-19.776 28.632-19.552 29.552-29.096 42.816-46.544 44.912a200.84 200.84 0 0 1-33.752 0c-34.208-2.32-80.752-5.12-95.648 35.376-9.544 25.84-11.168 95.648 19.552 131.96 5.28 8.616 6.224 19.2 2.56 28.624a56.08 56.08 0 0 1-16.528 25.832 151.504 151.504 0 0 1-23.272-23.28 151.28 151.28 0 0 0-66.56-52.824c-10-2.792-21.176-5.12-31.88-7.44-30.256-6.288-64.24-13.504-72.152-30.496a119.16 119.16 0 0 1-5.816-46.544 175.48 175.48 0 0 0-11.168-74 70.984 70.984 0 0 0-44.456-39.568A469.64 469.64 0 0 1 512 40.96zM0 512c0 282.768 229.232 512 512 512 282.768 0 512-229.232 512-512 0-282.768-229.232-512-512-512C229.232 0 0 229.232 0 512z"/>
        </svg>
      </button>
      <button class="analysis-btn" title="AI 分析对话" type="button">
        <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
          <path d="M535.311 49.212a343.944 343.944 0 0 1 330.752 249.615h-84.149a264.614 264.614 0 0 0-59.331-92.702 263.65 263.65 0 0 0-187.272-77.402h-82.16a264.192 264.192 0 0 0-264.735 264.794v58.73a42.104 42.104 0 0 1-3.132 15.54l-87.1 203.415 83.606 16.806c18.553 3.553 31.925 19.877 31.925 38.912v106.496c0 23.13 4.096 39.273 9.818 50.959 5.783 11.625 12.89 19.395 21.745 25.84 17.71 12.65 45.297 18.01 69.632 17.89 16.746 0 32.286-2.53 37.587-3.975 48.248-12.89 132.096-36.081 203.716-55.959 71.68-19.817 131.011-36.382 131.072-36.382l21.504 76.499c-0.12 0.12-238.17 66.56-335.812 92.642a242.748 242.748 0 0 1-58.067 6.746 219.738 219.738 0 0 1-85.775-16.263 148.119 148.119 0 0 1-77.04-72.343c-11.807-24.094-17.89-52.947-17.89-85.654v-73.97l-99.63-19.937a40.237 40.237 0 0 1-27.347-20.54 40.297 40.297 0 0 1-1.385-34.033l103.183-241.002v-50.417A344.124 344.124 0 0 1 453.15 49.212zM734.45 382.615l126.615 394.54h-94.992l-24.214-88.184H618.014l-27.106 88.125h-89.57l131.313-394.481H734.45z m259.915 0v394.48h-92.642v-394.48h92.642zM683.008 458.27h-1.205L635 622.23h88.607l-40.599-163.96z"/>
        </svg>
      </button>
    `;

    try {
      el.querySelector('.settings-btn')?.addEventListener('click', () => {
        try {
          handlers?.onSettings?.();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      el.querySelector('.translate-all-btn')?.addEventListener('click', () => {
        try {
          handlers?.onTranslateAll?.();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      el.querySelector('.analysis-btn')?.addEventListener('click', () => {
        try {
          handlers?.onAnalyze?.();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    return el;
  }

  function attachToHeader(headerEl, toolbarEl) {
    if (!headerEl || !toolbarEl) return false;
    try {
      headerEl.appendChild(toolbarEl);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.views.toolbarView = {
    ensureStyles,
    createToolbar,
    attachToHeader
  };
})();
