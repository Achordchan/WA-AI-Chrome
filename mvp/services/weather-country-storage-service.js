/*
用途：天气模块国家识别相关的本地持久化 Service（MVP）。
说明：
- 将 legacy-weather-info.js 中与“用户修正(userCorrections)/自动推断(resolvedCountries) 的加载/保存/防抖保存”逻辑下沉到 service，减少 legacy 体积。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherCountryStorageService) return;

  function getChrome(deps = {}) {
    try {
      return deps.chrome || window.chrome;
    } catch (e) {
      return null;
    }
  }

  function getSetTimeout(deps = {}) {
    try {
      return deps.setTimeout || window.setTimeout;
    } catch (e) {
      return null;
    }
  }

  // 加载自动推断国家信息
  async function loadResolvedCountries(owner, deps = {}) {
    try {
      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.local) return false;

      const result = await chromeRef.storage.local.get(['weatherCountryResolved']);
      if (result.weatherCountryResolved) {
        owner.resolvedCountries = new Map(Object.entries(result.weatherCountryResolved));
        try {
          console.log('WeatherInfo: 加载自动推断信息:', owner.resolvedCountries.size, '条记录');
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (error) {
      try {
        console.warn('WeatherInfo: 加载自动推断信息失败:', error);
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  // 保存自动推断国家信息（批量防抖）
  function scheduleSaveResolvedCountries(owner, deps = {}) {
    try {
      if (owner._resolvedSaveTimer) return true;

      const chromeRef = getChrome(deps);
      const setTimeoutRef = getSetTimeout(deps);
      if (!chromeRef?.storage?.local || typeof setTimeoutRef !== 'function') return false;

      owner._resolvedSaveTimer = setTimeoutRef(async () => {
        try {
          owner._resolvedSaveTimer = null;
          const resolved = Object.fromEntries(owner.resolvedCountries);
          await chromeRef.storage.local.set({ weatherCountryResolved: resolved });
        } catch (e) {
          // ignore
        }
      }, 550);

      return true;
    } catch (e) {
      return false;
    }
  }

  // 将识别结果写入自动推断缓存（不覆盖手动修正）
  function maybeStoreResolvedCountry(owner, countryInfo, deps = {}) {
    try {
      if (!countryInfo) return false;
      if (countryInfo.isUserCorrected) return false;
      const phoneNumber = String(countryInfo.phoneNumber || '').replace(/[^\d]/g, '');
      if (!phoneNumber) return false;

      const minimal = {
        country: countryInfo.country,
        name: countryInfo.name,
        timezone: countryInfo.timezone,
        flag: countryInfo.flag,
        prefix: countryInfo.prefix,
        needsConfirmation: countryInfo.needsConfirmation === true,
        isAutoDetected: countryInfo.isAutoDetected === true,
        detectionMethod: countryInfo.detectionMethod,
        resolvedAt: Date.now()
      };

      const prev = owner.resolvedCountries.get(phoneNumber);
      const same = prev && prev.country === minimal.country && prev.timezone === minimal.timezone && prev.name === minimal.name;
      if (same) return false;

      owner.resolvedCountries.set(phoneNumber, minimal);
      scheduleSaveResolvedCountries(owner, deps);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 加载用户修正的国家信息
  async function loadUserCorrections(owner, deps = {}) {
    try {
      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.local) return false;

      const result = await chromeRef.storage.local.get(['weatherCountryCorrections']);
      if (result.weatherCountryCorrections) {
        owner.userCorrections = new Map(Object.entries(result.weatherCountryCorrections));
        try {
          console.log('WeatherInfo: 加载用户修正信息:', owner.userCorrections.size, '条记录');
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (error) {
      try {
        console.warn('WeatherInfo: 加载用户修正信息失败:', error);
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  // 保存用户修正的国家信息
  async function saveUserCorrections(owner, deps = {}) {
    try {
      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.local) return false;

      const corrections = Object.fromEntries(owner.userCorrections);
      await chromeRef.storage.local.set({ weatherCountryCorrections: corrections });
      try {
        console.log('WeatherInfo: 保存用户修正信息成功');
      } catch (e) {
        // ignore
      }
      return true;
    } catch (error) {
      try {
        console.error('WeatherInfo: 保存用户修正信息失败:', error);
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  window.WAAP.services.weatherCountryStorageService = {
    loadResolvedCountries,
    scheduleSaveResolvedCountries,
    maybeStoreResolvedCountry,
    loadUserCorrections,
    saveUserCorrections
  };
})();
