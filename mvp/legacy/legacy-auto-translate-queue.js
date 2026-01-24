/*
用途：自动翻译队列/节流/去重的 legacy fallback（从 content.js 迁移出来）。
说明：本文件内部自维护状态，不依赖 content.js 里的 let 变量；当 MVP autoTranslatePresenter 不可用时使用。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};
  if (window.WAAP.legacy.autoTranslateQueue) return;

  let enabled = false;
  let lastAutoTranslateAt = 0;
  const AUTO_TRANSLATE_THROTTLE_MS = 900;
  const AUTO_TRANSLATE_IGNORE_AFTER_CHAT_SWITCH_MS = 1200;
  let lastChatKey = '';
  let lastChatSwitchAt = 0;
  let chatEnterTimer = null;

  const autoTranslatedMessageKeys = new Set();
  const autoTranslatedMessageKeyRing = [];
  const AUTO_TRANSLATE_KEY_RING_MAX = 500;

  let queue = [];
  let queueRunning = false;

  function rememberKey(key) {
    if (!key) return;
    if (autoTranslatedMessageKeys.has(key)) return;
    autoTranslatedMessageKeys.add(key);
    autoTranslatedMessageKeyRing.push(key);
    if (autoTranslatedMessageKeyRing.length > AUTO_TRANSLATE_KEY_RING_MAX) {
      const old = autoTranslatedMessageKeyRing.shift();
      if (old) autoTranslatedMessageKeys.delete(old);
    }
  }

  function getActiveChatKey() {
    try {
      if (window.WAAP?.services?.whatsappDomService?.getChatTitleFirstLine) {
        return window.WAAP.services.whatsappDomService.getChatTitleFirstLine();
      }
    } catch (e) {
      // ignore
    }

    try {
      const domService = window.WAAP?.services?.whatsappDomService;
      const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
      if (!main) return '';
      const header = main.querySelector('header');
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

  function isElementInMain(el) {
    try {
      if (window.WAAP?.services?.whatsappDomService?.isElementInMain) {
        return window.WAAP.services.whatsappDomService.isElementInMain(el);
      }
    } catch (e) {
      // ignore
    }

    try {
      const domService = window.WAAP?.services?.whatsappDomService;
      const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
      if (!main) return false;
      return !!(el && main.contains(el));
    } catch (e) {
      return false;
    }
  }

  function getMessagesInActiveChat() {
    try {
      if (window.WAAP?.services?.whatsappDomService?.getMessageElementsInActiveChat) {
        return window.WAAP.services.whatsappDomService.getMessageElementsInActiveChat();
      }
      const domService = window.WAAP?.services?.whatsappDomService;
      const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
      if (!main) return [];
      return Array.from(main.querySelectorAll('div[data-pre-plain-text]'));
    } catch (e) {
      return [];
    }
  }

  function primeSeenInChat(excludeNewestCount = 3) {
    try {
      const all = getMessagesInActiveChat();
      if (all.length === 0) return;
      const cutoff = Math.max(0, all.length - excludeNewestCount);
      for (let i = 0; i < cutoff; i++) {
        const m = all[i];
        const wrapperId = m?.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
        const pre = m?.getAttribute?.('data-pre-plain-text') || '';
        const key = wrapperId || pre;
        if (key) rememberKey(key);
      }
    } catch (e) {
      // ignore
    }
  }

  function getMessageKey(messageElement, extractedText = '') {
    try {
      const wrapperId = messageElement?.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
      const pre = messageElement?.getAttribute?.('data-pre-plain-text') || '';
      if (wrapperId) return wrapperId;
      if (pre) return pre;
      const text = String(extractedText || '')
        .replace(/\s+/g, ' ')
        .trim();
      return text.slice(0, 120);
    } catch (e) {
      return '';
    }
  }

  function shouldAutoTranslateNewMessage(messageElement, deps = {}) {
    if (!enabled) return false;
    if (!messageElement || !(messageElement instanceof Element)) return false;

    const now = Date.now();
    if (lastChatSwitchAt && now - lastChatSwitchAt < AUTO_TRANSLATE_IGNORE_AFTER_CHAT_SWITCH_MS) {
      return false;
    }

    try {
      if (messageElement.dataset.waaiAutoTranslateQueued === 'true') return false;
      if (messageElement.dataset.waaiAutoTranslated === 'true') return false;
    } catch (e) {
      // ignore
    }

    if (!isElementInMain(messageElement)) return false;

    try {
      const container = messageElement.closest('.message-container') || messageElement.parentElement;
      if (container && container.querySelector('.translation-content')) return false;
    } catch (e) {
      // ignore
    }

    let text = '';
    try {
      const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
      const collectTextContent = deps.collectTextContent || window.collectTextContent;
      if (typeof getMessageTextRoot === 'function' && typeof collectTextContent === 'function') {
        const textRoot = getMessageTextRoot(messageElement);
        text = textRoot ? collectTextContent(textRoot) : '';
      }
    } catch (e) {
      text = '';
    }

    if (!text || !String(text).trim()) return false;

    const key = getMessageKey(messageElement, text);
    if (key && autoTranslatedMessageKeys.has(key)) return false;

    try {
      messageElement.dataset.waaiAutoTranslateKey = key;
    } catch (e) {
      // ignore
    }

    return true;
  }

  function enqueue(messageElement) {
    if (!messageElement) return;

    let key = '';
    try {
      key = messageElement.dataset.waaiAutoTranslateKey || '';
    } catch (e) {
      key = '';
    }

    if (key) rememberKey(key);

    try {
      messageElement.dataset.waaiAutoTranslateQueued = 'true';
    } catch (e) {
      // ignore
    }

    queue.push(messageElement);
    runQueue();
  }

  async function runQueue() {
    if (queueRunning) return;
    queueRunning = true;

    try {
      while (queue.length > 0) {
        const messageElement = queue.shift();
        if (!messageElement) continue;

        try {
          const container = messageElement.closest('.message-container') || messageElement.parentElement;
          if (container && container.querySelector('.translation-content')) {
            try {
              messageElement.dataset.waaiAutoTranslateQueued = 'false';
              messageElement.dataset.waaiAutoTranslated = 'true';
            } catch (e) {
              // ignore
            }
            continue;
          }
        } catch (e) {
          // ignore
        }

        const now = Date.now();
        const waitMs = Math.max(0, AUTO_TRANSLATE_THROTTLE_MS - (now - lastAutoTranslateAt));
        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, waitMs));
        }
        lastAutoTranslateAt = Date.now();

        try {
          if (!document.contains(messageElement)) {
            try {
              messageElement.dataset.waaiAutoTranslateQueued = 'false';
              messageElement.dataset.waaiAutoTranslated = 'true';
            } catch (e) {
              // ignore
            }
            continue;
          }

          const translateFn = window.translateMessage;
          if (typeof translateFn === 'function') {
            await translateFn(messageElement);
          }
        } catch (e) {
          // ignore
        }

        try {
          messageElement.dataset.waaiAutoTranslateQueued = 'false';
          messageElement.dataset.waaiAutoTranslated = 'true';
        } catch (e) {
          // ignore
        }
      }
    } finally {
      queueRunning = false;
    }
  }

  function maybeAutoTranslateNewMessage(messageElement, deps = {}) {
    try {
      if (!shouldAutoTranslateNewMessage(messageElement, deps)) return false;
      enqueue(messageElement);
      return true;
    } catch (e) {
      return false;
    }
  }

  function scheduleOnChatEnter() {
    try {
      if (chatEnterTimer) {
        clearTimeout(chatEnterTimer);
      }
      chatEnterTimer = setTimeout(() => {
        primeSeenInChat(0);
      }, 700);
      return true;
    } catch (e) {
      return false;
    }
  }

  function onChatMaybeSwitched() {
    try {
      const key = getActiveChatKey();
      const now = Date.now();
      if (key && key !== lastChatKey) {
        lastChatKey = key;
        lastChatSwitchAt = now;
        scheduleOnChatEnter();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function setEnabled(v) {
    enabled = v === true;
    if (enabled) {
      scheduleOnChatEnter();
    }
  }

  function getState() {
    return {
      enabled: !!enabled,
      queueLength: Array.isArray(queue) ? queue.length : -1,
      queueRunning: !!queueRunning,
      lastAutoTranslateAt,
      lastChatKey,
      lastChatSwitchAt
    };
  }

  window.WAAP.legacy.autoTranslateQueue = {
    setEnabled,
    getState,
    scheduleOnChatEnter,
    onChatMaybeSwitched,
    maybeAutoTranslateNewMessage
  };
})();
