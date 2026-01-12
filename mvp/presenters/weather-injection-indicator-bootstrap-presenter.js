/*
用途：WhatsApp 顶部“注入提示（AI全能助手...）”早启动 Bootstrap Presenter（MVP）。
说明：
- 解决“必须进入聊天窗口后才会出现注入提示”的问题：不要依赖 WeatherInfo.init（它可能被 autoInitPresenter 的“聊天窗口活跃”条件阻塞）。
- 本模块在页面加载后就开始尝试，一旦 window.WeatherInfo 挂载完成，就调用 initInjectionIndicator。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.weatherInjectionIndicatorBootstrapPresenter) return;

  function getWeatherInfo(deps = {}) {
    try {
      return deps.WeatherInfo || window.WeatherInfo;
    } catch (e) {
      return null;
    }
  }

  function tryBootOnce(deps = {}) {
    try {
      const WeatherInfo = getWeatherInfo(deps);
      if (!WeatherInfo) return false;

      // 已经有 indicator：不重复启动
      try {
        const doc = deps.document || window.document;
        if (WeatherInfo.injectionIndicator && doc?.contains?.(WeatherInfo.injectionIndicator)) {
          return true;
        }
      } catch (e) {
        // ignore
      }

      // 优先走 service（更可控、带节流与 observer）
      try {
        const svc = deps.weatherInjectionIndicatorService || window.WAAP?.services?.weatherInjectionIndicatorService;
        if (svc?.initInjectionIndicator) {
          const ok = svc.initInjectionIndicator(WeatherInfo, {
            document: deps.document || window.document,
            MutationObserver: deps.MutationObserver || window.MutationObserver,
            setTimeout: deps.setTimeout || window.setTimeout,
            XPathResult: deps.XPathResult || window.XPathResult
          });
          if (ok) return true;
        }
      } catch (e) {
        // ignore
      }

      // 兜底：直接调用 WeatherInfo 自己的 initInjectionIndicator
      try {
        if (typeof WeatherInfo.initInjectionIndicator === 'function') {
          WeatherInfo.initInjectionIndicator();
          return true;
        }
      } catch (e) {
        // ignore
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  function setup(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      if (!documentRef || typeof setTimeoutRef !== 'function') return null;

      let stopped = false;
      let attempts = 0;
      const maxAttempts = 50; // 约 15s（50 * 300ms）
      let observer = null;
      let domHandler = null;

      const cleanup = () => {
        stopped = true;
        try {
          if (observer) observer.disconnect();
        } catch (e) {
          // ignore
        }
        observer = null;

        try {
          if (domHandler) documentRef.removeEventListener('DOMContentLoaded', domHandler);
        } catch (e) {
          // ignore
        }
        domHandler = null;
      };

      const loop = () => {
        try {
          if (stopped) return;
          attempts++;

          const ok = tryBootOnce({
            ...deps,
            document: documentRef,
            MutationObserver: MutationObserverRef,
            setTimeout: setTimeoutRef
          });

          if (ok) {
            cleanup();
            return;
          }

          if (attempts >= maxAttempts) {
            cleanup();
            return;
          }

          setTimeoutRef(loop, 300);
        } catch (e) {
          try {
            setTimeoutRef(loop, 500);
          } catch (e2) {
            // ignore
          }
        }
      };

      // DOM ready 后尽快开始
      try {
        if (documentRef.readyState === 'loading') {
          domHandler = () => {
            try {
              setTimeoutRef(loop, 50);
            } catch (e) {
              // ignore
            }
          };
          documentRef.addEventListener('DOMContentLoaded', domHandler);
        } else {
          setTimeoutRef(loop, 50);
        }
      } catch (e) {
        // ignore
      }

      // DOM 变化时也尝试一次（节流）
      try {
        if (typeof MutationObserverRef === 'function') {
          let lastTryAt = 0;
          observer = new MutationObserverRef(() => {
            try {
              if (stopped) return;
              const now = Date.now();
              if (now - lastTryAt < 200) return;
              lastTryAt = now;
              tryBootOnce({
                ...deps,
                document: documentRef,
                MutationObserver: MutationObserverRef,
                setTimeout: setTimeoutRef
              });
            } catch (e) {
              // ignore
            }
          });
          if (documentRef.body) {
            observer.observe(documentRef.body, { childList: true, subtree: true });
          }
        }
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

  window.WAAP.presenters.weatherInjectionIndicatorBootstrapPresenter = {
    setup,
    tryBootOnce
  };

  // 自动启动一次（不依赖聊天窗口状态）
  try {
    setup({
      document: window.document,
      MutationObserver: window.MutationObserver,
      setTimeout: window.setTimeout,
      XPathResult: window.XPathResult
    });
  } catch (e) {
    // ignore
  }
})();
