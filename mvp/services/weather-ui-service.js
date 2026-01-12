/*
用途：天气模块 UI 编排 Service（MVP）。
说明：
- 从 legacy-weather-info.js 迁移 showStatus/insertStatus/DOM 选择/渲染插入/国家选择器/时钟等 UI 逻辑。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherUiService) return;

  function showStatus(owner, status, message = null, deps = {}) {
    try {
      if (!owner) return null;
      const documentRef = deps.document || window.document;

      const statusText = message || (owner.statusMessages && owner.statusMessages[status]) || '📊 状态未知';
      if (
        owner.currentStatus === status &&
        owner.currentInfoElement &&
        owner.currentInfoElement.textContent === statusText
      ) {
        return owner.currentInfoElement;
      }

      owner.currentStatus = status;
      try {
        console.log(`📊 天气信息状态: ${status} - ${statusText}`);
      } catch (e) {
        // ignore
      }

      // 如果已有元素，更新内容
      if (owner.currentInfoElement) {
        owner.currentInfoElement.textContent = statusText;
        owner.currentInfoElement.className = `weather-info-status status-${status}`;
        updateStatusStyle(owner, owner.currentInfoElement, status, { document: documentRef });
        return owner.currentInfoElement;
      }

      // 创建新的状态元素
      const statusElement = documentRef.createElement('div');
      statusElement.className = `weather-info-status status-${status}`;
      statusElement.textContent = statusText;
      updateStatusStyle(owner, statusElement, status, { document: documentRef });

      owner.currentInfoElement = statusElement;
      return statusElement;
    } catch (e) {
      return null;
    }
  }

  function getStatusColor(status) {
    const colors = {
      loading: '#f0f8ff',
      error: '#ffe6e6',
      'no-number': '#fff5e6',
      'no-contact': '#f5f5f5',
      success: '#e6ffe6',
      idle: '#f5f5f5'
    };
    return colors[status] || colors.idle;
  }

  function getStatusBorderColor(status) {
    const colors = {
      loading: '#4a90e2',
      error: '#e74c3c',
      'no-number': '#f39c12',
      'no-contact': '#95a5a6',
      success: '#27ae60',
      idle: '#bdc3c7'
    };
    return colors[status] || colors.idle;
  }

  function ensureAnimationStyles(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      if (documentRef.querySelector('#weather-status-animations')) return true;

      const style = documentRef.createElement('style');
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
      documentRef.head.appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateStatusStyle(owner, element, status, deps = {}) {
    try {
      if (!owner || !element) return false;

      element.style.cssText = `
        padding: 8px 12px;
        margin: 5px 0;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        background: ${getStatusColor(status)};
        color: ${status === 'loading' ? '#666' : '#333'};
        border: 1px solid ${getStatusBorderColor(status)};
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        max-width: 300px;
        word-wrap: break-word;
      `;

      if (status === 'loading') {
        element.style.animation = 'pulse 1.5s ease-in-out infinite';
        ensureAnimationStyles(deps);
      } else {
        element.style.animation = 'none';
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function getLoadingStatusText(owner) {
    try {
      if (!owner) return '🌍 正在加载信息...';
      if (owner.displaySettingsLoaded !== true) {
        return '🌍 正在加载信息...';
      }
      const showWeather = owner.displaySettings ? owner.displaySettings.showWeather !== false : true;
      const showTime = owner.displaySettings ? owner.displaySettings.showTime !== false : true;

      if (showWeather) return '🌤️ 正在获取天气信息...';
      if (showTime) return '⏰ 正在获取当地时间...';
      return '🌍 正在加载信息...';
    } catch (e) {
      return '🌍 正在加载信息...';
    }
  }

  function findPhoneNumberElement(deps = {}) {
    try {
      const documentRef = deps.document || window.document;

      // 尝试找到电话号码显示的元素
      const phoneSelectors = [
        '#main header span[title*="+"]',
        '#main header [data-testid="conversation-info-header-chat-subtitle"] span[title*="+"]',
        '#main header span[dir="auto"]:has-text("+"):not([class*="status"])',
        '#main header span:contains("+")',
        '#main header *[title*="+"]'
      ];

      for (const selector of phoneSelectors) {
        try {
          if (selector.includes(':contains') || selector.includes(':has-text')) {
            const allSpans = documentRef.querySelectorAll('#main header span');
            for (const span of allSpans) {
              const text = span.textContent || span.title || '';
              if (text.includes('+') && /\+\d+/.test(text)) {
                return span;
              }
            }
          } else {
            const element = documentRef.querySelector(selector);
            if (element) {
              const text = element.textContent || element.title || '';
              if (text.includes('+') && /\+\d+/.test(text)) {
                return element;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function findContactNameElement(deps = {}) {
    try {
      const documentRef = deps.document || window.document;

      const contactSelectors = [
        '#main header [data-testid="conversation-info-header-chat-subtitle"] span[dir="auto"]',
        '#main header span[dir="auto"]:not([class*="status"]):not([title*="+"])',
        '#main header div[data-testid="conversation-info-header-chat-subtitle"] > span',
        '#main header span:not([class*="status"]):not([title*="+"])',
        '#main header div[data-testid="conversation-info-header-chat-subtitle"] *'
      ];

      for (const selector of contactSelectors) {
        try {
          const elements = documentRef.querySelectorAll(selector);
          for (const element of elements) {
            const text = (element.textContent || '').trim();
            if (
              text &&
              !text.includes('+') &&
              !/^\d+$/.test(text) &&
              !text.includes('在线') &&
              !text.includes('最后') &&
              !text.includes('typing') &&
              text.length > 1
            ) {
              return element;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function findInsertionContainer(owner, deps = {}) {
    try {
      const documentRef = deps.document || window.document;

      const phoneElement = findPhoneNumberElement({ document: documentRef });
      if (!phoneElement) {
        const headerSelectors = [
          '#main header div[data-testid="conversation-info-header-chat-subtitle"]',
          '#main header',
          'header[data-testid="conversation-info-header"]'
        ];

        for (const selector of headerSelectors) {
          try {
            const element = documentRef.querySelector(selector);
            if (element) {
              return element;
            }
          } catch (e) {
            // ignore
          }
        }
        return null;
      }

      let container = phoneElement.parentElement;
      while (container && !(container.matches && container.matches('#main header div, #main header'))) {
        container = container.parentElement;
      }

      return container || null;
    } catch (e) {
      return null;
    }
  }

  function insertStatus(owner, container = null, deps = {}) {
    try {
      if (!owner) return false;
      const documentRef = deps.document || window.document;

      // 查找合适的插入位置
      const insertPosition = container || findInsertionContainer(owner, { document: documentRef });

      if (!insertPosition) {
        showStatus(owner, 'error', '❌ 未找到插入位置', { document: documentRef });
        return false;
      }

      const existingStatus = insertPosition.querySelector('.weather-info-status');
      if (existingStatus) {
        try {
          existingStatus.remove();
        } catch (e) {
          // ignore
        }
      }

      const statusElement = showStatus(owner, 'loading', getLoadingStatusText(owner), { document: documentRef });
      if (!statusElement) return false;
      insertPosition.appendChild(statusElement);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 获取当地时间
  function getLocalTime(timezone) {
    try {
      const now = new Date();
      const localTime = now
        .toLocaleString('zh-CN', {
          timeZone: timezone,
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        .replace(/(\d{4})\/(\d{2})\/(\d{2})\s/, '')
        .replace(/(\d{2})\/(\d{2})\s/, '$1月$2日 ');

      return {
        time: localTime,
        timezone: timezone
      };
    } catch (error) {
      try {
        console.error('WeatherInfo: 获取时间失败:', error);
      } catch (e) {
        // ignore
      }
      return {
        time: '无法获取',
        timezone: timezone
      };
    }
  }

  // 启动实时时钟
  function startRealtimeClock(owner, deps = {}) {
    try {
      if (!owner) return false;
      const documentRef = deps.document || window.document;
      const setIntervalRef = deps.setInterval || window.setInterval;
      const clearIntervalRef = deps.clearInterval || window.clearInterval;

      if (owner.clockInterval) {
        try {
          if (typeof clearIntervalRef === 'function') clearIntervalRef(owner.clockInterval);
        } catch (e) {
          // ignore
        }
      }

      if (typeof setIntervalRef !== 'function') return false;

      owner.clockInterval = setIntervalRef(() => {
        try {
          const timeElements = documentRef.querySelectorAll('.local-time[data-timezone]');
          timeElements.forEach((element) => {
            try {
              const tz = element.getAttribute('data-timezone');
              if (tz) {
                const timeData = getLocalTime(tz);
                element.textContent = timeData.time;
              }
            } catch (e2) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }
      }, 1000);

      return true;
    } catch (e) {
      return false;
    }
  }

  // 停止实时时钟
  function stopRealtimeClock(owner, deps = {}) {
    try {
      if (!owner) return false;
      const clearIntervalRef = deps.clearInterval || window.clearInterval;
      if (owner.clockInterval) {
        try {
          if (typeof clearIntervalRef === 'function') {
            clearIntervalRef(owner.clockInterval);
          } else {
            clearInterval(owner.clockInterval);
          }
        } catch (e) {
          // ignore
        }
        owner.clockInterval = null;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // 生成天气HTML片段
  function generateWeatherHTML(weatherData) {
    return `
      <span class="weather-icon">${weatherData.icon}</span>
      <span class="temperature">${Math.round(weatherData.temperature)}°</span>
      <span class="weather-desc">${weatherData.description}</span>
      ${weatherData.humidity ? `<span class="humidity">💧${weatherData.humidity}</span>` : ''}
      ${weatherData.windSpeed ? `<span class="wind">💨${weatherData.windSpeed}</span>` : ''}
      ${weatherData.isDefault ? '<span class="default-indicator" title="默认天气数据">📊</span>' : ''}
    `;
  }

  // 更新天气显示（用于异步加载完成后更新）
  function updateWeatherDisplay(owner, weatherData, deps = {}) {
    try {
      if (!owner || !owner.currentWeatherElement) {
        return false;
      }

      const documentRef = deps.document || window.document;

      const weatherContainer = owner.currentWeatherElement.querySelector('#weather-data-container');
      if (!weatherContainer) {
        return false;
      }

      weatherContainer.innerHTML = generateWeatherHTML(weatherData);

      weatherContainer.style.opacity = '0';
      weatherContainer.style.transition = 'opacity 0.3s ease-in-out';

      const raf = deps.requestAnimationFrame || window.requestAnimationFrame;
      if (typeof raf === 'function') {
        raf(() => {
          weatherContainer.style.opacity = '1';
        });
      } else {
        weatherContainer.style.opacity = '1';
      }

      void documentRef;
      return true;
    } catch (e) {
      return false;
    }
  }

  // 隐藏天气信息
  function hideWeatherInfo(owner, deps = {}) {
    try {
      if (!owner) return false;

      if (owner.currentWeatherElement) {
        try {
          owner.currentWeatherElement.remove();
        } catch (e) {
          // ignore
        }
        owner.currentWeatherElement = null;
      }

      if (owner.currentInfoElement) {
        try {
          owner.currentInfoElement.remove();
        } catch (e) {
          // ignore
        }
        owner.currentInfoElement = null;
      }

      owner.currentStatus = 'idle';
      stopRealtimeClock(owner, deps);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 创建天气显示组件
  function createWeatherDisplay(owner, countryInfo, weatherData, timeData, deps = {}) {
    try {
      if (!owner || !countryInfo) return false;

      const documentRef = deps.document || window.document;

      hideWeatherInfo(owner, { document: documentRef, clearInterval: deps.clearInterval || window.clearInterval });

      const insertionContainer = findInsertionContainer(owner, { document: documentRef });
      if (!insertionContainer) {
        return false;
      }

      const weatherContainer = documentRef.createElement('div');
      weatherContainer.className = 'wa-weather-info';

      const allowCountryOverride = owner.displaySettings && owner.displaySettings.allowCountryOverride === true;
      const showWeather = owner.displaySettings ? owner.displaySettings.showWeather !== false : true;
      const showTime = owner.displaySettings ? owner.displaySettings.showTime !== false : true;

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
              document: documentRef,
              generateWeatherHTML: (d) => generateWeatherHTML(d)
            }
          );
        } else {
          weatherContainer.innerHTML = `<div class="weather-inline"><span class="country-info"><span class="country-name">${countryInfo.name}</span></span></div>`;
        }
      } catch (e) {
        // ignore
      }

      try {
        const view = window.WAAP?.views?.weatherInfoView;
        if (view?.ensureStyles) {
          view.ensureStyles({ document: documentRef });
          view.ensureFlagRenderMode?.({ document: documentRef });
        }
      } catch (e) {
        // ignore
      }

      const phoneElement = findPhoneNumberElement({ document: documentRef });
      if (phoneElement) {
        phoneElement.insertAdjacentElement('afterend', weatherContainer);
      } else {
        const contactElement = findContactNameElement({ document: documentRef });
        if (contactElement) {
          contactElement.insertAdjacentElement('afterend', weatherContainer);
        } else {
          insertionContainer.appendChild(weatherContainer);
        }
      }

      owner.currentWeatherElement = weatherContainer;

      // 交互：点国旗/国家名 -> 选国家；点天气 -> 强制刷新；点空白 -> 普通刷新
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
              let latestAllowOverride = owner.displaySettings && owner.displaySettings.allowCountryOverride === true;
              const chromeRef = deps.chrome || window.chrome;
              if (chromeRef?.storage?.sync?.get) {
                const allowFromStore = await new Promise((resolve) => {
                  try {
                    chromeRef.storage.sync.get(['weatherAllowCountryOverride'], (data) => {
                      try {
                        if (chromeRef.runtime?.lastError) return resolve(null);
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
                if (typeof owner.openCountryOverridePrompt === 'function') {
                  if (Array.isArray(candidates) && candidates.length > 0) {
                    owner.openCountryOverridePrompt(countryInfo, { preferredCountries: candidates });
                  } else {
                    owner.openCountryOverridePrompt(countryInfo);
                  }
                  return;
                }
              }
            } catch (e1) {
              // ignore
            }

            try {
              if (typeof owner.refreshWeatherInfo === 'function') {
                owner.refreshWeatherInfo(countryInfo);
              }
            } catch (e2) {
              // ignore
            }
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
              const autoRenew = owner.displaySettings && owner.displaySettings.cacheAutoRenew !== false;
              if (autoRenew) {
                const view = window.WAAP?.views?.weatherInfoView;
                if (view?.confirmForceRefresh) {
                  const ok = await view.confirmForceRefresh(weatherInfoEl, { document: documentRef });
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
                view.setWeatherLoading(weatherContainer, { document: documentRef });
              }
            } catch (e4) {
              // ignore
            }

            try {
              if (typeof owner.refreshWeatherInfo === 'function') {
                owner.refreshWeatherInfo(countryInfo, { force: true });
              }
            } catch (e5) {
              // ignore
            }
          };

          weatherInfoEl.addEventListener('click', onWeatherActivate, true);
          weatherInfoEl.addEventListener('pointerdown', onWeatherActivate, true);
        }

        weatherContainer.addEventListener('click', () => {
          try {
            if (typeof owner.refreshWeatherInfo === 'function') {
              owner.refreshWeatherInfo(countryInfo);
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      if (showTime) {
        startRealtimeClock(owner, { document: documentRef, setInterval: deps.setInterval || window.setInterval, clearInterval: deps.clearInterval || window.clearInterval });
      } else {
        stopRealtimeClock(owner, { clearInterval: deps.clearInterval || window.clearInterval });
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function getPinyinInitials(text) {
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
  }

  function getAllCountriesList(owner) {
    try {
      if (!owner) return { byCode: new Map(), byName: new Map() };
      if (owner._allCountriesCache) return owner._allCountriesCache;
      const byCode = new Map();
      const byName = new Map();

      Object.values(owner.countryCodeMap || {}).forEach((item) => {
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

      owner._allCountriesCache = { byCode, byName };
      return owner._allCountriesCache;
    } catch (e) {
      return { byCode: new Map(), byName: new Map() };
    }
  }

  function openCountryPicker(owner, { title = '选择国家/地区', countries = [], preferredCountries = [], onSelect }, deps = {}) {
    try {
      if (!owner) return false;
      const documentRef = deps.document || window.document;

      if (owner._countryPickerOverlay) {
        try {
          owner._countryPickerOverlay.remove();
        } catch (e) {}
        owner._countryPickerOverlay = null;
      }

      const isDarkMode = (() => {
        try {
          if (documentRef.body?.classList?.contains('dark')) return true;
          if (documentRef.documentElement?.getAttribute('data-theme') === 'dark') return true;
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
        } catch (e) {
          // ignore
        }
        return false;
      })();

      const overlay = documentRef.createElement('div');
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
        try {
          overlay.remove();
        } catch (e) {}
        if (owner._countryPickerOverlay === overlay) owner._countryPickerOverlay = null;
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
          const initials = getPinyinInitials(name);
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
        .sort((a, b) => (a._name || '').localeCompare(b._name || '', 'zh'));

      const render = (query) => {
        try {
          const q = String(query || '').trim().toLowerCase();
          const baseList = q ? Array.from(byCode.values()) : [];
          const filtered = q
            ? baseList
                .filter((it) => (it._searchText || '').includes(q))
                .sort((a, b) => (a._name || '').localeCompare((b._name || ''), 'zh'))
            : [];

          if (!listEl) return;
          listEl.innerHTML = '';

          const frag = documentRef.createDocumentFragment();

          const appendItem = (it) => {
            const btn = documentRef.createElement('button');
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
                try {
                  console.error('WeatherInfo: 选择国家失败:', e);
                } catch (e2) {
                  // ignore
                }
              }
            });
            frag.appendChild(btn);
          };

          if (!q) {
            if (preferredItems.length > 0) {
              const group1 = documentRef.createElement('div');
              group1.className = 'wa-country-picker-group-label';
              group1.textContent = '该区号常见国家/地区';
              frag.appendChild(group1);
              preferredItems.forEach(appendItem);

              const group2 = documentRef.createElement('div');
              group2.className = 'wa-country-picker-group-label';
              group2.textContent = '全部国家/地区';
              frag.appendChild(group2);
            }
            normalItems.forEach(appendItem);
          } else {
            filtered.slice(0, 300).forEach(appendItem);
          }

          if (filtered.length > 300) {
            const hint = documentRef.createElement('div');
            hint.className = 'wa-country-picker-more-hint';
            hint.textContent = '结果较多，请继续输入关键词缩小范围';
            frag.appendChild(hint);
          }

          if (q && filtered.length === 0) {
            const empty = documentRef.createElement('div');
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

      (documentRef.body || documentRef.documentElement).appendChild(overlay);
      owner._countryPickerOverlay = overlay;

      render('');
      try {
        input && input.focus();
      } catch (e) {}

      return true;
    } catch (e) {
      try {
        console.error('WeatherInfo: 打开国家选择器失败:', e);
      } catch (e2) {
        // ignore
      }
      return false;
    }
  }

  async function openCountryOverridePrompt(owner, countryInfo, options = {}, deps = {}) {
    try {
      if (!owner || !countryInfo) return false;
      const chromeRef = deps.chrome || window.chrome;

      const phoneKey = countryInfo.phoneNumber || owner.currentPhoneNumber || (() => {
        try {
          if (typeof owner.tryGetWhatsAppNumber === 'function') {
            return owner.tryGetWhatsAppNumber();
          }
        } catch (e) {
          // ignore
        }
        return null;
      })();

      if (!phoneKey) return false;

      const { byCode } = getAllCountriesList(owner);
      const list = Array.from(byCode.values()).filter(Boolean);

      const preferred = options && Array.isArray(options.preferredCountries) ? options.preferredCountries : [];

      openCountryPicker(
        owner,
        {
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

              owner.userCorrections.set(correctionKey, correctionValue);
              try {
                await owner.saveUserCorrections?.();
              } catch (e3) {
                // ignore
              }

              const newCountryInfo = {
                ...correctionValue,
                phoneNumber: phoneKey,
                isUserCorrected: true
              };

              try {
                owner.displayWeatherInfo?.(newCountryInfo);
              } catch (e4) {
                // ignore
              }
            } catch (e2) {
              try {
                console.error('WeatherInfo: 手动修改国家失败:', e2);
              } catch (e3) {
                // ignore
              }
            }
          }
        },
        { document: deps.document || window.document, chrome: chromeRef }
      );

      return true;
    } catch (e) {
      try {
        console.error('WeatherInfo: 手动修改国家失败:', e);
      } catch (e2) {
        // ignore
      }
      return false;
    }
  }

  window.WAAP.services.weatherUiService = {
    showStatus,
    insertStatus,
    getLoadingStatusText,
    hideWeatherInfo,
    createWeatherDisplay,
    updateWeatherDisplay,
    generateWeatherHTML,
    getLocalTime,
    startRealtimeClock,
    stopRealtimeClock,
    findInsertionContainer,
    openCountryOverridePrompt,
    openCountryPicker,
    getAllCountriesList
  };
})();
