/*
用途：天气信息模块 legacy 兼容层
说明：
- 仅负责挂载 window.WeatherInfo 对外 API，并把核心逻辑转交给 WAAP 的 MVP services/presenters。
- 当 MVP 未加载时，做最小化兜底（console.warn + 安全返回），避免页面报错。
作者：Achord
*/

(function () {
  if (typeof window === 'undefined') return;

  if (!window.WAAP) window.WAAP = {};

  function warnMissing(name) {
    try {
      console.warn(`⚠️ WeatherInfo: MVP ${name} 未加载，已跳过。`);
    } catch (e) {
      // ignore
    }
  }

  function safeCall(fn, fallback) {
    try {
      if (typeof fn === 'function') return fn();
    } catch (e) {
      // ignore
    }
    return fallback;
  }

  const WeatherInfo = {
    // 版本信息
    version: 'V3.2.0',

    // --- 状态字段：给 MVP services/presenters 读写用（尽量保持与旧版字段名兼容） ---
    currentStatus: 'idle',
    currentInfoElement: null,
    currentWeatherElement: null,
    injectionIndicator: null,

    lastNoContactShownAt: 0,
    initialized: false,
    observerInitialized: false,
    lastChatCheckAt: 0,
    lastExtractAt: 0,
    lastChatKey: '',
    lastChatKeyAt: 0,
    consecutiveNoNumber: 0,

    displaySettings: {
      enabled: true,
      showWeather: true,
      showTime: true,
      allowCountryOverride: false,
      cacheAutoRenew: true,
      autoRenewEvictDays: 10
    },

    displaySettingsLoaded: false,
    displaySettingsListenerInstalled: false,

    // 国家数据（由 mvp/services/weather-country-code-map.js 提供）
    countryCodeMap: {},
    userCorrections: new Map(),
    resolvedCountries: new Map(),
    _resolvedSaveTimer: null,
    _allCountriesCache: null,

    // 天气缓存相关（由 mvp/services/weather-cache-service.js 管理）
    weatherCache: new Map(),
    weatherCacheTtlMs: 60 * 60 * 1000,
    _weatherInFlight: new Map(),
    _weatherCacheStorageKey: 'waapWeatherDataCacheV1',
    _weatherCacheLoaded: false,
    _weatherCacheStore: null,
    _weatherCacheSaveTimer: null,

    _weatherCacheAutoRenewEnabled: true,
    _weatherAutoRenewTimer: null,
    _weatherAutoRenewRunning: false,
    _weatherAutoRenewNextAttemptAt: new Map(),
    _weatherAutoRenewNextRunAt: 0,

    // Debug
    lastDebugNumber: null,
    currentPhoneNumber: null,

    statusMessages: {
      loading: '🌍 正在加载信息...',
      error: '❌ 天气信息加载失败',
      success: '✅ 天气信息加载完成',
      'no-number': '⚠️ 未检测到联系人号码',
      'no-contact': '⚠️ 未检测到聊天窗口'
    },

    // --- 基础工具：用于 integration fallback/orchestrator ---
    getActiveChatKey() {
      return safeCall(() => {
        const domService = window.WAAP?.services?.whatsappDomService;
        if (domService?.getChatTitleFirstLine) {
          return domService.getChatTitleFirstLine() || '';
        }

        const main = document.querySelector('#main');
        const header = main ? main.querySelector('header') : null;
        const text = (header && header.innerText ? header.innerText : '').trim();
        return (
          text
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)[0] || ''
        );
      }, '');
    },

    isChatWindowActive() {
      return safeCall(() => {
        const domService = window.WAAP?.services?.whatsappDomService;
        const main = domService?.getMain ? domService.getMain() : document.querySelector('#main');
        const header = domService?.getMainHeader ? domService.getMainHeader(main) : main?.querySelector?.('header');
        return !!(main && header);
      }, false);
    },

    // --- 初始化：只做加载设置/缓存/observer 的触发 ---
    init() {
      if (this.initialized) return;
      this.initialized = true;

      // countryCodeMap
      try {
        const map = window.WAAP?.data?.weatherCountryCodeMap;
        if (map && typeof map === 'object') {
          this.countryCodeMap = map;
        }
      } catch (e) {
        // ignore
      }

      // 设置读取/监听
      try {
        const s = window.WAAP?.services?.weatherSettingsService;
        if (s?.loadDisplaySettings) s.loadDisplaySettings(this, { chrome: window.chrome });
        else warnMissing('services.weatherSettingsService');
        if (s?.installDisplaySettingsListener) s.installDisplaySettingsListener(this, { chrome: window.chrome });
      } catch (e) {
        // ignore
      }

      // 国家修正/自动推断加载
      try {
        const cs = window.WAAP?.services?.weatherCountryStorageService;
        if (cs?.loadUserCorrections) cs.loadUserCorrections(this, { chrome: window.chrome });
        if (cs?.loadResolvedCountries) cs.loadResolvedCountries(this, { chrome: window.chrome });
      } catch (e) {
        // ignore
      }

      // 聊天 observer
      try {
        const obs = window.WAAP?.services?.weatherChatWindowObserverService;
        if (obs?.setupChatWindowObserver) {
          obs.setupChatWindowObserver(this, {
            document: window.document,
            MutationObserver: window.MutationObserver,
            setTimeout: window.setTimeout,
            clearTimeout: window.clearTimeout
          });
        }
      } catch (e) {
        // ignore
      }

      // 顶部注入提示（不强依赖）
      try {
        this.initInjectionIndicator();
      } catch (e) {
        // ignore
      }
    },

    setupChatWindowObserver() {
      try {
        const obs = window.WAAP?.services?.weatherChatWindowObserverService;
        if (!obs?.setupChatWindowObserver) {
          warnMissing('services.weatherChatWindowObserverService');
          return false;
        }
        return obs.setupChatWindowObserver(this, {
          document: window.document,
          MutationObserver: window.MutationObserver,
          setTimeout: window.setTimeout,
          clearTimeout: window.clearTimeout
        });
      } catch (e) {
        return false;
      }
    },

    disconnectChatWindowObserver() {
      try {
        const obs = window.WAAP?.services?.weatherChatWindowObserverService;
        if (!obs?.disconnect) return false;
        return obs.disconnect(this);
      } catch (e) {
        return false;
      }
    },

    // --- Settings / Country storage wrappers ---
    loadDisplaySettings() {
      const s = window.WAAP?.services?.weatherSettingsService;
      if (!s?.loadDisplaySettings) return warnMissing('services.weatherSettingsService');
      return s.loadDisplaySettings(this, { chrome: window.chrome });
    },

    installDisplaySettingsListener() {
      const s = window.WAAP?.services?.weatherSettingsService;
      if (!s?.installDisplaySettingsListener) return warnMissing('services.weatherSettingsService');
      return s.installDisplaySettingsListener(this, { chrome: window.chrome });
    },

    loadUserCorrections() {
      const s = window.WAAP?.services?.weatherCountryStorageService;
      if (!s?.loadUserCorrections) return warnMissing('services.weatherCountryStorageService');
      return s.loadUserCorrections(this, { chrome: window.chrome });
    },

    saveUserCorrections() {
      const s = window.WAAP?.services?.weatherCountryStorageService;
      if (!s?.saveUserCorrections) return warnMissing('services.weatherCountryStorageService');
      return s.saveUserCorrections(this, { chrome: window.chrome });
    },

    loadResolvedCountries() {
      const s = window.WAAP?.services?.weatherCountryStorageService;
      if (!s?.loadResolvedCountries) return warnMissing('services.weatherCountryStorageService');
      return s.loadResolvedCountries(this, { chrome: window.chrome });
    },

    scheduleSaveResolvedCountries() {
      const s = window.WAAP?.services?.weatherCountryStorageService;
      if (!s?.scheduleSaveResolvedCountries) return warnMissing('services.weatherCountryStorageService');
      return s.scheduleSaveResolvedCountries(this, { chrome: window.chrome, setTimeout: window.setTimeout });
    },

    maybeStoreResolvedCountry(countryInfo) {
      const s = window.WAAP?.services?.weatherCountryStorageService;
      if (!s?.maybeStoreResolvedCountry) return warnMissing('services.weatherCountryStorageService');
      return s.maybeStoreResolvedCountry(this, countryInfo, { chrome: window.chrome, setTimeout: window.setTimeout });
    },

    // --- Cache wrappers ---
    ensureWeatherCacheLoaded() {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.ensureWeatherCacheLoaded) return warnMissing('services.weatherCacheService');
      return s.ensureWeatherCacheLoaded(this, { chrome: window.chrome });
    },

    getPersistedWeatherCacheEntry(cacheKey) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.getPersistedWeatherCacheEntry) return null;
      return s.getPersistedWeatherCacheEntry(this, cacheKey);
    },

    setPersistedWeatherCacheEntry(cacheKey, entry) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.setPersistedWeatherCacheEntry) return warnMissing('services.weatherCacheService');
      return s.setPersistedWeatherCacheEntry(this, cacheKey, entry, { chrome: window.chrome, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
    },

    applyWeatherCacheMinutes(minutes) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.applyWeatherCacheMinutes) return warnMissing('services.weatherCacheService');
      return s.applyWeatherCacheMinutes(this, minutes, { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
    },

    applyWeatherCacheAutoRenew(value) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.applyWeatherCacheAutoRenew) return warnMissing('services.weatherCacheService');
      return s.applyWeatherCacheAutoRenew(this, value, { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
    },

    applyWeatherAutoRenewEvictDays(days) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.applyWeatherAutoRenewEvictDays) return warnMissing('services.weatherCacheService');
      return s.applyWeatherAutoRenewEvictDays(this, days, { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
    },

    stopWeatherAutoRenew() {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.stopWeatherAutoRenew) return warnMissing('services.weatherCacheService');
      return s.stopWeatherAutoRenew(this, { clearTimeout: window.clearTimeout });
    },

    scheduleWeatherAutoRenew(reason = '') {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.scheduleWeatherAutoRenew) return warnMissing('services.weatherCacheService');
      return s.scheduleWeatherAutoRenew(this, reason, { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
    },

    runWeatherAutoRenewOnce(options = {}) {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.runWeatherAutoRenewOnce) return warnMissing('services.weatherCacheService');
      return s.runWeatherAutoRenewOnce(this, { chrome: window.chrome, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, options });
    },

    getWeatherAutoRenewNextRunAt() {
      const s = window.WAAP?.services?.weatherCacheService;
      if (!s?.getWeatherAutoRenewNextRunAt) return 0;
      return s.getWeatherAutoRenewNextRunAt(this);
    },

    // --- Country detect ---
    identifyCountry(phoneNumber) {
      const s = window.WAAP?.services?.weatherCountryDetectService;
      if (!s?.identifyCountry) {
        warnMissing('services.weatherCountryDetectService');
        return null;
      }
      return s.identifyCountry(this, String(phoneNumber || '').replace(/[^\d]/g, ''));
    },

    // --- UI delegates ---
    showStatus(status, message = null) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.showStatus) return warnMissing('services.weatherUiService');
      return ui.showStatus(this, status, message, { document: window.document });
    },

    insertStatus(container = null) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.insertStatus) return warnMissing('services.weatherUiService');
      return ui.insertStatus(this, container, { document: window.document });
    },

    hideWeatherInfo() {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.hideWeatherInfo) return warnMissing('services.weatherUiService');
      return ui.hideWeatherInfo(this, { clearInterval: window.clearInterval });
    },

    createWeatherDisplay(countryInfo, weatherData, timeData) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.createWeatherDisplay) return warnMissing('services.weatherUiService');
      return ui.createWeatherDisplay(this, countryInfo, weatherData, timeData, {
        document: window.document,
        chrome: window.chrome,
        setInterval: window.setInterval,
        clearInterval: window.clearInterval
      });
    },

    updateWeatherDisplay(weatherData) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.updateWeatherDisplay) return warnMissing('services.weatherUiService');
      return ui.updateWeatherDisplay(this, weatherData, {
        document: window.document,
        requestAnimationFrame: window.requestAnimationFrame
      });
    },

    getLocalTime(timezone) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.getLocalTime) {
        warnMissing('services.weatherUiService');
        return { time: '无法获取', timezone: String(timezone || '') };
      }
      return ui.getLocalTime(timezone);
    },

    startRealtimeClock() {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.startRealtimeClock) return warnMissing('services.weatherUiService');
      return ui.startRealtimeClock(this, {
        document: window.document,
        setInterval: window.setInterval,
        clearInterval: window.clearInterval
      });
    },

    stopRealtimeClock() {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.stopRealtimeClock) return warnMissing('services.weatherUiService');
      return ui.stopRealtimeClock(this, { clearInterval: window.clearInterval });
    },

    openCountryOverridePrompt(countryInfo) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.openCountryOverridePrompt) return warnMissing('services.weatherUiService');
      return ui.openCountryOverridePrompt(this, countryInfo, { document: window.document, chrome: window.chrome });
    },

    openCountryPicker(countryInfo) {
      const ui = window.WAAP?.services?.weatherUiService;
      if (!ui?.openCountryPicker) return warnMissing('services.weatherUiService');
      return ui.openCountryPicker(this, countryInfo, { document: window.document, chrome: window.chrome });
    },

    // --- Weather display flow delegates ---
    async displayWeatherInfo(countryInfo, options = {}) {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (!p?.displayWeatherInfo) {
        warnMissing('presenters.weatherDisplayPresenter');
        return false;
      }
      return await p.displayWeatherInfo(this, countryInfo, options, { document: window.document, chrome: window.chrome });
    },

    async loadWeatherDataAsync(countryInfo, options = {}) {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (!p?.loadWeatherDataAsync) {
        warnMissing('presenters.weatherDisplayPresenter');
        return null;
      }
      return await p.loadWeatherDataAsync(this, countryInfo, options, { document: window.document, chrome: window.chrome });
    },

    async getWeatherData(countryInfo, options = {}) {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (!p?.getWeatherData) {
        warnMissing('presenters.weatherDisplayPresenter');
        return null;
      }
      return await p.getWeatherData(this, countryInfo, options, { document: window.document, chrome: window.chrome });
    },

    async getWeatherFromWttr(countryInfo, options = {}) {
      const s = window.WAAP?.services?.weatherWttrService;
      if (!s?.getWeatherFromWttr) {
        warnMissing('services.weatherWttrService');
        return null;
      }
      return await s.getWeatherFromWttr(countryInfo, options, {
        fetch: window.fetch,
        AbortController: window.AbortController,
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout
      });
    },

    getDefaultWeatherData(countryInfo) {
      const s = window.WAAP?.services?.weatherWttrService;
      if (!s?.getDefaultWeatherData) {
        warnMissing('services.weatherWttrService');
        return null;
      }
      return s.getDefaultWeatherData(countryInfo);
    },

    // --- Chat flow delegates ---
    checkForNewChatWindow() {
      const p = window.WAAP?.presenters?.weatherChatFlowPresenter;
      if (!p?.checkForNewChatWindow) {
        warnMissing('presenters.weatherChatFlowPresenter');
        return false;
      }
      return p.checkForNewChatWindow(this, { document: window.document, setTimeout: window.setTimeout });
    },

    extractPhoneNumber() {
      const p = window.WAAP?.presenters?.weatherChatFlowPresenter;
      if (!p?.extractPhoneNumber) {
        warnMissing('presenters.weatherChatFlowPresenter');
        return false;
      }
      return p.extractPhoneNumber(this, { document: window.document, XPathResult: window.XPathResult, setTimeout: window.setTimeout });
    },

    processPhoneNumber(phoneNumber) {
      const p = window.WAAP?.presenters?.weatherPhoneProcessingPresenter;
      if (!p?.processPhoneNumber) {
        warnMissing('presenters.weatherPhoneProcessingPresenter');
        return false;
      }
      return p.processPhoneNumber(this, phoneNumber);
    },

    tryGetWhatsAppNumber() {
      const s = window.WAAP?.services?.weatherPhoneExtractService;
      if (!s?.tryGetWhatsAppNumber) {
        warnMissing('services.weatherPhoneExtractService');
        return null;
      }
      return s.tryGetWhatsAppNumber(this, {
        document: window.document,
        XPathResult: window.XPathResult,
        onPhoneNumber: (num) => {
          try {
            this.processPhoneNumber(num);
          } catch (e) {
            // ignore
          }
        }
      });
    },

    // --- Injection indicator delegates ---
    createInjectionIndicator() {
      const s = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (!s?.createInjectionIndicator) {
        warnMissing('services.weatherInjectionIndicatorService');
        return false;
      }
      return s.createInjectionIndicator(this, { document: window.document, XPathResult: window.XPathResult });
    },

    removeInjectionIndicator() {
      const s = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (!s?.removeInjectionIndicator) {
        warnMissing('services.weatherInjectionIndicatorService');
        return false;
      }
      return s.removeInjectionIndicator(this);
    },

    initInjectionIndicator() {
      const s = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (!s?.initInjectionIndicator) {
        warnMissing('services.weatherInjectionIndicatorService');s
        return false;
      }
      return s.initInjectionIndicator(this, {
        document: window.document,
        MutationObserver: window.MutationObserver,
        setTimeout: window.setTimeout,
        XPathResult: window.XPathResult
      });
    },

    // --- Debug helpers（保留外部入口） ---
    manualTrigger() {
      try {
        this.currentStatus = 'idle';
      } catch (e) {
        // ignore
      }

      try {
        this.hideWeatherInfo();
      } catch (e) {
        // ignore
      }

      try {
        this.checkForNewChatWindow();
      } catch (e) {
        // ignore
      }

      return true;
    },

    testWhatsAppExtraction() {
      try {
        return this.tryGetWhatsAppNumber();
      } catch (e) {
        return null;
      }
    }
  };

  // 挂载到全局
  window.WeatherInfo = WeatherInfo;

  // 兼容：保留全局调试函数名
  window.testWhatsApp = function () {
    try {
      return window.WeatherInfo?.testWhatsAppExtraction?.();
    } catch (e) {
      return null;
    }
  };

  window.getWhatsAppNumber = function () {
    try {
      return window.WeatherInfo?.tryGetWhatsAppNumber?.();
    } catch (e) {
      return null;
    }
  };

  window.triggerWeatherInfo = function () {
    try {
      if (window.WeatherInfo?.manualTrigger) {
        return window.WeatherInfo.manualTrigger();
      }
      return false;
    } catch (e) {
      try {
        console.error('❌ 手动触发失败:', e);
      } catch (e2) {
        // ignore
      }
      return false;
    }
  };

  try {
    console.log('WeatherInfo: 天气信息兼容层已加载');
  } catch (e) {
    // ignore
  }
})();
