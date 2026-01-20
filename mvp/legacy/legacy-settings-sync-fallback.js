/*
用途：settingsSyncService 不可用时的 legacy fallback（从 content.js 迁移出来）。
说明：这里不直接读写 content.js 里的 let 变量，而是通过回调把变更传回去，避免跨文件作用域问题。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};
  if (window.WAAP.legacy.settingsSyncFallback) return;

  function loadAutoTranslateSetting(options = {}) {
    try {
      const chromeApi = options.chrome || window.chrome;
      if (!chromeApi?.storage?.sync) return false;

      chromeApi.storage.sync.get(['autoTranslateNewMessages'], (data) => {
        try {
          const enabled = data?.autoTranslateNewMessages === true;
          try {
            options.onAutoTranslateChanged?.(enabled);
          } catch (e) {
            // ignore
          }
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  function loadSttSetting(options = {}) {
    try {
      const chromeApi = options.chrome || window.chrome;
      if (!chromeApi?.storage?.sync) return false;

      chromeApi.storage.sync.get(['sttEnabled'], (data) => {
        try {
          const enabled = data?.sttEnabled === true;
          try {
            options.onSttEnabledChanged?.(enabled);
          } catch (e) {
            // ignore
          }
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  function loadWeatherInfoSetting(options = {}) {
    try {
      const chromeApi = options.chrome || window.chrome;
      if (!chromeApi?.storage?.sync) return false;

      chromeApi.storage.sync.get(['weatherEnabled'], (data) => {
        try {
          const enabled = data?.weatherEnabled !== false;
          try {
            options.onWeatherEnabledChanged?.(enabled);
          } catch (e) {
            // ignore
          }
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  function installSettingsStorageListeners(options = {}) {
    try {
      const chromeApi = options.chrome || window.chrome;
      if (!chromeApi?.storage?.onChanged) return false;

      chromeApi.storage.onChanged.addListener((changes, areaName) => {
        try {
          if (areaName !== 'sync') return;

          if (changes?.weatherEnabled) {
            const enabled = changes.weatherEnabled.newValue !== false;
            try {
              options.onWeatherEnabledChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }

          if (changes?.autoTranslateNewMessages) {
            const enabled = changes.autoTranslateNewMessages.newValue === true;
            try {
              options.onAutoTranslateChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }

          if (changes?.sttEnabled) {
            const enabled = changes.sttEnabled.newValue === true;
            try {
              options.onSttEnabledChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.settingsSyncFallback = {
    loadAutoTranslateSetting,
    loadWeatherInfoSetting,
    loadSttSetting,
    installSettingsStorageListeners
  };
})();
