(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.autoInitPresenter) return;

  function setup(deps = {}) {
    try {
      const initialize = deps.initialize;
      const isChatWindowActive = deps.isChatWindowActive;
      const isInitialized = deps.isInitialized;
      const isInitStarted = deps.isInitStarted;

      let started = false;
      let lastCheckAt = 0;
      let observer = null;
      let domHandler = null;
      let pendingCheckTimer = null;

      const cleanup = () => {
        try {
          if (observer) observer.disconnect();
        } catch (e) {
          // ignore
        }
        observer = null;

        try {
          if (domHandler) document.removeEventListener('DOMContentLoaded', domHandler);
        } catch (e) {
          // ignore
        }
        domHandler = null;

        try {
          if (pendingCheckTimer) clearTimeout(pendingCheckTimer);
        } catch (e) {
          // ignore
        }
        pendingCheckTimer = null;
      };

      const maybeAutoInitialize = () => {
        try {
          const now = Date.now();
          if (now - lastCheckAt < 500) return;
          lastCheckAt = now;

          if (started) return;
          if (typeof isInitialized === 'function' && isInitialized()) return;
          if (typeof isInitStarted === 'function' && isInitStarted()) return;

          if (typeof isChatWindowActive === 'function' && !isChatWindowActive()) {
            return;
          }

          started = true;
          try {
            if (typeof initialize === 'function') initialize();
          } catch (e) {
            // ignore
          }

          cleanup();
        } catch (e) {
          // ignore
        }
      };

      const scheduleCheck = (delayMs = 0) => {
        try {
          if (pendingCheckTimer) clearTimeout(pendingCheckTimer);
        } catch (e) {
          // ignore
        }

        pendingCheckTimer = setTimeout(() => {
          pendingCheckTimer = null;
          maybeAutoInitialize();
        }, delayMs);
      };

      try {
        if (document.readyState === 'loading') {
          domHandler = () => {
            scheduleCheck(120);
          };
          document.addEventListener('DOMContentLoaded', domHandler);
        } else {
          scheduleCheck(0);
        }
      } catch (e) {
        // ignore
      }

      try {
        observer = new MutationObserver(() => {
          scheduleCheck(80);
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      } catch (e) {
        // ignore
      }

      return {
        disconnect: cleanup
      };
    } catch (e) {
      return null;
    }
  }

  window.WAAP.presenters.autoInitPresenter = {
    setup
  };
})();
