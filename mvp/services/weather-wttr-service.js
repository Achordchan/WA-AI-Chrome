/*
用途：天气数据获取 Service（MVP）。
说明：
- 从 legacy-weather-info.js 迁移 wttr.in 请求与解析逻辑（getWeatherFromWttr/getDefaultWeatherData）。
- 该 service 不直接操作 UI，只负责拿到天气数据。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherWttrService) return;

  let lastFetchErrorAt = 0;
  let lastFetchErrorMsg = '';

  function sleepMs(ms, deps = {}) {
    try {
      const setTimeoutRef = deps.setTimeout || window.setTimeout;
      const n = Number.isFinite(ms) ? ms : 0;
      return new Promise((resolve) => {
        try {
          if (typeof setTimeoutRef === 'function') {
            setTimeoutRef(resolve, Math.max(0, n));
          } else {
            setTimeout(resolve, Math.max(0, n));
          }
        } catch (e) {
          resolve();
        }
      });
    } catch (e) {
      return Promise.resolve();
    }
  }

  function isRetryableWttrError(err) {
    try {
      if (!err) return false;
      if (err && err.name === 'AbortError') return true;
      if (err && err.name === 'TimeoutError') return true;
      if (err && err.name === 'HttpError') {
        const status = Number.isFinite(err.status) ? err.status : 0;
        if (status === 429) return true;
        if (status >= 500 && status <= 599) return true;
        if (status === 408) return true;
        return false;
      }

      const msg = String(err?.message || err || '');
      if (/Failed to fetch/i.test(msg)) return true;
      if (/NetworkError/i.test(msg)) return true;
      if (/ERR_/i.test(msg)) return true;
      if (/timeout/i.test(msg)) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  async function fetchJsonWithTimeout(url, timeoutMs, deps = {}) {
    const fetchRef = deps.fetch || window.fetch;
    const AbortControllerRef = deps.AbortController || window.AbortController;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;
    const clearTimeoutRef = deps.clearTimeout || window.clearTimeout;

    if (typeof fetchRef !== 'function') {
      throw new Error('fetch 不可用');
    }

    const ms = Number.isFinite(timeoutMs) ? timeoutMs : 10000;

    let controller = null;
    let timeoutId = null;
    try {
      if (typeof AbortControllerRef === 'function') {
        controller = new AbortControllerRef();
      }
    } catch (e) {
      controller = null;
    }

    const timeoutPromise = new Promise((_, reject) => {
      try {
        if (typeof setTimeoutRef === 'function') {
          timeoutId = setTimeoutRef(() => {
            try {
              if (controller) controller.abort();
            } catch (e) {
              // ignore
            }
            const t = new Error('request timeout');
            t.name = 'TimeoutError';
            reject(t);
          }, ms);
        } else {
          timeoutId = setTimeout(() => {
            try {
              if (controller) controller.abort();
            } catch (e) {
              // ignore
            }
            const t = new Error('request timeout');
            t.name = 'TimeoutError';
            reject(t);
          }, ms);
        }
      } catch (e) {
        const t = new Error('request timeout');
        t.name = 'TimeoutError';
        reject(t);
      }
    });

    try {
      const response = await Promise.race([
        fetchRef(url, {
          method: 'GET',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          headers: {
            Accept: 'application/json'
          },
          signal: controller ? controller.signal : undefined
        }),
        timeoutPromise
      ]);

      if (!response || !response.ok) {
        const status = response ? response.status : 0;
        const e = new Error(`HTTP error! status: ${status || 'unknown'}`);
        e.name = 'HttpError';
        e.status = status;
        throw e;
      }

      return await response.json();
    } finally {
      try {
        if (timeoutId && typeof clearTimeoutRef === 'function') {
          clearTimeoutRef(timeoutId);
        } else if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  async function getWeatherFromWttr(countryInfo, options = {}, deps = {}) {
    try {
      // 构建查询位置 - 优先使用国家名称
      const location = (countryInfo && (countryInfo.name || countryInfo.country)) ? (countryInfo.name || countryInfo.country) : '';
      const query = encodeURIComponent(location);

      try {
        console.log(`WeatherInfo: 正在查询 ${location} 的天气信息...`);
      } catch (e) {
        // ignore
      }

      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10000;
      const retries = Number.isFinite(options.retries) ? Math.max(0, parseInt(String(options.retries), 10)) : 2;
      const retryDelayMs = Number.isFinite(options.retryDelayMs) ? Math.max(0, parseInt(String(options.retryDelayMs), 10)) : 700;
      const maxRetryDelayMs = Number.isFinite(options.maxRetryDelayMs) ? Math.max(0, parseInt(String(options.maxRetryDelayMs), 10)) : 6000;

      const baseUrls = ['https://wttr.in', 'http://wttr.in'];
      const candidateUrls = baseUrls.map((base) => `${base}/${query}?format=j1&lang=zh`);

      let lastError = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        let shouldContinueRetry = true;

        for (let i = 0; i < candidateUrls.length; i++) {
          const wttrUrl = candidateUrls[i];

          try {
            const data = await fetchJsonWithTimeout(wttrUrl, timeoutMs, deps);

            if (data && data.current_condition && data.current_condition[0]) {
              const current = data.current_condition[0];
              const weather = data.weather && data.weather[0];

              // 天气状况映射
              const conditionMap = {
                Sunny: { desc: '晴朗', icon: '☀️' },
                Clear: { desc: '晴朗', icon: '☀️' },
                'Partly cloudy': { desc: '多云', icon: '⛅' },
                Cloudy: { desc: '阴天', icon: '☁️' },
                Overcast: { desc: '阴天', icon: '☁️' },
                'Light rain': { desc: '小雨', icon: '🌦️' },
                'Moderate rain': { desc: '中雨', icon: '🌧️' },
                'Heavy rain': { desc: '大雨', icon: '🌧️' },
                'Light snow': { desc: '小雪', icon: '🌨️' },
                'Heavy snow': { desc: '大雪', icon: '❄️' },
                Fog: { desc: '雾', icon: '🌫️' },
                Mist: { desc: '薄雾', icon: '🌫️' }
              };

              const condition = current.weatherDesc && current.weatherDesc[0] ? current.weatherDesc[0].value : '';
              const weatherInfo = conditionMap[condition] || { desc: condition || '未知', icon: '🌤️' };

              return {
                temperature: parseInt(current.temp_C, 10),
                description: weatherInfo.desc,
                icon: weatherInfo.icon,
                humidity: `${current.humidity}%`,
                windSpeed: `${current.windspeedKmph} km/h`,
                feelsLike: `${current.FeelsLikeC}°C`,
                visibility: `${current.visibility} km`,
                pressure: `${current.pressure} mb`,
                uvIndex: current.uvIndex || 'N/A',
                location: location,
                forecast: weather
                  ? {
                      maxTemp: parseInt(weather.maxtempC, 10),
                      minTemp: parseInt(weather.mintempC, 10),
                      sunrise: weather.astronomy && weather.astronomy[0] ? weather.astronomy[0].sunrise : null,
                      sunset: weather.astronomy && weather.astronomy[0] ? weather.astronomy[0].sunset : null
                    }
                  : null
              };
            }

            throw new Error('无效的天气数据格式');
          } catch (e) {
            lastError = e;
            const retryable = isRetryableWttrError(e);
            if (!retryable) {
              shouldContinueRetry = false;
              break;
            }
          }
        }

        if (!shouldContinueRetry) break;
        if (attempt >= retries) break;

        const baseDelay = Math.min(maxRetryDelayMs, retryDelayMs * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(baseDelay * 0.35)));
        await sleepMs(baseDelay + jitter, deps);
      }

      try {
        const now = Date.now();
        const msg = String(lastError?.message || lastError || 'Failed to fetch');
        const shouldLog = now - lastFetchErrorAt > 30000 || msg !== lastFetchErrorMsg;
        if (shouldLog) {
          lastFetchErrorAt = now;
          lastFetchErrorMsg = msg;
          console.warn('WeatherInfo: wttr.in 请求失败:', msg);
        }
      } catch (e) {
        // ignore
      }

      return null;
    } catch (error) {
      try {
        const now = Date.now();
        const msg = String(error?.message || error || 'Failed to fetch');
        const shouldLog = now - lastFetchErrorAt > 30000 || msg !== lastFetchErrorMsg;
        if (shouldLog) {
          lastFetchErrorAt = now;
          lastFetchErrorMsg = msg;
          console.warn('WeatherInfo: wttr.in 请求失败:', msg);
        }
      } catch (e) {
        // ignore
      }

      return null;
    }
  }

  // 获取默认天气数据（备用方案）
  function getDefaultWeatherData(countryInfo) {
    // 根据地理位置和季节提供基础的默认天气
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // 基于国家和季节的简单天气预测
    const isNorthern = !['AU', 'NZ', 'ZA', 'AR', 'CL', 'BR'].includes(countryInfo && countryInfo.country ? countryInfo.country : '');
    const isSummer = isNorthern ? month >= 6 && month <= 8 : month >= 12 || month <= 2;
    const isWinter = isNorthern ? month >= 12 || month <= 2 : month >= 6 && month <= 8;

    let temperature, description, icon;

    if (isSummer) {
      temperature = Math.floor(Math.random() * 10) + 25; // 25-35°C
      description = '晴朗';
      icon = '☀️';
    } else if (isWinter) {
      temperature = Math.floor(Math.random() * 15) + 5; // 5-20°C
      description = '多云';
      icon = '☁️';
    } else {
      temperature = Math.floor(Math.random() * 10) + 18; // 18-28°C
      description = '多云';
      icon = '⛅';
    }

    return {
      temperature: temperature,
      description: description,
      icon: icon,
      humidity: `${Math.floor(Math.random() * 30) + 50}%`, // 50-80%
      windSpeed: `${Math.floor(Math.random() * 15) + 5} km/h`, // 5-20 km/h
      location: countryInfo && countryInfo.name ? countryInfo.name : '',
      isDefault: true
    };
  }

  window.WAAP.services.weatherWttrService = {
    getWeatherFromWttr,
    getDefaultWeatherData
  };
})();
