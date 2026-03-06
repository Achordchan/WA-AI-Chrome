/*
用途：天气功能集成 Presenter（从 content.js 迁移出来）。负责在聊天切换/接近底部等时机，安全触发 WeatherInfo 更新，并做节流与可用性判断。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.weatherIntegrationPresenter) return;

  let lastWeatherChatKey = '';
  let lastWeatherTriggerAt = 0;
  const WEATHER_CHAT_SWITCH_THROTTLE_MS = 1200;

  function getActiveChatKey(deps = {}) {
    try {
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
      if (domService?.getChatTitleFirstLine) {
        return domService.getChatTitleFirstLine() || '';
      }
    } catch (e) {
      // ignore
    }

    try {
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
      const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
      if (!main) return '';
      const header = main.querySelector('header');
      if (!header) return '';

      const text = (header.innerText || '').trim();
      if (!text) return '';

      return (
        text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)[0] || ''
      );
    } catch (e) {
      return '';
    }
  }

  function hideWeatherIfPossible(WeatherInfo) {
    try {
      if (!WeatherInfo) return;
      if (typeof WeatherInfo.hideWeatherInfo === 'function') {
        WeatherInfo.hideWeatherInfo();
      }
      if (typeof WeatherInfo.stopRealtimeClock === 'function') {
        WeatherInfo.stopRealtimeClock();
      }
    } catch (e) {
      // ignore
    }
  }

  function isChatActive(deps = {}) {
    try {
      const WeatherInfo = deps.WeatherInfo || window.WeatherInfo;
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;

      const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
      const header = domService?.getMainHeader ? domService.getMainHeader(main) : main?.querySelector?.('header');

      if (!main) return false;

      if (typeof WeatherInfo?.isChatWindowActive === 'function') {
        try {
          if (WeatherInfo.isChatWindowActive()) return true;
        } catch (e) {
          // ignore
        }
      }

      return !!header;
    } catch (e) {
      return false;
    }
  }

  function setupAutoIntegrate(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;
      const integrateWeatherInfo = deps.integrateWeatherInfo;

      if (!documentRef || typeof setTimeoutRef !== 'function') return null;

      let domHandler = null;
      let timer1 = null;
      let timer2 = null;

      const cleanup = () => {
        try {
          if (domHandler) documentRef.removeEventListener('DOMContentLoaded', domHandler);
        } catch (e) {
          // ignore
        }
        domHandler = null;

        try {
          if (timer1) clearTimeout(timer1);
        } catch (e) {
          // ignore
        }
        timer1 = null;

        try {
          if (timer2) clearTimeout(timer2);
        } catch (e) {
          // ignore
        }
        timer2 = null;
      };

      try {
        domHandler = () => {
          try {
            timer1 = setTimeoutRef(() => {
              try {
                if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
              } catch (e) {
                // ignore
              }
            }, 3000);
          } catch (e) {
            // ignore
          }
        };

        documentRef.addEventListener('DOMContentLoaded', domHandler);
      } catch (e) {
        // ignore
      }

      try {
        if (documentRef.readyState === 'complete' || documentRef.readyState === 'interactive') {
          timer2 = setTimeoutRef(() => {
            try {
              if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
            } catch (e) {
              // ignore
            }
          }, 2000);
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

  function integrate(options = {}, deps = {}) {
    const force = options && options.force === true;

    const enabled = typeof deps.isEnabled === 'function' ? deps.isEnabled() : true;
    const WeatherInfo = deps.WeatherInfo || window.WeatherInfo;

    if (!enabled) {
      hideWeatherIfPossible(WeatherInfo);
      return false;
    }

    if (typeof WeatherInfo === 'undefined') {
      try {
        console.warn('⚠️ WeatherInfo模块未加载，跳过天气功能集成');
      } catch (e) {
        // ignore
      }
      return false;
    }

    try {
      const chatKey = getActiveChatKey(deps);
      const now = Date.now();

      if (!force) {
        if (!chatKey) {
          try {
            console.log('ℹ️ 当前无法识别聊天窗口 key，跳过天气更新');
          } catch (e) {
            // ignore
          }
          return false;
        }
        if (chatKey === lastWeatherChatKey) {
          return false;
        }
        if (now - lastWeatherTriggerAt < WEATHER_CHAT_SWITCH_THROTTLE_MS) {
          return false;
        }
        lastWeatherChatKey = chatKey;
        lastWeatherTriggerAt = now;
      }

      if (!isChatActive(deps)) {
        try {
          console.log('ℹ️ 当前没有活跃的聊天窗口');
        } catch (e) {
          // ignore
        }
        return false;
      }

      try {
        console.log('🌤️ 开始集成天气信息功能...');
      } catch (e) {
        // ignore
      }

      try {
        if (typeof WeatherInfo.checkForNewChatWindow === 'function') {
          try {
            console.log('🔍 检查新聊天窗口的天气信息...');
          } catch (e) {
            // ignore
          }
          WeatherInfo.checkForNewChatWindow();
        } else if (typeof WeatherInfo.extractPhoneNumber === 'function') {
          try {
            console.log('📞 尝试提取电话号码...');
          } catch (e) {
            // ignore
          }
          setTimeout(() => {
            try {
              WeatherInfo.extractPhoneNumber();
            } catch (e2) {
              // ignore
            }
          }, 1000);
        }
      } catch (e) {
        // ignore
      }

      return true;
    } catch (error) {
      try {
        console.error('❌ 集成天气信息功能时出错:', error);
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  window.WAAP.presenters.weatherIntegrationPresenter = {
    integrate,
    getActiveChatKey,
    setupAutoIntegrate
  };
})();
