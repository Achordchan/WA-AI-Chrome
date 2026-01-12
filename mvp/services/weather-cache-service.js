/*
用途：天气缓存与自动续期 Service（MVP）。
说明：
- 将 legacy-weather-info.js 中与“天气缓存/持久化/自动续期/淘汰策略”相关的逻辑下沉到 service，减少 legacy 体积。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherCacheService) return;

  const WEATHER_AUTO_RENEW_LAST_RUN_AT_KEY = 'waapWeatherAutoRenewLastRunAtV1';
  const WEATHER_AUTO_RENEW_MIN_INTERVAL_MS = 5 * 60 * 1000;

  function getNow() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

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

  function getClearTimeout(deps = {}) {
    try {
      return deps.clearTimeout || window.clearTimeout;
    } catch (e) {
      return null;
    }
  }

  function getPersistedWeatherCacheEntry(owner, cacheKey) {
    try {
      if (!owner || !owner._weatherCacheStore || !cacheKey) return null;
      const entry = owner._weatherCacheStore[cacheKey];
      if (!entry || typeof entry !== 'object') return null;
      return entry;
    } catch (e) {
      return null;
    }
  }

  function scheduleSaveWeatherCacheStore(owner, deps = {}) {
    try {
      if (!owner) return false;
      if (owner._weatherCacheSaveTimer) return true;

      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.local) return false;

      const setTimeoutRef = getSetTimeout(deps);
      if (typeof setTimeoutRef !== 'function') return false;

      owner._weatherCacheSaveTimer = setTimeoutRef(async () => {
        try {
          const payload = {};
          payload[owner._weatherCacheStorageKey] = owner._weatherCacheStore || {};
          await chromeRef.storage.local.set(payload);
        } catch (e) {
          // ignore
        } finally {
          owner._weatherCacheSaveTimer = null;
        }
      }, 800);

      return true;
    } catch (e) {
      return false;
    }
  }

  function setPersistedWeatherCacheEntry(owner, cacheKey, entry, deps = {}) {
    try {
      if (!owner || !cacheKey) return false;
      if (!owner._weatherCacheStore || typeof owner._weatherCacheStore !== 'object') {
        owner._weatherCacheStore = {};
      }

      if (!entry) {
        delete owner._weatherCacheStore[cacheKey];
      } else {
        owner._weatherCacheStore[cacheKey] = entry;
      }

      scheduleSaveWeatherCacheStore(owner, deps);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function ensureWeatherCacheLoaded(owner, deps = {}) {
    try {
      if (!owner) return false;
      if (owner._weatherCacheLoaded) return true;

      owner._weatherCacheLoaded = true;
      owner._weatherCacheStore = {};

      const chromeRef = getChrome(deps);
      if (!chromeRef?.storage?.local) return false;

      const res = await chromeRef.storage.local.get([owner._weatherCacheStorageKey]);
      const raw = res ? res[owner._weatherCacheStorageKey] : null;
      if (raw && typeof raw === 'object') {
        owner._weatherCacheStore = raw;
      }
      return true;
    } catch (e) {
      try {
        if (owner) owner._weatherCacheStore = {};
      } catch (e2) {
        // ignore
      }
      return false;
    }
  }

  function stopWeatherAutoRenew(owner, deps = {}) {
    try {
      if (!owner) return false;

      const clearTimeoutRef = getClearTimeout(deps);

      if (owner._weatherAutoRenewTimer) {
        try {
          if (typeof clearTimeoutRef === 'function') {
            clearTimeoutRef(owner._weatherAutoRenewTimer);
          } else {
            clearTimeout(owner._weatherAutoRenewTimer);
          }
        } catch (e) {
          // ignore
        }
        owner._weatherAutoRenewTimer = null;
      }
      owner._weatherAutoRenewNextRunAt = 0;
      return true;
    } catch (e) {
      return false;
    }
  }

  function canRunWeatherAutoRenew(owner) {
    try {
      if (!owner) return false;
      if (owner.displaySettings && owner.displaySettings.enabled !== true) return false;
      if (owner.displaySettings && owner.displaySettings.showWeather !== true) return false;
      if (owner._weatherCacheAutoRenewEnabled !== true) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function refreshWeatherCacheKey(owner, cacheKey, deps = {}) {
    try {
      if (!owner) return false;
      if (!canRunWeatherAutoRenew(owner)) return false;

      const key = String(cacheKey || '');
      if (!key) return false;

      // 去重：避免与 UI 触发的同 key 请求并发
      const existing = owner._weatherInFlight?.get?.(key);
      if (existing) {
        try {
          await existing;
        } catch (e) {
          // ignore
        }
        return true;
      }

      const parts = key.split('|');
      const country = parts.length > 0 ? (parts[0] || '') : '';
      const name = parts.length > 1 ? parts.slice(1).join('|') : '';
      const countryInfo = { country, name };

      const promise = (async () => {
        try {
          const getWeatherFromWttr = deps.getWeatherFromWttr || owner.getWeatherFromWttr;
          if (typeof getWeatherFromWttr !== 'function') return false;

          const weatherData = await getWeatherFromWttr.call(owner, countryInfo, {
            timeoutMs: 15000,
            retries: 2,
            retryDelayMs: 700,
            maxRetryDelayMs: 6000
          });
          if (!weatherData || weatherData.error) return false;

          let lastSeenAt = 0;
          try {
            const persisted = getPersistedWeatherCacheEntry(owner, key);
            lastSeenAt = persisted && typeof persisted.lastSeenAt === 'number' ? persisted.lastSeenAt : 0;
            if (!lastSeenAt && persisted && typeof persisted.time === 'number') lastSeenAt = persisted.time;
          } catch (e) {
            // ignore
          }

          const entry = { time: getNow(), data: weatherData, lastSeenAt: lastSeenAt || 0 };

          try {
            owner.weatherCache?.set?.(key, entry);
          } catch (e) {
            // ignore
          }

          setPersistedWeatherCacheEntry(owner, key, entry, deps);

          try {
            owner._weatherAutoRenewNextAttemptAt?.delete?.(key);
          } catch (e) {
            // ignore
          }
          return true;
        } catch (e) {
          return false;
        } finally {
          try {
            owner._weatherInFlight?.delete?.(key);
          } catch (e) {
            // ignore
          }
        }
      })();

      try {
        if (owner._weatherInFlight && typeof owner._weatherInFlight.set === 'function') {
          owner._weatherInFlight.set(key, promise);
        }
      } catch (e) {
        // ignore
      }

      return await promise;
    } catch (e) {
      return false;
    }
  }

  async function runWeatherAutoRenewOnce(owner, deps = {}) {
    if (!owner) return;
    if (owner._weatherAutoRenewRunning) return;
    owner._weatherAutoRenewRunning = true;

    try {
      if (!canRunWeatherAutoRenew(owner)) {
        return;
      }

      await ensureWeatherCacheLoaded(owner, deps);
      const store = (owner._weatherCacheStore && typeof owner._weatherCacheStore === 'object') ? owner._weatherCacheStore : {};
      const keys = Object.keys(store);
      if (keys.length === 0) {
        stopWeatherAutoRenew(owner, deps);
        return;
      }

      const now = getNow();
      const ttlMs = Number.isFinite(owner.weatherCacheTtlMs) ? owner.weatherCacheTtlMs : (60 * 60 * 1000);
      const evictDays = (owner.displaySettings && Number.isFinite(owner.displaySettings.autoRenewEvictDays))
        ? owner.displaySettings.autoRenewEvictDays
        : 10;
      const evictMs = (Number.isFinite(evictDays) && evictDays > 0) ? (evictDays * 24 * 60 * 60 * 1000) : 0;
      const maxPerRun = 3;
      const backoffMs = 15 * 60 * 1000;

      // 淘汰：N 天未出现的国家，停止续期并删除缓存
      try {
        if (evictMs > 0) {
          let changed = false;
          for (const k of keys) {
            const entry = store[k];
            if (!entry || typeof entry !== 'object') continue;
            let lastSeenAt = (typeof entry.lastSeenAt === 'number') ? entry.lastSeenAt : 0;
            if (!lastSeenAt) {
              // 兼容旧数据：没有 lastSeenAt 时用缓存写入时间兜底
              const t = (typeof entry.time === 'number') ? entry.time : 0;
              if (t) {
                entry.lastSeenAt = t;
                lastSeenAt = t;
                changed = true;
              }
            }

            if (lastSeenAt && (now - lastSeenAt) > evictMs) {
              try {
                delete store[k];
                changed = true;
              } catch (e) {
                // ignore
              }
              try {
                owner.weatherCache?.delete?.(k);
              } catch (e) {
                // ignore
              }
              try {
                owner._weatherAutoRenewNextAttemptAt?.delete?.(k);
              } catch (e) {
                // ignore
              }
            }
          }

          if (changed) {
            try {
              scheduleSaveWeatherCacheStore(owner, deps);
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (e) {
        // ignore
      }

      const nextKeys = Object.keys(store);
      if (nextKeys.length === 0) {
        stopWeatherAutoRenew(owner, deps);
        return;
      }

      const force = !!(deps.options && deps.options.force === true);
      const expiredKeys = nextKeys
        .map((k) => {
          const entry = store[k];
          const t = entry && typeof entry.time === 'number' ? entry.time : 0;
          return { key: k, time: t };
        })
        .filter((x) => !!x.key)
        .filter((x) => force ? (x.time > 0) : (x.time > 0 && (now - x.time) >= ttlMs))
        .sort((a, b) => a.time - b.time)
        .map((x) => x.key);

      let throttleUntilAt = 0;
      try {
        if (!force && expiredKeys.length > 0) {
          const chromeRef = getChrome(deps);
          if (chromeRef?.storage?.local) {
            const res = await chromeRef.storage.local.get([WEATHER_AUTO_RENEW_LAST_RUN_AT_KEY]);
            const lastRunAt = res ? parseInt(String(res[WEATHER_AUTO_RENEW_LAST_RUN_AT_KEY] || 0), 10) : 0;
            if (Number.isFinite(lastRunAt) && lastRunAt > 0) {
              const until = (lastRunAt + WEATHER_AUTO_RENEW_MIN_INTERVAL_MS) - now;
              if (until > 0) {
                throttleUntilAt = lastRunAt + WEATHER_AUTO_RENEW_MIN_INTERVAL_MS;
              }
            }
          }
        }
      } catch (e) {
        throttleUntilAt = 0;
      }

      let refreshed = 0;
      if (!throttleUntilAt) {
        for (const cacheKey of expiredKeys) {
          if (refreshed >= maxPerRun) break;
          const nextAt = owner._weatherAutoRenewNextAttemptAt?.get?.(cacheKey) || 0;
          if (nextAt && now < nextAt) continue;

          const ok = await refreshWeatherCacheKey(owner, cacheKey, deps);
          if (!ok) {
            try {
              owner._weatherAutoRenewNextAttemptAt?.set?.(cacheKey, now + backoffMs);
            } catch (e) {
              // ignore
            }
          }
          refreshed += 1;
        }

        try {
          if (!force && refreshed > 0) {
            const chromeRef = getChrome(deps);
            if (chromeRef?.storage?.local) {
              const payload = {};
              payload[WEATHER_AUTO_RENEW_LAST_RUN_AT_KEY] = now;
              await chromeRef.storage.local.set(payload);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // 计算下一次执行时间：距离最早过期/将过期的条目
      let nextDelayMs = 10 * 60 * 1000;
      try {
        let soonestExpiresAt = Infinity;
        Object.keys(store).forEach((k) => {
          const entry = store[k];
          const t = entry && typeof entry.time === 'number' ? entry.time : 0;
          if (!t) return;
          const expiresAt = t + ttlMs;
          if (expiresAt < soonestExpiresAt) soonestExpiresAt = expiresAt;
        });
        if (Number.isFinite(soonestExpiresAt) && soonestExpiresAt !== Infinity) {
          const until = soonestExpiresAt - getNow();
          if (until <= 0) {
            nextDelayMs = 60 * 1000;
          } else {
            nextDelayMs = Math.max(60 * 1000, Math.min(until + 1000, 30 * 60 * 1000));
          }
        }
      } catch (e) {
        nextDelayMs = 10 * 60 * 1000;
      }

      try {
        if (throttleUntilAt) {
          const until = throttleUntilAt - getNow();
          if (until > 0) {
            nextDelayMs = Math.max(60 * 1000, Math.min(until + 1000, 30 * 60 * 1000));
          }
        }
      } catch (e) {
        // ignore
      }

      stopWeatherAutoRenew(owner, deps);

      const setTimeoutRef = getSetTimeout(deps);
      if (typeof setTimeoutRef !== 'function') return;

      if (canRunWeatherAutoRenew(owner)) {
        owner._weatherAutoRenewNextRunAt = getNow() + nextDelayMs;
        owner._weatherAutoRenewTimer = setTimeoutRef(() => {
          runWeatherAutoRenewOnce(owner, deps);
        }, nextDelayMs);
      }
    } catch (e) {
      // ignore
    } finally {
      owner._weatherAutoRenewRunning = false;
    }
  }

  function scheduleWeatherAutoRenew(owner, reason = '', deps = {}) {
    try {
      if (!owner) return false;
      if (!canRunWeatherAutoRenew(owner)) {
        stopWeatherAutoRenew(owner, deps);
        return true;
      }

      stopWeatherAutoRenew(owner, deps);

      const setTimeoutRef = getSetTimeout(deps);
      if (typeof setTimeoutRef !== 'function') return false;

      const delayMs = 1500;
      owner._weatherAutoRenewNextRunAt = getNow() + delayMs;
      owner._weatherAutoRenewTimer = setTimeoutRef(() => {
        runWeatherAutoRenewOnce(owner, { ...deps, options: null, reason });
      }, delayMs);

      return true;
    } catch (e) {
      return false;
    }
  }

  function applyWeatherCacheMinutes(owner, minutes, deps = {}) {
    try {
      if (!owner) return false;
      let m = parseInt(String(minutes ?? ''), 10);
      if (!Number.isFinite(m) || m <= 0) m = 60;
      if (m > 10080) m = 10080;
      owner.weatherCacheTtlMs = m * 60 * 1000;
    } catch (e) {
      try {
        if (owner) owner.weatherCacheTtlMs = 60 * 60 * 1000;
      } catch (e2) {
        // ignore
      }
    }

    try {
      scheduleWeatherAutoRenew(owner, 'ttl-change', deps);
    } catch (e) {
      // ignore
    }

    return true;
  }

  function applyWeatherCacheAutoRenew(owner, value, deps = {}) {
    try {
      if (!owner) return false;
      const enabled = value !== false;
      owner._weatherCacheAutoRenewEnabled = enabled;
      if (!enabled) {
        stopWeatherAutoRenew(owner, deps);
      } else {
        scheduleWeatherAutoRenew(owner, 'auto-renew-enabled', deps);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyWeatherAutoRenewEvictDays(owner, days, deps = {}) {
    try {
      if (!owner) return false;
      let d = parseInt(String(days ?? ''), 10);
      if (!Number.isFinite(d) || d < 0) d = 10;
      if (d > 365) d = 365;
      if (owner.displaySettings && typeof owner.displaySettings === 'object') {
        owner.displaySettings.autoRenewEvictDays = d;
      }
    } catch (e) {
      try {
        if (owner?.displaySettings) owner.displaySettings.autoRenewEvictDays = 10;
      } catch (e2) {
        // ignore
      }
    }

    try {
      scheduleWeatherAutoRenew(owner, 'evict-days-change', deps);
    } catch (e) {
      // ignore
    }

    return true;
  }

  function getWeatherAutoRenewNextRunAt(owner) {
    try {
      return owner && Number.isFinite(owner._weatherAutoRenewNextRunAt) ? owner._weatherAutoRenewNextRunAt : 0;
    } catch (e) {
      return 0;
    }
  }

  window.WAAP.services.weatherCacheService = {
    getWeatherAutoRenewNextRunAt,
    applyWeatherCacheMinutes,
    applyWeatherCacheAutoRenew,
    applyWeatherAutoRenewEvictDays,
    stopWeatherAutoRenew,
    canRunWeatherAutoRenew,
    scheduleWeatherAutoRenew,
    runWeatherAutoRenewOnce,
    refreshWeatherCacheKey,
    ensureWeatherCacheLoaded,
    getPersistedWeatherCacheEntry,
    setPersistedWeatherCacheEntry,
    scheduleSaveWeatherCacheStore
  };
})();
