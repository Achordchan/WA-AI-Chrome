/*
用途：初始化流程 legacy fallback（从 content.js 迁移出来）。当 MVP contentOrchestratorPresenter 不可用时，负责执行旧初始化：更新日志、样式注入、消息观察、输入框翻译、天气初始化，并维护初始化状态。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.initializeFallback) return;

  async function legacyInitialize(deps = {}) {
    const isInitialized = deps.isInitialized;
    const isInitStarted = deps.isInitStarted;
    const markInitStarted = deps.markInitStarted;
    const markInitialized = deps.markInitialized;
    const markInitFailed = deps.markInitFailed;

    const updatePluginStatus = deps.updatePluginStatus;
    const checkAndShowUpdateLog = deps.checkAndShowUpdateLog;
    const injectStyles = deps.injectStyles;
    const observeMessages = deps.observeMessages;
    const initializeInputTranslate = deps.initializeInputTranslate;

    const WeatherInfo = deps.WeatherInfo;

    try {
      if (typeof isInitialized === 'function' && isInitialized()) return;
      if (typeof isInitStarted === 'function' && isInitStarted()) return;

      if (typeof markInitStarted === 'function') markInitStarted();

      try {
        if (typeof checkAndShowUpdateLog === 'function') {
          await checkAndShowUpdateLog();
        }
      } catch (e) {
        // ignore
      }

      try {
        if (typeof injectStyles === 'function') injectStyles();
        if (typeof updatePluginStatus === 'function') updatePluginStatus('translation', true);
      } catch (e) {
        // ignore
      }

      try {
        if (typeof observeMessages === 'function') observeMessages();
        if (typeof updatePluginStatus === 'function') updatePluginStatus('observer', true);
      } catch (e) {
        // ignore
      }

      // 初始化输入框翻译功能
      try {
        if (typeof initializeInputTranslate === 'function') {
          initializeInputTranslate();
          if (typeof updatePluginStatus === 'function') updatePluginStatus('apiService', true);
        } else {
          try {
            console.error('Input translate initialization function not found');
          } catch (e) {
            // ignore
          }
          if (typeof updatePluginStatus === 'function') updatePluginStatus('apiService', false);
        }
      } catch (e) {
        if (typeof updatePluginStatus === 'function') updatePluginStatus('apiService', false);
      }

      // 初始化天气信息功能
      try {
        if (typeof WeatherInfo !== 'undefined') {
          try {
            console.log('正在初始化天气信息功能...');
          } catch (e) {
            // ignore
          }
          try {
            if (typeof WeatherInfo?.init === 'function') {
              WeatherInfo.init();
            } else if (typeof WeatherInfo?.setupChatWindowObserver === 'function') {
              WeatherInfo.setupChatWindowObserver();
            }
            if (typeof updatePluginStatus === 'function') updatePluginStatus('weatherInfo', true);
            try {
              console.log('✅ 天气信息功能初始化成功');
            } catch (e) {
              // ignore
            }
          } catch (error) {
            try {
              console.error('❌ 天气信息功能初始化失败:', error);
            } catch (e) {
              // ignore
            }
            if (typeof updatePluginStatus === 'function') updatePluginStatus('weatherInfo', false);
          }
        } else {
          try {
            console.warn('⚠️ WeatherInfo 模块未找到，天气功能将不可用');
          } catch (e) {
            // ignore
          }
          if (typeof updatePluginStatus === 'function') updatePluginStatus('weatherInfo', false);
        }
      } catch (e) {
        if (typeof updatePluginStatus === 'function') updatePluginStatus('weatherInfo', false);
      }

      if (typeof markInitialized === 'function') markInitialized();
    } catch (error) {
      try {
        console.error('Initialization error:', error);
      } catch (e) {
        // ignore
      }

      try {
        if (typeof updatePluginStatus === 'function') {
          updatePluginStatus('translation', false);
          updatePluginStatus('observer', false);
          updatePluginStatus('apiService', false);
          updatePluginStatus('weatherInfo', false);
        }
      } catch (e) {
        // ignore
      }

      if (typeof markInitFailed === 'function') markInitFailed();
    }
  }

  window.WAAP.legacy.initializeFallback = {
    legacyInitialize
  };
})();
