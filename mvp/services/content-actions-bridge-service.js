/*
用途：为 content.js 提供 actions/healthCheck 的统一桥接层（MVP）。
说明：
- 统一把各类动作（translateAllMessages/analyzeConversation/showSettingsModal 等）挂到 WAAP.core.actions。
- 同时补齐 window.* 兼容别名（仅在缺失时补，不覆盖现有全局）。
- healthCheck 也由本 service 安装，依赖由 content.js 注入（避免 content.js 过大）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.contentActionsBridgeService) return;

  let healthDeps = null;

  function ensureCore() {
    try {
      if (!window.WAAP) window.WAAP = {};
      if (!window.WAAP.core) window.WAAP.core = {};
      if (!window.WAAP.core.actions) window.WAAP.core.actions = {};
      return window.WAAP.core;
    } catch (e) {
      return null;
    }
  }

  function safeSetWindowFn(name, fn) {
    try {
      if (!name) return;
      if (typeof fn !== 'function') return;
      if (typeof window[name] !== 'function') {
        window[name] = fn;
      }
    } catch (e) {
      // ignore
    }
  }

  function registerActions(actions = {}) {
    try {
      const core = ensureCore();
      if (!core) return false;

      const a = core.actions;
      if (actions && typeof actions === 'object') {
        Object.keys(actions).forEach((k) => {
          try {
            const fn = actions[k];
            if (typeof fn !== 'function') return;
            a[k] = fn;
          } catch (e) {
            // ignore
          }
        });
      }

      try {
        if (typeof core.initialize !== 'function' && typeof a.initialize === 'function') {
          core.initialize = a.initialize;
        }
      } catch (e) {
        // ignore
      }

      // 兼容别名（仅补齐缺失的 window.*）
      safeSetWindowFn('translateAllMessages', a.translateAllMessages);
      safeSetWindowFn('analyzeConversation', a.analyzeConversation);
      safeSetWindowFn('showSettingsModal', a.showSettingsModal);
      safeSetWindowFn('closeSettingsModal', a.closeSettingsModal);
      safeSetWindowFn('showToast', a.showToast);
      safeSetWindowFn('showTranslateConfirmDialog', a.showTranslateConfirmDialog);
      safeSetWindowFn('checkAiEnabled', a.checkAiEnabled);
      safeSetWindowFn('showExtensionInvalidatedError', a.showExtensionInvalidatedError);
      safeSetWindowFn('initialize', a.initialize);
      safeSetWindowFn('triggerAutoTranslateScan', a.triggerAutoTranslateScan);
      safeSetWindowFn('getAutoTranslateState', a.getAutoTranslateState);
      safeSetWindowFn('triggerWeatherInfo', a.triggerWeatherInfo);
      safeSetWindowFn('testTranslationServiceSwitch', a.testTranslationServiceSwitch);

      try {
        if (!window.WAAP) window.WAAP = {};
        if (!window.WAAP.debug) window.WAAP.debug = {};
        const dbg = window.WAAP.debug;
        if (typeof dbg.triggerAutoTranslateScan !== 'function' && typeof a.triggerAutoTranslateScan === 'function') {
          dbg.triggerAutoTranslateScan = a.triggerAutoTranslateScan;
        }
        if (typeof dbg.getAutoTranslateState !== 'function' && typeof a.getAutoTranslateState === 'function') {
          dbg.getAutoTranslateState = a.getAutoTranslateState;
        }
        if (typeof dbg.triggerWeatherInfo !== 'function' && typeof a.triggerWeatherInfo === 'function') {
          dbg.triggerWeatherInfo = a.triggerWeatherInfo;
        }
        if (typeof dbg.testTranslationServiceSwitch !== 'function' && typeof a.testTranslationServiceSwitch === 'function') {
          dbg.testTranslationServiceSwitch = a.testTranslationServiceSwitch;
        }
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function registerHealthCheck(deps = {}) {
    try {
      healthDeps = deps && typeof deps === 'object' ? deps : null;

      const core = ensureCore();
      if (!core) return false;
      if (typeof core.healthCheck === 'function') return true;

      core.healthCheck = function () {
        try {
          const w = window;
          const waap = w.WAAP || {};
          const services = waap.services || {};
          const presenters = waap.presenters || {};
          const legacy = waap.legacy || {};

          const d = healthDeps || {};
          const getContentState = typeof d.getContentState === 'function' ? d.getContentState : () => ({});
          const isAutoTranslateEnabled = typeof d.isAutoTranslateEnabled === 'function' ? d.isAutoTranslateEnabled : () => false;
          const pluginStatus = d.pluginStatus && typeof d.pluginStatus === 'object' ? d.pluginStatus : (waap.state?.pluginStatus || null);

          const st = getContentState() || {};

          return {
            ok: true,
            hasWAAP: !!w.WAAP,
            pluginStatus,
            state: {
              autoTranslateEnabled: !!isAutoTranslateEnabled(),
              weatherInfoEnabled: st.weatherInfoEnabled,
              contentScriptInitStarted: st.contentScriptInitStarted,
              contentScriptInitialized: st.contentScriptInitialized
            },
            globals: {
              hasInitialize: typeof w.initialize === 'function',
              hasTranslateAllMessages: typeof w.translateAllMessages === 'function',
              hasAnalyzeConversation: typeof w.analyzeConversation === 'function',
              hasShowSettingsModal: typeof w.showSettingsModal === 'function'
            },
            services: {
              whatsappDomService: !!services.whatsappDomService,
              translationOrchestratorService: !!services.translationOrchestratorService,
              runtimeMessageRouter: !!services.runtimeMessageRouter,
              settingsSyncService: !!services.settingsSyncService,
              privacyRecordsService: !!services.privacyRecordsService,
              contentStateService: !!services.contentStateService,
              contentActionsBridgeService: !!services.contentActionsBridgeService
            },
            presenters: {
              contentOrchestratorPresenter: !!presenters.contentOrchestratorPresenter,
              translationPresenter: !!presenters.translationPresenter,
              analysisPresenter: !!presenters.analysisPresenter,
              inputTranslatePresenter: !!presenters.inputTranslatePresenter,
              messageObserverPresenter: !!presenters.messageObserverPresenter,
              quickChatPresenter: !!presenters.quickChatPresenter,
              weatherIntegrationPresenter: !!presenters.weatherIntegrationPresenter,
              autoInitPresenter: !!presenters.autoInitPresenter
            },
            legacy: {
              initializeFallback: !!legacy.initializeFallback,
              observerOrchestrator: !!legacy.observerOrchestrator,
              translateTextFallback: !!legacy.translateTextFallback
            },
            weather: {
              hasWeatherInfo: typeof w.WeatherInfo !== 'undefined' && !!w.WeatherInfo
            }
          };
        } catch (e) {
          return { ok: false, error: String(e && e.message ? e.message : e) };
        }
      };

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.contentActionsBridgeService = {
    registerActions,
    registerHealthCheck
  };
})();
