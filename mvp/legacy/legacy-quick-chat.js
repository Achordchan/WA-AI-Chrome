/*
用途：quick-chat.js 的 legacy fallback（按钮注入 + 弹窗 + DOM 观察器）。
说明：当 MVP quickChatPresenter 不可用时，使用此旧实现保证功能可用；保持可回滚。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.quickChatFallback) return;

  // 添加在 content.js 中的合适位置
  // 添加节流函数
  function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  function resolveActionSlot(buttonEl, scope) {
    if (!buttonEl) return null;

    let current = buttonEl.parentElement || buttonEl;
    while (current && current !== scope) {
      const parent = current.parentElement;
      if (!parent) break;
      if (parent.children.length > 1) {
        return {
          parent,
          slot: current
        };
      }
      current = parent;
    }

    return null;
  }

  function collectAncestors(element) {
    const ancestors = [];
    let current = element;
    while (current) {
      ancestors.push(current);
      current = current.parentElement;
    }
    return ancestors;
  }

  function getDirectChild(container, element) {
    let current = element;
    while (current && current.parentElement !== container) {
      current = current.parentElement;
    }
    return current && current.parentElement === container ? current : null;
  }

  function findSharedActionBar(scope = document) {
    try {
      const newChatBtn =
        scope?.querySelector?.('button[aria-label="新聊天"]') ||
        scope?.querySelector?.('button[aria-label="New chat"]') ||
        document.querySelector('button[aria-label="新聊天"]') ||
        document.querySelector('button[aria-label="New chat"]');
      const menuBtn =
        scope?.querySelector?.('button[aria-label="菜单"]') ||
        scope?.querySelector?.('button[aria-label="Menu"]') ||
        document.querySelector('button[aria-label="菜单"]') ||
        document.querySelector('button[aria-label="Menu"]');

      if (newChatBtn && menuBtn) {
        const newChatAncestors = collectAncestors(newChatBtn);
        const menuAncestors = new Set(collectAncestors(menuBtn));
        for (const ancestor of newChatAncestors) {
          if (menuAncestors.has(ancestor) && ancestor.children && ancestor.children.length >= 2) {
            return { bar: ancestor, newChatBtn, menuBtn };
          }
        }
      }

      if (newChatBtn) {
        return {
          bar: newChatBtn.parentElement?.parentElement || newChatBtn.parentElement || newChatBtn,
          newChatBtn,
          menuBtn
        };
      }

      if (menuBtn) {
        return {
          bar: menuBtn.parentElement?.parentElement || menuBtn.parentElement || menuBtn,
          newChatBtn,
          menuBtn
        };
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  // 修改addQuickChatButton函数
  function addQuickChatButton() {
    try {
      console.log('开始尝试添加快速对话按钮');

      // 检查按钮是否已存在
      if (document.querySelector('.quick-chat-btn')) {
        console.log('快速对话按钮已存在，跳过添加');
        return;
      }

      let targetContainer = null;
      const actionBarInfo = findSharedActionBar(document);
      if (actionBarInfo?.bar) {
        targetContainer = actionBarInfo.bar;
      }

      // 扩展选择器列表，增加更多可能的DOM路径
      const selectors = [
        'header[data-tab="2"]',
        '.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
        'div[data-tab="3"]',
        '#side header',
        'header._23P3O',
        '#app div[role="navigation"]',
        '#app header',
        'header[data-testid="chatlist-header"]',
        '#side > header',
        '#app div[data-testid="chat-list-header"]'
      ];

      if (!targetContainer) {
        for (const selector of selectors) {
          targetContainer = document.querySelector(selector);
          if (targetContainer) {
            console.log('找到目标容器，使用选择器:', selector);
            break;
          }
        }
      }

      if (!targetContainer) {
        console.warn('未找到合适的目标容器，将等待重试');
        return;
      }

      // 创建新按钮
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

      // 添加样式
      const style = document.createElement('style');
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

      // 添加点击事件
      quickChatBtn.addEventListener('click', () => {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'quick-chat-modal';
        modal.innerHTML = `
        <div class="quick-chat-content">
          <h3>发起临时对话</h3>
          <div class="input-group">
            <div class="input-field phone-number">
              <label for="phoneNumber">手机号码（含国际区号）</label>
              <input type="text" id="phoneNumber" placeholder="例如：+8613160235855">
            </div>
          </div>
          <div class="button-group">
            <button id="cancelBtn">取消</button>
            <button id="confirmBtn">确定</button>
          </div>
          <div class="copyright-info">
            本插件由WhatsApp Assistant Pro+（by Achord）驱动
          </div>
        </div>
        </div>
      `;

        // 添加模态框样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
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
        #cancelBtn {
          background: #f5f5f5;
          border: 1px solid #ddd;
          color: #666;
        }
        #cancelBtn:hover {
          background: #e9e9e9;
        }
        #confirmBtn {
          background: #00a884;
          border: none;
          color: white;
        }
        #confirmBtn:hover {
          background: #008f6f;
        }
        .copyright-info {
          text-align: center;
          color: #666;
          font-size: 12px;
          line-height: 1.6;
        }
      `;
        document.head.appendChild(modalStyle);

        // 添加到页面
        document.body.appendChild(modal);

        // 绑定事件
        const cancelBtn = modal.querySelector('#cancelBtn');
        const confirmBtn = modal.querySelector('#confirmBtn');
        const areaCodeInput = modal.querySelector('#areaCode');
        const phoneNumberInput = modal.querySelector('#phoneNumber');

        // 添加回车键事件监听
        phoneNumberInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            confirmBtn.click();
          }
        });

        cancelBtn.addEventListener('click', () => {
          modal.remove();
        });

        confirmBtn.addEventListener('click', () => {
          const phoneNumber = phoneNumberInput.value.trim();

          if (!phoneNumber) {
            alert('请输入手机号码');
            return;
          }

          // 移除所有非数字字符，保留加号
          const fullNumber = phoneNumber.replace(/[^\d+]/g, '').replace(/^\+/, '');

          try {
            // 构建WhatsApp链接并打开
            const link = document.createElement('a');
            link.href = `whatsapp://send?phone=${fullNumber}`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
          } catch (error) {
            alert('无法打开 WhatsApp，请确保已安装 WhatsApp 客户端，请联系管理员修复');
          }

          modal.remove();
        });
      });

      // 尝试多种方式插入按钮
      try {
        // 方式1：围绕新聊天 / 菜单按钮动作区插入
        try {
          const scope =
            (targetContainer.matches && targetContainer.matches('header') ? targetContainer : null) ||
            targetContainer.querySelector?.('header') ||
            targetContainer;
          const sharedActionBar = findSharedActionBar(scope);
          const menuBtn = sharedActionBar?.menuBtn || null;
          const actionBtn = sharedActionBar?.newChatBtn || null;
          const menuSlot = resolveActionSlot(menuBtn, scope);
          const actionSlot = resolveActionSlot(actionBtn, scope);

          if (sharedActionBar?.bar) {
            const menuAnchor = menuBtn ? getDirectChild(sharedActionBar.bar, menuBtn) : null;
            if (menuAnchor) {
              sharedActionBar.bar.insertBefore(quickChatBtn, menuAnchor);
              console.log('成功在共同动作栏菜单前插入按钮');
              return;
            }

            const actionAnchor = actionBtn ? getDirectChild(sharedActionBar.bar, actionBtn) : null;
            if (actionAnchor) {
              sharedActionBar.bar.insertBefore(quickChatBtn, actionAnchor.nextSibling || null);
              console.log('成功在共同动作栏新聊天按钮后插入按钮');
              return;
            }
          }

          if (menuSlot?.parent && actionSlot?.parent && menuSlot.parent === actionSlot.parent) {
            menuSlot.parent.insertBefore(quickChatBtn, menuSlot.slot);
            console.log('成功在动作栏菜单前插入按钮');
            return;
          }

          if (menuSlot?.parent) {
            menuSlot.parent.insertBefore(quickChatBtn, menuSlot.slot);
            console.log('成功在菜单按钮前插入按钮');
            return;
          }

          if (actionSlot?.parent) {
            actionSlot.parent.insertBefore(quickChatBtn, actionSlot.slot.nextSibling || null);
            console.log('成功在新聊天按钮后插入按钮');
            return;
          }
        } catch (insertError) {
          console.error('动作区插入错误:', insertError);
        }

        // 方式2：在"对话"标题后插入
        const titleElement =
          targetContainer.querySelector('div[title="对话"]') ||
          targetContainer.querySelector('div[title="Chats"]');
        if (titleElement && titleElement.parentNode) {
          titleElement.parentNode.insertBefore(quickChatBtn, titleElement.nextSibling || null);
          console.log('成功在对话标题后插入按钮');
          return;
        }

        // 方式3：在header的最后插入
        targetContainer.appendChild(quickChatBtn);
        console.log('成功在header末尾插入按钮');
      } catch (error) {
        console.error('插入按钮时发生错误:', error);
      }
    } catch (error) {
      console.error('添加快速对话按钮时发生错误:', error);
    }
  }

  // 修改重试机制
  let retryCount = 0;
  const MAX_RETRIES = 15;
  const RETRY_INTERVAL = 3000;

  function retryAddButton() {
    // 使用之前定义好的选择器列表
    const selectors = [
      'header[data-tab="2"]',
      '.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
      'div[data-tab="3"]',
      '#side header',
      'header._23P3O',
      '#app div[role="navigation"]',
      '#app header',
      'header[data-testid="chatlist-header"]',
      '#side > header',
      '#app div[data-testid="chat-list-header"]',
      // 添加新的选择器路径
      '#app > div > div > div > div > header'
    ];

    let targetContainer = null;
    const actionBarInfo = findSharedActionBar(document);
    if (actionBarInfo?.bar) {
      targetContainer = actionBarInfo.bar;
    }

    if (!targetContainer) {
      for (const selector of selectors) {
        targetContainer = document.querySelector(selector);
        if (targetContainer) {
          break;
        }
      }
    }

    if (!targetContainer) {
      // 如果没有找到容器，使用 debug 级别的日志
      console.debug('等待目标容器加载...');

      // 添加重试逻辑
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          retryCount++;
          retryAddButton();
        }, RETRY_INTERVAL);
      }
      return;
    }

    // 检查按钮是否已存在
    if (targetContainer.querySelector('.quick-chat-btn')) {
      return;
    }

    // 调用添加按钮的函数
    addQuickChatButton();
  }

  function initializeQuickChat(deps = {}) {
    try {
      const chromeRef = deps.chrome || window.chrome;
      const documentRef = deps.document || window.document;

      if (!chromeRef?.storage?.sync?.get) {
        retryAddButton();
      } else {
        chromeRef.storage.sync.get(['quickChatEnabled'], (data) => {
          const enabled = data?.quickChatEnabled !== false;
          if (!enabled) {
            return;
          }

          // 修改观察器配置
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.addedNodes.length && !documentRef.querySelector('.quick-chat-btn')) {
                retryAddButton();
              }
            }
          });

          // 开始观察，使用更宽松的配置
          observer.observe(documentRef.body, {
            childList: true,
            subtree: true,
            attributes: true
          });

          // 初始检查
          retryAddButton();
        });
      }
    } catch (e) {
      // ignore
    }
  }

  window.WAAP.legacy.quickChatFallback = {
    initializeQuickChat
  };
})();
