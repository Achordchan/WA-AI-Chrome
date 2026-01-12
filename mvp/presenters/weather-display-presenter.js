/*
用途：天气模块“显示天气 + 读取缓存 + 请求天气”的流程 Presenter（MVP）。
说明：
- 将 legacy-weather-info.js 中与“显示天气信息 / 读缓存 / 请求天气 / 更新 UI”相关的逻辑下沉到 presenter，减少 legacy 体积。
- 该 presenter 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.weatherDisplayPresenter) return;

  function getNow() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

  function getWeatherCacheKey(countryInfo) {
    try {
      const c = countryInfo && countryInfo.country ? String(countryInfo.country) : '';
      const n = countryInfo && countryInfo.name ? String(countryInfo.name) : '';
      return `${c}|${n}`;
    } catch (e) {
      return '';
    }
  }

  async function touchWeatherCacheLastSeen(owner, cacheKey, deps = {}) {
    try {
      const cacheSvc = deps.weatherCacheService || window.WAAP?.services?.weatherCacheService;
      if (!cacheSvc?.ensureWeatherCacheLoaded || !cacheSvc?.getPersistedWeatherCacheEntry || !cacheSvc?.setPersistedWeatherCacheEntry) {
        return false;
      }

      await cacheSvc.ensureWeatherCacheLoaded(owner, deps);

      const now = getNow();
      const persisted = cacheSvc.getPersistedWeatherCacheEntry(owner, cacheKey);
      if (persisted && typeof persisted === 'object') {
        cacheSvc.setPersistedWeatherCacheEntry(owner, cacheKey, { ...persisted, lastSeenAt: now }, deps);
        return true;
      }

      const mem = owner.weatherCache?.get?.(cacheKey);
      if (mem && typeof mem === 'object') {
        const next = { ...mem, lastSeenAt: now };
        owner.weatherCache.set(cacheKey, next);
        cacheSvc.setPersistedWeatherCacheEntry(owner, cacheKey, next, deps);
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  async function getWeatherData(owner, countryInfo, options = {}, deps = {}) {
    try {
      const cacheKey = getWeatherCacheKey(countryInfo);
      if (!cacheKey) return null;

      const force = options && options.force === true;
      const now = getNow();

      const cacheSvc = deps.weatherCacheService || window.WAAP?.services?.weatherCacheService;
      try {
        await cacheSvc?.ensureWeatherCacheLoaded?.(owner, deps);
      } catch (e) {
        // ignore
      }

      if (!force) {
        try {
          const cached = owner.weatherCache?.get?.(cacheKey);
          if (cached && typeof cached.time === 'number' && (now - cached.time) < owner.weatherCacheTtlMs) {
            await touchWeatherCacheLastSeen(owner, cacheKey, deps);
            return cached.data;
          }
        } catch (e) {
          // ignore
        }

        try {
          const persisted = cacheSvc?.getPersistedWeatherCacheEntry?.(owner, cacheKey);
          if (persisted && typeof persisted.time === 'number') {
            if ((now - persisted.time) < owner.weatherCacheTtlMs) {
              try {
                owner.weatherCache?.set?.(cacheKey, persisted);
              } catch (e2) {
                // ignore
              }
              await touchWeatherCacheLastSeen(owner, cacheKey, deps);
              return persisted.data;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const existing = owner._weatherInFlight?.get?.(cacheKey);
      if (existing) return await existing;

      const promise = (async () => {
        try {
          const getWeatherFromWttr = deps.getWeatherFromWttr || owner.getWeatherFromWttr;
          if (typeof getWeatherFromWttr !== 'function') return null;

          const weatherData = await getWeatherFromWttr.call(owner, countryInfo, { timeoutMs: 10000 });
          if (!weatherData || weatherData.error) return null;

          let lastSeenAt = 0;
          try {
            const persisted = cacheSvc?.getPersistedWeatherCacheEntry?.(owner, cacheKey);
            lastSeenAt = persisted && typeof persisted.lastSeenAt === 'number' ? persisted.lastSeenAt : 0;
            if (!lastSeenAt && persisted && typeof persisted.time === 'number') lastSeenAt = persisted.time;
          } catch (e) {
            // ignore
          }

          const entry = { time: getNow(), data: weatherData, lastSeenAt: lastSeenAt || getNow() };

          try {
            owner.weatherCache?.set?.(cacheKey, entry);
          } catch (e) {
            // ignore
          }

          try {
            cacheSvc?.setPersistedWeatherCacheEntry?.(owner, cacheKey, entry, deps);
          } catch (e) {
            // ignore
          }

          return weatherData;
        } catch (e) {
          return null;
        } finally {
          try {
            owner._weatherInFlight?.delete?.(cacheKey);
          } catch (e) {
            // ignore
          }
        }
      })();

      try {
        owner._weatherInFlight?.set?.(cacheKey, promise);
      } catch (e) {
        // ignore
      }

      return await promise;
    } catch (e) {
      return null;
    }
  }

  async function loadWeatherDataAsync(owner, countryInfo, options = {}, deps = {}) {
    try {
      const uiSvc = deps.weatherUiService || window.WAAP?.services?.weatherUiService;
      const wttrSvc = deps.weatherWttrService || window.WAAP?.services?.weatherWttrService;
      const cacheSvc = deps.weatherCacheService || window.WAAP?.services?.weatherCacheService;

      const weatherData = await getWeatherData(owner, countryInfo, options, deps);
      if (weatherData) {
        try {
          uiSvc?.updateWeatherDisplay?.(owner, weatherData, deps);
        } catch (e) {
          // ignore
        }
        return weatherData;
      }

      // 兜底：如果请求失败，使用默认数据
      try {
        if (wttrSvc?.getDefaultWeatherData) {
          const fallback = wttrSvc.getDefaultWeatherData(countryInfo);
          if (fallback) {
            uiSvc?.updateWeatherDisplay?.(owner, fallback, deps);

            try {
              const cacheKey = getWeatherCacheKey(countryInfo);
              if (cacheKey && cacheSvc?.ensureWeatherCacheLoaded && cacheSvc?.getPersistedWeatherCacheEntry && cacheSvc?.setPersistedWeatherCacheEntry) {
                await cacheSvc.ensureWeatherCacheLoaded(owner, deps);
                const persisted = cacheSvc.getPersistedWeatherCacheEntry(owner, cacheKey);
                if (persisted && typeof persisted === 'object') {
                  await touchWeatherCacheLastSeen(owner, cacheKey, deps);
                }
              }
            } catch (e) {
              // ignore
            }

            return fallback;
          }
        }
      } catch (e) {
        // ignore
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  async function displayWeatherInfo(owner, countryInfo, options = {}, deps = {}) {
    try {
      if (!owner || !countryInfo) return false;

      if (owner.displaySettings && owner.displaySettings.enabled !== true) {
        try {
          owner.hideWeatherInfo?.();
        } catch (e) {
          // ignore
        }
        return true;
      }

      const uiSvc = deps.weatherUiService || window.WAAP?.services?.weatherUiService;
      if (!uiSvc) return false;

      const showWeather = owner.displaySettings ? owner.displaySettings.showWeather !== false : true;
      const showTime = owner.displaySettings ? owner.displaySettings.showTime !== false : true;

      try {
        owner.showStatus?.('loading', uiSvc.getLoadingStatusText ? uiSvc.getLoadingStatusText(owner) : '🌤️ 正在获取天气信息...');
      } catch (e) {
        // ignore
      }

      // 先插入状态，避免用户觉得“没反应”
      try {
        uiSvc.insertStatus?.(owner, null, deps);
      } catch (e) {
        // ignore
      }

      const timeData = showTime && countryInfo.timezone ? uiSvc.getLocalTime?.(countryInfo.timezone) : null;

      // 先渲染壳（weatherData 为空时 view 会显示 loading）
      try {
        uiSvc.createWeatherDisplay?.(owner, countryInfo, null, timeData, deps);
      } catch (e) {
        // ignore
      }

      if (!showWeather) {
        try {
          owner.showStatus?.('success', '✅ 已更新');
        } catch (e) {
          // ignore
        }
        return true;
      }

      const force = options && options.force === true;
      const weatherData = await loadWeatherDataAsync(owner, countryInfo, { force }, deps);

      if (weatherData) {
        try {
          owner.showStatus?.('success', '✅ 天气信息获取成功');
        } catch (e) {
          // ignore
        }
        return true;
      }

      try {
        owner.showStatus?.('error', '⚠️ 天气信息获取失败');
      } catch (e) {
        // ignore
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.weatherDisplayPresenter = {
    displayWeatherInfo,
    loadWeatherDataAsync,
    getWeatherData
  };
})();
