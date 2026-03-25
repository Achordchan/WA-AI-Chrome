/*
用途：从 WhatsApp Web 当前聊天窗口提取聊天对象号码（DOM/XPath/备用策略）Service（MVP）。
说明：
- 将 legacy-weather-info.js 中 tryGetWhatsAppNumber 及其备用提取链路下沉到 service，减少 legacy 体积。
- 该 service 只负责“拿到号码文本”，不直接决定后续业务；但可通过 onPhoneNumber 回调把号码交回调用方处理。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherPhoneExtractService) return;

  const phoneCacheByChatKey = new Map();
  const sidebarAutoAttemptAtByChatKey = new Map();
  const SIDEBAR_AUTO_ATTEMPT_COOLDOWN_MS = 10 * 60 * 1000;

  const DEBUG_PHONE_SIDEBAR_FALLBACK = false;

  const PHONE_CACHE_STORAGE_KEY = 'waapChatPhoneCacheV1';
  let persistedLoaded = false;
  let persistedStore = {};
  let persistedLoadPromise = null;
  let persistedSaveTimer = null;

  let inputActivityInstalled = false;
  let lastInputActivityAt = 0;
  const INPUT_ACTIVITY_WINDOW_MS = 1400;
  let lastMainComposerInputAt = 0;

  function debugLog(...args) {
    try {
      if (DEBUG_PHONE_SIDEBAR_FALLBACK !== true) return;
      console.log('[WAAP][phone-fallback]', ...args);
    } catch (e) {
      // ignore
    }
  }

  function getChromeLocal(deps = {}) {
    try {
      const chromeRef = deps.chrome || window.chrome;
      return chromeRef?.storage?.local ? chromeRef.storage.local : null;
    } catch (e) {
      return null;
    }
  }

  function getSetTimeout(deps = {}) {
    try {
      return deps.setTimeout || window.setTimeout;
    } catch (e) {
      return null;
    }
  }

  function loadPersistedStore(deps = {}) {
    try {
      if (persistedLoadPromise) return persistedLoadPromise;
      const storage = getChromeLocal(deps);
      if (!storage) {
        persistedLoaded = true;
        persistedStore = {};
        persistedLoadPromise = Promise.resolve(true);
        return persistedLoadPromise;
      }

      persistedLoadPromise = (async () => {
        try {
          const res = await storage.get([PHONE_CACHE_STORAGE_KEY]);
          const raw = res ? res[PHONE_CACHE_STORAGE_KEY] : null;
          persistedStore = raw && typeof raw === 'object' ? raw : {};
        } catch (e) {
          persistedStore = {};
        } finally {
          persistedLoaded = true;
        }

        try {
          const entries = Object.entries(persistedStore || {});
          for (const [k, v] of entries) {
            const phone = v && typeof v === 'object' ? String(v.phoneE164 || '') : '';
            if (k && phone) phoneCacheByChatKey.set(String(k), phone);
          }
        } catch (e) {
          // ignore
        }

        return true;
      })();

      return persistedLoadPromise;
    } catch (e) {
      persistedLoaded = true;
      persistedStore = {};
      persistedLoadPromise = Promise.resolve(false);
      return persistedLoadPromise;
    }
  }

  function scheduleSavePersistedStore(deps = {}) {
    try {
      if (persistedSaveTimer) return true;
      const storage = getChromeLocal(deps);
      const setTimeoutRef = getSetTimeout(deps);
      if (!storage || typeof setTimeoutRef !== 'function') return false;

      persistedSaveTimer = setTimeoutRef(async () => {
        try {
          const payload = {};
          payload[PHONE_CACHE_STORAGE_KEY] = persistedStore || {};
          await storage.set(payload);
        } catch (e) {
          // ignore
        } finally {
          persistedSaveTimer = null;
        }
      }, 800);

      return true;
    } catch (e) {
      persistedSaveTimer = null;
      return false;
    }
  }

  function purgePersistedStore(owner) {
    try {
      const now = Date.now();
      const evictDays = (owner && owner.displaySettings && Number.isFinite(owner.displaySettings.autoRenewEvictDays))
        ? owner.displaySettings.autoRenewEvictDays
        : 10;
      const evictMs = (Number.isFinite(evictDays) && evictDays > 0) ? (evictDays * 24 * 60 * 60 * 1000) : 0;
      if (evictMs <= 0) return false;

      let changed = false;
      const entries = Object.entries(persistedStore || {});
      for (const [chatKey, entry] of entries) {
        const lastSeenAt = entry && typeof entry === 'object' ? Number(entry.lastSeenAt || 0) : 0;
        if (lastSeenAt && (now - lastSeenAt) > evictMs) {
          try {
            delete persistedStore[chatKey];
            phoneCacheByChatKey.delete(chatKey);
            sidebarAutoAttemptAtByChatKey.delete(chatKey);
            changed = true;
          } catch (e) {
            // ignore
          }
        }
      }

      return changed;
    } catch (e) {
      return false;
    }
  }

  function persistPhoneForChatKey(owner, chatKey, phoneE164, deps = {}) {
    try {
      const key = String(chatKey || '').trim();
      const phone = String(phoneE164 || '').trim();
      if (!key || !phone) return false;

      void loadPersistedStore(deps);

      Promise.resolve(persistedLoadPromise).then(() => {
        try {
          const now = Date.now();
          const digits = phone.replace(/[^\d]/g, '');
          persistedStore[key] = {
            phoneE164: phone,
            phoneDigits: digits,
            lastSeenAt: now,
            updatedAt: now
          };
          purgePersistedStore(owner);
          scheduleSavePersistedStore(deps);
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  function touchPersistedChatKey(owner, chatKey, deps = {}) {
    try {
      const key = String(chatKey || '').trim();
      if (!key) return false;
      if (!persistedLoaded) {
        void loadPersistedStore(deps);
        return false;
      }
      const entry = persistedStore && typeof persistedStore === 'object' ? persistedStore[key] : null;
      if (!entry || typeof entry !== 'object') return false;
      entry.lastSeenAt = Date.now();
      purgePersistedStore(owner);
      scheduleSavePersistedStore(deps);
      return true;
    } catch (e) {
      return false;
    }
  }

  function dispatchUserClick(el, deps = {}) {
    try {
      if (!el) return false;
      const MouseEventRef = deps.MouseEvent || window.MouseEvent;

      if (typeof el.dispatchEvent === 'function' && typeof MouseEventRef === 'function') {
        el.dispatchEvent(new MouseEventRef('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEventRef('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEventRef('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      }

      if (typeof el.click === 'function') {
        el.click();
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  function tryExtractPhoneFromContactInfoSidebar(owner, deps = {}) {
    if (!owner || typeof owner.isChatWindowActive !== 'function') return null;

    if (!owner.isChatWindowActive()) {
      return null;
    }

    const documentRef = deps.document || window.document;
    if (!documentRef) return null;

    try {
      const infoTitleEl =
        documentRef.querySelector('[title="联系人信息"]') ||
        documentRef.querySelector('[title="Contact info"]') ||
        documentRef.querySelector('[title="Contact Info"]');

      if (!infoTitleEl) return null;

      const root =
        infoTitleEl.closest('.copyable-area') ||
        infoTitleEl.closest('[role="dialog"]') ||
        infoTitleEl.closest('section') ||
        infoTitleEl.closest('div');

      if (!root) return null;

      const candidates = root.querySelectorAll('[data-testid="selectable-text"], .copyable-text, span[dir="auto"]');
      if (!candidates || candidates.length === 0) return null;

      for (const el of candidates) {
        const rawText = (el?.textContent || '').trim();
        if (!rawText) continue;
        if (!rawText.includes('+')) continue;

        const cleaned = cleanPhoneNumber(rawText);
        if (!cleaned || !cleaned.startsWith('+')) continue;

        const digits = cleaned.replace(/[^\d]/g, '');
        if (digits.length < 8 || digits.length > 15) continue;

        try {
          const cb = deps.onPhoneNumber;
          if (typeof cb === 'function') cb(cleaned);
        } catch (e) {
          // ignore
        }

        return cleaned;
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  function getActiveChatKey(owner) {
    try {
      const key = typeof owner?.getActiveChatKey === 'function' ? owner.getActiveChatKey() : '';
      return String(key || '').trim();
    } catch (e) {
      return '';
    }
  }

  function cachePhoneForChatKey(chatKey, phoneE164) {
    try {
      const key = String(chatKey || '').trim();
      const phone = String(phoneE164 || '').trim();
      if (!key || !phone) return false;
      phoneCacheByChatKey.set(key, phone);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getCachedPhoneForChatKey(chatKey) {
    try {
      const key = String(chatKey || '').trim();
      if (!key) return null;
      const v = phoneCacheByChatKey.get(key);
      return v ? String(v) : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeValidPhoneText(rawText) {
    try {
      const cleaned = cleanPhoneNumber(String(rawText || '').trim());
      if (!cleaned || !cleaned.startsWith('+')) return '';
      const digits = cleaned.replace(/[^\d]/g, '');
      if (digits.length < 8 || digits.length > 15) return '';
      return cleaned;
    } catch (e) {
      return '';
    }
  }

  function getHeaderPhoneCandidate(owner, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
      const main = domService?.getMain ? domService.getMain() : documentRef.querySelector('#main');
      const header = domService?.getMainHeader ? domService.getMainHeader(main) : main?.querySelector?.('header');
      if (!header) return null;

      const candidateSelectors = [
        '[role="button"] span[dir="auto"]',
        'button span[dir="auto"]',
        'a span[dir="auto"]',
        'span[dir="auto"]',
        '[title*="+"]',
        '[aria-label*="+"]'
      ];

      const seen = new Set();
      for (const selector of candidateSelectors) {
        const nodes = header.querySelectorAll(selector);
        for (const node of nodes) {
          if (!node || seen.has(node)) continue;
          seen.add(node);

          const rawText =
            node.getAttribute?.('title') ||
            node.getAttribute?.('aria-label') ||
            node.textContent ||
            node.innerText ||
            '';
          const phone = normalizeValidPhoneText(rawText);
          if (!phone) continue;

          return {
            phone,
            element: node
          };
        }
      }

      const headerLines = String(header.innerText || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const line of headerLines) {
        const phone = normalizeValidPhoneText(line);
        if (phone) {
          return {
            phone,
            element: header
          };
        }
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  function commitResolvedPhone(owner, rawPhone, deps = {}) {
    try {
      const phone = normalizeValidPhoneText(rawPhone);
      if (!phone) return '';

      try {
        const cb = deps.onPhoneNumber;
        if (typeof cb === 'function') cb(phone);
      } catch (e) {
        // ignore
      }

      try {
        const chatKey = getActiveChatKey(owner);
        if (chatKey) {
          cachePhoneForChatKey(chatKey, phone);
          persistPhoneForChatKey(owner, chatKey, phone, deps);
        }
      } catch (e) {
        // ignore
      }

      return phone;
    } catch (e) {
      return '';
    }
  }

  function ensureInputActivityTracking(documentRef) {
    try {
      if (inputActivityInstalled) return;
      if (!documentRef || !documentRef.addEventListener) return;

      const isFromMainComposer = (evt) => {
        try {
          const t = evt?.target;
          if (!t) return false;
          if (t.closest) {
            if (t.closest('#main footer')) return true;
            if (t.closest('[data-testid="conversation-compose-box"]')) return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      };

      const mark = (evt) => {
        try {
          lastInputActivityAt = Date.now();
          if (isFromMainComposer(evt)) {
            lastMainComposerInputAt = lastInputActivityAt;
          }
        } catch (e) {
          lastInputActivityAt = 0;
        }
      };

      documentRef.addEventListener('keydown', mark, true);
      documentRef.addEventListener('input', mark, true);
      documentRef.addEventListener('compositionstart', mark, true);
      inputActivityInstalled = true;
    } catch (e) {
      // ignore
    }
  }

  function isUserTyping(documentRef) {
    try {
      const now = Date.now();
      // 只阻止“主聊天输入框”的近期输入；左侧搜索框即便长期聚焦也不应阻止兜底取号
      if (now - (lastMainComposerInputAt || 0) > INPUT_ACTIVITY_WINDOW_MS) return false;

      const el = documentRef?.activeElement;
      if (!el) return true;
      const tag = String(el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if (el.isContentEditable) return true;
      const role = String(el.getAttribute?.('role') || '').toLowerCase();
      if (role === 'textbox') return true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function waitForSidebarPhoneByObserver(owner, deps = {}, options = {}) {
    try {
      const documentRef = deps.document || window.document;
      const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;
      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 1800;
      if (!documentRef || typeof setTimeoutRef !== 'function') return Promise.resolve(null);

      return new Promise((resolve) => {
        let done = false;
        let observer = null;
        let timeoutId = null;

        const cleanup = () => {
          try {
            if (observer) observer.disconnect();
          } catch (e) {
            // ignore
          }
          observer = null;

          try {
            if (timeoutId) clearTimeout(timeoutId);
          } catch (e) {
            // ignore
          }
          timeoutId = null;
        };

        const finish = (value) => {
          if (done) return;
          done = true;
          cleanup();
          resolve(value || null);
        };

        const tryResolve = () => {
          try {
            const phone = tryExtractPhoneFromContactInfoSidebar(owner, { ...deps, document: documentRef });
            if (phone) finish(phone);
          } catch (e) {
            // ignore
          }
        };

        timeoutId = setTimeoutRef(() => {
          finish(null);
        }, timeoutMs);

        if (typeof MutationObserverRef === 'function') {
          try {
            observer = new MutationObserverRef(() => {
              tryResolve();
            });
            observer.observe(documentRef.body || documentRef.documentElement, {
              childList: true,
              subtree: true,
              characterData: true,
              attributes: true
            });
          } catch (e) {
            observer = null;
          }
        }

        tryResolve();
      });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  function scheduleAutoOpenSidebarAndExtractPhone(owner, deps = {}) {
    try {
      if (!owner || typeof owner.isChatWindowActive !== 'function') return false;
      if (!owner.isChatWindowActive()) return false;

      const documentRef = deps.document || window.document;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;
      const showToast = deps.showToast || window.showToast;
      if (!documentRef || typeof setTimeoutRef !== 'function') return false;

      void loadPersistedStore(deps);

      ensureInputActivityTracking(documentRef);

      if (isUserTyping(documentRef)) {
        debugLog('skip: recent input activity');
        return false;
      }

      const chatKey = getActiveChatKey(owner);
      if (chatKey) {
        const cached = getCachedPhoneForChatKey(chatKey);
        if (cached) {
          debugLog('skip: cached', chatKey);
          return false;
        }
      }

      const now = Date.now();
      const lastAttemptAt = chatKey ? sidebarAutoAttemptAtByChatKey.get(chatKey) || 0 : 0;
      if (chatKey && now - lastAttemptAt < SIDEBAR_AUTO_ATTEMPT_COOLDOWN_MS) {
        debugLog('skip: cooldown', chatKey);
        return false;
      }
      if (chatKey) sidebarAutoAttemptAtByChatKey.set(chatKey, now);

      if (owner._waapPhoneSidebarFallbackRunning === true) return true;
      owner._waapPhoneSidebarFallbackRunning = true;
      debugLog('start', chatKey);

      const toastId = (() => {
        try {
          if (typeof showToast === 'function') {
            return showToast('正在使用备选方案获取对方号码，请勿干预操作，即将完成。', 'info', 0);
          }
        } catch (e) {
          // ignore
        }
        return null;
      })();

      const cleanupToast = () => {
        try {
          if (!toastId) return;
          if (typeof toastId === 'string') {
            documentRef.getElementById(toastId)?.remove();
            return;
          }

          if (typeof toastId?.remove === 'function') {
            toastId.remove();
          }
        } catch (e) {
          // ignore
        }
      };

      const alreadyOpen = (() => {
        try {
          return !!(
            documentRef.querySelector('[title="联系人信息"]') ||
            documentRef.querySelector('[title="Contact info"]') ||
            documentRef.querySelector('[title="Contact Info"]')
          );
        } catch (e) {
          return false;
        }
      })();

      const clickOpen = () => {
        try {
          const headerCandidate = getHeaderPhoneCandidate(owner, {
            ...deps,
            document: documentRef
          });
          const phoneElement = headerCandidate?.element || null;

          const header =
            documentRef.querySelector('header[data-testid="conversation-info-header"]') ||
            documentRef.querySelector('#main header');

          const fromPhone = phoneElement
            ? phoneElement.closest?.('[role="button"], button, a, header') || phoneElement
            : null;

          const fromHeader = header
            ? header.querySelector?.('[role="button"], button, a') || header
            : null;

          const target = fromPhone || fromHeader;
          const ok = dispatchUserClick(target, deps);
          debugLog('clickOpen', !!ok);
          return ok;
        } catch (e) {
          // ignore
        }
        return false;
      };

      const clickClose = () => {
        try {
          const btn =
            documentRef.querySelector('button[aria-label="关闭"]') ||
            documentRef.querySelector('button[title="关闭"]') ||
            documentRef.querySelector('button[aria-label="Close"]') ||
            documentRef.querySelector('button[title="Close"]');
          const ok = dispatchUserClick(btn, deps);
          debugLog('clickClose', !!ok);
          return ok;
        } catch (e) {
          // ignore
        }
        return false;
      };

      if (!alreadyOpen) {
        clickOpen();
      }

      void (async () => {
        try {
          const fromSidebar = await waitForSidebarPhoneByObserver(owner, {
            ...deps,
            document: documentRef,
            setTimeout: setTimeoutRef
          });

          if (fromSidebar) {
            try {
              const chatKeyNow = getActiveChatKey(owner);
              const cleaned = cleanPhoneNumber(fromSidebar);
              if (chatKeyNow && cleaned && cleaned.startsWith('+')) {
                cachePhoneForChatKey(chatKeyNow, cleaned);
                persistPhoneForChatKey(owner, chatKeyNow, cleaned, deps);
              }
            } catch (e) {
              // ignore
            }

            cleanupToast();
            try {
              if (!alreadyOpen) {
                setTimeoutRef(() => {
                  try {
                    clickClose();
                  } catch (e) {
                    // ignore
                  }
                }, 240);
              }
            } catch (e) {
              // ignore
            }

            owner._waapPhoneSidebarFallbackRunning = false;
            debugLog('success', getActiveChatKey(owner));
            return;
          }

          cleanupToast();
          try {
            if (!alreadyOpen) clickClose();
          } catch (e) {
            // ignore
          }
          owner._waapPhoneSidebarFallbackRunning = false;
          debugLog('fail: timeout', chatKey);
        } catch (e) {
          cleanupToast();
          owner._waapPhoneSidebarFallbackRunning = false;
        }
      })();
      return true;
    } catch (e) {
      try {
        owner._waapPhoneSidebarFallbackRunning = false;
      } catch (e2) {
        // ignore
      }
      return false;
    }
  }

  function tryGetWhatsAppNumber(owner, deps = {}) {
    if (!owner || typeof owner.isChatWindowActive !== 'function') return null;

    if (!owner.isChatWindowActive()) {
      return null;
    }

    const documentRef = deps.document || window.document;
    const XPathResultRef = deps.XPathResult || window.XPathResult;

    void loadPersistedStore(deps);

    try {
      const chatKey = getActiveChatKey(owner);
      const cached = getCachedPhoneForChatKey(chatKey);
      if (cached) {
        try {
          touchPersistedChatKey(owner, chatKey, deps);
        } catch (e) {
          // ignore
        }
        try {
          const cb = deps.onPhoneNumber;
          if (typeof cb === 'function') cb(cached);
        } catch (e) {
          // ignore
        }
        return cached;
      }
    } catch (e) {
      // ignore
    }

    try {
      const headerCandidate = getHeaderPhoneCandidate(owner, {
        ...deps,
        document: documentRef
      });
      if (headerCandidate?.phone) {
        const numbersOnly = headerCandidate.phone.replace(/[^\d]/g, '');
        try {
          if (owner.currentPhoneNumber !== numbersOnly) {
            console.log('✅ 成功获取当前聊天对象号码!');
            console.log('📞 号码:', headerCandidate.phone);
            console.log('🎯 开始处理号码...');
          }
        } catch (e) {
          // ignore
        }

        const committed = commitResolvedPhone(owner, headerCandidate.phone, deps);
        if (committed) return committed;
      }

      try {
        const fromSidebar = tryExtractPhoneFromContactInfoSidebar(owner, { ...deps, document: documentRef });
        if (fromSidebar) {
          const committed = commitResolvedPhone(owner, fromSidebar, deps);
          if (committed) return committed;
        }
      } catch (e) {
        // ignore
      }

      const backupResult = tryBackupMethods(owner, { ...deps, document: documentRef });
      const committedBackup = commitResolvedPhone(owner, backupResult, deps);

      if (!committedBackup) {
        try {
          scheduleAutoOpenSidebarAndExtractPhone(owner, { ...deps, document: documentRef, XPathResult: XPathResultRef });
        } catch (e) {
          // ignore
        }
      }

      try {
        owner.lastDebugNumber = committedBackup ? String(committedBackup) : 'invalid';
      } catch (e) {
        // ignore
      }

      return committedBackup || null;
    } catch (error) {
      try {
        console.error('❌ 获取当前聊天号码时发生错误:', error);
      } catch (e) {
        // ignore
      }
      return null;
    }
  }

  // 备用获取方法
  function tryBackupMethods(owner, deps = {}) {
    if (!owner || typeof owner.isChatWindowActive !== 'function') return null;

    if (!owner.isChatWindowActive()) {
      return null;
    }

    try {
      console.log('🔄 尝试备用方法获取号码...');
    } catch (e) {
      // ignore
    }

    // 首先尝试从聊天记录的data-id属性中提取号码
    try {
      console.log('🎯 步骤1: 尝试从聊天记录的data-id中提取号码...');
    } catch (e) {
      // ignore
    }

    const phoneFromDataId = extractPhoneFromChatMessages(owner, deps);
    if (phoneFromDataId) {
      try {
        console.log('✅ data-id方法成功，返回号码:', phoneFromDataId);
      } catch (e) {
        // ignore
      }
      return phoneFromDataId;
    }

    try {
      console.log('🎯 步骤2: data-id方法失败，尝试其他备用选择器...');
    } catch (e) {
      // ignore
    }

    const documentRef = deps.document || window.document;

    const backupSelectors = [
      // 主聊天区域的头部号码
      '#main header span[dir="auto"]',
      '#main header [title*="+"]',
      'header[data-testid="conversation-info-header"] span[title*="+"]',
      'header[data-testid="conversation-info-header"] [dir="auto"]'
    ];

    for (const selector of backupSelectors) {
      try {
        const elements = documentRef.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent || element.title || '';
          const phoneRegex = /^\+\d{1,3}[\s\d\-\(\)]{8,}$/;

          if (phoneRegex.test(text.trim())) {
            try {
              console.log(`✅ 备用方法成功! 选择器: ${selector}`);
              console.log(`📞 号码: ${text.trim()}`);
            } catch (e) {
              // ignore
            }

            try {
              const cb = deps.onPhoneNumber;
              if (typeof cb === 'function') cb(text.trim());
            } catch (e) {
              // ignore
            }

            return text.trim();
          }
        }
      } catch (error) {
        try {
          console.log(`❌ 备用选择器失败: ${selector}`, error.message);
        } catch (e) {
          // ignore
        }
      }
    }

    try {
      console.log('❌ 所有方法都未能获取到号码');
    } catch (e) {
      // ignore
    }

    return null;
  }

  // 从聊天记录的data-id属性中提取手机号码
  function extractPhoneFromChatMessages(owner, deps = {}) {
    if (!owner || typeof owner.isChatWindowActive !== 'function') return null;

    if (!owner.isChatWindowActive()) {
      return null;
    }

    try {
      console.log('🔍 尝试从聊天记录的data-id属性中提取号码...');
    } catch (e) {
      // ignore
    }

    const documentRef = deps.document || window.document;

    try {
      // 查找聊天消息元素，通常包含data-id属性
      const chatMessageSelectors = [
        // 聊天消息容器的各种可能选择器
        '[data-id*="@c.us"]',
        '#main [data-id*="@c.us"]',
        '[data-id*="@g.us"]',
        '#main [data-id*="@g.us"]',
        // 更具体的聊天消息选择器
        '.message-in [data-id]',
        '.message-out [data-id]',
        '[class*="message"] [data-id]',
        // 聊天容器选择器
        '#main div[data-id]',
        '[tabindex="-1"][data-id]'
      ];

      for (const selector of chatMessageSelectors) {
        try {
          const elements = documentRef.querySelectorAll(selector);
          try {
            console.log(`🔍 使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
          } catch (e) {
            // ignore
          }

          for (const element of elements) {
            const dataId = element.getAttribute('data-id');
            if (dataId) {
              try {
                console.log(`📋 检查data-id: ${dataId}`);
              } catch (e) {
                // ignore
              }

              const phoneNumber = parsePhoneFromDataId(dataId);

              if (phoneNumber) {
                try {
                  console.log(`✅ 从data-id成功提取号码: ${phoneNumber}`);
                  console.log(`📞 完整的data-id: ${dataId}`);
                } catch (e) {
                  // ignore
                }

                const formattedPhone = formatPhoneNumber(phoneNumber);
                if (formattedPhone) {
                  try {
                    const cb = deps.onPhoneNumber;
                    if (typeof cb === 'function') cb(formattedPhone);
                  } catch (e) {
                    // ignore
                  }

                  return formattedPhone;
                }
              }
            }
          }
        } catch (error) {
          try {
            console.log(`❌ 选择器 "${selector}" 执行失败:`, error.message);
          } catch (e) {
            // ignore
          }
        }
      }

      try {
        console.log('❌ 未能从聊天记录的data-id中找到有效号码');
      } catch (e) {
        // ignore
      }
      return null;
    } catch (error) {
      try {
        console.error('❌ 从聊天记录提取号码时发生错误:', error);
      } catch (e) {
        // ignore
      }
      return null;
    }
  }

  function parsePhoneFromDataId(dataId) {
    if (!dataId) return null;

    try {
      // lid 是 WhatsApp 内部标识（不是手机号），避免误判
      if (String(dataId).includes('@lid_')) {
        return null;
      }

      // 匹配个人聊天格式
      const personalChatRegex = /(?:true|false)_(\d+)@c\.us_/;
      const personalMatch = dataId.match(personalChatRegex);

      if (personalMatch && personalMatch[1]) {
        const phoneNumber = personalMatch[1];
        try {
          console.log(`📱 解析到个人聊天号码: ${phoneNumber}`);
        } catch (e) {
          // ignore
        }
        return phoneNumber;
      }

      // 匹配群聊格式
      const groupChatRegex = /(?:true|false)_(\d+)-\d+@g\.us_/;
      const groupMatch = dataId.match(groupChatRegex);

      if (groupMatch && groupMatch[1]) {
        const phoneNumber = groupMatch[1];
        try {
          console.log(`📱 解析到群聊创建者号码: ${phoneNumber}`);
        } catch (e) {
          // ignore
        }
        return phoneNumber;
      }

      // 尝试更宽松的匹配（但必须是 c.us / g.us），避免扫到别的内部 id
      if (!String(dataId).includes('@c.us') && !String(dataId).includes('@g.us')) {
        return null;
      }

      const looseRegex = /_(\d{8,15})@(?:c|g)\.us/;
      const looseMatch = dataId.match(looseRegex);

      if (looseMatch && looseMatch[1]) {
        const phoneNumber = looseMatch[1];
        try {
          console.log(`📱 宽松匹配到号码: ${phoneNumber}`);
        } catch (e) {
          // ignore
        }
        return phoneNumber;
      }

      try {
        console.log(`❌ 无法从data-id解析号码: ${dataId}`);
      } catch (e) {
        // ignore
      }
      return null;
    } catch (error) {
      try {
        console.error('❌ 解析data-id时发生错误:', error);
      } catch (e) {
        // ignore
      }
      return null;
    }
  }

  // 格式化手机号码，添加国际区号
  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }

    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

    if (cleanNumber.length < 8) {
      try {
        console.log(`❌ 号码太短，无效: ${cleanNumber}`);
      } catch (e) {
        // ignore
      }
      return null;
    }

    // 如果号码已经包含国际区号，直接返回
    if (cleanNumber.length >= 10 && !cleanNumber.startsWith('0')) {
      const formattedNumber = '+' + cleanNumber;
      try {
        console.log(`📞 格式化号码: ${phoneNumber} -> ${formattedNumber}`);
      } catch (e) {
        // ignore
      }
      return formattedNumber;
    }

    // 对于中国号码，如果是11位且以1开头，添加86区号
    if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      const formattedNumber = '+86' + cleanNumber;
      try {
        console.log(`📞 格式化中国号码: ${phoneNumber} -> ${formattedNumber}`);
      } catch (e) {
        // ignore
      }
      return formattedNumber;
    }

    // 其他情况，假设已经是完整的国际号码
    const formattedNumber = '+' + cleanNumber;
    try {
      console.log(`📞 格式化号码: ${phoneNumber} -> ${formattedNumber}`);
    } catch (e) {
      // ignore
    }
    return formattedNumber;
  }

  // 清理电话号码文本
  function cleanPhoneNumber(text) {
    if (!text) return '';

    // 移除常见的非数字字符，但保留+号
    let cleaned = text.replace(/[^\d+]/g, '');

    // 如果没有+号，尝试从原文本中提取
    if (!cleaned.startsWith('+') && text.includes('+')) {
      const match = text.match(/\+[\d\s\-()]+/);
      if (match) {
        cleaned = match[0].replace(/[^\d+]/g, '');
      }
    }

    return cleaned;
  }

  window.WAAP.services.weatherPhoneExtractService = {
    tryGetWhatsAppNumber,
    tryBackupMethods,
    extractPhoneFromChatMessages,
    parsePhoneFromDataId,
    tryExtractPhoneFromContactInfoSidebar,
    scheduleAutoOpenSidebarAndExtractPhone,
    formatPhoneNumber,
    cleanPhoneNumber
  };
})();
