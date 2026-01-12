(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.whatsappDomService) return;

  function getMain() {
    try {
      return document.querySelector('#main');
    } catch (e) {
      return null;
    }
  }

  function getMainHeader(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      return main.querySelector('header');
    } catch (e) {
      return null;
    }
  }

  function getMainFooter(mainEl) {
    try {
      const main = mainEl || getMain();
      if (!main) return null;
      return document.querySelector('footer._ak1i') || main.querySelector('footer');
    } catch (e) {
      return null;
    }
  }

  function getChatEditable(footerEl) {
    try {
      const footer = footerEl || getMainFooter();
      if (!footer) return null;
      return footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') || footer.querySelector('div[contenteditable="true"]');
    } catch (e) {
      return null;
    }
  }

  function isChatWindowExists() {
    try {
      const main = getMain();
      if (!main) return false;
      const header = getMainHeader(main);
      if (!header) return false;
      const editable = getChatEditable(getMainFooter(main));
      return !!editable;
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
    isChatWindowExists,
    getChatTitleFirstLine,
    getMessageElementsInActiveChat,
    getChatScrollContainer,
    isNearBottom,
    maybeScrollChatToBottom,
    isElementInMain
  };
})();
