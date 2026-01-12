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

      try {
        if (document.readyState === 'loading') {
          domHandler = () => {
            setTimeout(() => {
              maybeAutoInitialize();
            }, 500);
          };
          document.addEventListener('DOMContentLoaded', domHandler);
        } else {
          setTimeout(() => {
            maybeAutoInitialize();
          }, 500);
        }
      } catch (e) {
        // ignore
      }

      try {
        observer = new MutationObserver(() => {
          maybeAutoInitialize();
        });
        observer.observe(document.body, { childList: true, subtree: true });
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
