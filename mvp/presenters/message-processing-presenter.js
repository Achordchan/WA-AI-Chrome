(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.messageProcessingPresenter) return;

  function getMessageTextRoot(messageElement) {
    if (!messageElement) return null;

    const isInsideQuotedBlock = (el) => {
      try {
        if (!el) return false;
        const qa = el.closest('[data-testid*="quoted"], [data-testid*="reply"], [aria-label*="引用"], [aria-label*="回复"]');
        return !!(qa && messageElement.contains(qa));
      } catch (e) {
        return false;
      }
    };

    const selectable = messageElement.querySelector('.selectable-text');
    if (selectable && !isInsideQuotedBlock(selectable)) return selectable;

    const candidates = messageElement.querySelectorAll('span[dir], div[dir]');
    let best = null;
    let bestLen = 0;
    let bestQuoted = null;
    let bestQuotedLen = 0;
    candidates.forEach((el) => {
      const inQuoted = isInsideQuotedBlock(el);
      const t = (el.textContent || '').replace(/\u200e/g, '').trim();
      if (!t) return;
      if (/^\d{1,2}:\d{2}$/.test(t)) return;
      if (t === 'msg-dblcheck') return;
      if (inQuoted) {
        if (t.length > bestQuotedLen) {
          bestQuoted = el;
          bestQuotedLen = t.length;
        }
        return;
      }
      if (t.length > bestLen) {
        best = el;
        bestLen = t.length;
      }
    });
    if (best) return best;
    if (bestQuoted) return bestQuoted;

    if (messageElement.classList && messageElement.classList.contains('copyable-text')) {
      return messageElement;
    }

    return messageElement;
  }

  function addTranslateButton(messageElement, deps = {}) {
    try {
      if (!messageElement) return false;

      if (messageElement.querySelector('.translate-btn-container')) {
        return true;
      }

      const translateBtn = document.createElement('button');
      translateBtn.className = 'translate-btn';
      translateBtn.innerHTML = `译`;
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
              translateText: deps.translateText,
              getMessageTextRoot: deps.getMessageTextRoot,
              collectTextContent: deps.collectTextContent,
              typeWriter: deps.typeWriter,
              maybeScrollChatToBottom: deps.maybeScrollChatToBottom
            });
            if (ok) return;
          }
        } catch (e3) {
          // ignore
        }

        try {
          const fn = deps.translateMessage;
          if (typeof fn === 'function') {
            await fn(messageElement);
          }
        } catch (e4) {
          // ignore
        }
      };

      const buttonContainer = document.createElement('span');
      buttonContainer.className = 'translate-btn-container';
      buttonContainer.appendChild(translateBtn);

      const getRoot = deps.getMessageTextRoot || getMessageTextRoot;
      const textRoot = getRoot(messageElement);
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

  function processMessage(message, deps = {}) {
    try {
      if (!message) return false;

      if (!message.dataset.processed) {
        try {
          message.classList.add('message-wrapper');
          message.classList.add('waai-message');
          message.style.position = 'relative';
        } catch (e) {
          // ignore
        }

        const ok = addTranslateButton(message, deps);
        if (!ok) return false;

        message.dataset.processed = 'true';
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.messageProcessingPresenter = {
    getMessageTextRoot,
    addTranslateButton,
    processMessage
  };
})();
