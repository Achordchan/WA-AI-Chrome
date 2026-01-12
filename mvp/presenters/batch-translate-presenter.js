(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.batchTranslatePresenter) return;

  function detectDarkMode() {
    try {
      return (
        document.body.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
        document.documentElement.getAttribute('data-theme') === 'dark'
      );
    } catch (e) {
      return false;
    }
  }

  function findMessageContainer(messageEl) {
    try {
      let msgContainer = messageEl?.closest?.('.message-container');
      if (!msgContainer) {
        msgContainer = messageEl?.parentElement;
        if (!msgContainer) msgContainer = messageEl;
        try {
          msgContainer?.classList?.add?.('message-container');
        } catch (e) {
          // ignore
        }
      }
      return msgContainer || null;
    } catch (e) {
      return null;
    }
  }

  async function translateAllMessages(messageContainer, deps = {}) {
    const showToast = deps.showToast || window.showToast;
    const notificationId = typeof showToast === 'function'
      ? showToast('正在使用Google翻译批量翻译所有消息...', 'info', 0)
      : null;

    try {
      const messages = messageContainer?.querySelectorAll?.('div[data-pre-plain-text]') || [];
      let translatedCount = 0;

      const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
      const collectTextContent = deps.collectTextContent || window.collectTextContent;

      const api = deps.ApiServices || window.ApiServices;
      const googleTranslate = deps.translateGoogle || api?.translation?.google;
      if (typeof googleTranslate !== 'function') {
        throw new Error('Google翻译服务不可用');
      }

      for (const message of messages) {
        try {
          const msgContainer = findMessageContainer(message);
          if (!msgContainer) continue;

          const existingTranslation = msgContainer.querySelector('.translation-content');
          if (existingTranslation) {
            if (existingTranslation.style.display === 'none') {
              existingTranslation.style.display = 'block';
              const thinkingContent = msgContainer.querySelector('.thinking-content');
              if (thinkingContent) thinkingContent.style.display = 'block';
            }
            continue;
          }

          if (msgContainer.querySelector('.translation-loading') || msgContainer.querySelector('.translation-error')) {
            continue;
          }

          const textElement = typeof getMessageTextRoot === 'function' ? getMessageTextRoot(message) : null;
          if (!textElement) continue;

          const text = typeof collectTextContent === 'function' ? collectTextContent(textElement) : '';
          if (!text) continue;

          const translation = await googleTranslate(text, 'auto', 'zh-CN');
          if (!translation) continue;

          const isDarkMode = detectDarkMode();
          const translationElement = document.createElement('div');
          translationElement.className = 'translation-content';

          if (isDarkMode) {
            translationElement.style.cssText = `
              background-color: rgba(10, 110, 200, 0.1);
              border-left: 3px solid #1e88e5;
              color: #e2e2e2;
              padding: 8px 12px;
              margin-top: 5px;
              font-size: 14px;
              border-radius: 0 4px 4px 0;
              position: relative;
              animation: fadeIn 0.3s ease-in-out;
            `;
          } else {
            translationElement.style.cssText = `
              background-color: rgba(220, 240, 255, 0.7);
              border-left: 3px solid #2196f3;
              color: #333;
              padding: 8px 12px;
              margin-top: 5px;
              font-size: 14px;
              border-radius: 0 4px 4px 0;
              position: relative;
              animation: fadeIn 0.3s ease-in-out;
            `;
          }

          translationElement.textContent = String(translation || '');
          msgContainer.appendChild(translationElement);
          translatedCount++;

          if (notificationId && (translatedCount % 5 === 0 || translatedCount === messages.length)) {
            const toastElement = document.getElementById(notificationId);
            const contentEl = toastElement?.querySelector?.('.toast-content');
            if (contentEl) {
              contentEl.textContent = `正在使用Google翻译批量翻译所有消息... (${translatedCount}/${messages.length})`;
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (notificationId) {
        const toastElement = document.getElementById(notificationId);
        const contentEl = toastElement?.querySelector?.('.toast-content');
        if (contentEl) {
          contentEl.textContent = `批量翻译完成！已翻译 ${translatedCount} 条消息`;
          setTimeout(() => {
            try {
              document.getElementById(notificationId)?.remove();
            } catch (e) {
              // ignore
            }
          }, 3000);
        }
      }

      return true;
    } catch (error) {
      if (notificationId) {
        const toastElement = document.getElementById(notificationId);
        const contentEl = toastElement?.querySelector?.('.toast-content');
        if (contentEl) {
          contentEl.textContent = `批量翻译失败: ${error?.message || '未知错误'}`;
        }
        try {
          if (toastElement) toastElement.className = toastElement.className.replace('info', 'error');
        } catch (e) {
          // ignore
        }
        setTimeout(() => {
          try {
            document.getElementById(notificationId)?.remove();
          } catch (e) {
            // ignore
          }
        }, 3000);
      }
      return false;
    }
  }

  window.WAAP.presenters.batchTranslatePresenter = {
    translateAllMessages
  };
})();
