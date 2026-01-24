/*
用途：天气功能集成 legacy fallback（从 content.js 迁移出来）。当 MVP weatherIntegrationPresenter 不可用时，负责在聊天切换时机触发 WeatherInfo 更新，并做 chatKey 去重与节流。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.weatherIntegrationFallback) return;

  let lastWeatherChatKey = '';
  let lastWeatherTriggerAt = 0;
  const WEATHER_CHAT_SWITCH_THROTTLE_MS = 1200;

  function getActiveChatKeyForWeather(deps = {}) {
    try {
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
      if (domService?.getChatTitleFirstLine) {
        return domService.getChatTitleFirstLine() || '';
      }
    } catch (e) {
      // ignore
    }

    const documentRef = deps.document || window.document;

    const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
    const main = domService?.getMain ? domService.getMain() : documentRef.querySelector('#main');
    if (!main) return '';
    const header = main.querySelector('header');
    if (!header) return '';

    const text = (header.innerText || '').trim();
    if (!text) return '';

    // header 往往包含多行（联系人名/状态/按钮），取第一行做稳定 key
    const firstLine =
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)[0] || '';

    return firstLine;
  }

  function integrate(options = {}, deps = {}) {
    const force = options && options.force === true;

    const isEnabled = deps.isEnabled;
    const enabled = typeof isEnabled === 'function' ? isEnabled() : true;

    const WeatherInfo = deps.WeatherInfo || window.WeatherInfo;

    if (!enabled) {
      try {
        if (typeof WeatherInfo !== 'undefined') {
          if (typeof WeatherInfo.hideWeatherInfo === 'function') {
            WeatherInfo.hideWeatherInfo();
          }
          if (typeof WeatherInfo.stopRealtimeClock === 'function') {
            WeatherInfo.stopRealtimeClock();
          }
        }
      } catch (e) {
        // ignore
      }
      return false;
    }

    // 检查WeatherInfo是否可用
    if (typeof WeatherInfo === 'undefined') {
      try {
        console.warn('⚠️ WeatherInfo模块未加载，跳过天气功能集成');
      } catch (e) {
        // ignore
      }
      return false;
    }

    try {
      // 检查是否有聊天窗口
      const domService = deps.whatsappDomService || window.WAAP?.services?.whatsappDomService;
      const documentRef = deps.document || window.document;

      const main = domService?.getMain ? domService.getMain() : documentRef.querySelector('#main');
      const header = domService?.getMainHeader ? domService.getMainHeader(main) : (main ? main.querySelector('header') : null);
      const chatActive = !!(
        main &&
        ((typeof WeatherInfo?.isChatWindowActive === 'function' && WeatherInfo.isChatWindowActive()) || !!header)
      );

      const chatKey = getActiveChatKeyForWeather({ whatsappDomService: domService, document: documentRef });
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

      if (chatActive) {
        try {
          console.log('🌤️ 开始集成天气信息功能...');
        } catch (e) {
          // ignore
        }

        // 触发天气信息检查
        if (typeof WeatherInfo.checkForNewChatWindow === 'function') {
          try {
            console.log('🔍 检查新聊天窗口的天气信息...');
          } catch (e) {
            // ignore
          }
          WeatherInfo.checkForNewChatWindow();
        }

        // 如果有提取电话号码的功能，也触发一下
        if (typeof WeatherInfo.extractPhoneNumber === 'function') {
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
        return true;
      } else {
        try {
          console.log('ℹ️ 当前没有活跃的聊天窗口');
        } catch (e) {
          // ignore
        }
        return false;
      }
    } catch (error) {
      try {
        console.error('❌ 集成天气信息功能时出错:', error);
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  function getState() {
    return {
      lastWeatherChatKey,
      lastWeatherTriggerAt,
      throttleMs: WEATHER_CHAT_SWITCH_THROTTLE_MS
    };
  }

  window.WAAP.legacy.weatherIntegrationFallback = {
    integrate,
    getActiveChatKeyForWeather,
    getState
  };
})();
