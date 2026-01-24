/*
用途：legacy-weather-info.js 的完整历史实现备份（用于回滚/对照）。
作者：Achord
*/

/*
用途：天气信息（weather-info.js）模块 legacy 实现（按号码展示国家天气 + 当地时间）。
说明：此文件保留原始实现用于回滚与兜底；主入口由较薄的 weather-info.js 兼容层负责挂载与初始化编排。
作者：Achord
*/

// AI全能助手 - WhatsApp增强功能模块
// 作者: Achord (Tel: 13160235855, Email: achordchan@gmail.com)
// 功能: 根据对方号码显示国家天气和当地时间
// 版本: V3.2.1
// 
// 请尊重开源项目，二开保留作者信息

const WeatherInfo = {
  // 版本信息
  version: 'V3.2.1',
  
  // 状态管理
  currentStatus: 'idle', // idle, loading, success, error, no-number
  currentInfoElement: null,
  injectionIndicator: null, // WhatsApp 标志注入提示元素
  lastNoContactShownAt: 0,
  initialized: false,
  observerInitialized: false,
  lastChatCheckAt: 0,
  lastExtractAt: 0,
  lastChatKey: '',
  lastChatKeyAt: 0,
  consecutiveNoNumber: 0,
  displaySettings: {
    enabled: true,
    showWeather: true,
    showTime: true,
    allowCountryOverride: false,
    cacheAutoRenew: true,
    autoRenewEvictDays: 10
  },

  _weatherCacheAutoRenewEnabled: true,
  _weatherAutoRenewTimer: null,
  _weatherAutoRenewRunning: false,
  _weatherAutoRenewNextAttemptAt: new Map(),
  _weatherAutoRenewNextRunAt: 0,
  _flagEmojiSupported: null,

  getWeatherAutoRenewNextRunAt() {
    try {
      return Number.isFinite(this._weatherAutoRenewNextRunAt) ? this._weatherAutoRenewNextRunAt : 0;
    } catch (e) {
      return 0;
    }
  },

  isFlagEmojiSupported() {
    try {
      if (this._flagEmojiSupported === true) return true;
      if (this._flagEmojiSupported === false) return false;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this._flagEmojiSupported = true;
        return true;
      }

      ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      const flagW = ctx.measureText('🇺🇸').width;
      const codeW = ctx.measureText('US').width;

      const supported = Math.abs(flagW - codeW) > 2;
      this._flagEmojiSupported = supported;
      return supported;
    } catch (e) {
      this._flagEmojiSupported = true;
      return true;
    }
  },

  ensureFlagRenderMode() {
    try {
      const supported = this.isFlagEmojiSupported();
      const root = document.documentElement;
      if (!root) return;
      if (supported) {
        root.classList.remove('waap-flag-emoji-unsupported');
        root.classList.add('waap-flag-emoji-supported');
      } else {
        root.classList.remove('waap-flag-emoji-supported');
        root.classList.add('waap-flag-emoji-unsupported');
      }
    } catch (e) {
      // ignore
    }
  },

  renderCountryFlag(countryInfo) {
    try {
      const view = window.WAAP?.views?.weatherInfoView;
      if (view?.renderCountryFlag) {
        return view.renderCountryFlag(countryInfo);
      }
      const flag = countryInfo && countryInfo.flag ? String(countryInfo.flag) : '';
      const code = countryInfo && countryInfo.country ? String(countryInfo.country).toUpperCase() : '';
      const safeCode = code.replace(/[^A-Z0-9_]/g, '').slice(0, 10);
      return `<span class="country-flag-emoji">${flag || '🌍'}</span><span class="country-flag-badge">${safeCode || '--'}</span>`;
    } catch (e) {
      return `<span class="country-flag-emoji">🌍</span><span class="country-flag-badge">--</span>`;
    }
  },

  // 加载自动推断国家信息
  async loadResolvedCountries() {
    try {
      const svc = window.WAAP?.services?.weatherCountryStorageService;
      if (svc?.loadResolvedCountries) {
        const ok = await svc.loadResolvedCountries(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 保存自动推断国家信息（批量防抖）
  scheduleSaveResolvedCountries() {
    try {
      const svc = window.WAAP?.services?.weatherCountryStorageService;
      if (svc?.scheduleSaveResolvedCountries) {
        const ok = svc.scheduleSaveResolvedCountries(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 将识别结果写入自动推断缓存（不覆盖手动修正）
  maybeStoreResolvedCountry(countryInfo) {
    try {
      const svc = window.WAAP?.services?.weatherCountryStorageService;
      if (svc?.maybeStoreResolvedCountry) {
        const ok = svc.maybeStoreResolvedCountry(this, countryInfo);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },
  displaySettingsLoaded: false,
  displaySettingsListenerInstalled: false,
  _allCountriesCache: null,
  statusMessages: {
    loading: '🌍 正在加载信息...',
    error: '❌ 天气信息加载失败',
    'no-number': '📱 未检测到有效号码',
    success: '✅ 天气信息加载完成',
    'no-contact': '👤 未检测到聊天对象'
  },

  applyWeatherCacheMinutes(minutes) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.applyWeatherCacheMinutes) {
        return svc.applyWeatherCacheMinutes(this, minutes);
      }
    } catch (e) {
      // ignore
    }

    // 最小兜底：只更新 TTL，不做复杂续期
    try {
      let m = parseInt(String(minutes ?? ''), 10);
      if (!Number.isFinite(m) || m <= 0) m = 60;
      if (m > 10080) m = 10080;
      this.weatherCacheTtlMs = m * 60 * 1000;
    } catch (e) {
      this.weatherCacheTtlMs = 60 * 60 * 1000;
    }
  },

  applyWeatherCacheAutoRenew(value) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.applyWeatherCacheAutoRenew) {
        return svc.applyWeatherCacheAutoRenew(this, value);
      }
    } catch (e) {
      // ignore
    }

    try {
      this._weatherCacheAutoRenewEnabled = value !== false;
    } catch (e) {
      // ignore
    }
  },

  applyWeatherAutoRenewEvictDays(days) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.applyWeatherAutoRenewEvictDays) {
        return svc.applyWeatherAutoRenewEvictDays(this, days);
      }
    } catch (e) {
      // ignore
    }

    try {
      let d = parseInt(String(days ?? ''), 10);
      if (!Number.isFinite(d) || d < 0) d = 10;
      if (d > 365) d = 365;
      this.displaySettings.autoRenewEvictDays = d;
    } catch (e) {
      // ignore
    }
  },

  stopWeatherAutoRenew() {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.stopWeatherAutoRenew) {
        return svc.stopWeatherAutoRenew(this);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this._weatherAutoRenewTimer) {
        clearTimeout(this._weatherAutoRenewTimer);
        this._weatherAutoRenewTimer = null;
      }
      this._weatherAutoRenewNextRunAt = 0;
    } catch (e) {
      // ignore
    }
  },

  canRunWeatherAutoRenew() {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.canRunWeatherAutoRenew) {
        return svc.canRunWeatherAutoRenew(this);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this.displaySettings && this.displaySettings.enabled !== true) return false;
      if (this.displaySettings && this.displaySettings.showWeather !== true) return false;
      if (this._weatherCacheAutoRenewEnabled !== true) return false;
      return true;
    } catch (e) {
      return false;
    }
  },

  scheduleWeatherAutoRenew(reason = '') {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.scheduleWeatherAutoRenew) {
        return svc.scheduleWeatherAutoRenew(this, reason);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (!this.canRunWeatherAutoRenew()) {
        this.stopWeatherAutoRenew();
        return;
      }
      this.stopWeatherAutoRenew();
    } catch (e) {
      // ignore
    }
  },

  async runWeatherAutoRenewOnce(options = null) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.runWeatherAutoRenewOnce) {
        return await svc.runWeatherAutoRenewOnce(this, { options });
      }
    } catch (e) {
      // ignore
    }
  },

  async refreshWeatherCacheKey(cacheKey) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.refreshWeatherCacheKey) {
        return await svc.refreshWeatherCacheKey(this, cacheKey);
      }
    } catch (e) {
      // ignore
    }

    return false;
  },

  async ensureWeatherCacheLoaded() {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.ensureWeatherCacheLoaded) {
        return await svc.ensureWeatherCacheLoaded(this);
      }
    } catch (e) {
      // ignore
    }
  },

  getPersistedWeatherCacheEntry(cacheKey) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.getPersistedWeatherCacheEntry) {
        return svc.getPersistedWeatherCacheEntry(this, cacheKey);
      }
    } catch (e) {
      // ignore
    }

    return null;
  },

  setPersistedWeatherCacheEntry(cacheKey, entry) {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.setPersistedWeatherCacheEntry) {
        return svc.setPersistedWeatherCacheEntry(this, cacheKey, entry);
      }
    } catch (e) {
      // ignore
    }
  },

  scheduleSaveWeatherCacheStore() {
    try {
      const svc = window.WAAP?.services?.weatherCacheService;
      if (svc?.scheduleSaveWeatherCacheStore) {
        return svc.scheduleSaveWeatherCacheStore(this);
      }
    } catch (e) {
      // ignore
    }
  },

  loadDisplaySettings() {
    try {
      const svc = window.WAAP?.services?.weatherSettingsService;
      if (svc?.loadDisplaySettings) {
        const ok = svc.loadDisplaySettings(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (!chrome?.storage?.sync) {
        this.displaySettingsLoaded = true;
        return;
      }

      chrome.storage.sync.get(
        ['weatherEnabled', 'weatherShowWeather', 'weatherShowTime', 'weatherAllowCountryOverride', 'weatherCacheMinutes', 'weatherCacheAutoRenew', 'weatherAutoRenewEvictDays'],
        (data) => {
          try {
            if (chrome.runtime?.lastError) {
              this.displaySettingsLoaded = true;
              return;
            }

            this.displaySettings.enabled = data.weatherEnabled !== false;
            this.displaySettings.showWeather = data.weatherShowWeather !== false;
            this.displaySettings.showTime = data.weatherShowTime !== false;
            this.displaySettings.allowCountryOverride = data.weatherAllowCountryOverride === true;
            this.applyWeatherCacheMinutes(data.weatherCacheMinutes);
            this.displaySettings.cacheAutoRenew = data.weatherCacheAutoRenew !== false;
            this.applyWeatherCacheAutoRenew(data.weatherCacheAutoRenew);
            this.applyWeatherAutoRenewEvictDays(data.weatherAutoRenewEvictDays);
            this.displaySettingsLoaded = true;

            if (this.displaySettings.enabled !== true) {
              this.hideWeatherInfo();
            }
          } catch (e) {
            this.displaySettingsLoaded = true;
          }
        }
      );
    } catch (e) {
      this.displaySettingsLoaded = true;
    }
  },

  installDisplaySettingsListener() {
    try {
      const svc = window.WAAP?.services?.weatherSettingsService;
      if (svc?.installDisplaySettingsListener) {
        const ok = svc.installDisplaySettingsListener(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this.displaySettingsListenerInstalled) return;
      if (!chrome?.storage?.onChanged) return;
      this.displaySettingsListenerInstalled = true;

      chrome.storage.onChanged.addListener((changes, areaName) => {
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
            this.displaySettings.enabled = changes.weatherEnabled.newValue !== false;
          }
          if (changes.weatherShowWeather) {
            this.displaySettings.showWeather = changes.weatherShowWeather.newValue !== false;
          }
          if (changes.weatherShowTime) {
            this.displaySettings.showTime = changes.weatherShowTime.newValue !== false;
          }
          if (changes.weatherAllowCountryOverride) {
            this.displaySettings.allowCountryOverride = changes.weatherAllowCountryOverride.newValue === true;
          }
          if (changes.weatherCacheMinutes) {
            this.applyWeatherCacheMinutes(changes.weatherCacheMinutes.newValue);
          }
          if (changes.weatherCacheAutoRenew) {
            this.displaySettings.cacheAutoRenew = changes.weatherCacheAutoRenew.newValue !== false;
            this.applyWeatherCacheAutoRenew(changes.weatherCacheAutoRenew.newValue);
          }

          if (changes.weatherAutoRenewEvictDays) {
            this.applyWeatherAutoRenewEvictDays(changes.weatherAutoRenewEvictDays.newValue);
          }

          if (this.displaySettings.enabled !== true) {
            this.hideWeatherInfo();
            this.stopWeatherAutoRenew();
            return;
          }

          try {
            this.scheduleWeatherAutoRenew('settings-changed');
          } catch (e) {
            // ignore
          }

          this.checkForNewChatWindow();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  },

  // 国家代码和区号映射表
  countryCodeMap: {
    // 主要国家和地区的电话区号
    // 注意：+1区号被多个北美国家共享，需要特殊处理
    '1': { 
      country: 'NANP', // North American Numbering Plan
      name: '北美地区', 
      timezone: 'America/New_York', 
      flag: '🌎',
      isShared: true,
      countries: [
        { country: 'US', name: '美国', timezone: 'America/New_York', flag: '🇺🇸' },
        { country: 'CA', name: '加拿大', timezone: 'America/Toronto', flag: '🇨🇦' },
        { country: 'JM', name: '牙买加', timezone: 'America/Jamaica', flag: '🇯🇲' },
        { country: 'BS', name: '巴哈马', timezone: 'America/Nassau', flag: '🇧🇸' },
        { country: 'BB', name: '巴巴多斯', timezone: 'America/Barbados', flag: '🇧🇧' },
        { country: 'AG', name: '安提瓜和巴布达', timezone: 'America/Antigua', flag: '🇦🇬' },
        { country: 'DM', name: '多米尼克', timezone: 'America/Dominica', flag: '🇩🇲' },
        { country: 'DO', name: '多米尼加', timezone: 'America/Santo_Domingo', flag: '🇩🇴' },
        { country: 'GD', name: '格林纳达', timezone: 'America/Grenada', flag: '🇬🇩' },
        { country: 'KN', name: '圣基茨和尼维斯', timezone: 'America/St_Kitts', flag: '🇰🇳' },
        { country: 'LC', name: '圣卢西亚', timezone: 'America/St_Lucia', flag: '🇱🇨' },
        { country: 'VC', name: '圣文森特和格林纳丁斯', timezone: 'America/St_Vincent', flag: '🇻🇨' },
        { country: 'TT', name: '特立尼达和多巴哥', timezone: 'America/Port_of_Spain', flag: '🇹🇹' }
      ]
    },
    '7': { 
      country: 'RU_KZ', // Russia-Kazakhstan shared code
      name: '俄语区', 
      timezone: 'Europe/Moscow', 
      flag: '🌍',
      isShared: true,
      countries: [
        { country: 'RU', name: '俄罗斯', timezone: 'Europe/Moscow', flag: '🇷🇺' },
        { country: 'KZ', name: '哈萨克斯坦', timezone: 'Asia/Almaty', flag: '🇰🇿' }
      ]
    },
    '20': { country: 'EG', name: '埃及', timezone: 'Africa/Cairo', flag: '🇪🇬' },
    '27': { country: 'ZA', name: '南非', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
    '30': { country: 'GR', name: '希腊', timezone: 'Europe/Athens', flag: '🇬🇷' },
    '31': { country: 'NL', name: '荷兰', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
    '32': { country: 'BE', name: '比利时', timezone: 'Europe/Brussels', flag: '🇧🇪' },
    '33': { country: 'FR', name: '法国', timezone: 'Europe/Paris', flag: '🇫🇷' },
    '34': { country: 'ES', name: '西班牙', timezone: 'Europe/Madrid', flag: '🇪🇸' },
    '36': { country: 'HU', name: '匈牙利', timezone: 'Europe/Budapest', flag: '🇭🇺' },
    '39': { country: 'IT', name: '意大利', timezone: 'Europe/Rome', flag: '🇮🇹' },
    '40': { country: 'RO', name: '罗马尼亚', timezone: 'Europe/Bucharest', flag: '🇷🇴' },
    '41': { country: 'CH', name: '瑞士', timezone: 'Europe/Zurich', flag: '🇨🇭' },
    '43': { country: 'AT', name: '奥地利', timezone: 'Europe/Vienna', flag: '🇦🇹' },
    '44': { 
      country: 'GB_TERRITORIES', // UK and territories
      name: '英联邦', 
      timezone: 'Europe/London', 
      flag: '🇬🇧',
      isShared: true,
      countries: [
        { country: 'GB', name: '英国', timezone: 'Europe/London', flag: '🇬🇧' },
        { country: 'JE', name: '泽西岛', timezone: 'Europe/Jersey', flag: '🇯🇪' },
        { country: 'GG', name: '根西岛', timezone: 'Europe/Guernsey', flag: '🇬🇬' },
        { country: 'IM', name: '马恩岛', timezone: 'Europe/Isle_of_Man', flag: '🇮🇲' }
      ]
    },
    '45': { country: 'DK', name: '丹麦', timezone: 'Europe/Copenhagen', flag: '🇩🇰' },
    '46': { country: 'SE', name: '瑞典', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
    '47': { country: 'NO', name: '挪威', timezone: 'Europe/Oslo', flag: '🇳🇴' },
    '48': { country: 'PL', name: '波兰', timezone: 'Europe/Warsaw', flag: '🇵🇱' },
    '49': { country: 'DE', name: '德国', timezone: 'Europe/Berlin', flag: '🇩🇪' },
    '51': { country: 'PE', name: '秘鲁', timezone: 'America/Lima', flag: '🇵🇪' },
    '52': { country: 'MX', name: '墨西哥', timezone: 'America/Mexico_City', flag: '🇲🇽' },
    '53': { country: 'CU', name: '古巴', timezone: 'America/Havana', flag: '🇨🇺' },
    '54': { country: 'AR', name: '阿根廷', timezone: 'America/Buenos_Aires', flag: '🇦🇷' },
    '55': { country: 'BR', name: '巴西', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
    '56': { country: 'CL', name: '智利', timezone: 'America/Santiago', flag: '🇨🇱' },
    '57': { country: 'CO', name: '哥伦比亚', timezone: 'America/Bogota', flag: '🇨🇴' },
    '58': { country: 'VE', name: '委内瑞拉', timezone: 'America/Caracas', flag: '🇻🇪' },
    '60': { country: 'MY', name: '马来西亚', timezone: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
    '61': { country: 'AU', name: '澳大利亚', timezone: 'Australia/Sydney', flag: '🇦🇺' },
    '62': { country: 'ID', name: '印度尼西亚', timezone: 'Asia/Jakarta', flag: '🇮🇩' },
    '63': { country: 'PH', name: '菲律宾', timezone: 'Asia/Manila', flag: '🇵🇭' },
    '64': { country: 'NZ', name: '新西兰', timezone: 'Pacific/Auckland', flag: '🇳🇿' },
    '65': { country: 'SG', name: '新加坡', timezone: 'Asia/Singapore', flag: '🇸🇬' },
    '66': { country: 'TH', name: '泰国', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
    '81': { country: 'JP', name: '日本', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
    '82': { country: 'KR', name: '韩国', timezone: 'Asia/Seoul', flag: '🇰🇷' },
    '84': { country: 'VN', name: '越南', timezone: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
    '86': { country: 'CN', name: '中国', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
    '90': { country: 'TR', name: '土耳其', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
    '91': { country: 'IN', name: '印度', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
    '92': { country: 'PK', name: '巴基斯坦', timezone: 'Asia/Karachi', flag: '🇵🇰' },
    '93': { country: 'AF', name: '阿富汗', timezone: 'Asia/Kabul', flag: '🇦🇫' },
    '94': { country: 'LK', name: '斯里兰卡', timezone: 'Asia/Colombo', flag: '🇱🇰' },
    '95': { country: 'MM', name: '缅甸', timezone: 'Asia/Yangon', flag: '🇲🇲' },
    '98': { country: 'IR', name: '伊朗', timezone: 'Asia/Tehran', flag: '🇮🇷' },
    '212': { 
      country: 'MA_EH', // Morocco and Western Sahara
      name: '摩洛哥地区', 
      timezone: 'Africa/Casablanca', 
      flag: '🇲🇦',
      isShared: true,
      countries: [
        { country: 'MA', name: '摩洛哥', timezone: 'Africa/Casablanca', flag: '🇲🇦' },
        { country: 'EH', name: '西撒哈拉', timezone: 'Africa/El_Aaiun', flag: '🇪🇭' }
      ]
    },
    '213': { country: 'DZ', name: '阿尔及利亚', timezone: 'Africa/Algiers', flag: '🇩🇿' },
    '216': { country: 'TN', name: '突尼斯', timezone: 'Africa/Tunis', flag: '🇹🇳' },
    '218': { country: 'LY', name: '利比亚', timezone: 'Africa/Tripoli', flag: '🇱🇾' },
    '220': { country: 'GM', name: '冈比亚', timezone: 'Africa/Banjul', flag: '🇬🇲' },
    '221': { country: 'SN', name: '塞内加尔', timezone: 'Africa/Dakar', flag: '🇸🇳' },
    '222': { country: 'MR', name: '毛里塔尼亚', timezone: 'Africa/Nouakchott', flag: '🇲🇷' },
    '223': { country: 'ML', name: '马里', timezone: 'Africa/Bamako', flag: '🇲🇱' },
    '224': { country: 'GN', name: '几内亚', timezone: 'Africa/Conakry', flag: '🇬🇳' },
    '225': { country: 'CI', name: '科特迪瓦', timezone: 'Africa/Abidjan', flag: '🇨🇮' },
    '226': { country: 'BF', name: '布基纳法索', timezone: 'Africa/Ouagadougou', flag: '🇧🇫' },
    '227': { country: 'NE', name: '尼日尔', timezone: 'Africa/Niamey', flag: '🇳🇪' },
    '228': { country: 'TG', name: '多哥', timezone: 'Africa/Lome', flag: '🇹🇬' },
    '229': { country: 'BJ', name: '贝宁', timezone: 'Africa/Porto-Novo', flag: '🇧🇯' },
    '230': { country: 'MU', name: '毛里求斯', timezone: 'Indian/Mauritius', flag: '🇲🇺' },
    '231': { country: 'LR', name: '利比里亚', timezone: 'Africa/Monrovia', flag: '🇱🇷' },
    '232': { country: 'SL', name: '塞拉利昂', timezone: 'Africa/Freetown', flag: '🇸🇱' },
    '233': { country: 'GH', name: '加纳', timezone: 'Africa/Accra', flag: '🇬🇭' },
    '234': { country: 'NG', name: '尼日利亚', timezone: 'Africa/Lagos', flag: '🇳🇬' },
    '235': { country: 'TD', name: '乍得', timezone: 'Africa/Ndjamena', flag: '🇹🇩' },
    '236': { country: 'CF', name: '中非', timezone: 'Africa/Bangui', flag: '🇨🇫' },
    '237': { country: 'CM', name: '喀麦隆', timezone: 'Africa/Douala', flag: '🇨🇲' },
    '238': { country: 'CV', name: '佛得角', timezone: 'Atlantic/Cape_Verde', flag: '🇨🇻' },
    '239': { country: 'ST', name: '圣多美和普林西比', timezone: 'Africa/Sao_Tome', flag: '🇸🇹' },
    '240': { country: 'GQ', name: '赤道几内亚', timezone: 'Africa/Malabo', flag: '🇬🇶' },
    '241': { country: 'GA', name: '加蓬', timezone: 'Africa/Libreville', flag: '🇬🇦' },
    '242': { country: 'CG', name: '刚果', timezone: 'Africa/Brazzaville', flag: '🇨🇬' },
    '243': { country: 'CD', name: '刚果民主共和国', timezone: 'Africa/Kinshasa', flag: '🇨🇩' },
    '244': { country: 'AO', name: '安哥拉', timezone: 'Africa/Luanda', flag: '🇦🇴' },
    '245': { country: 'GW', name: '几内亚比绍', timezone: 'Africa/Bissau', flag: '🇬🇼' },
    '246': { country: 'IO', name: '英属印度洋领地', timezone: 'Indian/Chagos', flag: '🇮🇴' },
    '248': { country: 'SC', name: '塞舌尔', timezone: 'Indian/Mahe', flag: '🇸🇨' },
    '249': { country: 'SD', name: '苏丹', timezone: 'Africa/Khartoum', flag: '🇸🇩' },
    '250': { country: 'RW', name: '卢旺达', timezone: 'Africa/Kigali', flag: '🇷🇼' },
    '251': { country: 'ET', name: '埃塞俄比亚', timezone: 'Africa/Addis_Ababa', flag: '🇪🇹' },
    '252': { country: 'SO', name: '索马里', timezone: 'Africa/Mogadishu', flag: '🇸🇴' },
    '253': { country: 'DJ', name: '吉布提', timezone: 'Africa/Djibouti', flag: '🇩🇯' },
    '254': { country: 'KE', name: '肯尼亚', timezone: 'Africa/Nairobi', flag: '🇰🇪' },
    '255': { country: 'TZ', name: '坦桑尼亚', timezone: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
    '256': { country: 'UG', name: '乌干达', timezone: 'Africa/Kampala', flag: '🇺🇬' },
    '257': { country: 'BI', name: '布隆迪', timezone: 'Africa/Bujumbura', flag: '🇧🇮' },
    '258': { country: 'MZ', name: '莫桑比克', timezone: 'Africa/Maputo', flag: '🇲🇿' },
    '260': { country: 'ZM', name: '赞比亚', timezone: 'Africa/Lusaka', flag: '🇿🇲' },
    '261': { country: 'MG', name: '马达加斯加', timezone: 'Indian/Antananarivo', flag: '🇲🇬' },
    '262': { 
      country: 'RE_YT', // Réunion and Mayotte
      name: '法属印度洋', 
      timezone: 'Indian/Reunion', 
      flag: '🇫🇷',
      isShared: true,
      countries: [
        { country: 'RE', name: '留尼汪', timezone: 'Indian/Reunion', flag: '🇷🇪' },
        { country: 'YT', name: '马约特', timezone: 'Indian/Mayotte', flag: '🇾🇹' }
      ]
    },
    '263': { country: 'ZW', name: '津巴布韦', timezone: 'Africa/Harare', flag: '🇿🇼' },
    '264': { country: 'NA', name: '纳米比亚', timezone: 'Africa/Windhoek', flag: '🇳🇦' },
    '265': { country: 'MW', name: '马拉维', timezone: 'Africa/Blantyre', flag: '🇲🇼' },
    '266': { country: 'LS', name: '莱索托', timezone: 'Africa/Maseru', flag: '🇱🇸' },
    '267': { country: 'BW', name: '博茨瓦纳', timezone: 'Africa/Gaborone', flag: '🇧🇼' },
    '268': { country: 'SZ', name: '斯威士兰', timezone: 'Africa/Mbabane', flag: '🇸🇿' },
    '269': { country: 'KM', name: '科摩罗', timezone: 'Indian/Comoro', flag: '🇰🇲' },
    '290': { country: 'SH', name: '圣赫勒拿', timezone: 'Atlantic/St_Helena', flag: '🇸🇭' },
    '291': { country: 'ER', name: '厄立特里亚', timezone: 'Africa/Asmara', flag: '🇪🇷' },
    '297': { country: 'AW', name: '阿鲁巴', timezone: 'America/Aruba', flag: '🇦🇼' },
    '298': { country: 'FO', name: '法罗群岛', timezone: 'Atlantic/Faroe', flag: '🇫🇴' },
    '299': { country: 'GL', name: '格陵兰', timezone: 'America/Godthab', flag: '🇬🇱' },
    '350': { country: 'GI', name: '直布罗陀', timezone: 'Europe/Gibraltar', flag: '🇬🇮' },
    '351': { country: 'PT', name: '葡萄牙', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
    '352': { country: 'LU', name: '卢森堡', timezone: 'Europe/Luxembourg', flag: '🇱🇺' },
    '353': { country: 'IE', name: '爱尔兰', timezone: 'Europe/Dublin', flag: '🇮🇪' },
    '354': { country: 'IS', name: '冰岛', timezone: 'Atlantic/Reykjavik', flag: '🇮🇸' },
    '355': { country: 'AL', name: '阿尔巴尼亚', timezone: 'Europe/Tirane', flag: '🇦🇱' },
    '356': { country: 'MT', name: '马耳他', timezone: 'Europe/Malta', flag: '🇲🇹' },
    '357': { country: 'CY', name: '塞浦路斯', timezone: 'Asia/Nicosia', flag: '🇨🇾' },
    '358': { country: 'FI', name: '芬兰', timezone: 'Europe/Helsinki', flag: '🇫🇮' },
    '359': { country: 'BG', name: '保加利亚', timezone: 'Europe/Sofia', flag: '🇧🇬' },
    '370': { country: 'LT', name: '立陶宛', timezone: 'Europe/Vilnius', flag: '🇱🇹' },
    '371': { country: 'LV', name: '拉脱维亚', timezone: 'Europe/Riga', flag: '🇱🇻' },
    '372': { country: 'EE', name: '爱沙尼亚', timezone: 'Europe/Tallinn', flag: '🇪🇪' },
    '373': { country: 'MD', name: '摩尔多瓦', timezone: 'Europe/Chisinau', flag: '🇲🇩' },
    '374': { country: 'AM', name: '亚美尼亚', timezone: 'Asia/Yerevan', flag: '🇦🇲' },
    '375': { country: 'BY', name: '白俄罗斯', timezone: 'Europe/Minsk', flag: '🇧🇾' },
    '376': { country: 'AD', name: '安道尔', timezone: 'Europe/Andorra', flag: '🇦🇩' },
    '377': { country: 'MC', name: '摩纳哥', timezone: 'Europe/Monaco', flag: '🇲🇨' },
    '378': { country: 'SM', name: '圣马力诺', timezone: 'Europe/San_Marino', flag: '🇸🇲' },
    '380': { country: 'UA', name: '乌克兰', timezone: 'Europe/Kiev', flag: '🇺🇦' },
    '381': { country: 'RS', name: '塞尔维亚', timezone: 'Europe/Belgrade', flag: '🇷🇸' },
    '382': { country: 'ME', name: '黑山', timezone: 'Europe/Podgorica', flag: '🇲🇪' },
    '383': { country: 'XK', name: '科索沃', timezone: 'Europe/Pristina', flag: '🇽🇰' },
    '385': { country: 'HR', name: '克罗地亚', timezone: 'Europe/Zagreb', flag: '🇭🇷' },
    '386': { country: 'SI', name: '斯洛文尼亚', timezone: 'Europe/Ljubljana', flag: '🇸🇮' },
    '387': { country: 'BA', name: '波斯尼亚和黑塞哥维那', timezone: 'Europe/Sarajevo', flag: '🇧🇦' },
    '389': { country: 'MK', name: '北马其顿', timezone: 'Europe/Skopje', flag: '🇲🇰' },
    '420': { country: 'CZ', name: '捷克', timezone: 'Europe/Prague', flag: '🇨🇿' },
    '421': { country: 'SK', name: '斯洛伐克', timezone: 'Europe/Bratislava', flag: '🇸🇰' },
    '423': { country: 'LI', name: '列支敦士登', timezone: 'Europe/Vaduz', flag: '🇱🇮' },
    '500': { country: 'FK', name: '福克兰群岛', timezone: 'Atlantic/Stanley', flag: '🇫🇰' },
    '501': { country: 'BZ', name: '伯利兹', timezone: 'America/Belize', flag: '🇧🇿' },
    '502': { country: 'GT', name: '危地马拉', timezone: 'America/Guatemala', flag: '🇬🇹' },
    '503': { country: 'SV', name: '萨尔瓦多', timezone: 'America/El_Salvador', flag: '🇸🇻' },
    '504': { country: 'HN', name: '洪都拉斯', timezone: 'America/Tegucigalpa', flag: '🇭🇳' },
    '505': { country: 'NI', name: '尼加拉瓜', timezone: 'America/Managua', flag: '🇳🇮' },
    '506': { country: 'CR', name: '哥斯达黎加', timezone: 'America/Costa_Rica', flag: '🇨🇷' },
    '507': { country: 'PA', name: '巴拿马', timezone: 'America/Panama', flag: '🇵🇦' },
    '508': { country: 'PM', name: '圣皮埃尔和密克隆', timezone: 'America/Miquelon', flag: '🇵🇲' },
    '509': { country: 'HT', name: '海地', timezone: 'America/Port-au-Prince', flag: '🇭🇹' },
    '590': { 
      country: 'GP_BL_MF', // Guadeloupe, Saint Barthélemy, Saint Martin
      name: '法属安的列斯', 
      timezone: 'America/Guadeloupe', 
      flag: '🇫🇷',
      isShared: true,
      countries: [
        { country: 'GP', name: '瓜德罗普', timezone: 'America/Guadeloupe', flag: '🇬🇵' },
        { country: 'BL', name: '圣巴泰勒米', timezone: 'America/St_Barthelemy', flag: '🇧🇱' },
        { country: 'MF', name: '法属圣马丁', timezone: 'America/Marigot', flag: '🇲🇫' }
      ]
    },
    '591': { country: 'BO', name: '玻利维亚', timezone: 'America/La_Paz', flag: '🇧🇴' },
    '592': { country: 'GY', name: '圭亚那', timezone: 'America/Guyana', flag: '🇬🇾' },
    '593': { country: 'EC', name: '厄瓜多尔', timezone: 'America/Guayaquil', flag: '🇪🇨' },
    '594': { country: 'GF', name: '法属圭亚那', timezone: 'America/Cayenne', flag: '🇬🇫' },
    '595': { country: 'PY', name: '巴拉圭', timezone: 'America/Asuncion', flag: '🇵🇾' },
    '596': { country: 'MQ', name: '马提尼克', timezone: 'America/Martinique', flag: '🇲🇶' },
    '597': { country: 'SR', name: '苏里南', timezone: 'America/Paramaribo', flag: '🇸🇷' },
    '598': { country: 'UY', name: '乌拉圭', timezone: 'America/Montevideo', flag: '🇺🇾' },
    '599': { 
      country: 'CW_BQ', // Curaçao and Caribbean Netherlands
      name: '荷属安的列斯', 
      timezone: 'America/Curacao', 
      flag: '🇳🇱',
      isShared: true,
      countries: [
        { country: 'CW', name: '库拉索', timezone: 'America/Curacao', flag: '🇨🇼' },
        { country: 'BQ', name: '荷属加勒比', timezone: 'America/Kralendijk', flag: '🇧🇶' }
      ]
    },
    '670': { country: 'TL', name: '东帝汶', timezone: 'Asia/Dili', flag: '🇹🇱' },
    '672': { country: 'AQ', name: '南极洲', timezone: 'Antarctica/McMurdo', flag: '🇦🇶' },
    '673': { country: 'BN', name: '文莱', timezone: 'Asia/Brunei', flag: '🇧🇳' },
    '674': { country: 'NR', name: '瑙鲁', timezone: 'Pacific/Nauru', flag: '🇳🇷' },
    '675': { country: 'PG', name: '巴布亚新几内亚', timezone: 'Pacific/Port_Moresby', flag: '🇵🇬' },
    '676': { country: 'TO', name: '汤加', timezone: 'Pacific/Tongatapu', flag: '🇹🇴' },
    '677': { country: 'SB', name: '所罗门群岛', timezone: 'Pacific/Guadalcanal', flag: '🇸🇧' },
    '678': { country: 'VU', name: '瓦努阿图', timezone: 'Pacific/Efate', flag: '🇻🇺' },
    '679': { country: 'FJ', name: '斐济', timezone: 'Pacific/Fiji', flag: '🇫🇯' },
    '680': { country: 'PW', name: '帕劳', timezone: 'Pacific/Palau', flag: '🇵🇼' },
    '681': { country: 'WF', name: '瓦利斯和富图纳', timezone: 'Pacific/Wallis', flag: '🇼🇫' },
    '682': { country: 'CK', name: '库克群岛', timezone: 'Pacific/Rarotonga', flag: '🇨🇰' },
    '683': { country: 'NU', name: '纽埃', timezone: 'Pacific/Niue', flag: '🇳🇺' },
    '684': { country: 'AS', name: '美属萨摩亚', timezone: 'Pacific/Pago_Pago', flag: '🇦🇸' },
    '685': { country: 'WS', name: '萨摩亚', timezone: 'Pacific/Apia', flag: '🇼🇸' },
    '686': { country: 'KI', name: '基里巴斯', timezone: 'Pacific/Tarawa', flag: '🇰🇮' },
    '687': { country: 'NC', name: '新喀里多尼亚', timezone: 'Pacific/Noumea', flag: '🇳🇨' },
    '688': { country: 'TV', name: '图瓦卢', timezone: 'Pacific/Funafuti', flag: '🇹🇻' },
    '689': { country: 'PF', name: '法属波利尼西亚', timezone: 'Pacific/Tahiti', flag: '🇵🇫' },
    '690': { country: 'TK', name: '托克劳', timezone: 'Pacific/Fakaofo', flag: '🇹🇰' },
    '691': { country: 'FM', name: '密克罗尼西亚', timezone: 'Pacific/Chuuk', flag: '🇫🇲' },
    '692': { country: 'MH', name: '马绍尔群岛', timezone: 'Pacific/Majuro', flag: '🇲🇭' },
    '850': { country: 'KP', name: '朝鲜', timezone: 'Asia/Pyongyang', flag: '🇰🇵' },
    '852': { country: 'HK', name: '香港', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
    '853': { country: 'MO', name: '澳门', timezone: 'Asia/Macau', flag: '🇲🇴' },
    '855': { country: 'KH', name: '柬埔寨', timezone: 'Asia/Phnom_Penh', flag: '🇰🇭' },
    '856': { country: 'LA', name: '老挝', timezone: 'Asia/Vientiane', flag: '🇱🇦' },
    '880': { country: 'BD', name: '孟加拉国', timezone: 'Asia/Dhaka', flag: '🇧🇩' },
    '886': { country: 'TW', name: '台湾', timezone: 'Asia/Taipei', flag: '🇹🇼' },
    '960': { country: 'MV', name: '马尔代夫', timezone: 'Indian/Maldives', flag: '🇲🇻' },
    '961': { country: 'LB', name: '黎巴嫩', timezone: 'Asia/Beirut', flag: '🇱🇧' },
    '962': { country: 'JO', name: '约旦', timezone: 'Asia/Amman', flag: '🇯🇴' },
    '963': { country: 'SY', name: '叙利亚', timezone: 'Asia/Damascus', flag: '🇸🇾' },
    '964': { country: 'IQ', name: '伊拉克', timezone: 'Asia/Baghdad', flag: '🇮🇶' },
    '965': { country: 'KW', name: '科威特', timezone: 'Asia/Kuwait', flag: '🇰🇼' },
    '966': { country: 'SA', name: '沙特阿拉伯', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
    '967': { country: 'YE', name: '也门', timezone: 'Asia/Aden', flag: '🇾🇪' },
    '968': { country: 'OM', name: '阿曼', timezone: 'Asia/Muscat', flag: '🇴🇲' },
    '970': { country: 'PS', name: '巴勒斯坦', timezone: 'Asia/Gaza', flag: '🇵🇸' },
    '971': { country: 'AE', name: '阿联酋', timezone: 'Asia/Dubai', flag: '🇦🇪' },
    '972': { country: 'IL', name: '以色列', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },
    '973': { country: 'BH', name: '巴林', timezone: 'Asia/Bahrain', flag: '🇧🇭' },
    '974': { country: 'QA', name: '卡塔尔', timezone: 'Asia/Qatar', flag: '🇶🇦' },
    '975': { country: 'BT', name: '不丹', timezone: 'Asia/Thimphu', flag: '🇧🇹' },
    '976': { country: 'MN', name: '蒙古', timezone: 'Asia/Ulaanbaatar', flag: '🇲🇳' },
    '977': { country: 'NP', name: '尼泊尔', timezone: 'Asia/Kathmandu', flag: '🇳🇵' },
    '992': { country: 'TJ', name: '塔吉克斯坦', timezone: 'Asia/Dushanbe', flag: '🇹🇯' },
    '993': { country: 'TM', name: '土库曼斯坦', timezone: 'Asia/Ashgabat', flag: '🇹🇲' },
    '994': { country: 'AZ', name: '阿塞拜疆', timezone: 'Asia/Baku', flag: '🇦🇿' },
    '995': { country: 'GE', name: '格鲁吉亚', timezone: 'Asia/Tbilisi', flag: '🇬🇪' },
    '996': { country: 'KG', name: '吉尔吉斯斯坦', timezone: 'Asia/Bishkek', flag: '🇰🇬' },
    '998': { country: 'UZ', name: '乌兹别克斯坦', timezone: 'Asia/Tashkent', flag: '🇺🇿' }
  },

  // 当前显示的天气信息元素
  currentWeatherElement: null,
  currentPhoneNumber: null,

  weatherCache: new Map(),
  weatherCacheTtlMs: 60 * 60 * 1000,
  _weatherInFlight: new Map(),
  _weatherCacheStorageKey: 'waapWeatherDataCacheV1',
  _weatherCacheLoaded: false,
  _weatherCacheStore: null,
  _weatherCacheSaveTimer: null,
  
  // 调试状态（避免重复输出）
  lastDebugNumber: null,
  
  // 实时时钟定时器
  clockInterval: null,
  
  // 用户手动修正的国家信息缓存
  userCorrections: new Map(),

  // 自动推断的国家信息缓存（用于隐私页展示 & 减少重复计算）
  resolvedCountries: new Map(),
  _resolvedSaveTimer: null,
  
  // 智能识别缓存 (基于号码段)
  numberPatterns: new Map(),

  // 创建或更新状态显示
  showStatus: function(status, message = null) {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.showStatus) {
        return ui.showStatus(this, status, message, { document: window.document });
      }
    } catch (e) {
      // ignore
    }
	
    const statusText = message || this.statusMessages[status] || '📊 状态未知';
    if (this.currentStatus === status && this.currentInfoElement && this.currentInfoElement.textContent === statusText) {
      return this.currentInfoElement;
    }

    this.currentStatus = status;
    console.log(`📊 天气信息状态: ${status} - ${statusText}`);
    
    // 如果已有元素，更新内容
    if (this.currentInfoElement) {
      this.currentInfoElement.textContent = statusText;
      this.currentInfoElement.className = `weather-info-status status-${status}`;
      this.updateStatusStyle(this.currentInfoElement, status);
      return this.currentInfoElement;
    }
    
    // 创建新的状态元素
    const statusElement = document.createElement('div');
    statusElement.className = `weather-info-status status-${status}`;
    statusElement.textContent = statusText;
    this.updateStatusStyle(statusElement, status);
    
    this.currentInfoElement = statusElement;
    return statusElement;
  },

  // 更新状态样式
  updateStatusStyle: function(element, status) {
    element.style.cssText = `
      padding: 8px 12px;
      margin: 5px 0;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      background: ${this.getStatusColor(status)};
      color: ${status === 'loading' ? '#666' : '#333'};
      border: 1px solid ${this.getStatusBorderColor(status)};
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    // 添加加载动画
    if (status === 'loading') {
      this.addLoadingAnimation(element);
    } else {
      element.style.animation = 'none';
    }
  },

  // 获取状态对应的背景色
  getStatusColor: function(status) {
    const colors = {
      loading: '#f0f8ff',
      error: '#ffe6e6',
      'no-number': '#fff5e6',
      'no-contact': '#f5f5f5',
      success: '#e6ffe6',
      idle: '#f5f5f5'
    };
    return colors[status] || colors.idle;
  },

  // 获取状态对应的边框色
  getStatusBorderColor: function(status) {
    const colors = {
      loading: '#4a90e2',
      error: '#e74c3c',
      'no-number': '#f39c12',
      'no-contact': '#95a5a6',
      success: '#27ae60',
      idle: '#bdc3c7'
    };
    return colors[status] || colors.idle;
  },

  // 添加动画效果
  addLoadingAnimation: function(element) {
    if (this.currentStatus === 'loading') {
      element.style.animation = 'pulse 1.5s ease-in-out infinite';
      
      // 添加CSS动画样式（如果还没有）
      this.ensureAnimationStyles();
    }
  },

  // 确保动画样式存在
  ensureAnimationStyles: function() {
    if (!document.querySelector('#weather-status-animations')) {
      const style = document.createElement('style');
      style.id = 'weather-status-animations';
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .weather-info-status {
          transition: all 0.3s ease;
        }
        .weather-info-status:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `;
      document.head.appendChild(style);
    }
  },

  // 插入状态到聊天窗口
  insertStatus: function(container = null) {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.insertStatus) {
        return ui.insertStatus(this, container, { document: window.document });
      }
    } catch (e) {
      // ignore
    }
	
    console.log('🌤️ 插入状态信息到聊天窗口...');
    
    // 查找合适的插入位置
    let insertPosition = container || this.findInsertionContainer();
    
    if (!insertPosition) {
      console.log('❌ 未找到合适的插入位置');
      this.showStatus('error', '❌ 未找到插入位置');
      return false;
    }

    // 移除已存在的状态信息
    const existingStatus = insertPosition.querySelector('.weather-info-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const statusElement = this.showStatus('loading', this.getLoadingStatusText());
    insertPosition.appendChild(statusElement);
    
    console.log('✅ 状态信息已插入');
    return true;
  },

  getLoadingStatusText() {
    try {
      if (this.displaySettingsLoaded !== true) {
        return '🌍 正在加载信息...';
      }
      const showWeather = this.displaySettings ? this.displaySettings.showWeather !== false : true;
      const showTime = this.displaySettings ? this.displaySettings.showTime !== false : true;

      if (showWeather) return '🌤️ 正在获取天气信息...';
      if (showTime) return '⏰ 正在获取当地时间...';
      return '🌍 正在加载信息...';
    } catch (e) {
      return '🌍 正在加载信息...';
    }
  },

  getActiveChatKey() {
    try {
      const main = document.getElementById('main') || document.querySelector('#main');
      if (!main) return '';
      const header = main.querySelector('header');
      if (!header) return '';
      const text = (header.innerText || '').trim();
      if (!text) return '';
      return (
        text
          .split('\n')
          .map((s) => String(s || '').trim())
          .filter(Boolean)[0] || ''
      );
    } catch (e) {
      return '';
    }
  },

  // 初始化功能
  init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    
    try {
      const map = window.WAAP?.data?.weatherCountryCodeMap;
      if (map && typeof map === 'object') {
        this.countryCodeMap = map;
      }
    } catch (e) {
    }
    
    console.log('WeatherInfo: 初始化天气信息功能');
    this.loadDisplaySettings();
    this.installDisplaySettingsListener();
    this.loadUserCorrections();
    this.loadResolvedCountries();
    this.setupChatWindowObserver();
    
    // 初始化注入提示
    setTimeout(() => {
      this.initInjectionIndicator();
    }, 300); // 延迟2秒确保页面完全加载
  },
  
  // 停止所有功能
  stop() {
    console.log('WeatherInfo: 停止所有功能');

    try {
      this.stopWeatherAutoRenew();
    } catch (e) {
      // ignore
    }
    
    // 清除所有观察器
    if (this.chatWindowObserver) {
      this.chatWindowObserver.disconnect();
      this.chatWindowObserver = null;
    }
    if (this.currentInfoElement) {
      this.currentInfoElement.remove();
    }
    if (this.injectionIndicator) {
      this.injectionIndicator.remove();
    }
    
    // 清除所有定时器
    clearTimeout(this.loadingTimeout);
    clearTimeout(this.retryTimeout);
  },
  
  // 加载用户修正的国家信息
  async loadUserCorrections() {
    try {
      const svc = window.WAAP?.services?.weatherCountryStorageService;
      if (svc?.loadUserCorrections) {
        const ok = await svc.loadUserCorrections(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },
  
  // 保存用户修正的国家信息
  async saveUserCorrections() {
    try {
      const svc = window.WAAP?.services?.weatherCountryStorageService;
      if (svc?.saveUserCorrections) {
        const ok = await svc.saveUserCorrections(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  isChatWindowActive() {
    const main = document.getElementById('main');
    if (!main) return false;

    // 有输入框通常表示已经进入某个会话
    if (document.querySelector('footer._ak1i')) return true;

    // 有消息/会话相关 data-id（减少误判）
    if (main.querySelector('[data-id*="@c.us"], [data-id*="@g.us"]')) return true;

    // 有会话 header（不同版本 WhatsApp 可能不同）
    if (main.querySelector('header[data-testid="conversation-info-header"], header [data-testid="conversation-info-header"]')) return true;

    return false;
  },

  // 设置聊天窗口观察器
  setupChatWindowObserver() {
    try {
      const svc = window.WAAP?.services?.weatherChatWindowObserverService;
      if (svc?.setupChatWindowObserver) {
        const ok = svc.setupChatWindowObserver(this, {
          document: window.document,
          MutationObserver: window.MutationObserver,
          setTimeout: window.setTimeout,
          clearTimeout: window.clearTimeout
        });
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    // 最小兜底：不再保留完整实现（已迁移到 service）
    try {
      this.observerInitialized = true;
    } catch (e2) {
      // ignore
    }
  },

  // 检查新的聊天窗口
  checkForNewChatWindow() {
    try {
      const p = window.WAAP?.presenters?.weatherChatFlowPresenter;
      if (p?.checkForNewChatWindow) {
        const ok = p.checkForNewChatWindow(this, {
          document: window.document,
          setTimeout: window.setTimeout
        });
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 从当前聊天窗口提取电话号码
  extractPhoneNumber() {
    try {
      const p = window.WAAP?.presenters?.weatherChatFlowPresenter;
      if (p?.extractPhoneNumber) {
        const ok = p.extractPhoneNumber(this, {
          document: window.document
        });
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 处理电话号码
  processPhoneNumber(phoneNumber) {
    try {
      const p = window.WAAP?.presenters?.weatherPhoneProcessingPresenter;
      if (p?.processPhoneNumber) {
        const handled = p.processPhoneNumber(this, phoneNumber);
        if (handled === true) return;
        if (handled === false) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 识别国家
  identifyCountry(phoneNumber) {
    try {
      const svc = window.WAAP?.services?.weatherCountryDetectService;
      if (svc?.identifyCountry) {
        const info = svc.identifyCountry(this, phoneNumber);
        if (info) return info;
      }
    } catch (e) {
      // ignore
    }

    return null;
  },
  
  // 处理共享区号的智能识别
  handleSharedCountryCode(phoneNumber, prefix, countryData) {
    try {
      const svc = window.WAAP?.services?.weatherCountryDetectService;
      if (svc?.handleSharedCountryCode) {
        const info = svc.handleSharedCountryCode(this, phoneNumber, prefix, countryData);
        if (info) return info;
      }
    } catch (e) {
      // ignore
    }

    return null;
  },

  // 显示天气信息
  async displayWeatherInfo(countryInfo, options = {}) {
    try {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (p?.displayWeatherInfo) {
        return await p.displayWeatherInfo(this, countryInfo, options, {
          document: window.document,
          chrome: window.chrome
        });
      }
    } catch (e) {
      // ignore
    }
	
    if (this.displaySettings && this.displaySettings.enabled !== true) {
      this.hideWeatherInfo();
      return;
    }
    
    console.log('WeatherInfo: 显示天气信息:', countryInfo);
    
    try {
      // 显示国家识别状态
      this.showStatus('loading', '🌍 正在识别国家信息...');
      
      const showTime = this.displaySettings ? this.displaySettings.showTime !== false : true;
      const showWeather = this.displaySettings ? this.displaySettings.showWeather !== false : true;

      const localTime = showTime ? this.getLocalTime(countryInfo.timezone) : null;
      this.createWeatherDisplay(countryInfo, null, localTime);

      try {
        const cacheKey = this.getWeatherCacheKey(countryInfo);
        if (cacheKey) {
          await this.ensureWeatherCacheLoaded();
          const now = Date.now();
          const persisted = this.getPersistedWeatherCacheEntry(cacheKey);
          if (persisted && typeof persisted === 'object') {
            this.setPersistedWeatherCacheEntry(cacheKey, { ...persisted, lastSeenAt: now });
          } else {
            const mem = this.weatherCache.get(cacheKey);
            if (mem && typeof mem === 'object') {
              const next = { ...mem, lastSeenAt: now };
              this.weatherCache.set(cacheKey, next);
              this.setPersistedWeatherCacheEntry(cacheKey, next);
            }
          }
        }
      } catch (e) {
        // ignore
      }

      if (showWeather) {
        // 更新状态为正在获取天气
        this.showStatus('loading', '🌤️ 正在获取天气信息...');
        const force = options && options.force === true;
        this.loadWeatherDataAsync(countryInfo, { force });
      } else {
        this.showStatus('success', '✅ 信息加载完成');
      }
      
    } catch (error) {
      console.error('WeatherInfo: 显示基础信息失败:', error);
      
      // 显示错误状态
      this.showStatus('error', '❌ 信息加载失败');
      
      // 尝试至少显示时间信息
      try {
        const localTime = this.getLocalTime(countryInfo.timezone);
        this.createWeatherDisplay(countryInfo, null, localTime);
      } catch (timeError) {
        console.error('WeatherInfo: 连时间信息也获取失败:', timeError);
      }
    }
  },

  // 异步加载天气数据
  async loadWeatherDataAsync(countryInfo, options = {}) {
    try {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (p?.loadWeatherDataAsync) {
        return await p.loadWeatherDataAsync(this, countryInfo, options, {
          document: window.document,
          chrome: window.chrome
        });
      }
    } catch (e) {
      // ignore
    }
	
    try {
      console.log('WeatherInfo: 开始异步加载天气数据...');
      
      // 获取天气数据
      const weatherData = await this.getWeatherData(countryInfo, options);
      
      if (weatherData) {
        // 更新现有显示，添加天气信息
        this.updateWeatherDisplay(weatherData);
        this.showStatus('success', '✅ 天气信息加载完成');
      } else {
        console.warn('WeatherInfo: 天气数据获取失败，保持基础显示');
        this.showStatus('error', '⚠️ 天气信息获取失败');
      }
      
    } catch (error) {
      console.error('WeatherInfo: 异步加载天气数据失败:', error);
      this.showStatus('error', '⚠️ 天气信息获取失败');
    }
  },

  // 获取天气数据 (可配置不同的API)
  async getWeatherData(countryInfo, options = {}) {
    try {
      const p = window.WAAP?.presenters?.weatherDisplayPresenter;
      if (p?.getWeatherData) {
        return await p.getWeatherData(this, countryInfo, options, {
          document: window.document,
          chrome: window.chrome
        });
      }
    } catch (e) {
      // ignore
    }
	
    const cacheKey = this.getWeatherCacheKey(countryInfo);
    const force = options && options.force === true;
    try {
      await this.ensureWeatherCacheLoaded();
    } catch (e) {
      // ignore
    }

    const now = Date.now();

    if (!force) {
      const cached = this.weatherCache.get(cacheKey);
      if (cached && (now - cached.time) < this.weatherCacheTtlMs) {
        return cached.data;
      }

      try {
        const persisted = this.getPersistedWeatherCacheEntry(cacheKey);
        if (persisted && typeof persisted.time === 'number') {
          if ((now - persisted.time) < this.weatherCacheTtlMs) {
            this.weatherCache.set(cacheKey, persisted);
            return persisted.data;
          }

          this.setPersistedWeatherCacheEntry(cacheKey, null);
        }
      } catch (e) {
        // ignore
      }
    }

    const existing = this._weatherInFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        this.showStatus('loading', '🌤️ 正在获取天气信息...');

        const maxRetries = 2;
        const retryDelaysMs = [1000, 2000];

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const timeoutMs = attempt === 0 ? 10000 : 15000;
          try {
            const weatherData = await this.getWeatherFromWttr(countryInfo, { timeoutMs });

            if (weatherData && !weatherData.error) {
              this.showStatus('success', '✅ 天气信息获取成功');
              const entry = { time: Date.now(), data: weatherData, lastSeenAt: Date.now() };
              this.weatherCache.set(cacheKey, entry);
              try {
                this.setPersistedWeatherCacheEntry(cacheKey, entry);
              } catch (e) {
                // ignore
              }
              return weatherData;
            }

            console.warn('WeatherInfo: wttr.in API返回错误');
            this.showStatus('error', '⚠️ 天气信息获取失败');
            return null;
          } catch (error) {
            const isAbort = error && (error.name === 'AbortError');
            const isFetchFailed = error && /Failed to fetch/i.test(String(error.message || error));
            const shouldRetry = (attempt < maxRetries) && (isAbort || isFetchFailed);

            if (shouldRetry) {
              const delay = retryDelaysMs[attempt] || 2000;
              this.showStatus('loading', `🌤️ 正在获取天气信息... (重试 ${attempt + 1}/${maxRetries})`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            throw error;
          }
        }

        return null;
      } catch (error) {
        const isAbort = error && (error.name === 'AbortError');
        if (!isAbort) {
          console.error('WeatherInfo: 获取天气数据失败:', error);
        }
        this.showStatus('error', '❌ 天气信息获取失败');
        return null;
      } finally {
        this._weatherInFlight.delete(cacheKey);
      }
    })();

    this._weatherInFlight.set(cacheKey, requestPromise);
    return requestPromise;
  },

  getWeatherCacheKey(countryInfo) {
    const c = (countryInfo && countryInfo.country) ? String(countryInfo.country) : '';
    const n = (countryInfo && countryInfo.name) ? String(countryInfo.name) : '';
    return `${c}|${n}`;
  },

  // 使用wttr.in获取天气信息
  async getWeatherFromWttr(countryInfo, options = {}) {
    try {
      const svc = window.WAAP?.services?.weatherWttrService;
      if (svc?.getWeatherFromWttr) {
        return await svc.getWeatherFromWttr(countryInfo, options, {
          fetch: window.fetch,
          AbortController: window.AbortController,
          setTimeout: window.setTimeout,
          clearTimeout: window.clearTimeout
        });
      }
    } catch (e) {
      // ignore
    }
	
    try {
      // 构建查询位置 - 优先使用国家名称
      const location = countryInfo.name || countryInfo.country;
      const query = encodeURIComponent(location);
      
      // wttr.in的JSON API端点
      const wttrUrl = `https://wttr.in/${query}?format=j1&lang=zh`;
      
      console.log(`WeatherInfo: 正在查询 ${location} 的天气信息...`);

      const controller = new AbortController();
      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10000;
      const timeoutId = setTimeout(() => {
        try {
          controller.abort();
        } catch (e) {
          // ignore
        }
      }, timeoutMs);

      let response;
      try {
        response = await fetch(wttrUrl, {
          method: 'GET',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.current_condition && data.current_condition[0]) {
        const current = data.current_condition[0];
        const weather = data.weather && data.weather[0];
        
        // 天气状况映射
        const conditionMap = {
          'Sunny': { desc: '晴朗', icon: '☀️' },
          'Clear': { desc: '晴朗', icon: '☀️' },
          'Partly cloudy': { desc: '多云', icon: '⛅' },
          'Cloudy': { desc: '阴天', icon: '☁️' },
          'Overcast': { desc: '阴天', icon: '☁️' },
          'Light rain': { desc: '小雨', icon: '🌦️' },
          'Moderate rain': { desc: '中雨', icon: '🌧️' },
          'Heavy rain': { desc: '大雨', icon: '🌧️' },
          'Light snow': { desc: '小雪', icon: '🌨️' },
          'Heavy snow': { desc: '大雪', icon: '❄️' },
          'Fog': { desc: '雾', icon: '🌫️' },
          'Mist': { desc: '薄雾', icon: '🌫️' }
        };
        
        const condition = current.weatherDesc[0].value;
        const weatherInfo = conditionMap[condition] || { desc: condition, icon: '🌤️' };
        
        return {
          temperature: parseInt(current.temp_C),
          description: weatherInfo.desc,
          icon: weatherInfo.icon,
          humidity: `${current.humidity}%`,
          windSpeed: `${current.windspeedKmph} km/h`,
          feelsLike: `${current.FeelsLikeC}°C`,
          visibility: `${current.visibility} km`,
          pressure: `${current.pressure} mb`,
          uvIndex: current.uvIndex || 'N/A',
          location: location,
          forecast: weather ? {
            maxTemp: parseInt(weather.maxtempC),
            minTemp: parseInt(weather.mintempC),
            sunrise: weather.astronomy[0].sunrise,
            sunset: weather.astronomy[0].sunset
          } : null
        };
      }
      
      throw new Error('无效的天气数据格式');
      
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError');
      if (!isAbort) {
        console.error('WeatherInfo: wttr.in API调用失败:', error);
      }
      throw error;
    }
  },

  // 获取默认天气数据（备用方案）
  getDefaultWeatherData(countryInfo) {
    try {
      const svc = window.WAAP?.services?.weatherWttrService;
      if (svc?.getDefaultWeatherData) {
        return svc.getDefaultWeatherData(countryInfo);
      }
    } catch (e) {
      // ignore
    }
	
    // 根据地理位置和季节提供基础的默认天气
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    // 基于国家和季节的简单天气预测
    const isNorthern = !['AU', 'NZ', 'ZA', 'AR', 'CL', 'BR'].includes(countryInfo.country);
    const isSummer = isNorthern ? (month >= 6 && month <= 8) : (month >= 12 || month <= 2);
    const isWinter = isNorthern ? (month >= 12 || month <= 2) : (month >= 6 && month <= 8);
    
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
      location: countryInfo.name,
      isDefault: true
    };
  },

  // 获取当地时间
  getLocalTime(timezone) {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.getLocalTime) {
        return ui.getLocalTime(timezone);
      }
    } catch (e) {
      // ignore
    }
	
    try {
      const now = new Date();
      const localTime = now.toLocaleString('zh-CN', {
        timeZone: timezone,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{4})\/(\d{2})\/(\d{2})\s/, '').replace(/(\d{2})\/(\d{2})\s/, '$1月$2日 ');
      
      return {
        time: localTime,
        timezone: timezone
      };
    } catch (error) {
      console.error('WeatherInfo: 获取时间失败:', error);
      return {
        time: '无法获取',
        timezone: timezone
      };
    }
  },

  // 启动实时时钟
  startRealtimeClock() {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.startRealtimeClock) {
        return ui.startRealtimeClock(this, {
          document: window.document,
          setInterval: window.setInterval,
          clearInterval: window.clearInterval
        });
      }
    } catch (e) {
      // ignore
    }
	
    // 清除之前的定时器
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    // 每秒更新时间
    this.clockInterval = setInterval(() => {
      const timeElements = document.querySelectorAll('.local-time[data-timezone]');
      timeElements.forEach(element => {
        const timezone = element.getAttribute('data-timezone');
        if (timezone) {
          const timeData = this.getLocalTime(timezone);
          element.textContent = timeData.time;
        }
      });
    }, 1000);
  },

  // 停止实时时钟
  stopRealtimeClock() {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.stopRealtimeClock) {
        return ui.stopRealtimeClock(this, { clearInterval: window.clearInterval });
      }
    } catch (e) {
      // ignore
    }
	
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  // 找到电话号码元素，用于在其旁边插入天气信息
  findPhoneNumberElement() {
    console.log('WeatherInfo: 查找电话号码元素...');
    
    // 尝试找到电话号码显示的元素
    const phoneSelectors = [
      // 主要的电话号码选择器
      '#main header span[title*="+"]',
      '#main header [data-testid="conversation-info-header-chat-subtitle"] span[title*="+"]',
      // 包含电话号码的span
      '#main header span[dir="auto"]:has-text("+"):not([class*="status"])',
      // 备用选择器 - 查找包含+号的文本
      '#main header span:contains("+")',
      // 更广泛的搜索
      '#main header *[title*="+"]'
    ];
    
    for (const selector of phoneSelectors) {
      try {
        // 对于包含+号的选择器，需要特殊处理
        if (selector.includes(':contains') || selector.includes(':has-text')) {
          // 手动查找包含+号的元素
          const allSpans = document.querySelectorAll('#main header span');
          for (const span of allSpans) {
            const text = span.textContent || span.title || '';
            if (text.includes('+') && /\+\d+/.test(text)) {
              console.log('✅ 找到电话号码元素:', text);
              return span;
            }
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || element.title || '';
            if (text.includes('+') && /\+\d+/.test(text)) {
              console.log('✅ 找到电话号码元素:', selector, text);
              return element;
            }
          }
        }
      } catch (error) {
        console.log(`❌ 电话号码选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到电话号码元素');
    return null;
  },

  // 查找联系人名称元素（当没有显示电话号码时）
  findContactNameElement() {
    console.log('WeatherInfo: 查找联系人名称元素...');
    
    // 尝试找到联系人名称显示的元素
    const contactSelectors = [
      // 聊天头部的联系人名称
      '#main header [data-testid="conversation-info-header-chat-title"]',
      '#main header span[dir="auto"]:not([class*="status"]):not([title*="+"])',
      // 备用选择器
      '#main header div[data-testid="conversation-info-header-chat-subtitle"] > span',
      '#main header span:not([class*="status"]):not([title*="+"])',
      // 更广泛的搜索
      '#main header div[data-testid="conversation-info-header-chat-subtitle"] *'
    ];
    
    for (const selector of contactSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          let text = element.textContent || element.title || '';
          text = text.trim();
          
          // 过滤掉无关信息
          const invalidPatterns = [
            /最后上线时间/,
            /上次使用时间/,
            /\+\d+/,  // 电话号码
            /online/i,
            /last seen/i,
            /typing/i,
            /正在输入/,
            /^\s*$/   // 空白
          ];
          
          const isValid = text.length > 0 && 
                         text.length < 50 && 
                         !invalidPatterns.some(pattern => pattern.test(text));
          
          if (isValid) {
            console.log('✅ 找到联系人名称元素:', selector, text);
            return element;
          }
        }
      } catch (error) {
        console.log(`❌ 联系人名称选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到联系人名称元素');
    return null;
  },

  // 找到合适的插入位置（电话号码的父容器）
  findInsertionContainer() {
    console.log('WeatherInfo: 查找插入位置...');
    
    const phoneElement = this.findPhoneNumberElement();
    if (!phoneElement) {
      // 如果找不到电话号码，回退到头部容器
      console.log('WeatherInfo: 回退到头部容器...');
      const headerSelectors = [
        '#main header div[data-testid="conversation-info-header-chat-subtitle"]',
        '#main header',
        'header[data-testid="conversation-info-header"]'
      ];
      
      for (const selector of headerSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            console.log('✅ 找到头部容器:', selector);
            return element;
          }
        } catch (error) {
          console.log(`❌ 头部选择器失败: ${selector}`, error.message);
        }
      }
      return null;
    }
    
    // 找到电话号码的父容器，这样我们可以在同一行插入天气信息
    let container = phoneElement.parentElement;
    while (container && !container.matches('#main header div, #main header')) {
      container = container.parentElement;
    }
    
    if (container) {
      console.log('✅ 找到插入容器:', container.tagName, container.className);
      return container;
    }
    
    console.log('❌ 未找到合适的插入容器');
    return null;
  },

  // 获取当前聊天对象的联系人名称
  getCurrentContactName() {
    console.log('WeatherInfo: 获取联系人名称...');
    
    const nameSelectors = [
      // 聊天头部的联系人名称
      '#main header span[title]:not([title*="+"])',
      '#main header [data-testid="conversation-info-header-chat-title"]',
      'header[data-testid="conversation-info-header"] span[title]:not([title*="+"])',
      // 备用选择器
      '#main header span[dir="auto"]:not([dir="auto"]:has([title*="+"]))',
      '#main header .copyable-text span'
    ];
    
    for (const selector of nameSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          let text = element.textContent || element.title || '';
          text = text.trim();
          
          // 过滤掉无关信息
          const invalidPatterns = [
            /最后上线时间/,
            /上次使用时间/,
            /\+\d+/,  // 电话号码
            /online/i,
            /last seen/i,
            /typing/i,
            /正在输入/,
            /^\s*$/   // 空白
          ];
          
          const isValid = text.length > 0 && 
                         text.length < 50 && 
                         !invalidPatterns.some(pattern => pattern.test(text));
          
          if (isValid) {
            console.log('✅ 找到联系人名称:', text);
            return text;
          }
        }
      } catch (error) {
        console.log(`❌ 名称选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到有效的联系人名称');
    return '';
  },

  // 创建天气显示组件
  createWeatherDisplay(countryInfo, weatherData, timeData) {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.createWeatherDisplay) {
        return ui.createWeatherDisplay(this, countryInfo, weatherData, timeData, {
          document: window.document,
          chrome: window.chrome,
          setInterval: window.setInterval,
          clearInterval: window.clearInterval
        });
      }
    } catch (e) {
      // ignore
    }
	
    // 移除旧的显示元素
    this.hideWeatherInfo();
    
    // 获取联系人名称
    const contactName = this.getCurrentContactName();
    
    // 找到合适的插入位置
    const insertionContainer = this.findInsertionContainer();
    if (!insertionContainer) {
      console.log('WeatherInfo: 未找到合适的插入位置');
      return;
    }
    
    // 创建新的显示元素
    const weatherContainer = document.createElement('div');
    weatherContainer.className = 'wa-weather-info';
    
    const allowCountryOverride = this.displaySettings && this.displaySettings.allowCountryOverride === true;
    const showWeather = this.displaySettings ? this.displaySettings.showWeather !== false : true;
    const showTime = this.displaySettings ? this.displaySettings.showTime !== false : true;

    // 根据是否需要确认显示不同的内容
    const needsConfirmation = countryInfo.needsConfirmation && !countryInfo.isUserCorrected;
    const isAutoDetected = countryInfo.isAutoDetected;
    const isUserCorrected = countryInfo.isUserCorrected;

    const showSelector = allowCountryOverride && needsConfirmation && countryInfo.sharedCountryData && countryInfo.sharedCountryData.countries;
    
    try {
      const view = window.WAAP?.views?.weatherInfoView;
      if (view?.renderWeather) {
        view.renderWeather(
          weatherContainer,
          countryInfo,
          weatherData,
          timeData,
          {
            showSelector,
            showWeather,
            showTime,
            needsConfirmation,
            isAutoDetected,
            isUserCorrected
          },
          {
            document: window.document,
            generateWeatherHTML: (d) => this.generateWeatherHTML(d)
          }
        );
      } else {
        weatherContainer.innerHTML = `<div class="weather-inline"><span class="country-info"><span class="country-flag">${this.renderCountryFlag(countryInfo)}</span><span class="country-name">${countryInfo.name}</span></span></div>`;
      }
    } catch (e) {
      // ignore
    }

    // 添加样式
    this.addWeatherStyles();
    
    // 将天气信息插入到电话号码或联系人名称旁边
    const phoneElement = this.findPhoneNumberElement();
    if (phoneElement) {
      // 在电话号码后面插入天气信息
      phoneElement.insertAdjacentElement('afterend', weatherContainer);
    } else {
      // 如果找不到电话号码，尝试找到联系人名称元素
      const contactElement = this.findContactNameElement();
      if (contactElement) {
        // 在联系人名称后面插入天气信息
        contactElement.insertAdjacentElement('afterend', weatherContainer);
      } else {
        // 如果都找不到，添加到插入容器的末尾
        insertionContainer.appendChild(weatherContainer);
      }
    }
    this.currentWeatherElement = weatherContainer;
      
      // 如果需要确认，添加国家选择事件
      if (showSelector) {
        this.setupCountrySelection(weatherContainer, countryInfo);
      }

      // 交互：点国旗/国家名 -> 选国家；点天气 -> 强制刷新（写入缓存）；点空白 -> 普通刷新
      try {
        const countryInfoEl = weatherContainer.querySelector('.country-info');
        if (countryInfoEl) {
          const onCountryActivate = async (e) => {
            try {
              e.stopPropagation();
            } catch (e0) {
              // ignore
            }

            try {
              let latestAllowOverride = this.displaySettings && this.displaySettings.allowCountryOverride === true;
              if (chrome?.storage?.sync?.get) {
                const allowFromStore = await new Promise((resolve) => {
                  try {
                    chrome.storage.sync.get(['weatherAllowCountryOverride'], (data) => {
                      try {
                        if (chrome.runtime?.lastError) return resolve(null);
                        resolve(data && data.weatherAllowCountryOverride === true);
                      } catch (e2) {
                        resolve(null);
                      }
                    });
                  } catch (e2) {
                    resolve(null);
                  }
                });
                if (allowFromStore === true) {
                  latestAllowOverride = true;
                }
              }

              if (latestAllowOverride) {
                const candidates = countryInfo?.sharedCountryData?.countries || [];
                if (Array.isArray(candidates) && candidates.length > 0) {
                  this.openCountryOverridePrompt(countryInfo, { preferredCountries: candidates });
                } else {
                  this.openCountryOverridePrompt(countryInfo);
                }
                return;
              }
            } catch (e1) {
              // ignore
            }

            this.refreshWeatherInfo(countryInfo);
          };

          // capture：防止 WA 自己的 handler 提前 stopPropagation
          countryInfoEl.addEventListener('click', onCountryActivate, true);
          countryInfoEl.addEventListener('pointerdown', onCountryActivate, true);
        }

        const weatherInfoEl = weatherContainer.querySelector('.weather-info');
        if (weatherInfoEl) {
          const onWeatherActivate = async (e) => {
            try {
              e.stopPropagation();
            } catch (e0) {
              // ignore
            }

            const prevInner = (() => {
              try {
                return weatherInfoEl.innerHTML;
              } catch (e1) {
                return null;
              }
            })();

            try {
              const autoRenew = this.displaySettings && this.displaySettings.cacheAutoRenew !== false;
              if (autoRenew) {
                const view = window.WAAP?.views?.weatherInfoView;
                if (view?.confirmForceRefresh) {
                  const ok = await view.confirmForceRefresh(weatherInfoEl, { document: window.document });
                  if (!ok) {
                    try {
                      if (typeof prevInner === 'string') weatherInfoEl.innerHTML = prevInner;
                    } catch (e3) {
                      // ignore
                    }
                    return;
                  }
                }
              }
            } catch (e2) {
              // ignore
            }

            try {
              const view = window.WAAP?.views?.weatherInfoView;
              if (view?.setWeatherLoading) {
                view.setWeatherLoading(weatherContainer, { document: window.document });
              }
            } catch (e4) {
              // ignore
            }

            this.refreshWeatherInfo(countryInfo, { force: true });
          };

          weatherInfoEl.addEventListener('click', onWeatherActivate, true);
          weatherInfoEl.addEventListener('pointerdown', onWeatherActivate, true);
        }

        weatherContainer.addEventListener('click', () => {
          this.refreshWeatherInfo(countryInfo);
        });
      } catch (e) {
        // ignore
      }
      
      // 启动实时时钟
      if (showTime) {
        this.startRealtimeClock();
      } else {
        this.stopRealtimeClock();
      }
  },

  getAllCountriesList() {
    try {
      if (this._allCountriesCache) return this._allCountriesCache;
      const byCode = new Map();
      const byName = new Map();

      Object.values(this.countryCodeMap || {}).forEach((item) => {
        if (!item) return;
        if (item.isShared && Array.isArray(item.countries)) {
          item.countries.forEach((c) => {
            if (!c || !c.country) return;
            byCode.set(String(c.country).toUpperCase(), c);
            if (c.name) byName.set(String(c.name).trim(), c);
          });
          return;
        }
        if (item.country) {
          byCode.set(String(item.country).toUpperCase(), item);
          if (item.name) byName.set(String(item.name).trim(), item);
        }
      });

      this._allCountriesCache = { byCode, byName };
      return this._allCountriesCache;
    } catch (e) {
      return { byCode: new Map(), byName: new Map() };
    }
  },

  async openCountryOverridePrompt(countryInfo, options = {}) {
    try {
      if (!countryInfo) return;
      try {
        // 确保选择器/气泡等样式已注入（老样式已存在时也会补齐缺失片段）
        if (typeof this.addWeatherStyles === 'function') {
          this.addWeatherStyles();
        }
      } catch (e0) {
        // ignore
      }
      const phoneKey = countryInfo.phoneNumber || this.currentPhoneNumber || (() => {
        try {
          if (typeof this.tryGetWhatsAppNumber === 'function') {
            return this.tryGetWhatsAppNumber();
          }
        } catch (e) {
          // ignore
        }
        return null;
      })();
      if (!phoneKey) return;
      const { byCode } = this.getAllCountriesList();
      const list = Array.from(byCode.values()).filter(Boolean);

      const preferred = (options && Array.isArray(options.preferredCountries)) ? options.preferredCountries : [];

      this.openCountryPicker({
        title: '选择国家/地区',
        countries: list,
        preferredCountries: preferred,
        onSelect: async (selected) => {
          try {
            if (!selected) return;
            const correctionKey = phoneKey;
            const correctionValue = {
              country: selected.country,
              name: selected.name,
              timezone: selected.timezone,
              flag: selected.flag,
              prefix: countryInfo.prefix
            };

            this.userCorrections.set(correctionKey, correctionValue);
            await this.saveUserCorrections();

            const newCountryInfo = {
              ...correctionValue,
              phoneNumber: phoneKey,
              isUserCorrected: true
            };

            this.displayWeatherInfo(newCountryInfo);
          } catch (e2) {
            console.error('WeatherInfo: 手动修改国家失败:', e2);
          }
        }
      });
    } catch (e) {
      console.error('WeatherInfo: 手动修改国家失败:', e);
    }
  },

  getPinyinInitials(text) {
    try {
      const boundaries = '啊芭擦搭蛾发噶哈击喀垃妈拿哦啪期然撒塌挖昔压匝';
      const letters = 'ABCDEFGHJKLMNOPQRSTWXYZ';
      const pickInitial = (ch) => {
        try {
          for (let i = boundaries.length - 1; i >= 0; i--) {
            if (ch.localeCompare(boundaries[i], 'zh') >= 0) return letters[i];
          }
        } catch (e) {
          // ignore
        }
        return '';
      };

      const raw = String(text || '');
      let out = '';
      for (const ch of raw) {
        if (/^[A-Za-z0-9]$/.test(ch)) {
          out += ch.toLowerCase();
          continue;
        }
        if (/^[\u4e00-\u9fa5]$/.test(ch)) {
          const initial = pickInitial(ch);
          if (initial) out += initial.toLowerCase();
        }
      }
      return out;
    } catch (e) {
      return '';
    }
  },

  openCountryPicker({ title = '选择国家/地区', countries = [], preferredCountries = [], onSelect }) {
    try {
      if (this._countryPickerOverlay) {
        try { this._countryPickerOverlay.remove(); } catch (e) {}
        this._countryPickerOverlay = null;
      }

      const isDarkMode = (() => {
        try {
          if (document.body?.classList?.contains('dark')) return true;
          if (document.documentElement?.getAttribute('data-theme') === 'dark') return true;
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
        } catch (e) {
          // ignore
        }
        return false;
      })();

      const overlay = document.createElement('div');
      overlay.className = isDarkMode ? 'wa-country-picker-overlay wa-country-picker-dark' : 'wa-country-picker-overlay';
      overlay.innerHTML = `
        <div class="wa-country-picker-panel" role="dialog" aria-modal="true">
          <div class="wa-country-picker-header">
            <div class="wa-country-picker-title">${title}</div>
            <button class="wa-country-picker-close" type="button" aria-label="关闭">×</button>
          </div>
          <div class="wa-country-picker-search-wrap">
            <input class="wa-country-picker-search" type="text" placeholder="搜索：中文 / 国家代码 / 拼音首字母" />
          </div>
          <div class="wa-country-picker-list" role="listbox"></div>
        </div>
      `;

      const close = () => {
        try { overlay.remove(); } catch (e) {}
        if (this._countryPickerOverlay === overlay) this._countryPickerOverlay = null;
      };

      const closeBtn = overlay.querySelector('.wa-country-picker-close');
      if (closeBtn) closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      const input = overlay.querySelector('.wa-country-picker-search');
      const listEl = overlay.querySelector('.wa-country-picker-list');

      const allItems = (Array.isArray(countries) ? countries : [])
        .filter(Boolean)
        .map((c) => {
          const name = String(c.name || '').trim();
          const code = String(c.country || '').trim();
          const flag = String(c.flag || '🌍');
          const initials = this.getPinyinInitials(name);
          const searchText = `${name} ${code} ${code.toLowerCase()} ${initials}`.toLowerCase();
          return { ...c, _name: name, _code: code, _flag: flag, _initials: initials, _searchText: searchText };
        });

      const byCode = new Map();
      allItems.forEach((it) => {
        const code = String(it._code || '').toUpperCase();
        if (!code) return;
        if (!byCode.has(code)) byCode.set(code, it);
      });

      const preferredCodes = new Set(
        (Array.isArray(preferredCountries) ? preferredCountries : [])
          .filter(Boolean)
          .map((c) => String(c.country || c._code || '').toUpperCase())
          .filter(Boolean)
      );

      const preferredItems = Array.from(preferredCodes)
        .map((code) => byCode.get(code))
        .filter(Boolean);

      const normalItems = Array.from(byCode.values())
        .filter((it) => !preferredCodes.has(String(it._code || '').toUpperCase()))
        .sort((a, b) => (a._name || '').localeCompare((b._name || ''), 'zh'));

      const render = (query) => {
        try {
          const q = String(query || '').trim().toLowerCase();
          const baseList = q ? Array.from(byCode.values()) : [];
          const filtered = q
            ? baseList.filter((it) => (it._searchText || '').includes(q))
              .sort((a, b) => (a._name || '').localeCompare((b._name || ''), 'zh'))
            : [];

          if (!listEl) return;
          listEl.innerHTML = '';

          const frag = document.createDocumentFragment();

          const appendItem = (it) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wa-country-picker-item';
            btn.setAttribute('role', 'option');
            btn.innerHTML = `
              <span class="wa-country-picker-flag">${it._flag}</span>
              <span class="wa-country-picker-name">${it._name}</span>
              <span class="wa-country-picker-code">${it._code}</span>
            `;
            btn.addEventListener('click', async () => {
              try {
                close();
                if (typeof onSelect === 'function') {
                  await onSelect(it);
                }
              } catch (e) {
                console.error('WeatherInfo: 选择国家失败:', e);
              }
            });
            frag.appendChild(btn);
          };

          if (!q) {
            if (preferredItems.length > 0) {
              const group1 = document.createElement('div');
              group1.className = 'wa-country-picker-group-label';
              group1.textContent = '该区号常见国家/地区';
              frag.appendChild(group1);
              preferredItems.forEach(appendItem);

              const group2 = document.createElement('div');
              group2.className = 'wa-country-picker-group-label';
              group2.textContent = '全部国家/地区';
              frag.appendChild(group2);
            }
            normalItems.forEach(appendItem);
          } else {
            filtered.slice(0, 300).forEach(appendItem);
          }

          if (filtered.length > 300) {
            const hint = document.createElement('div');
            hint.className = 'wa-country-picker-more-hint';
            hint.textContent = '结果较多，请继续输入关键词缩小范围';
            frag.appendChild(hint);
          }

          if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'wa-country-picker-empty';
            empty.textContent = '未找到匹配的国家/地区';
            frag.appendChild(empty);
          }

          listEl.appendChild(frag);
        } catch (e) {
          // ignore
        }
      };

      if (input) {
        input.addEventListener('input', () => render(input.value));
      }

      document.body.appendChild(overlay);
      this._countryPickerOverlay = overlay;

      render('');
      try { input && input.focus(); } catch (e) {}
    } catch (e) {
      console.error('WeatherInfo: 打开国家选择器失败:', e);
    }
  },

  // 生成天气HTML片段
  generateWeatherHTML(weatherData) {
    return `
      <span class="weather-icon">${weatherData.icon}</span>
      <span class="temperature">${Math.round(weatherData.temperature)}°</span>
      <span class="weather-desc">${weatherData.description}</span>
      ${weatherData.humidity ? `<span class="humidity">💧${weatherData.humidity}</span>` : ''}
      ${weatherData.windSpeed ? `<span class="wind">💨${weatherData.windSpeed}</span>` : ''}
      ${weatherData.isDefault ? '<span class="default-indicator" title="默认天气数据">📊</span>' : ''}
    `;
  },

  // 更新天气显示（用于异步加载完成后更新）
  updateWeatherDisplay(weatherData) {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.updateWeatherDisplay) {
        return ui.updateWeatherDisplay(this, weatherData, {
          document: window.document,
          requestAnimationFrame: window.requestAnimationFrame
        });
      }
    } catch (e) {
      // ignore
    }
	
    if (!this.currentWeatherElement) {
      console.log('WeatherInfo: 没有找到当前天气元素，无法更新');
      return;
    }

    const weatherContainer = this.currentWeatherElement.querySelector('#weather-data-container');
    if (!weatherContainer) {
      console.log('WeatherInfo: 没有找到天气数据容器，无法更新');
      return;
    }

    // 更新天气信息内容
    weatherContainer.innerHTML = this.generateWeatherHTML(weatherData);
    
    // 添加淡入动画效果
    weatherContainer.style.opacity = '0';
    weatherContainer.style.transition = 'opacity 0.3s ease-in-out';
    
    // 使用requestAnimationFrame确保动画效果
    requestAnimationFrame(() => {
      weatherContainer.style.opacity = '1';
    });

    console.log('WeatherInfo: 天气信息已更新');
  },
  
  // 设置国家选择功能
  setupCountrySelection(container, countryInfo) {
    const trigger = container.querySelector('.country-confirm-chip');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      try {
        e.stopPropagation();
        const candidates = countryInfo?.sharedCountryData?.countries || [];
        const { byCode } = this.getAllCountriesList();
        const fullList = Array.from(byCode.values()).filter(Boolean);
        this.openCountryPicker({
          title: '选择国家/地区',
          countries: fullList,
          preferredCountries: candidates,
          onSelect: async (selectedCountry) => {
            try {
              if (!selectedCountry) return;
              const correctionKey = countryInfo.phoneNumber;
              const correctionValue = {
                ...selectedCountry,
                prefix: countryInfo.prefix
              };

              this.userCorrections.set(correctionKey, correctionValue);
              await this.saveUserCorrections();
              console.log('WeatherInfo: 用户选择国家:', selectedCountry.name);

              const newCountryInfo = {
                ...correctionValue,
                phoneNumber: countryInfo.phoneNumber,
                isUserCorrected: true
              };

              this.displayWeatherInfo(newCountryInfo);
            } catch (e2) {
              console.error('WeatherInfo: 保存国家选择失败:', e2);
            }
          }
        });
      } catch (e3) {
        // ignore
      }
    });
  },

  // 查找天气显示容器的位置
  findWeatherDisplayContainer() {
    // 尝试多个可能的位置
    const selectors = [
      'header[data-testid="conversation-header"]',
      '.chat-header',
      '#main header',
      '[data-testid="chat-header"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    // 如果找不到合适的位置，返回body作为备选
    return document.body;
  },

  // 添加天气信息样式
  addWeatherStyles() {
    try {
      const view = window.WAAP?.views?.weatherInfoView;
      if (view?.ensureStyles) {
        view.ensureStyles({ document: window.document });
        if (view.ensureFlagRenderMode) {
          view.ensureFlagRenderMode({ document: window.document });
        }
        return;
      }
    } catch (e) {
      // ignore
    }

    if (document.querySelector('#wa-weather-styles')) {
      return; // 样式已存在
    }

    // 极端兜底：如果 view 未加载，仅注入最小样式保证布局不崩
    try {
      const style = document.createElement('style');
      style.id = 'wa-weather-styles';
      style.textContent = `
        .wa-weather-info{display:inline-flex;align-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8696a0;margin:0 0 0 6px;padding:1px 4px;background:rgba(0,0,0,0.03);border-radius:6px;line-height:1.2;vertical-align:middle;flex-shrink:0;}
        .weather-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .country-info{display:flex;align-items:center;gap:4px;}
        .country-flag{font-size:14px;}
      `;
      document.head.appendChild(style);
    } catch (e2) {
      // ignore
    }
  },

  // 隐藏天气信息
  hideWeatherInfo() {
    try {
      const ui = window.WAAP?.services?.weatherUiService;
      if (ui?.hideWeatherInfo) {
        return ui.hideWeatherInfo(this, { clearInterval: window.clearInterval });
      }
    } catch (e) {
      // ignore
    }
	
    if (this.currentWeatherElement) {
      this.currentWeatherElement.remove();
      this.currentWeatherElement = null;
    }
    
    // 清理状态信息
    if (this.currentInfoElement) {
      this.currentInfoElement.remove();
      this.currentInfoElement = null;
    }
    
    // 重置状态
    this.currentStatus = 'idle';
    
    // 停止实时时钟
    this.stopRealtimeClock();
  },

  // 刷新天气信息
  async refreshWeatherInfo(countryInfo, options = {}) {
    console.log('WeatherInfo: 刷新天气信息');
    await this.displayWeatherInfo(countryInfo, options);
  },

  // API配置接口 (供用户配置天气API)
  setWeatherAPI(apiConfig) {
    this.weatherAPIConfig = apiConfig;
    console.log('WeatherInfo: 设置天气API配置:', apiConfig);
  },

  // 测试功能 (开发时使用)
  test(phoneNumber = '8613800138000') {
    console.log('WeatherInfo: 测试功能，使用号码:', phoneNumber);
    this.processPhoneNumber(phoneNumber);
  },
  
  // 尝试从WhatsApp页面获取当前聊天对象号码
  tryGetWhatsAppNumber() {
    if (!this.isChatWindowActive()) {
      return null;
    }

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.tryGetWhatsAppNumber) {
        const phoneText = svc.tryGetWhatsAppNumber(this, {
          document: window.document,
          XPathResult: window.XPathResult,
          onPhoneNumber: (v) => {
            try {
              if (typeof this.processPhoneNumber === 'function') {
                this.processPhoneNumber(v);
              }
            } catch (e) {
              // ignore
            }
          }
        });
        if (typeof phoneText === 'string' && phoneText.trim()) {
          return phoneText;
        }
      }
    } catch (e) {
      // ignore
    }

    return null;
  },
  
  // 备用获取方法
  tryBackupMethods() {
    if (!this.isChatWindowActive()) {
      return null;
    }

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.tryBackupMethods) {
        const v = svc.tryBackupMethods(this, {
          document: window.document,
          onPhoneNumber: (x) => {
            try {
              if (typeof this.processPhoneNumber === 'function') {
                this.processPhoneNumber(x);
              }
            } catch (e) {
              // ignore
            }
          }
        });
        if (typeof v === 'string' && v.trim()) {
          return v;
        }
      }
    } catch (e) {
      // ignore
    }

    return null;
  },

  // 从聊天记录的data-id属性中提取手机号码
  extractPhoneFromChatMessages() {
    if (!this.isChatWindowActive()) {
      return null;
    }

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.extractPhoneFromChatMessages) {
        const v = svc.extractPhoneFromChatMessages(this, {
          document: window.document,
          onPhoneNumber: (x) => {
            try {
              if (typeof this.processPhoneNumber === 'function') {
                this.processPhoneNumber(x);
              }
            } catch (e) {
              // ignore
            }
          }
        });
        if (typeof v === 'string' && v.trim()) {
          return v;
        }
      }
    } catch (e) {
      // ignore
    }

    return null;
  },

  // 从data-id字符串中解析手机号码
  parsePhoneFromDataId(dataId) {
    if (!dataId || typeof dataId !== 'string') {
      return null;
    }

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.parsePhoneFromDataId) {
        const v = svc.parsePhoneFromDataId(dataId);
        if (typeof v === 'string' && v.trim()) {
          return v;
        }
      }
    } catch (e) {
      // ignore
    }
    
    return null;
  },

  // 格式化手机号码，添加国际区号
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.formatPhoneNumber) {
        const v = svc.formatPhoneNumber(phoneNumber);
        if (typeof v === 'string' && v.trim()) {
          return v;
        }
      }
    } catch (e) {
      // ignore
    }
    
    return null;
  },
  
  // 搜索可能包含号码的相似元素
  searchForSimilarElements() {
    console.log('\n🔍 尝试搜索页面中可能包含号码的元素...');
    
    // 可能的选择器
    const possibleSelectors = [
      // 通用的号码相关选择器
      '[href^="tel:"]',
      '[href^="whatsapp://"]',
      'span:contains("+")',
      'div:contains("+")',
      // WhatsApp特定的可能选择器
      '[data-testid*="phone"]',
      '[data-testid*="number"]',
      '.copyable-text',
      '[title*="+"]'
    ];
    
    let foundElements = [];
    
    possibleSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`📋 找到 ${elements.length} 个匹配选择器 "${selector}" 的元素:`);
          elements.forEach((el, index) => {
            const text = (el.textContent || el.innerText || el.getAttribute('href') || '').trim();
            if (text && text.includes('+') && /\d/.test(text)) {
              console.log(`   ${index + 1}. ${text}`);
              foundElements.push({ selector, text, element: el });
            }
          });
        }
      } catch (e) {
        // 某些选择器可能不支持，忽略错误
      }
    });
    
    // 尝试查找包含数字和+号的所有文本
    console.log('\n🔍 搜索页面中所有包含+和数字的文本...');
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const text = node.textContent.trim();
          if (text.includes('+') && /\d{7,}/.test(text)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let textNode;
    let phoneTexts = [];
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent.trim();
      if (!phoneTexts.includes(text)) {
        phoneTexts.push(text);
        console.log(`📱 可能的号码文本: "${text}"`);
      }
    }
    
    if (foundElements.length === 0 && phoneTexts.length === 0) {
      console.log('❌ 未找到任何可能包含号码的元素');
    }
    
    return { foundElements, phoneTexts };
  },
  
  // 清理电话号码文本
  cleanPhoneNumber(text) {
    if (!text) return '';

    try {
      const svc = window.WAAP?.services?.weatherPhoneExtractService;
      if (svc?.cleanPhoneNumber) {
        const v = svc.cleanPhoneNumber(text);
        if (typeof v === 'string') {
          return v;
        }
      }
    } catch (e) {
      // ignore
    }
    
    return '';
  },

  // 批量测试共享区号功能
  testSharedCodes() {
    console.log('WeatherInfo: 开始测试共享区号功能...');
    
    // 测试用例
    const testCases = [
      // +1 区号测试
      { number: '14165551234', expected: 'CA', description: '+1 加拿大多伦多' },
      { number: '12125551234', expected: 'US', description: '+1 美国纽约 (需确认)' },
      { number: '12425551234', expected: 'BS', description: '+1 巴哈马 (需确认)' },
      
      // +7 区号测试  
      { number: '74951234567', expected: 'RU', description: '+7 俄罗斯莫斯科 (需确认)' },
      { number: '77011234567', expected: 'KZ', description: '+7 哈萨克斯坦阿拉木图' },
      { number: '76001234567', expected: 'KZ', description: '+7 哈萨克斯坦' },
      
      // +44 区号测试
      { number: '442012345678', expected: 'GB', description: '+44 英国伦敦 (需确认)' },
      { number: '441534123456', expected: 'JE', description: '+44 泽西岛' },
      { number: '441481123456', expected: 'GG', description: '+44 根西岛' },
      { number: '441624123456', expected: 'IM', description: '+44 马恩岛' },
      
      // 其他共享区号测试
      { number: '212123456789', expected: 'MA', description: '+212 摩洛哥 (需确认)' },
      { number: '262123456789', expected: 'RE', description: '+262 留尼汪 (需确认)' },
      { number: '590123456789', expected: 'GP', description: '+590 瓜德罗普 (需确认)' },
      { number: '599123456789', expected: 'CW', description: '+599 库拉索 (需确认)' }
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`\n--- 测试 ${index + 1}: ${testCase.description} ---`);
      const result = this.identifyCountry(testCase.number);
      
      if (result) {
        console.log(`识别结果: ${result.name} (${result.country})`);
        console.log(`是否需要确认: ${result.needsConfirmation ? '是' : '否'}`);
        console.log(`是否自动识别: ${result.isAutoDetected ? '是' : '否'}`);
        if (result.detectionMethod) {
          console.log(`识别方法: ${result.detectionMethod}`);
        }
        
        // 简单的验证
        const isCorrect = result.country === testCase.expected || 
                         (result.needsConfirmation && result.sharedCountryData?.countries.some(c => c.country === testCase.expected));
        console.log(`测试结果: ${isCorrect ? '✅ 通过' : '❌ 失败'}`);
      } else {
        console.log('❌ 无法识别号码');
      }
    });
    
    console.log('\n=== 共享区号测试完成 ===');
  },
  
  // 清除用户修正缓存 (开发/调试使用)
  clearUserCorrections() {
    this.userCorrections.clear();
    chrome.storage.local.remove(['weatherCountryCorrections']);
    console.log('WeatherInfo: 已清除所有用户修正记录');
  },



  // WhatsApp 标志注入提示功能
  createInjectionIndicator() {
    try {
      const svc = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (svc?.createInjectionIndicator) {
        const ok = svc.createInjectionIndicator(this, {
          document: window.document,
          XPathResult: window.XPathResult
        });
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  // 移除注入提示
  removeInjectionIndicator() {
    try {
      const svc = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (svc?.removeInjectionIndicator) {
        const ok = svc.removeInjectionIndicator(this);
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    try {
      this.injectionIndicator = null;
    } catch (e2) {
      // ignore
    }
  },

  // 初始化注入提示（带重试机制）
  initInjectionIndicator() {
    try {
      const svc = window.WAAP?.services?.weatherInjectionIndicatorService;
      if (svc?.initInjectionIndicator) {
        const ok = svc.initInjectionIndicator(this, {
          document: window.document,
          MutationObserver: window.MutationObserver,
          setTimeout: window.setTimeout,
          XPathResult: window.XPathResult
        });
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    return;
  },

  
  // 查看当前缓存状态 (开发/调试使用)
  viewCacheStatus() {
    console.log('WeatherInfo: 当前用户修正缓存:', Object.fromEntries(this.userCorrections));
    return {
      corrections: Object.fromEntries(this.userCorrections),
      totalCount: this.userCorrections.size
    };
  },
  
  // 清除用户修正缓存 (开发/调试使用)
  clearUserCorrections() {
    localStorage.removeItem(this.cacheKey);
    console.log('WeatherInfo: 用户修正缓存已清除');
  },
  
  // 手动触发天气信息功能
  manualTrigger: function() {
    console.log('🚀 手动触发天气信息功能...');
    
    // 重置状态
    this.currentStatus = 'idle';
    this.hideWeatherInfo();
    
    // 立即检查新聊天窗口
    this.checkForNewChatWindow();
    
    return true;
  },

  // 快速测试WhatsApp号码获取功能
  testWhatsAppExtraction() {
    console.log('=== WhatsApp号码提取测试 ===');
    console.log('🔍 正在搜索WhatsApp页面中的号码元素...\n');
    
    const result = this.tryGetWhatsAppNumber();
    
    if (result) {
      console.log(`\n✅ 成功获取到号码: ${result}`);
    } else {
      console.log('\n❌ 未能获取到有效的号码');
      console.log('💡 建议:');
      console.log('   1. 确保已在WhatsApp Web页面');
      console.log('   2. 尝试点击联系人头像进入详情页面');
      console.log('   3. 等待页面完全加载后再次尝试');
    }
    
    console.log('\n=== 测试完成 ===');
    return result;
  }
};

// 初始化功能
if (typeof window !== 'undefined') {
  try {
    const hasOrchestrator = !!window.WAAP?.presenters?.contentOrchestratorPresenter;
    if (!hasOrchestrator) {
    }
  } catch (e) {
  }
}

console.log('WeatherInfo: 天气信息模块已加载');

// 立即挂载到全局并提供测试函数
window.WeatherInfo = WeatherInfo;

// 确保全局对象可用
if (typeof window.WeatherInfo === 'undefined') {
  console.error('❌ WeatherInfo挂载失败！');
} else {
  console.log('✅ WeatherInfo已成功挂载到window对象');
}

// 提供全局快速测试函数
window.testWhatsApp = function() {
  console.log('=== WhatsApp号码提取测试 ===');
  console.log('🔍 正在搜索WhatsApp页面中的号码元素...\n');
  
  try {
    return WeatherInfo.testWhatsAppExtraction();
  } catch (error) {
    console.error('测试过程中出现错误:', error);
    console.log('💡 尝试直接调用核心功能...');
    return WeatherInfo.tryGetWhatsAppNumber();
  }
};

// 提供更直接的测试函数
window.getWhatsAppNumber = function() {
  return WeatherInfo.tryGetWhatsAppNumber();
};

// 提供全局手动触发函数
window.triggerWeatherInfo = function() {
  console.log('🚀 手动触发天气信息功能...');
  try {
    if (window.WeatherInfo && window.WeatherInfo.manualTrigger) {
      return window.WeatherInfo.manualTrigger();
    } else {
      return WeatherInfo.manualTrigger();
    }
  } catch (error) {
    console.error('❌ 手动触发失败:', error);
    return false;
  }
};

