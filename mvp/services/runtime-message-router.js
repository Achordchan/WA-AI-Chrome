(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  const existing = window.WAAP.services.runtimeMessageRouter;
  if (existing && typeof existing.isInstalled === 'function' && existing.isInstalled()) return;

  let installed = false;

  function isChatWindowExists() {
    try {
      if (window.WAAP?.services?.whatsappDomService?.isChatWindowExists) {
        return window.WAAP.services.whatsappDomService.isChatWindowExists();
      }
    } catch (e) {
      // ignore
    }

    try {
      const main = document.querySelector('#main');
      if (!main) return false;
      const header = main.querySelector('header');
      if (!header) return false;

      const footer = document.querySelector('footer._ak1i') || main.querySelector('footer');
      if (!footer) return false;

      const editable = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') || footer.querySelector('div[contenteditable="true"]');
      return !!editable;
    } catch (e) {
      return false;
    }
  }

  function isButtonsLoaded() {
    try {
      const ps = (() => {
        try {
          const svc = window.WAAP?.services?.contentStateService;
          if (svc?.getPluginStatus) {
            const v = svc.getPluginStatus();
            if (v && typeof v === 'object') return v;
          }
        } catch (e) {
          // ignore
        }

        try {
          if (typeof pluginStatus !== 'undefined' && pluginStatus && typeof pluginStatus === 'object') {
            return pluginStatus;
          }
        } catch (e2) {
          // ignore
        }
        return null;
      })();

      if (ps && (ps.translation || ps.observer || ps.apiService)) {
        if (isChatWindowExists() && ps.translation && ps.observer) return true;
      }

      const hasAny = !!(
        document.querySelector('.analysis-btn-container') ||
        document.querySelector('.translate-all-btn') ||
        document.querySelector('.translate-btn') ||
        document.querySelector('.translate-btn-container')
      );
      return hasAny;
    } catch (e) {
      return false;
    }
  }

  function handle(request, sendResponse) {
    if (!request || !request.type) return false;

    if (request.type === 'CHECK_CHAT_WINDOW') {
      try {
        sendResponse({ exists: isChatWindowExists() });
      } catch (e) {
        try {
          sendResponse({ exists: false });
        } catch (e2) {
          // ignore
        }
      }
      return false;
    }

    if (request.type === 'CHECK_BUTTONS') {
      try {
        sendResponse({ success: isButtonsLoaded() });
      } catch (e) {
        try {
          sendResponse({ success: false });
        } catch (e2) {
          // ignore
        }
      }
      return false;
    }

    if (request.type === 'SHOW_UPDATE_LOG') {
      try {
        if (typeof window.showUpdateLogManually === 'function') {
          window.showUpdateLogManually();
        } else if (typeof window.checkAndShowUpdateLog === 'function') {
          window.checkAndShowUpdateLog();
        }
      } catch (e) {
        // ignore
      }
      try {
        sendResponse({ success: true });
      } catch (e2) {
        // ignore
      }
      return false;
    }

    return false;
  }

  function install() {
    if (installed) return;
    try {
      if (chrome?.runtime?.onMessage?.addListener) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          try {
            if (!request || !request.type) return;
            handle(request, sendResponse);
          } catch (e) {
            try {
              sendResponse({ success: false, error: e?.message || 'unknown' });
            } catch (e2) {
              // ignore
            }
          }
        });
        installed = true;
      }
    } catch (e) {
      installed = false;
    }
  }

  function isInstalled() {
    return installed;
  }

  window.WAAP.services.runtimeMessageRouter = {
    install,
    isInstalled,
    handle,
    isChatWindowExists,
    isButtonsLoaded
  };

  install();
})();
