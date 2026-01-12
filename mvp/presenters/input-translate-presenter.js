/*
用途：输入框翻译功能 Presenter。
说明：统一管理 input-translate.js 的初始化入口，确保只初始化一次，并返回可选清理句柄。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.inputTranslatePresenter) return;

  let started = false;
  let cleanupFn = null;

  function normalizeCleanupHandle(ret) {
    if (!ret) return null;

    if (typeof ret === 'function') {
      return ret;
    }

    if (ret && typeof ret.disconnect === 'function') {
      return () => {
        try {
          ret.disconnect();
        } catch (e) {
          // ignore
        }
      };
    }

    return null;
  }

  function setup(deps = {}) {
    try {
      if (started) {
        return {
          disconnect: () => {
            try {
              if (typeof cleanupFn === 'function') cleanupFn();
            } catch (e) {
              // ignore
            }
          }
        };
      }

      started = true;

      const initializeInputTranslate =
        deps.initializeInputTranslate || window.initializeInputTranslate;

      try {
        if (typeof initializeInputTranslate === 'function') {
          const ret = initializeInputTranslate();
          cleanupFn = normalizeCleanupHandle(ret);
        }
      } catch (e) {
        cleanupFn = null;
      }

      return {
        disconnect: () => {
          try {
            if (typeof cleanupFn === 'function') cleanupFn();
          } catch (e) {
            // ignore
          }
        }
      };
    } catch (e) {
      return null;
    }
  }

  function getState() {
    return {
      started: started === true,
      hasCleanup: typeof cleanupFn === 'function'
    };
  }

  window.WAAP.presenters.inputTranslatePresenter = {
    setup,
    getState
  };
})();
