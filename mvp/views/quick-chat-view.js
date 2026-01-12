(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.quickChatView) return;

  function ensureButtonStyles() {
    try {
      if (document.querySelector('#waap-quick-chat-btn-style')) return;
      const style = document.createElement('style');
      style.id = 'waap-quick-chat-btn-style';
      style.textContent = `
        .quick-chat-btn {
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.3s;
          margin-left: 8px;
          display: inline-flex;
          align-items: center;
        }
        .quick-chat-btn:hover {
          background-color: rgba(134, 150, 160, 0.15);
        }
      `;
      document.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  }

  function ensureModalStyles() {
    try {
      if (document.querySelector('#waap-quick-chat-modal-style')) return;
      const style = document.createElement('style');
      style.id = 'waap-quick-chat-modal-style';
      style.textContent = `
        .quick-chat-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .quick-chat-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 360px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .quick-chat-content h3 {
          margin: 0 0 24px;
          text-align: center;
          color: #075e54;
          font-size: 20px;
        }
        .input-group {
          margin-bottom: 24px;
        }
        .input-field {
          margin-bottom: 16px;
        }
        .input-field label {
          display: block;
          margin-bottom: 8px;
          color: #128c7e;
          font-weight: 500;
        }
        .input-field input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 16px;
          box-sizing: border-box;
        }
        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 20px;
        }
        .button-group button {
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }
        .quick-chat-cancel-btn {
          background: #f5f5f5;
          border: 1px solid #ddd;
          color: #666;
        }
        .quick-chat-cancel-btn:hover {
          background: #e9e9e9;
        }
        .quick-chat-confirm-btn {
          background: #00a884;
          border: none;
          color: white;
        }
        .quick-chat-confirm-btn:hover {
          background: #008f6f;
        }
        .copyright-info {
          text-align: center;
          color: #666;
          font-size: 12px;
          line-height: 1.6;
        }
      `;
      document.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  }

  function createButton(onClick) {
    ensureButtonStyles();

    const quickChatBtn = document.createElement('div');
    quickChatBtn.className = 'quick-chat-btn x78zum5 x6s0dn4 x1y1aw1k x1sxyh0 xwib8y2 xurb0ha';
    quickChatBtn.setAttribute('role', 'button');
    quickChatBtn.setAttribute('tabindex', '0');
    quickChatBtn.setAttribute('title', '快速对话');
    quickChatBtn.setAttribute('aria-label', '发起临时对话');
    quickChatBtn.innerHTML = `
      <span aria-hidden="true" data-icon="quick-chat" class="">
        <svg t="1734071546020" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M314.8288 518.9376c-10.3424 0-17.2288-3.456-24.1408-10.3424-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c3.456-3.456 6.8864-6.8864 10.3424-6.8864 6.8864-3.456 17.2288-3.456 27.5712 0 3.456 0 6.8864 3.456 10.3424 6.8864 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-6.8864 6.8864-17.2032 10.3424-24.1152 10.3424z m144.7936 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3424 3.456-13.7728 3.456z m144.768 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3168 3.456-13.7728 3.456z m0 0" fill="#1296db"/>
          <path d="M883.6096 753.3312c27.5712-44.8 41.3696-93.0816 41.3696-144.7936 0-93.0816-48.256-179.2512-127.5392-234.4192h-3.456C742.272 250.0096 611.2768 163.84 456.1664 163.84c-196.48-3.456-358.5024 141.3376-358.5024 320.5888 0 58.5984 13.7984 110.3104 48.256 158.5664l-44.8 117.1968c-3.456 10.3424-3.456 24.1408 6.8864 34.4832 3.456 10.3424 13.7984 13.7984 24.1408 13.7984h6.8864l158.5664-31.0272c13.7984 6.8864 27.5712 10.3424 41.3696 13.7984 62.0544 68.9408 155.136 110.3104 255.104 110.3104 51.712 0 99.968-10.3424 144.7936-27.5712l144.7936 27.5712h6.8864c10.3424 0 20.6848-3.456 27.5712-13.7984 6.8864-10.3424 10.3424-24.1408 6.8864-34.4832l-41.3952-99.9424z m-582.5536-44.8h-6.8864l-110.3104 20.6848 27.5712-75.8272c3.456-10.3424 3.456-24.1408-3.456-31.0272-27.5712-44.8-41.3696-89.6256-41.3696-137.8816 0-141.3376 130.9952-255.104 293.0176-255.104 162.0224 0 293.0176 113.7664 293.0176 255.104s-134.4512 255.104-293.0176 255.104c-51.712 0-99.968-10.3424-141.3376-31.0272h-17.2288z m513.6128 51.712l24.1408 62.0544-93.0816-17.2288c-6.8864 0-13.7984 0-20.6848 3.456-37.9136 17.2288-82.7392 27.5712-127.5392 27.5712-41.3696 0-82.7392-10.3424-120.6528-27.5712 189.5936-6.8864 341.2736-148.224 341.2736-320.5888 24.1408 34.4832 37.9136 75.8272 37.9136 120.6528 0 41.3696-13.7984 82.7392-41.3696 120.6528-3.4304 10.3168-3.4304 20.6592 0 31.0016z m0 0" fill="#1296db"/>
        </svg>
      </span>
    `;

    try {
      quickChatBtn.addEventListener('click', () => {
        try {
          onClick?.();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    return quickChatBtn;
  }

  function insertButtonIntoContainer(buttonEl, targetContainer) {
    if (!buttonEl || !targetContainer) return false;

    try {
      const xpathResult = document.evaluate(
        '//*[@id="app"]/div/div[3]/div/div[3]/header/header/div/span/div/div[1]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const targetElement = xpathResult.singleNodeValue;
      if (targetElement && targetElement.parentNode) {
        targetElement.parentNode.insertBefore(buttonEl, targetElement);
        return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      const titleElement = targetContainer.querySelector('div[title="对话"]');
      if (titleElement && titleElement.parentNode) {
        const insertBefore = titleElement.nextSibling;
        if (insertBefore) {
          titleElement.parentNode.insertBefore(buttonEl, insertBefore);
          return true;
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      targetContainer.appendChild(buttonEl);
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderModal() {
    ensureModalStyles();

    const modal = document.createElement('div');
    modal.className = 'quick-chat-modal';
    modal.innerHTML = `
      <div class="quick-chat-content">
        <h3>发起临时对话</h3>
        <div class="input-group">
          <div class="input-field phone-number">
            <label for="waapQuickChatPhone">手机号码（含国际区号）</label>
            <input type="text" id="waapQuickChatPhone" placeholder="例如：+8613160235855">
          </div>
        </div>
        <div class="button-group">
          <button type="button" class="quick-chat-cancel-btn" data-action="cancel">取消</button>
          <button type="button" class="quick-chat-confirm-btn" data-action="confirm">确定</button>
        </div>
        <div class="copyright-info">
          本插件由WhatsApp Assistant Pro+（by Achord）驱动
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const phoneInput = modal.querySelector('#waapQuickChatPhone');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const confirmBtn = modal.querySelector('[data-action="confirm"]');

    try {
      phoneInput?.focus();
    } catch (e) {
      // ignore
    }

    return { modal, phoneInput, cancelBtn, confirmBtn };
  }

  window.WAAP.views.quickChatView = {
    createButton,
    insertButtonIntoContainer,
    renderModal
  };
})();
