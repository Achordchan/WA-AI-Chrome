/*
用途：为 content.js 提供统一的运行时状态存储（MVP）。
说明：集中管理 content.js 的初始化标记、自动翻译开关、天气开关、pluginStatus，并提供读取方法给 runtimeMessageRouter / healthCheck 等使用。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};
  if (!window.WAAP.state) window.WAAP.state = {};

  if (window.WAAP.services.contentStateService) return;

  function ensureState() {
    try {
      if (!window.WAAP) window.WAAP = {};
      if (!window.WAAP.state) window.WAAP.state = {};
      if (!window.WAAP.state.content) window.WAAP.state.content = {};

      const s = window.WAAP.state.content;

      // pluginStatus：允许 content.js 先创建，也允许此 service 先创建
      if (!s.pluginStatus) {
        s.pluginStatus = window.WAAP.state.pluginStatus && typeof window.WAAP.state.pluginStatus === 'object'
          ? window.WAAP.state.pluginStatus
          : null;
      }

      if (!s.pluginStatus || typeof s.pluginStatus !== 'object') {
        s.pluginStatus = {
          translation: false,
          observer: false,
          apiService: false,
          weatherInfo: false
        };
      }

      if (!window.WAAP.state.pluginStatus) {
        window.WAAP.state.pluginStatus = s.pluginStatus;
      }

      if (typeof s.autoTranslateNewMessagesEnabled !== 'boolean') s.autoTranslateNewMessagesEnabled = false;
      if (typeof s.weatherInfoEnabled !== 'boolean') s.weatherInfoEnabled = true;
      if (typeof s.sttEnabled !== 'boolean') s.sttEnabled = false;
      if (typeof s.contentScriptInitStarted !== 'boolean') s.contentScriptInitStarted = false;
      if (typeof s.contentScriptInitialized !== 'boolean') s.contentScriptInitialized = false;

      return s;
    } catch (e) {
      return {
        pluginStatus: {
          translation: false,
          observer: false,
          apiService: false,
          weatherInfo: false
        },
        autoTranslateNewMessagesEnabled: false,
        weatherInfoEnabled: true,
        sttEnabled: false,
        contentScriptInitStarted: false,
        contentScriptInitialized: false
      };
    }
  }

  function getContentState() {
    return ensureState();
  }

  function getPluginStatus() {
    try {
      return ensureState().pluginStatus;
    } catch (e) {
      return null;
    }
  }

  function setPluginStatus(status) {
    try {
      const s = ensureState();
      if (status && typeof status === 'object') {
        s.pluginStatus = status;
        window.WAAP.state.pluginStatus = status;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.contentStateService = {
    getContentState,
    getPluginStatus,
    setPluginStatus
  };
})();
