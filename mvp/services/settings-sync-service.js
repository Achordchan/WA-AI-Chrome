/*
用途：设置同步 Service（从 content.js 迁移出来）。负责从 chrome.storage.sync 读取并监听 autoTranslateNewMessages / weatherEnabled 的变化，并把变化回调给调用方。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.settingsSyncService) return;

  let installed = false;

  function safeGetSync(keys, cb) {
    try {
      if (!chrome?.storage?.sync?.get) return;
      chrome.storage.sync.get(keys, cb);
    } catch (e) {
      // ignore
    }
  }

  function applyInitial(deps = {}) {
    try {
      safeGetSync(['autoTranslateNewMessages'], (data) => {
        try {
          const enabled = data?.autoTranslateNewMessages === true;
          deps.onAutoTranslateChanged?.(enabled);
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      safeGetSync(['weatherEnabled'], (data) => {
        try {
          const enabled = data?.weatherEnabled !== false;
          deps.onWeatherEnabledChanged?.(enabled);
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      safeGetSync(['sttEnabled'], (data) => {
        try {
          const enabled = data?.sttEnabled === true;
          deps.onSttEnabledChanged?.(enabled);
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  }

  function install(deps = {}) {
    if (installed) return true;

    try {
      applyInitial(deps);
    } catch (e) {
      // ignore
    }

    try {
      if (!chrome?.storage?.onChanged?.addListener) {
        installed = true;
        return true;
      }

      chrome.storage.onChanged.addListener((changes, areaName) => {
        try {
          if (areaName !== 'sync') return;

          if (changes.weatherEnabled) {
            try {
              const enabled = changes.weatherEnabled.newValue !== false;
              deps.onWeatherEnabledChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }

          if (changes.autoTranslateNewMessages) {
            try {
              const enabled = changes.autoTranslateNewMessages.newValue === true;
              deps.onAutoTranslateChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }

          if (changes.sttEnabled) {
            try {
              const enabled = changes.sttEnabled.newValue === true;
              deps.onSttEnabledChanged?.(enabled);
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
      });

      installed = true;
      return true;
    } catch (e) {
      installed = false;
      return false;
    }
  }

  function isInstalled() {
    return installed;
  }

  window.WAAP.services.settingsSyncService = {
    install,
    isInstalled
  };
})();
