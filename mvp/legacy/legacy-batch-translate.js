/*
用途：批量翻译 legacy fallback（从 content.js 迁移出来）。当 MVP batchTranslatePresenter 不可用时，负责使用 Google 翻译批量翻译当前聊天窗口所有消息。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.batchTranslateFallback) return;

  async function legacyTranslateAllMessages(messageContainer, deps = {}) {
    const showToast = deps.showToast || window.showToast;
    const ApiServices = deps.ApiServices || window.ApiServices;
    const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
    const collectTextContent = deps.collectTextContent || window.collectTextContent;

    const documentRef = deps.document || window.document;
    const windowRef = deps.window || window;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    // 显示浮动消息框，提示用户翻译开始
    const notificationId = typeof showToast === 'function'
      ? showToast('正在使用Google翻译批量翻译所有消息...', 'info', 0)
      : null;

    try {
      if (!messageContainer || !messageContainer.querySelectorAll) {
        throw new Error('messageContainer 不可用');
      }

      // 获取所有消息
      const messages = messageContainer.querySelectorAll('div[data-pre-plain-text]');
      let translatedCount = 0;

      const googleTranslate = ApiServices?.translation?.google;
      if (typeof googleTranslate !== 'function') {
        throw new Error('Google翻译服务不可用');
      }

      // 遍历所有消息进行翻译
      for (const message of messages) {
        try {
          // 获取消息容器（批量翻译是否重复，应该以容器为准判断）
          let msgContainer = message.closest('.message-container');
          if (!msgContainer) {
            msgContainer = message.parentElement;
            if (!msgContainer) {
              msgContainer = message;
            }
            msgContainer.classList.add('message-container');
          }

          // 如果已经翻译过/正在翻译/上次翻译失败的提示还在，就跳过，避免重复翻译
          // 但：如果用户手动把翻译隐藏了，批量翻译应把它重新显示出来。
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

          // 获取文本元素
          const textElement = typeof getMessageTextRoot === 'function' ? getMessageTextRoot(message) : null;
          if (!textElement) continue;

          // 收集文本内容
          const text = typeof collectTextContent === 'function' ? collectTextContent(textElement) : '';
          if (!text) continue;

          // 直接使用Google翻译服务，不使用当前用户设置的翻译服务
          const translation = await googleTranslate(text, 'auto', 'zh-CN');

          // 创建翻译结果元素（不包含思考过程）
          if (translation) {
            // 检测是否为暗黑模式
            const isDarkMode = documentRef.body.classList.contains('dark') ||
              (windowRef.matchMedia && windowRef.matchMedia('(prefers-color-scheme: dark)').matches) ||
              documentRef.documentElement.getAttribute('data-theme') === 'dark';

            // 创建翻译结果元素
            const translationElement = documentRef.createElement('div');
            translationElement.className = 'translation-content';

            // 应用样式
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

            // 设置翻译内容
            translationElement.textContent = translation;

            // 添加到消息容器
            msgContainer.appendChild(translationElement);
            translatedCount++;

            // 更新浮动消息框内容显示进度
            if (notificationId && (translatedCount % 5 === 0 || translatedCount === messages.length)) {
              const toastElement = documentRef.getElementById(notificationId);
              if (toastElement && toastElement.querySelector('.toast-content')) {
                toastElement.querySelector('.toast-content').textContent =
                  `正在使用Google翻译批量翻译所有消息... (${translatedCount}/${messages.length})`;
              }
            }
          }
        } catch (error) {
          // 失败时继续处理下一条，不中断整体翻译
          continue;
        }
      }

      // 更新浮动消息框，显示翻译完成
      if (notificationId) {
        const toastElement = documentRef.getElementById(notificationId);
        if (toastElement && toastElement.querySelector('.toast-content')) {
          toastElement.querySelector('.toast-content').textContent =
            `批量翻译完成！已翻译 ${translatedCount} 条消息`;
          setTimeoutRef(() => {
            try {
              documentRef.getElementById(notificationId)?.remove();
            } catch (e) {
              // ignore
            }
          }, 3000);
        }
      }

      return true;
    } catch (error) {
      // 显示错误提示
      if (notificationId) {
        const toastElement = documentRef.getElementById(notificationId);
        if (toastElement) {
          if (toastElement.querySelector('.toast-content')) {
            toastElement.querySelector('.toast-content').textContent =
              `批量翻译失败: ${error.message || '未知错误'}`;
          }
          toastElement.className = toastElement.className.replace('info', 'error');
          setTimeoutRef(() => {
            try {
              documentRef.getElementById(notificationId)?.remove();
            } catch (e) {
              // ignore
            }
          }, 3000);
        }
      }
      return false;
    }
  }

  window.WAAP.legacy.batchTranslateFallback = {
    legacyTranslateAllMessages
  };
})();
