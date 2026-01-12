/*
用途：输入框区域监听 legacy fallback（从 content.js 迁移出来）。当 MVP inputObserverPresenter 不可用时，使用 MutationObserver 监听 #app 变化并补齐输入框翻译按钮/翻译器。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.observeInputAreaFallback) return;

  function legacyObserveInputArea(deps = {}) {
    const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
    const documentRef = deps.document || window.document;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    const addInputTranslateButton = deps.addInputTranslateButton || window.addInputTranslateButton;
    const addInputTranslator = deps.addInputTranslator || window.addInputTranslator;

    let isProcessing = false;
    const observer = new MutationObserverRef((mutations) => {
      if (isProcessing) return;

      isProcessing = true;
      setTimeoutRef(() => {
        try {
          const footer = documentRef.querySelector('footer');
          if (footer) {
            // 入框翻译按钮
            if (!footer.querySelector('.input-translate-btn')) {
              try {
                if (typeof addInputTranslateButton === 'function') addInputTranslateButton();
              } catch (e) {
                // ignore
              }
            }
            // 添加入框翻译器
            if (!footer.querySelector('.input-translator-btn')) {
              try {
                if (typeof addInputTranslator === 'function') addInputTranslator();
              } catch (e) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore
        }

        isProcessing = false;
      }, 500);
    });

    const appContainer = documentRef.querySelector('#app');
    if (appContainer) {
      observer.observe(appContainer, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }

    return () => observer.disconnect();
  }

  window.WAAP.legacy.observeInputAreaFallback = {
    legacyObserveInputArea
  };
})();
