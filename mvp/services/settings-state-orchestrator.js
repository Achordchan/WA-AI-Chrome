/*
用途：设置状态编排 Service（MVP）。
说明：把 autoTranslateNewMessages / weatherEnabled 的状态同步、以及自动翻译开关的副作用（setEnabled）集中处理，避免 content.js 变得臃肿。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.settingsStateOrchestrator) return;

  function applyAutoTranslateSideEffects(enabled, deps = {}) {
    const v = enabled === true;

    try {
      if (deps.autoTranslatePresenter?.setEnabled) {
        deps.autoTranslatePresenter.setEnabled(v);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (deps.autoTranslateQueue?.setEnabled) {
        deps.autoTranslateQueue.setEnabled(v);
      }
    } catch (e) {
      // ignore
    }

    return true;
  }

  function applyAutoTranslateEnabled(enabled, deps = {}) {
    try {
      const v = enabled === true;
      try {
        deps.onStateChanged?.(v);
      } catch (e) {
        // ignore
      }

      applyAutoTranslateSideEffects(v, deps);
      return v;
    } catch (e) {
      return enabled === true;
    }
  }

  function install(deps = {}) {
    try {
      const settingsSyncService = deps.settingsSyncService || window.WAAP?.services?.settingsSyncService;
      const settingsSyncFallback = deps.settingsSyncFallback || window.WAAP?.legacy?.settingsSyncFallback;

      const onAutoTranslateChanged = (enabled) => {
        try {
          applyAutoTranslateEnabled(enabled, deps);
        } catch (e) {
          // ignore
        }
      };

      const onWeatherEnabledChanged = (enabled) => {
        try {
          deps.onWeatherEnabledChanged?.(enabled !== false);
        } catch (e) {
          // ignore
        }
      };

      const onSttEnabledChanged = (enabled) => {
        try {
          deps.onSttEnabledChanged?.(enabled === true);
        } catch (e) {
          // ignore
        }
      };

      try {
        if (settingsSyncService?.install) {
          const ok = settingsSyncService.install({
            onAutoTranslateChanged,
            onWeatherEnabledChanged,
            onSttEnabledChanged
          });
          if (ok) return true;
        }
      } catch (e) {
        // ignore
      }

      // fallback：手动使用 legacy settingsSyncFallback
      try {
        if (settingsSyncFallback?.loadAutoTranslateSetting) {
          settingsSyncFallback.loadAutoTranslateSetting({
            chrome: deps.chrome || window.chrome,
            onAutoTranslateChanged
          });
        }
      } catch (e) {
        // ignore
      }

      try {
        if (settingsSyncFallback?.loadWeatherInfoSetting) {
          settingsSyncFallback.loadWeatherInfoSetting({
            chrome: deps.chrome || window.chrome,
            onWeatherEnabledChanged
          });
        }
      } catch (e) {
        // ignore
      }

      try {
        if (settingsSyncFallback?.loadSttSetting) {
          settingsSyncFallback.loadSttSetting({
            chrome: deps.chrome || window.chrome,
            onSttEnabledChanged
          });
        }
      } catch (e) {
        // ignore
      }

      try {
        if (settingsSyncFallback?.installSettingsStorageListeners) {
          settingsSyncFallback.installSettingsStorageListeners({
            chrome: deps.chrome || window.chrome,
            onAutoTranslateChanged,
            onWeatherEnabledChanged,
            onSttEnabledChanged
          });
        }
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.settingsStateOrchestrator = {
    install,
    applyAutoTranslateEnabled,
    applyAutoTranslateSideEffects
  };
})();
