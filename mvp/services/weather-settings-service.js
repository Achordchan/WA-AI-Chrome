/*
用途：天气设置读取与监听 Service（MVP）。
说明：
- 将 legacy-weather-info.js 中与“天气设置加载/监听 storage 变更”相关的逻辑下沉到 service，减少 legacy 体积。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherSettingsService) return;

  function getChrome(deps = {}) {
    try {
      return deps.chrome || window.chrome;
    } catch (e) {
      return null;
    }
  }

  function getRuntimeLastError(chromeRef) {
    try {
      return chromeRef?.runtime?.lastError;
    } catch (e) {
      return null;
    }
  }

  function loadDisplaySettings(owner, deps = {}) {
    try {
      if (!owner) return false;

      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.sync) {
        owner.displaySettingsLoaded = true;
        return true;
      }

      chromeRef.storage.sync.get(
        [
          'weatherEnabled',
          'weatherShowWeather',
          'weatherShowTime',
          'weatherAllowCountryOverride',
          'weatherCacheMinutes',
          'weatherCacheAutoRenew',
          'weatherAutoRenewEvictDays'
        ],
        (data) => {
          try {
            if (getRuntimeLastError(chromeRef)) {
              owner.displaySettingsLoaded = true;
              return;
            }

            owner.displaySettings.enabled = data.weatherEnabled !== false;
            owner.displaySettings.showWeather = data.weatherShowWeather !== false;
            owner.displaySettings.showTime = data.weatherShowTime !== false;
            owner.displaySettings.allowCountryOverride = data.weatherAllowCountryOverride === true;

            owner.applyWeatherCacheMinutes?.(data.weatherCacheMinutes);
            owner.displaySettings.cacheAutoRenew = data.weatherCacheAutoRenew !== false;
            owner.applyWeatherCacheAutoRenew?.(data.weatherCacheAutoRenew);
            owner.applyWeatherAutoRenewEvictDays?.(data.weatherAutoRenewEvictDays);

            owner.displaySettingsLoaded = true;

            if (owner.displaySettings.enabled !== true) {
              owner.hideWeatherInfo?.();
            }
          } catch (e) {
            owner.displaySettingsLoaded = true;
          }
        }
      );

      return true;
    } catch (e) {
      try {
        if (owner) owner.displaySettingsLoaded = true;
      } catch (e2) {
        // ignore
      }
      return false;
    }
  }

  function installDisplaySettingsListener(owner, deps = {}) {
    try {
      if (!owner) return false;

      if (owner.displaySettingsListenerInstalled) return true;

      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.onChanged) return false;

      owner.displaySettingsListenerInstalled = true;

      chromeRef.storage.onChanged.addListener((changes, areaName) => {
        try {
          if (areaName !== 'sync') return;

          const touched =
            !!changes.weatherEnabled ||
            !!changes.weatherShowWeather ||
            !!changes.weatherShowTime ||
            !!changes.weatherAllowCountryOverride ||
            !!changes.weatherCacheMinutes ||
            !!changes.weatherCacheAutoRenew ||
            !!changes.weatherAutoRenewEvictDays;

          if (!touched) return;

          if (changes.weatherEnabled) {
            owner.displaySettings.enabled = changes.weatherEnabled.newValue !== false;
          }
          if (changes.weatherShowWeather) {
            owner.displaySettings.showWeather = changes.weatherShowWeather.newValue !== false;
          }
          if (changes.weatherShowTime) {
            owner.displaySettings.showTime = changes.weatherShowTime.newValue !== false;
          }
          if (changes.weatherAllowCountryOverride) {
            owner.displaySettings.allowCountryOverride = changes.weatherAllowCountryOverride.newValue === true;
          }
          if (changes.weatherCacheMinutes) {
            owner.applyWeatherCacheMinutes?.(changes.weatherCacheMinutes.newValue);
          }
          if (changes.weatherCacheAutoRenew) {
            owner.displaySettings.cacheAutoRenew = changes.weatherCacheAutoRenew.newValue !== false;
            owner.applyWeatherCacheAutoRenew?.(changes.weatherCacheAutoRenew.newValue);
          }
          if (changes.weatherAutoRenewEvictDays) {
            owner.applyWeatherAutoRenewEvictDays?.(changes.weatherAutoRenewEvictDays.newValue);
          }

          if (owner.displaySettings.enabled !== true) {
            owner.hideWeatherInfo?.();
            owner.stopWeatherAutoRenew?.();
            return;
          }

          try {
            owner.scheduleWeatherAutoRenew?.('settings-changed');
          } catch (e) {
            // ignore
          }

          owner.checkForNewChatWindow?.();
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.weatherSettingsService = {
    loadDisplaySettings,
    installDisplaySettingsListener
  };
})();
