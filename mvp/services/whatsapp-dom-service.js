(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.whatsappDomService) return;

  const MEDIA_CAPTION_LABEL_RE = /^(输入消息|add a caption|caption)$/i;

  function getTextboxAriaLabel(el) {
    try {
      return String(el?.getAttribute?.('aria-label') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function isSendButtonLike(el) {
    try {
      if (!el) return false;
      const label = `${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`.trim();
      return /发送|send/i.test(label);
    } catch (e) {
      return false;
    }
  }

  function isEmojiButtonLike(el) {
    try {
      if (!el) return false;
      const label = `${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`.trim();
      return /表情|emoji|sticker|caption|动图/i.test(label);
    } catch (e) {
      return false;
    }
  }

  function findActionButton(scopeEl, matcher) {
    try {
      if (!scopeEl?.querySelectorAll || typeof matcher !== 'function') return null;
      return Array.from(scopeEl.querySelectorAll('button, [role="button"]')).find((el) => matcher(el)) || null;
    } catch (e) {
      return null;
    }
  }

  function hasSendAction(scopeEl) {
    return !!findActionButton(scopeEl, isSendButtonLike);
  }

  function getMain() {
    try {
      const mains = document.querySelectorAll('#main');
      if (!mains || mains.length === 0) return null;
      if (mains.length === 1) return mains[0];

      let best = mains[0];
      let bestScore = -1;

      mains.forEach((el) => {
        try {
          if (!el || !el.querySelector) return;

          let score = 0;
          if (el.querySelector('footer') || el.querySelector('[data-testid="compose-box"]')) score += 5;
          if (el.querySelector('[data-testid="conversation-panel-messages"]')) score += 4;
          if (el.querySelector('div[data-pre-plain-text]')) score += 3;
          if (
            el.querySelector('header') ||
            el.querySelector('[data-testid="conversation-header"]') ||
            el.querySelector('[role="banner"]')
          ) {
            score += 2;
          }

          if (score > bestScore) {
            bestScore = score;
            best = el;
          }
        } catch (e) {
          // ignore
        }
      });

      return best;
    } catch (e) {
      return null;
    }
  }

  function getMainHeader(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      const header =
        main.querySelector('header') ||
        main.querySelector('[data-testid="conversation-header"]') ||
        main.querySelector('[role="banner"]');
      if (header) return header;
      return (
        document.querySelector('header[data-testid="conversation-header"]') ||
        document.querySelector('header[aria-label*="Chat"], header[aria-label*="聊天"]')
      );
    } catch (e) {
      return null;
    }
  }

  function getMainFooter(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      const footer = (
        main.querySelector('[data-testid="compose-box"]') ||
        main.querySelector('footer') ||
        main.querySelector('footer._ak1i')
      );
      if (footer) return footer;
      return document.querySelector('[data-testid="compose-box"]') || document.querySelector('#main footer');
    } catch (e) {
      return null;
    }
  }

  function getChatEditable(footerEl) {
    try {
      const main = getMain();
      const footer = footerEl || getMainFooter(main);
      if (footer) {
        return (
          footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') ||
          footer.querySelector('div[contenteditable="true"][role="textbox"]') ||
          footer.querySelector('div[contenteditable="true"]')
        );
      }
      if (!main) return null;
      return (
        main.querySelector('.lexical-rich-text-input div[contenteditable="true"]') ||
        main.querySelector('div[contenteditable="true"][role="textbox"]') ||
        main.querySelector('div[contenteditable="true"]')
      );
    } catch (e) {
      return null;
    }
  }

  function getMediaCaptionInputTarget(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      const footer = getMainFooter(main);
      const inputs = main.querySelectorAll('div[contenteditable="true"][role="textbox"]');
      for (const inputBox of inputs) {
        if (footer && footer.contains(inputBox)) continue;

        const ariaLabel = getTextboxAriaLabel(inputBox);
        const scope = inputBox.closest('.copyable-area') || inputBox.parentElement || inputBox.closest('div');
        if (!scope || !hasSendAction(scope)) continue;
        if (ariaLabel && !MEDIA_CAPTION_LABEL_RE.test(ariaLabel)) continue;

        const container = inputBox.closest('.lexical-rich-text-input');
        const emojiButton = findActionButton(scope, isEmojiButtonLike);
        return {
          kind: 'preview',
          inputBox,
          container,
          mountParent: emojiButton?.parentNode || container?.parentNode || scope,
          beforeNode: emojiButton || container?.nextSibling || null,
          scope
        };
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getChatInputTarget(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      const footer = getMainFooter(main);
      const inputBox = getChatEditable(footer);
      if (!inputBox) return null;

      const container = inputBox.closest('.lexical-rich-text-input');
      return {
        kind: 'chat',
        inputBox,
        container,
        mountParent: container?.parentNode || footer,
        beforeNode: container?.nextSibling || null,
        scope: footer
      };
    } catch (e) {
      return null;
    }
  }

  function getActiveInputTarget(mainEl) {
    return getMediaCaptionInputTarget(mainEl) || getChatInputTarget(mainEl);
  }

  function isMediaCaptionInput(inputEl) {
    try {
      const main = getMain();
      const target = getMediaCaptionInputTarget(main);
      return !!(target?.inputBox && target.inputBox === inputEl);
    } catch (e) {
      return false;
    }
  }

  function isChatWindowExists() {
    try {
      const main = getMain();
      if (!main) return false;
      const header = getMainHeader(main);
      const editable = getChatEditable(getMainFooter(main));
      if (editable) return true;
      const footer = getMainFooter(main);
      return !!(header || footer);
    } catch (e) {
      return false;
    }
  }

  function getChatTitleFirstLine() {
    try {
      const header = getMainHeader();
      if (!header) return '';
      const text = (header.innerText || '').trim();
      if (!text) return '';
      return (
        text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)[0] || ''
      );
    } catch (e) {
      return '';
    }
  }

  function getMessageElementsInActiveChat() {
    try {
      const main = getMain();
      if (!main) return [];
      return Array.from(main.querySelectorAll('div[data-pre-plain-text]'));
    } catch (e) {
      return [];
    }
  }

  function getChatScrollContainer(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;

      const preferred = main.querySelector('[data-testid="conversation-panel-messages"]');
      if (preferred) return preferred;

      const candidates = main.querySelectorAll('div,section');
      for (const el of candidates) {
        const style = window.getComputedStyle(el);
        if (!style) continue;
        if (!/(auto|scroll)/.test(style.overflowY || '')) continue;
        if (el.scrollHeight > el.clientHeight + 50) return el;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function isNearBottom(el, threshold = 160) {
    try {
      return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
    } catch (e) {
      return false;
    }
  }

  function maybeScrollChatToBottom(messageContainer, deps = {}) {
    try {
      if (!messageContainer || messageContainer.dataset.waaiShouldScrollBottom !== 'true') return;

      const raf = deps.requestAnimationFrame || window.requestAnimationFrame;
      const scroller = deps.getChatScrollContainer ? deps.getChatScrollContainer() : getChatScrollContainer();
      if (!scroller) return;

      raf(() => {
        scroller.scrollTop = scroller.scrollHeight;
        raf(() => {
          scroller.scrollTop = scroller.scrollHeight;
        });
      });
    } catch (e) {
      // ignore
    }
  }

  function isElementInMain(el) {
    try {
      const main = getMain();
      if (!main) return false;
      return !!(el && main.contains(el));
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.whatsappDomService = {
    getMain,
    getMainHeader,
    getMainFooter,
    getChatEditable,
    getChatInputTarget,
    getMediaCaptionInputTarget,
    getActiveInputTarget,
    isMediaCaptionInput,
    hasSendAction,
    isChatWindowExists,
    getChatTitleFirstLine,
    getMessageElementsInActiveChat,
    getChatScrollContainer,
    isNearBottom,
    maybeScrollChatToBottom,
    isElementInMain
  };
})();
