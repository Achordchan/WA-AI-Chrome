/*
用途：输入区观察器 Presenter（从 content.js 迁移出来）。负责监听 WhatsApp DOM 变化，并在输入框区域出现时补齐输入框翻译按钮等组件。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.inputObserverPresenter) return;

  function observeInputArea(deps = {}) {
    let isProcessing = false;

    const getMutationObserver = () => {
      try {
        return deps.MutationObserver || window.MutationObserver;
      } catch (e) {
        return null;
      }
    };

    const getAppContainer = () => {
      try {
        if (typeof deps.getAppContainer === 'function') return deps.getAppContainer();
      } catch (e) {
        // ignore
      }
      try {
        const doc = deps.document || window.document;
        return doc?.querySelector?.('#app') || null;
      } catch (e) {
        return null;
      }
    };

    const safeSetTimeout = (fn, ms) => {
      try {
        const st = deps.setTimeout || window.setTimeout;
        return st(fn, ms);
      } catch (e) {
        return null;
      }
    };

    const tryPatchFooter = () => {
      try {
        const doc = deps.document || window.document;
        const footer = doc?.querySelector?.('footer');
        if (!footer) return;

        try {
          if (!footer.querySelector('.input-translate-btn')) {
            const addBtn = deps.addInputTranslateButton || window.addInputTranslateButton;
            if (typeof addBtn === 'function') addBtn();
          }
        } catch (e) {
          // ignore
        }

        try {
          if (!footer.querySelector('.input-translator-btn')) {
            const addTranslator = deps.addInputTranslator || window.addInputTranslator;
            if (typeof addTranslator === 'function') addTranslator();
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }
    };

    const MutationObserverCtor = getMutationObserver();
    if (!MutationObserverCtor) {
      return () => {};
    }

    const observer = new MutationObserverCtor(() => {
      if (isProcessing) return;

      isProcessing = true;
      safeSetTimeout(() => {
        tryPatchFooter();
        isProcessing = false;
      }, 500);
    });

    const appContainer = getAppContainer();
    if (appContainer) {
      try {
        observer.observe(appContainer, {
          childList: true,
          subtree: true,
          attributes: false
        });
      } catch (e) {
        // ignore
      }
    }

    return () => {
      try {
        observer.disconnect();
      } catch (e) {
        // ignore
      }
    };
  }

  window.WAAP.presenters.inputObserverPresenter = {
    observeInputArea
  };
})();
