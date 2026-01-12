/*
用途：单条消息“译”按钮 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP messageProcessingPresenter.addTranslateButton 不可用时，使用旧版 DOM 方式在消息文本前插入“译”按钮，并在点击时触发翻译。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.addTranslateButtonFallback) return;

  function legacyAddTranslateButton(messageElement, deps = {}) {
    const documentRef = deps.document || window.document;
    const translateText = deps.translateText || window.translateText;
    const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
    const collectTextContent = deps.collectTextContent || window.collectTextContent;
    const typeWriter = deps.typeWriter || window.typeWriter;
    const maybeScrollChatToBottom = deps.maybeScrollChatToBottom || window.maybeScrollChatToBottom;
    const translateMessage = deps.translateMessage || window.translateMessage;

    try {
      if (!messageElement || !(messageElement instanceof Element)) return false;

      // 检查是否已经添加过按钮
      if (messageElement.querySelector('.translate-btn-container')) {
        return true;
      }

      // 创建翻译按钮
      const translateBtn = documentRef.createElement('button');
      translateBtn.className = 'translate-btn';
      translateBtn.innerHTML = '译';

      translateBtn.onclick = async (e) => {
        try {
          e.stopPropagation();
          e.preventDefault();
        } catch (e2) {
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
            if (ok) return;
          }
        } catch (e3) {
          // ignore
        }

        try {
          if (typeof translateMessage === 'function') {
            await translateMessage(messageElement);
          }
        } catch (e4) {
          // ignore
        }
      };

      // 创建按钮容器
      const buttonContainer = documentRef.createElement('span');
      buttonContainer.className = 'translate-btn-container';
      buttonContainer.appendChild(translateBtn);

      // 将按钮放到消息文本最开头（inline），而不是悬浮在角落
      let textRoot = null;
      try {
        if (typeof getMessageTextRoot === 'function') textRoot = getMessageTextRoot(messageElement);
      } catch (e) {
        textRoot = null;
      }

      if (textRoot && textRoot.firstChild) {
        textRoot.insertBefore(buttonContainer, textRoot.firstChild);
      } else if (textRoot) {
        textRoot.appendChild(buttonContainer);
      } else if (messageElement.firstChild) {
        messageElement.insertBefore(buttonContainer, messageElement.firstChild);
      } else {
        messageElement.appendChild(buttonContainer);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.addTranslateButtonFallback = {
    legacyAddTranslateButton
  };
})();
