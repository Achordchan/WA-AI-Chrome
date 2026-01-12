/*
用途：单条消息翻译 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP translateMessagePresenter 不可用时，使用旧版 DOM 逻辑完成翻译、渲染加载/错误/思考过程，并保持滚动到底部体验。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.translateMessageFallback) return;

  async function legacyTranslateMessage(messageElement, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const translateText = deps.translateText || window.translateText;
      const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
      const collectTextContent = deps.collectTextContent || window.collectTextContent;
      const typeWriter = deps.typeWriter || window.typeWriter;
      const displayTranslationResult = deps.displayTranslationResult || window.displayTranslationResult;
      const maybeScrollChatToBottom = deps.maybeScrollChatToBottom || window.maybeScrollChatToBottom;
      const getChatScrollContainer = deps.getChatScrollContainer || window.getChatScrollContainer;
      const isNearBottom = deps.isNearBottom || window.isNearBottom;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      // 确保元素存在
      if (!messageElement) {
        console.error('translateMessage: 消息元素不存在');
        return;
      }

      // 获取消息容器 - 修改查找逻辑
      let messageContainer = messageElement.closest('.message-container');

      // 如果没有找到标准消息容器，尝试使用消息元素本身作为容器
      if (!messageContainer) {
        console.log('translateMessage: 使用替代消息容器查找方法');
        // 如果消息元素有父DIV，使用它作为容器
        messageContainer = messageElement.parentElement;

        // 如果还是找不到合适的容器，直接使用消息元素本身
        if (!messageContainer) {
          messageContainer = messageElement;
        }

        // 为找到的容器添加消息容器类，以便后续处理
        try {
          messageContainer.classList.add('message-container');
        } catch (e) {
          // ignore
        }
      }

      try {
        const scroller = typeof getChatScrollContainer === 'function' ? getChatScrollContainer() : null;
        const shouldScroll = scroller && typeof isNearBottom === 'function' ? isNearBottom(scroller) : false;
        messageContainer.dataset.waaiShouldScrollBottom = shouldScroll ? 'true' : 'false';
      } catch (e) {
        // ignore
      }

      try {
        if (window.WAAP?.presenters?.translationPresenter?.translateMessage) {
          const ok = await window.WAAP.presenters.translationPresenter.translateMessage(messageElement, {
            translateText,
            getMessageTextRoot,
            collectTextContent,
            typeWriter,
            maybeScrollChatToBottom
          });
          if (ok) {
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // 检查是否已经有翻译
      const existingTranslation = messageContainer.querySelector('.translation-content');
      if (existingTranslation) {
        // 已经有翻译，切换显示/隐藏
        if (existingTranslation.style.display === 'none') {
          existingTranslation.style.display = 'block';
          // 同时显示思考过程（如果有）
          const thinkingContent = messageContainer.querySelector('.thinking-content');
          if (thinkingContent) {
            thinkingContent.style.display = 'block';
          }
          if (typeof maybeScrollChatToBottom === 'function') {
            maybeScrollChatToBottom(messageContainer);
          }
        } else {
          existingTranslation.style.display = 'none';
          // 同时隐藏思考过程（如果有）
          const thinkingContent = messageContainer.querySelector('.thinking-content');
          if (thinkingContent) {
            thinkingContent.style.display = 'none';
          }
        }
        return;
      }

      // 创建加载指示器
      const loadingElement = documentRef.createElement('div');
      loadingElement.className = 'translation-loading';
      loadingElement.innerHTML = '翻译中<span class="loading-dots"></span>';
      messageContainer.appendChild(loadingElement);

      try {
        // 提取原始文本
        const textElement = typeof getMessageTextRoot === 'function' ? getMessageTextRoot(messageElement) : null;

        if (!textElement) {
          console.error('translateMessage: 无法找到可选择文本元素');
          messageContainer.removeChild(loadingElement);
          return;
        }

        // 收集文本内容 (包括表情)
        const text = typeof collectTextContent === 'function' ? collectTextContent(textElement) : '';

        if (!text) {
          console.error('translateMessage: 无法获取消息文本');
          messageContainer.removeChild(loadingElement);
          return;
        }

        console.log('原始消息文本:', text);

        // 翻译文本
        const translation = typeof translateText === 'function' ? await translateText(text) : '';
        console.log('获得翻译结果:', translation);

        // 移除加载指示器
        messageContainer.removeChild(loadingElement);

        // 创建翻译元素
        if (translation) {
          // 检查是否返回了带有思考过程的翻译对象（针对OpenAI接口的推理模式）
          if (typeof translation === 'object' && translation.hasThinking) {
            // 先创建思考过程容器（如果有）
            if (translation.thinking) {
              const thinkingElement = documentRef.createElement('div');
              thinkingElement.className = 'thinking-content';

              // 检测是否为暗黑模式
              const isDarkMode =
                documentRef.body.classList.contains('dark') ||
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
                documentRef.documentElement.getAttribute('data-theme') === 'dark';

              // 根据模式选择不同的样式
              if (isDarkMode) {
                thinkingElement.style.cssText = `
                background-color: rgba(20, 75, 150, 0.3);
                border-left: 3px solid #3b82f6;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #e0e0e0;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
              } else {
                thinkingElement.style.cssText = `
                background-color: rgba(240, 247, 255, 0.8);
                border-left: 3px solid #2196F3;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #333;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
              }

              // 添加空容器，用于打字机效果
              thinkingElement.innerHTML = '';
              messageContainer.appendChild(thinkingElement);

              // 应用打字机效果
              if (typeof typeWriter === 'function') {
                typeWriter(thinkingElement, translation.thinking, 5, () => {
                  // 思考完成后，显示翻译结果
                  if (typeof displayTranslationResult === 'function') {
                    displayTranslationResult(messageContainer, translation.translation, isDarkMode);
                  }
                });
              } else {
                thinkingElement.textContent = String(translation.thinking || '');
                if (typeof displayTranslationResult === 'function') {
                  displayTranslationResult(messageContainer, translation.translation, isDarkMode);
                }
              }
            } else {
              // 没有思考过程，直接显示翻译
              const isDarkMode =
                documentRef.body.classList.contains('dark') ||
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
                documentRef.documentElement.getAttribute('data-theme') === 'dark';
              if (typeof displayTranslationResult === 'function') {
                displayTranslationResult(messageContainer, translation.translation, isDarkMode);
              }
            }
          } else {
            // 普通翻译结果，直接显示
            const isDarkMode =
              documentRef.body.classList.contains('dark') ||
              (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
              documentRef.documentElement.getAttribute('data-theme') === 'dark';
            if (typeof displayTranslationResult === 'function') {
              displayTranslationResult(messageContainer, translation, isDarkMode);
            }
          }
        }
      } catch (error) {
        console.error('Translate error:', error);
        if (messageContainer.contains(loadingElement)) {
          // 替换加载指示器为错误消息
          loadingElement.textContent = `翻译失败: ${error.message}`;
          loadingElement.className = 'translation-error';

          // 3秒后自动删除错误消息
          setTimeoutRef(() => {
            if (messageContainer.contains(loadingElement)) {
              messageContainer.removeChild(loadingElement);
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Translation function error:', error);
    }
  }

  window.WAAP.legacy.translateMessageFallback = {
    legacyTranslateMessage
  };
})();
