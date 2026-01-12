(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.quickChatPresenter) return;

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

  function getTargetContainer() {
    const selectors = [
      '.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
      'div[data-tab="3"]',
      '#side header',
      'header._23P3O',
      '#app div[role="navigation"]',
      '#app header',
      'header[data-testid="chatlist-header"]',
      '#side > header',
      '#app div[data-testid="chat-list-header"]',
      '#app > div > div > div > div > header'
    ];

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (e) {
        // ignore
      }
    }

    return null;
  }

  function normalizePhoneNumber(raw) {
    const v = String(raw || '').trim();
    if (!v) return '';
    return v.replace(/[^\d+]/g, '').replace(/^\+/, '');
  }

  function openWhatsAppChatByPhoneNumber(phoneNumber) {
    const fullNumber = normalizePhoneNumber(phoneNumber);
    if (!fullNumber) return false;

    try {
      const url = `https://wa.me/${fullNumber}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (e) {
          // ignore
        }
      }, 100);
      return true;
    } catch (e) {
      return false;
    }
  }

  function openModal() {
    const view = window.WAAP?.views?.quickChatView;
    if (!view?.renderModal) return;

    const { modal, phoneInput, cancelBtn, confirmBtn } = view.renderModal();

    const cleanup = () => {
      try {
        modal?.remove();
      } catch (e) {
        // ignore
      }
    };

    const onConfirm = () => {
      const phone = phoneInput?.value?.trim() || '';
      if (!phone) {
        alert('请输入手机号码');
        return;
      }

      const ok = openWhatsAppChatByPhoneNumber(phone);
      if (!ok) {
        alert('无法打开 WhatsApp，请联系管理员修复');
      }
      cleanup();
    };

    try {
      phoneInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onConfirm();
      });
    } catch (e) {
      // ignore
    }

    try {
      cancelBtn?.addEventListener('click', cleanup);
    } catch (e) {
      // ignore
    }

    try {
      confirmBtn?.addEventListener('click', onConfirm);
    } catch (e) {
      // ignore
    }
  }

  function tryAddButton() {
    try {
      if (document.querySelector('.quick-chat-btn')) return true;

      const target = getTargetContainer();
      if (!target) return false;

      const view = window.WAAP?.views?.quickChatView;
      if (!view?.createButton || !view?.insertButtonIntoContainer) return false;

      const btn = view.createButton(openModal);
      return view.insertButtonIntoContainer(btn, target);
    } catch (e) {
      return false;
    }
  }

  let _retryCount = 0;
  const MAX_RETRIES = 15;
  const RETRY_INTERVAL = 3000;

  function retryAddButton() {
    const ok = tryAddButton();
    if (ok) return;

    if (_retryCount >= MAX_RETRIES) return;
    _retryCount++;
    setTimeout(retryAddButton, RETRY_INTERVAL);
  }

  function init() {
    try {
      const storage = window.WAAP?.services?.storageService;
      const getSync = storage?.getSync;

      let started = false;
      let stopObserver = null;

      const stop = () => {
        try {
          if (typeof stopObserver === 'function') stopObserver();
        } catch (e) {
          // ignore
        }
        stopObserver = null;
        started = false;
        try {
          const btn = document.querySelector('.quick-chat-btn');
          if (btn) btn.remove();
        } catch (e) {
          // ignore
        }
      };

      const start = () => {
        retryAddButton();

        const observer = new MutationObserver(
          throttle((mutations) => {
            for (const mutation of mutations) {
              if (mutation.addedNodes?.length && !document.querySelector('.quick-chat-btn')) {
                retryAddButton();
                break;
              }
            }
          }, 500)
        );

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });

        return () => observer.disconnect();
      };

      const applyGate = (data) => {
        const enabled = data?.quickChatEnabled === true;
        const unlocked = data?.quickChatUnlocked === true;
        if (enabled && unlocked) {
          if (!started) {
            stopObserver = start();
            started = true;
          }
        } else {
          if (started) {
            stop();
          }
        }
      };

      if (typeof getSync !== 'function') {
        stopObserver = start();
        started = true;
        return () => {
          stop();
        };
      }

      getSync(['quickChatEnabled', 'quickChatUnlocked']).then((data) => {
        applyGate(data);
      });

      let storageListener = null;
      try {
        if (chrome?.storage?.onChanged) {
          storageListener = (changes, areaName) => {
            if (areaName !== 'sync') return;
            if (!changes.quickChatEnabled && !changes.quickChatUnlocked) return;

            const enabled = changes.quickChatEnabled ? changes.quickChatEnabled.newValue === true : null;
            const unlocked = changes.quickChatUnlocked ? changes.quickChatUnlocked.newValue === true : null;

            if (enabled === null || unlocked === null) {
              getSync(['quickChatEnabled', 'quickChatUnlocked']).then((data) => {
                applyGate(data);
              });
              return;
            }

            applyGate({ quickChatEnabled: enabled, quickChatUnlocked: unlocked });
          };

          chrome.storage.onChanged.addListener(storageListener);
        }
      } catch (e) {
        // ignore
      }

      return () => {
        try {
          if (storageListener && chrome?.storage?.onChanged?.removeListener) {
            chrome.storage.onChanged.removeListener(storageListener);
          }
        } catch (e) {
          // ignore
        }
        stop();
      };
    } catch (e) {
      return () => {};
    }
  }

  window.WAAP.presenters.quickChatPresenter = {
    init,
    openModal
  };
})();
