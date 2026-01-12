/*
用途：天气模块“聊天窗口变化观察器”Service（MVP）。
说明：
- 从 legacy-weather-info.js 迁移 setupChatWindowObserver 的核心逻辑：监听 main 区域变化，防抖触发 checkForNewChatWindow。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherChatWindowObserverService) return;

  function setupChatWindowObserver(owner, deps = {}) {
    try {
      if (!owner) return false;

      // 设置聊天窗口观察器
      if (owner.observerInitialized && owner.chatWindowObserver) {
        return true;
      }

      try {
        if (!owner.displaySettingsLoaded) {
          owner.loadDisplaySettings?.();
        }
        owner.installDisplaySettingsListener?.();
      } catch (e) {
        // ignore
      }

      owner.observerInitialized = true;

      const documentRef = deps.document || window.document;
      const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;
      const clearTimeoutRef = deps.clearTimeout || window.clearTimeout;

      if (!documentRef || typeof MutationObserverRef !== 'function') return false;
      if (typeof setTimeoutRef !== 'function' || typeof clearTimeoutRef !== 'function') return false;

      // 监听聊天窗口切换 - 使用防抖机制减少频繁触发
      let debounceTimeout = null;
      const observer = new MutationObserverRef((mutations) => {
        // 清除之前的定时器
        try {
          if (debounceTimeout) {
            clearTimeoutRef(debounceTimeout);
          }
        } catch (e) {
          // ignore
        }

        // 只有当变化涉及到main区域时才检查
        let hasMainChange = false;
        try {
          hasMainChange = mutations.some(
            (mutation) =>
              mutation.target.id === 'main' ||
              (mutation.target.closest && mutation.target.closest('#main')) ||
              (mutation.addedNodes &&
                Array.from(mutation.addedNodes).some(
                  (node) => node && node.nodeType === 1 && (node.id === 'main' || (node.querySelector && node.querySelector('#main')))
                ))
          );
        } catch (e) {
          hasMainChange = true;
        }

        if (hasMainChange) {
          // 防抖：500ms内只触发一次
          debounceTimeout = setTimeoutRef(() => {
            try {
              owner.checkForNewChatWindow?.();
            } catch (e) {
              // ignore
            }
          }, 500);
        }
      });

      owner.chatWindowObserver = observer;

      // 开始观察 - 只观察主要区域
      try {
        const mainElement = documentRef.getElementById ? documentRef.getElementById('main') : documentRef.querySelector?.('#main');
        if (mainElement) {
          observer.observe(mainElement, {
            childList: true,
            subtree: true
          });
        } else if (documentRef.body) {
          // 如果main元素还没加载，观察整个body但更加精确
          observer.observe(documentRef.body, {
            childList: true,
            subtree: false // 只观察直接子元素
          });
        }
      } catch (e) {
        // ignore
      }

      // 初始检查
      try {
        setTimeoutRef(() => {
          try {
            owner.checkForNewChatWindow?.();
          } catch (e) {
            // ignore
          }
        }, 1000);
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function disconnect(owner) {
    try {
      if (!owner) return false;
      if (owner.chatWindowObserver && typeof owner.chatWindowObserver.disconnect === 'function') {
        owner.chatWindowObserver.disconnect();
      }
      owner.chatWindowObserver = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.weatherChatWindowObserverService = {
    setupChatWindowObserver,
    disconnect
  };
})();
