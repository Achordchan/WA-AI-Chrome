/*
用途：设置模块 Presenter（负责设置弹窗的交互、读取/保存配置、隐私记录导入导出、管理员预设等编排逻辑）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.settingsPresenter) return;

  async function open(deps = {}) {
    try {
      const view = window.WAAP?.views?.settingsView;
      if (!view) return false;

      try {
        view.ensureStyles?.();
      } catch (e) {
        // ignore
      }

      const created = view.createModal?.();
      const modal = created?.modal;
      const content = created?.content;
      if (!modal || !content) return false;

      try {
        const existing = document.getElementById('settings-modal');
        if (existing) existing.remove();
      } catch (e) {
        // ignore
      }

      try {
        // 自愈：极端情况下遮罩/弹窗残留会导致页面像“卡死”一样无法交互
        document.querySelectorAll('.admin-preset-overlay')?.forEach?.((el) => {
          try {
            el.remove?.();
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      try {
        // 自愈：如果历史版本遗留了没有 id 的 settings-modal（只靠 class），也顺手清掉
        document.querySelectorAll('.settings-modal')?.forEach?.((el) => {
          try {
            const id = String(el?.id || '');
            if (id === 'settings-modal') return;
            el.remove?.();
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      document.body.appendChild(modal);

      let settingsDirty = false;
      let settingsLoading = true;

      const showToast = deps.showToast || window.showToast;
      const showExtensionInvalidatedError = deps.showExtensionInvalidatedError || window.showExtensionInvalidatedError;

      const tabButtons = content.querySelectorAll('.settings-tab');
      const panels = content.querySelectorAll('.settings-tab-panel');
      const setActiveTab = (tabName) => {
        try {
          tabButtons.forEach((btn) => {
            const isActive = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });
          panels.forEach((panel) => {
            const isActive = panel.getAttribute('data-tab-panel') === tabName;
            panel.classList.toggle('is-active', isActive);
            panel.style.display = isActive ? 'block' : 'none';
          });
        } catch (e) {
          // ignore
        }
      };

      const setActivePrivacySubTab = (tabName) => {
        try {
          const name = String(tabName || 'records');
          privacySubTabButtons.forEach((btn) => {
            const isActive = btn.getAttribute('data-privacy-tab') === name;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });
          privacySubPanels.forEach((panel) => {
            const isActive = panel.getAttribute('data-privacy-panel') === name;
            panel.classList.toggle('is-active', isActive);
            panel.style.display = isActive ? 'block' : 'none';
          });
        } catch (e) {
          // ignore
        }
      };

      const formatTime = (ts) => {
        try {
          const d = new Date(ts);
          if (Number.isNaN(d.getTime())) return '-';
          return d.toLocaleString();
        } catch (e) {
          return '-';
        }
      };

      const readWeatherCacheMinutes = async () => {
        try {
          if (!chrome?.storage?.sync) return 60;
          const res = await chrome.storage.sync.get(['weatherCacheMinutes']);
          let m = parseInt(String(res?.weatherCacheMinutes ?? ''), 10);
          if (!Number.isFinite(m) || m <= 0) m = 60;
          if (m > 10080) m = 10080;
          return m;
        } catch (e) {
          return 60;
        }
      };

      const loadWeatherCacheView = async () => {
        try {
          if (!weatherCacheBody) return;
          weatherCacheBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载中...</td></tr>';

          const ttlMinutes = await readWeatherCacheMinutes();
          const ttlMs = ttlMinutes * 60 * 1000;
          try {
            if (weatherCacheTtlLabel) weatherCacheTtlLabel.textContent = `${ttlMinutes} 分钟`;
          } catch (e) {
            // ignore
          }

          let autoRenewEnabled = true;
          try {
            autoRenewEnabled = await (async () => {
              if (!chrome?.storage?.sync) return true;
              const res = await chrome.storage.sync.get(['weatherCacheAutoRenew']);
              return res?.weatherCacheAutoRenew !== false;
            })();
            if (weatherAutoRenewStatusLabel) weatherAutoRenewStatusLabel.textContent = autoRenewEnabled ? '开启' : '关闭';
          } catch (e) {
            autoRenewEnabled = true;
            if (weatherAutoRenewStatusLabel) weatherAutoRenewStatusLabel.textContent = '-';
          }

          let evictDays = 10;
          try {
            if (chrome?.storage?.sync) {
              const res = await chrome.storage.sync.get(['weatherAutoRenewEvictDays']);
              let d = parseInt(String(res?.weatherAutoRenewEvictDays ?? ''), 10);
              if (!Number.isFinite(d) || d < 0) d = 10;
              if (d > 365) d = 365;
              evictDays = d;
            }
          } catch (e) {
            evictDays = 10;
          }
          try {
            if (weatherAutoRenewEvictDaysLabel) {
              weatherAutoRenewEvictDaysLabel.textContent = `${evictDays} 天`;
            }
          } catch (e) {
            // ignore
          }

          try {
            const w = window.WeatherInfo;
            const nextAt = w && typeof w.getWeatherAutoRenewNextRunAt === 'function' ? w.getWeatherAutoRenewNextRunAt() : 0;
            if (weatherAutoRenewNextAtLabel) {
              weatherAutoRenewNextAtLabel.textContent = nextAt ? formatTime(nextAt) : '-';
            }
          } catch (e) {
            if (weatherAutoRenewNextAtLabel) weatherAutoRenewNextAtLabel.textContent = '-';
          }

          let store = {};
          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['waapWeatherDataCacheV1']);
              const raw = res ? res.waapWeatherDataCacheV1 : null;
              if (raw && typeof raw === 'object') store = raw;
            }
          } catch (e) {
            store = {};
          }

          try {
            if (weatherCacheCountLabel) {
              weatherCacheCountLabel.textContent = String(Object.keys(store || {}).length);
            }
          } catch (e) {
            // ignore
          }

          const rows = Object.keys(store || {})
            .map((key) => {
              const entry = store[key];
              const time = entry && typeof entry.time === 'number' ? entry.time : 0;
              const expiresAt = time ? time + ttlMs : 0;
              return { key, time, expiresAt, entry };
            })
            .filter((x) => !!x.key)
            .sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));

          if (rows.length === 0) {
            weatherCacheBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">暂无缓存</td></tr>';
            return;
          }

          const frag = document.createDocumentFragment();
          rows.forEach((r) => {
            const tr = document.createElement('tr');

            const countryTd = document.createElement('td');
            const t0 = String(r.key || '');
            const parts = t0.split('|');
            const code = parts[0] ? parts[0] : '';
            const name = parts[1] ? parts[1] : '';
            const label = [name, code ? `(${code})` : ''].filter(Boolean).join(' ');
            countryTd.textContent = label || t0;

            const expiresTd = document.createElement('td');
            expiresTd.textContent = r.expiresAt ? formatTime(r.expiresAt) : '-';

            const renewTd = document.createElement('td');
            try {
              if (!autoRenewEnabled) {
                renewTd.textContent = '不续期';
              } else if (!Number.isFinite(evictDays) || evictDays <= 0) {
                renewTd.textContent = '正常';
              } else {
                const lastSeenAt = (r.entry && typeof r.entry.lastSeenAt === 'number')
                  ? r.entry.lastSeenAt
                  : (r.time || 0);
                if (!lastSeenAt) {
                  renewTd.textContent = '正常';
                } else {
                  const dayMs = 24 * 60 * 60 * 1000;
                  const now = Date.now();
                  const daysSince = Math.floor(Math.max(0, now - lastSeenAt) / dayMs);
                  const left = evictDays - daysSince;
                  if (left <= 2) {
                    renewTd.textContent = left <= 0 ? '即将停止' : `即将停止（剩 ${left} 天）`;
                  } else {
                    renewTd.textContent = '正常';
                  }
                }
              }
            } catch (e) {
              renewTd.textContent = '-';
            }

            const actionTd = document.createElement('td');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'privacy-row-btn';
            btn.textContent = '重置';
            btn.setAttribute('data-cache-key', r.key);
            actionTd.appendChild(btn);

            tr.appendChild(countryTd);
            tr.appendChild(expiresTd);
            tr.appendChild(renewTd);
            tr.appendChild(actionTd);
            frag.appendChild(tr);
          });

          weatherCacheBody.innerHTML = '';
          weatherCacheBody.appendChild(frag);
        } catch (e) {
          try {
            if (weatherCacheBody) {
              weatherCacheBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载失败</td></tr>';
            }
          } catch (e2) {
            // ignore
          }

          try {
            if (weatherCacheCountLabel) weatherCacheCountLabel.textContent = '-';
          } catch (e3) {
            // ignore
          }
        }
      };

      const resetWeatherCacheKey = async (cacheKey) => {
        try {
          const k = String(cacheKey || '');
          if (!k) return;
          const ok = window.confirm('确定要重置该天气缓存吗？');
          if (!ok) return;

          try {
            const w = window.WeatherInfo;
            if (w && typeof w.setPersistedWeatherCacheEntry === 'function') {
              w.setPersistedWeatherCacheEntry(k, null);
            }
            if (w && w.weatherCache && typeof w.weatherCache.delete === 'function') {
              w.weatherCache.delete(k);
            }
          } catch (e) {
            // ignore
          }

          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['waapWeatherDataCacheV1']);
              const raw = res ? res.waapWeatherDataCacheV1 : null;
              const next = raw && typeof raw === 'object' ? { ...raw } : {};
              delete next[k];
              await chrome.storage.local.set({ waapWeatherDataCacheV1: next });
            }
          } catch (e) {
            // ignore
          }

          await loadWeatherCacheView();
          try {
            if (typeof showToast === 'function') showToast('已重置该缓存', 'success');
          } catch (e) {
            // ignore
          }
        } catch (e) {
          try {
            if (typeof showToast === 'function') showToast('重置失败', 'error');
          } catch (e2) {
            // ignore
          }
        }
      };

      const resetAllWeatherData = async () => {
        const ok1 = window.confirm('这将清空天气国家记录与天气缓存。此操作不可恢复，确定继续吗？');
        if (!ok1) return;
        const ok2 = window.confirm('再次确认：真的要清空天气相关数据吗？');
        if (!ok2) return;

        try {
          if (chrome?.storage?.local) {
            await chrome.storage.local.remove(['weatherCountryCorrections', 'weatherCountryResolved', 'waapWeatherDataCacheV1']);
          }
        } catch (e) {
          // ignore
        }

        try {
          const w = window.WeatherInfo;
          if (w && w.userCorrections && typeof w.userCorrections.clear === 'function') w.userCorrections.clear();
          if (w && w.resolvedCountries && typeof w.resolvedCountries.clear === 'function') w.resolvedCountries.clear();
          if (w && w.weatherCache && typeof w.weatherCache.clear === 'function') w.weatherCache.clear();
          if (w && typeof w.setPersistedWeatherCacheEntry === 'function') {
          }
          if (w && typeof w.ensureWeatherCacheLoaded === 'function') {
          }
          if (w && typeof w._weatherCacheLoaded !== 'undefined') {
            w._weatherCacheLoaded = false;
          }
          if (w && typeof w._weatherCacheStore !== 'undefined') {
            w._weatherCacheStore = null;
          }
        } catch (e) {
          // ignore
        }

        try {
          await loadPrivacyRecords();
        } catch (e) {
          // ignore
        }
        await loadWeatherCacheView();

        try {
          if (typeof showToast === 'function') showToast('已重置天气数据', 'success');
        } catch (e) {
          // ignore
        }
      };

      try {
        tabButtons.forEach((btn) => {
          btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            if (!tabName) return;
            setActiveTab(tabName);
          });
        });
        setActiveTab('translation');
      } catch (e) {
        // ignore
      }

      const privacyBody = content.querySelector('#privacyRecordsBody');
      const privacyRefreshBtn = content.querySelector('#privacyRefreshBtn');
      const privacyExportBtn = content.querySelector('#privacyExportBtn');
      const privacyImportBtn = content.querySelector('#privacyImportBtn');
      const privacyClearAllBtn = content.querySelector('#privacyClearAllBtn');
      const privacyImportFile = content.querySelector('#privacyImportFile');

      const privacySubTabButtons = content.querySelectorAll('.privacy-subtab');
      const privacySubPanels = content.querySelectorAll('.privacy-subpanel');
      const weatherCacheBody = content.querySelector('#weatherCacheBody');
      const weatherCacheTtlLabel = content.querySelector('#weatherCacheTtlLabel');
      const weatherCacheCountLabel = content.querySelector('#weatherCacheCountLabel');
      const weatherAutoRenewStatusLabel = content.querySelector('#weatherAutoRenewStatusLabel');
      const weatherAutoRenewEvictDaysLabel = content.querySelector('#weatherAutoRenewEvictDaysLabel');
      const weatherAutoRenewNextAtLabel = content.querySelector('#weatherAutoRenewNextAtLabel');
      const weatherCacheRefreshBtn = content.querySelector('#weatherCacheRefreshBtn');
      const weatherCacheRenewNowBtn = content.querySelector('#weatherCacheRenewNowBtn');
      const weatherCacheResetBtn = content.querySelector('#weatherCacheResetBtn');

      const privacyService = window.WAAP?.services?.privacyRecordsService;

      const safeJsonParse = (raw, fallback) => {
        try {
          if (!raw) return fallback;
          return JSON.parse(raw);
        } catch (e) {
          return fallback;
        }
      };

      const normalizePhoneKey = (k) => {
        const raw = String(k || '');
        if (raw.startsWith('phone:')) return raw.replace(/^phone:/, '').replace(/[^\d]/g, '');
        return raw.replace(/[^\d]/g, '');
      };

      const langLabel = (code) => {
        const raw = String(code || '').trim();
        if (!raw) return '暂无数据';
        const c0 = raw.toLowerCase();
        const c = (c0.includes('-') ? c0.split('-')[0] : c0) || c0;
        const map = {
          zh: '中文',
          en: '英文',
          ja: '日文',
          ko: '韩文',
          fr: '法语',
          de: '德语',
          es: '西班牙语',
          it: '意大利语',
          pt: '葡萄牙语',
          ru: '俄语',
          ar: '阿拉伯语',
          tr: '土耳其语',
          vi: '越南语',
          th: '泰语',
          id: '印尼语',
          ms: '马来语',
          nl: '荷兰语',
          sv: '瑞典语',
          no: '挪威语',
          da: '丹麦语',
          fi: '芬兰语',
          pl: '波兰语',
          cs: '捷克语',
          hu: '匈牙利语',
          ro: '罗马尼亚语',
          el: '希腊语',
          uk: '乌克兰语',
          fa: '波斯语',
          ur: '乌尔都语',
          hi: '印地语',
          bn: '孟加拉语',
          ta: '泰米尔语',
          te: '泰卢固语',
          ml: '马拉雅拉姆语',
          mr: '马拉地语',
          gu: '古吉拉特语',
          pa: '旁遮普语',
          sw: '斯瓦希里语',
          he: '希伯来语',
          iw: '希伯来语'
        };
        if (map[c]) return map[c];
        if (c0 === 'zh-cn' || c0 === 'zh-hans') return '中文';
        if (c0 === 'zh-tw' || c0 === 'zh-hant') return '中文（繁体）';
        return raw;
      };

      const buildCountryLabel = (item) => {
        try {
          if (!item) return '暂无数据';
          const flag = item.flag ? String(item.flag) : '';
          const name = item.name ? String(item.name) : '';
          const code = item.country ? String(item.country) : '';
          const parts = [];
          if (flag) parts.push(flag);
          if (name) parts.push(name);
          if (code) parts.push(code);
          return parts.join(' ');
        } catch (e) {
          return '暂无数据';
        }
      };

      const renderPrivacyRows = (records) => {
        try {
          if (!privacyBody) return;
          const list = Array.isArray(records) ? records : [];
          if (list.length === 0) {
            privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">暂无记录</td></tr>';
            return;
          }

          privacyBody.innerHTML = '';
          const frag = document.createDocumentFragment();
          list.forEach((r) => {
            const tr = document.createElement('tr');
            const phoneTd = document.createElement('td');
            const countryTd = document.createElement('td');
            const langTd = document.createElement('td');
            const actionTd = document.createElement('td');
            phoneTd.textContent = r.phone || '';
            countryTd.textContent = r.countryLabel || '暂无数据';
            langTd.textContent = r.langLabel || '暂无数据';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'privacy-row-btn';
            btn.textContent = '重置';
            btn.setAttribute('data-phone', r.phone || '');
            actionTd.appendChild(btn);

            tr.appendChild(phoneTd);
            tr.appendChild(countryTd);
            tr.appendChild(langTd);
            tr.appendChild(actionTd);
            frag.appendChild(tr);
          });
          privacyBody.appendChild(frag);
        } catch (e) {
          // ignore
        }
      };

      const loadPrivacyRecords = async () => {
        try {
          if (!privacyBody) return;
          privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载中...</td></tr>';

          try {
            if (privacyService?.getPrivacyRows) {
              const rows = await privacyService.getPrivacyRows();
              renderPrivacyRows(rows);
              return;
            }
          } catch (e) {
            // ignore
          }

          let weatherCorrections = {};
          let weatherResolved = {};
          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
              weatherCorrections = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
              weatherResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
            }
          } catch (e) {
            weatherCorrections = {};
            weatherResolved = {};
          }

          const langPrefsRaw = (() => {
            try {
              return localStorage.getItem('chatLanguagePreferences');
            } catch (e) {
              return null;
            }
          })();
          const langPrefs = safeJsonParse(langPrefsRaw, {});

          const numbers = new Set();
          Object.keys(weatherCorrections || {}).forEach((k) => {
            const n = normalizePhoneKey(k);
            if (n) numbers.add(n);
          });
          Object.keys(weatherResolved || {}).forEach((k) => {
            const n = normalizePhoneKey(k);
            if (n) numbers.add(n);
          });
          Object.keys(langPrefs || {}).forEach((k) => {
            const n = normalizePhoneKey(k);
            if (n) numbers.add(n);
          });

          const list = Array.from(numbers)
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)));

          try {
            const w = window.WeatherInfo;
            if (w && typeof w.identifyCountry === 'function' && chrome?.storage?.local) {
              const updates = {};
              let count = 0;
              for (const phone of list) {
                if (count >= 200) break;
                const hasManual = !!(weatherCorrections && (weatherCorrections[phone] || weatherCorrections[String(phone)]));
                const hasResolved = !!(weatherResolved && (weatherResolved[phone] || weatherResolved[String(phone)]));
                if (hasManual || hasResolved) continue;

                const info = w.identifyCountry(String(phone));
                if (!info || !info.country || !info.timezone) continue;
                updates[String(phone)] = {
                  country: info.country,
                  name: info.name,
                  timezone: info.timezone,
                  flag: info.flag,
                  prefix: info.prefix,
                  needsConfirmation: info.needsConfirmation === true,
                  isAutoDetected: info.isAutoDetected === true,
                  detectionMethod: info.detectionMethod,
                  resolvedAt: Date.now()
                };
                count += 1;
              }

              if (Object.keys(updates).length > 0) {
                const mergedResolved = { ...(weatherResolved || {}), ...updates };
                await chrome.storage.local.set({ weatherCountryResolved: mergedResolved });
                weatherResolved = mergedResolved;

                try {
                  if (w.resolvedCountries && typeof w.resolvedCountries.set === 'function') {
                    Object.keys(updates).forEach((k) => {
                      w.resolvedCountries.set(k, updates[k]);
                    });
                  }
                } catch (e2) {
                  // ignore
                }
              }
            }
          } catch (e) {
            // ignore
          }

          const rows = list.map((phone) => {
            const correction = weatherCorrections && (weatherCorrections[phone] || weatherCorrections[String(phone)]);
            const resolved = weatherResolved && (weatherResolved[phone] || weatherResolved[String(phone)]);

            let lang = null;
            if (langPrefs) {
              lang = langPrefs[`phone:${phone}`] || null;
            }

            return {
              phone,
              countryLabel: buildCountryLabel(correction || resolved),
              langLabel: lang ? langLabel(lang) : '暂无数据'
            };
          });

          renderPrivacyRows(rows);
        } catch (e) {
          try {
            if (privacyBody) privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载失败</td></tr>';
          } catch (e2) {
            // ignore
          }
        }
      };

      const exportPrivacyConfig = async () => {
        try {
          try {
            if (privacyService?.exportConfig) {
              const exported = await privacyService.exportConfig();
              const blob = new Blob([exported.jsonText], { type: 'application/json;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = exported.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              try {
                if (typeof showToast === 'function') showToast('已导出配置', 'success');
              } catch (e) {
                // ignore
              }
              return;
            }
          } catch (e) {
            // ignore
          }

          let weatherCorrections = {};
          let weatherResolved = {};
          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
              weatherCorrections = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
              weatherResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
            }
          } catch (e) {
            weatherCorrections = {};
            weatherResolved = {};
          }

          const langPrefsRaw = (() => {
            try {
              return localStorage.getItem('chatLanguagePreferences');
            } catch (e) {
              return null;
            }
          })();
          const langPrefs = safeJsonParse(langPrefsRaw, {});

          const payload = {
            version: '3.1.0',
            exportedAt: new Date().toISOString(),
            weatherCountryCorrections: weatherCorrections || {},
            weatherCountryResolved: weatherResolved || {},
            chatLanguagePreferences: langPrefs || {}
          };

          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `wa-ai-privacy-config-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          try {
            if (typeof showToast === 'function') showToast('已导出配置', 'success');
          } catch (e) {
            // ignore
          }
        } catch (e) {
          console.error('导出配置失败:', e);
          try {
            if (typeof showToast === 'function') showToast('导出配置失败', 'error');
          } catch (e2) {
            // ignore
          }
        }
      };

      const importPrivacyConfigText = async (text) => {
        try {
          try {
            if (privacyService?.importConfigText) {
              const result = await privacyService.importConfigText(text);
              if (!result?.ok) {
                try {
                  if (typeof showToast === 'function') showToast('导入失败：文件不是合法 JSON', 'error');
                } catch (e) {
                  // ignore
                }
                return;
              }
              try {
                if (typeof showToast === 'function') showToast('导入成功', 'success');
              } catch (e) {
                // ignore
              }
              await loadPrivacyRecords();
              return;
            }
          } catch (e) {
            // ignore
          }

          const data = safeJsonParse(text, null);
          if (!data || typeof data !== 'object') {
            try {
              if (typeof showToast === 'function') showToast('导入失败：文件不是合法 JSON', 'error');
            } catch (e) {
              // ignore
            }
            return;
          }

          const incomingWeather = data.weatherCountryCorrections && typeof data.weatherCountryCorrections === 'object' ? data.weatherCountryCorrections : {};
          const incomingResolved = data.weatherCountryResolved && typeof data.weatherCountryResolved === 'object' ? data.weatherCountryResolved : {};
          const incomingLang = data.chatLanguagePreferences && typeof data.chatLanguagePreferences === 'object' ? data.chatLanguagePreferences : {};

          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
              const current = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
              const currentResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
              const merged = { ...current, ...incomingWeather };
              const mergedResolved = { ...currentResolved, ...incomingResolved };
              await chrome.storage.local.set({ weatherCountryCorrections: merged, weatherCountryResolved: mergedResolved });
            }
          } catch (e) {
            // ignore
          }

          try {
            const currentRaw = (() => {
              try {
                return localStorage.getItem('chatLanguagePreferences');
              } catch (e) {
                return null;
              }
            })();
            const current = safeJsonParse(currentRaw, {});
            const merged = { ...current, ...incomingLang };
            localStorage.setItem('chatLanguagePreferences', JSON.stringify(merged));
          } catch (e) {
            // ignore
          }

          try {
            if (typeof showToast === 'function') showToast('导入成功', 'success');
          } catch (e) {
            // ignore
          }
          await loadPrivacyRecords();
        } catch (e) {
          console.error('导入配置失败:', e);
          try {
            if (typeof showToast === 'function') showToast('导入配置失败', 'error');
          } catch (e2) {
            // ignore
          }
        }
      };

      const removeKeysByPhone = (obj, phoneDigits) => {
        try {
          if (!obj || typeof obj !== 'object') return obj;
          const out = { ...obj };
          Object.keys(out).forEach((k) => {
            const n = normalizePhoneKey(k);
            if (n && n === phoneDigits) {
              delete out[k];
            }
          });
          return out;
        } catch (e) {
          return obj;
        }
      };

      const resetOnePhone = async (phoneDigits) => {
        try {
          const phone = String(phoneDigits || '').replace(/[^\d]/g, '');
          if (!phone) return;

          try {
            if (privacyService?.resetOne) {
              const result = await privacyService.resetOne(phone);
              if (!result?.ok) {
                try {
                  if (typeof showToast === 'function') showToast('重置失败', 'error');
                } catch (e) {
                  // ignore
                }
                return;
              }
              await loadPrivacyRecords();
              try {
                if (typeof showToast === 'function') showToast('已重置该号码记录', 'success');
              } catch (e) {
                // ignore
              }
              return;
            }
          } catch (e) {
            // ignore
          }

          try {
            if (chrome?.storage?.local) {
              const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
              const currentC = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
              const currentR = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
              const nextC = removeKeysByPhone(currentC, phone);
              const nextR = removeKeysByPhone(currentR, phone);
              await chrome.storage.local.set({ weatherCountryCorrections: nextC, weatherCountryResolved: nextR });
            }
          } catch (e) {
            // ignore
          }

          try {
            const raw = (() => {
              try {
                return localStorage.getItem('chatLanguagePreferences');
              } catch (e) {
                return null;
              }
            })();
            const prefs = safeJsonParse(raw, {});
            const next = removeKeysByPhone(prefs, phone);
            localStorage.setItem('chatLanguagePreferences', JSON.stringify(next));
          } catch (e) {
            // ignore
          }

          try {
            const w = window.WeatherInfo;
            if (w && w.userCorrections && typeof w.userCorrections.delete === 'function') {
              w.userCorrections.delete(phone);
            }
            if (w && w.resolvedCountries && typeof w.resolvedCountries.delete === 'function') {
              w.resolvedCountries.delete(phone);
            }
          } catch (e) {
            // ignore
          }

          await loadPrivacyRecords();
          try {
            if (typeof showToast === 'function') showToast('已重置该号码记录', 'success');
          } catch (e) {
            // ignore
          }
        } catch (e) {
          try {
            if (typeof showToast === 'function') showToast('重置失败', 'error');
          } catch (e2) {
            // ignore
          }
        }
      };

      const clearAllPrivacyData = async () => {
        const ok1 = window.confirm('这将清空所有长期保存记录（国家映射、输入框语言）。此操作不可恢复，确定继续吗？');
        if (!ok1) return;
        const ok2 = window.confirm('再次确认：真的要全部清空吗？');
        if (!ok2) return;
        const phrase = window.prompt('为防止误操作，请输入：我确定全部清空');
        if (phrase !== '我确定全部清空') {
          try {
            if (typeof showToast === 'function') showToast('已取消：口令不匹配', 'error');
          } catch (e) {
            // ignore
          }
          return;
        }

        try {
          if (privacyService?.clearAll) {
            await privacyService.clearAll();
            await loadPrivacyRecords();
            try {
              if (typeof showToast === 'function') showToast('已全部清空', 'success');
            } catch (e) {
              // ignore
            }
            return;
          }
        } catch (e) {
          // ignore
        }

        try {
          try {
            if (chrome?.storage?.local) {
              await chrome.storage.local.remove(['weatherCountryCorrections', 'weatherCountryResolved']);
            }
          } catch (e) {
            // ignore
          }

          try {
            localStorage.removeItem('chatLanguagePreferences');
          } catch (e) {
            // ignore
          }

          try {
            const w = window.WeatherInfo;
            if (w && w.userCorrections && typeof w.userCorrections.clear === 'function') w.userCorrections.clear();
            if (w && w.resolvedCountries && typeof w.resolvedCountries.clear === 'function') w.resolvedCountries.clear();
          } catch (e) {
            // ignore
          }

          await loadPrivacyRecords();
          try {
            if (typeof showToast === 'function') showToast('已全部清空', 'success');
          } catch (e) {
            // ignore
          }
        } catch (e) {
          try {
            if (typeof showToast === 'function') showToast('全部清空失败', 'error');
          } catch (e2) {
            // ignore
          }
        }
      };

      if (privacyRefreshBtn) {
        privacyRefreshBtn.addEventListener('click', () => {
          loadPrivacyRecords();
        });
      }

      try {
        if (privacySubTabButtons && privacySubTabButtons.length > 0) {
          privacySubTabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
              const tabName = btn.getAttribute('data-privacy-tab') || 'records';
              setActivePrivacySubTab(tabName);
              if (tabName === 'weather') {
                loadWeatherCacheView();
              }
            });
          });
          setActivePrivacySubTab('records');
        }
      } catch (e) {
        // ignore
      }

      if (weatherCacheRefreshBtn) {
        weatherCacheRefreshBtn.addEventListener('click', () => {
          loadWeatherCacheView();
        });
      }

      if (weatherCacheRenewNowBtn) {
        weatherCacheRenewNowBtn.addEventListener('click', async () => {
          try {
            const w = window.WeatherInfo;
            if (!w || typeof w.runWeatherAutoRenewOnce !== 'function') {
              try {
                if (typeof showToast === 'function') showToast('WeatherInfo 未就绪', 'error');
              } catch (e) {
                // ignore
              }
              return;
            }

            weatherCacheRenewNowBtn.disabled = true;
            try {
              await w.runWeatherAutoRenewOnce({ force: true });
              await loadWeatherCacheView();
              try {
                if (typeof showToast === 'function') showToast('已触发续期', 'success');
              } catch (e) {
                // ignore
              }
            } finally {
              weatherCacheRenewNowBtn.disabled = false;
            }
          } catch (e) {
            try {
              if (typeof showToast === 'function') showToast('续期失败', 'error');
            } catch (e2) {
              // ignore
            }
            try {
              weatherCacheRenewNowBtn.disabled = false;
            } catch (e3) {
              // ignore
            }
          }
        });
      }
      if (weatherCacheResetBtn) {
        weatherCacheResetBtn.addEventListener('click', () => {
          resetAllWeatherData();
        });
      }

      if (weatherCacheBody) {
        weatherCacheBody.addEventListener('click', (e) => {
          try {
            const t = e.target;
            if (!t || !(t instanceof HTMLElement)) return;
            if (!t.classList.contains('privacy-row-btn')) return;
            const k = t.getAttribute('data-cache-key') || '';
            if (!k) return;
            resetWeatherCacheKey(k);
          } catch (e2) {
            // ignore
          }
        });
      }
      if (privacyExportBtn) {
        privacyExportBtn.addEventListener('click', () => {
          exportPrivacyConfig();
        });
      }
      if (privacyImportBtn && privacyImportFile) {
        privacyImportBtn.addEventListener('click', () => {
          try {
            privacyImportFile.value = '';
          } catch (e) {}
          privacyImportFile.click();
        });
        privacyImportFile.addEventListener('change', async () => {
          try {
            const file = privacyImportFile.files && privacyImportFile.files[0];
            if (!file) return;
            const text = await file.text();
            const ok = window.confirm('导入会合并并覆盖同号码的记录，确定继续吗？');
            if (!ok) return;
            await importPrivacyConfigText(text);
          } catch (e) {
            try {
              if (typeof showToast === 'function') showToast('导入配置失败', 'error');
            } catch (e2) {
              // ignore
            }
          }
        });
      }

      if (privacyClearAllBtn) {
        privacyClearAllBtn.addEventListener('click', () => {
          clearAllPrivacyData();
        });
      }

      if (privacyBody) {
        privacyBody.addEventListener('click', (e) => {
          try {
            const t = e.target;
            if (!t || !(t instanceof HTMLElement)) return;
            if (!t.classList.contains('privacy-row-btn')) return;
            const phone = t.getAttribute('data-phone') || '';
            const p = String(phone).replace(/[^\d]/g, '');
            if (!p) return;
            const ok = window.confirm(`确定要重置号码 ${p} 的记录吗？`);
            if (!ok) return;
            resetOnePhone(p);
          } catch (e2) {
            // ignore
          }
        });
      }

      loadPrivacyRecords();

      const attemptCloseSettingsModal = () => {
        try {
          if (settingsDirty) {
            const ok = window.confirm('设置尚未保存，确定要关闭吗？');
            if (!ok) return;
          }
          modal.remove();
        } catch (e) {
          try {
            modal.remove();
          } catch (e2) {}
        }
      };

      content.addEventListener(
        'input',
        (e) => {
          try {
            if (settingsLoading) return;
            const t = e.target;
            if (!t || !(t instanceof HTMLElement)) return;
            const tag = (t.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
              settingsDirty = true;
            }
          } catch (e2) {
            // ignore
          }
        },
        true
      );

      content.addEventListener(
        'change',
        (e) => {
          try {
            if (settingsLoading) return;
            const t = e.target;
            if (!t || !(t instanceof HTMLElement)) return;
            const tag = (t.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
              settingsDirty = true;
            }
          } catch (e2) {
            // ignore
          }
        },
        true
      );

      const closeBtn = content.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          attemptCloseSettingsModal();
        });
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) return;
      });

      const toggleBtns = content.querySelectorAll('.toggle-visibility');
      toggleBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const inputId = btn.getAttribute('data-for');
          const input = document.getElementById(inputId);
          if (!input) return;
          input.type = input.type === 'password' ? 'text' : 'password';
        });
      });

      const translationApiSelect = content.querySelector('#translationApi');
      if (translationApiSelect) {
        translationApiSelect.addEventListener('change', () => {
          document.querySelectorAll('#translation-settings .api-setting-group').forEach((el) => {
            el.style.display = 'none';
          });
          const selectedService = translationApiSelect.value;
          const settingsEl = document.getElementById(`${selectedService}-settings`);
          if (settingsEl) {
            settingsEl.style.display = 'block';
          }
        });
      }

      const adminPresetBtn = content.querySelector('#adminPresetBtn');
      if (adminPresetBtn) {
        const openAdminPresetDialog = () => {
          try {
            const existing = document.querySelector('.admin-preset-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.className = 'admin-preset-overlay';
            overlay.innerHTML = `
          <div class="admin-preset-card" role="dialog" aria-modal="true">
            <div class="admin-preset-header">
              <div class="admin-preset-title">管理员预设</div>
              <button type="button" class="admin-preset-close" aria-label="关闭">×</button>
            </div>
            <div class="admin-preset-body">
              <div class="admin-preset-row">
                <label class="admin-preset-label">管理员口令</label>
                <input class="admin-preset-input" type="password" id="adminPresetPass" placeholder="请输入口令">
              </div>
              <div class="admin-preset-hint">将自动把“翻译服务”和“AI分析服务”切换到 OpenAI 通用接口，并填充 API Key / URL / 模型。</div>
            </div>
            <div class="admin-preset-footer">
              <button type="button" class="admin-preset-secondary" id="adminPresetCancel">取消</button>
              <button type="button" class="admin-preset-primary" id="adminPresetApply">应用预设</button>
            </div>
          </div>
        `;

            modal.appendChild(overlay);

            const close = () => {
              try {
                overlay.remove();
              } catch (e) {}
            };

            const passEl = overlay.querySelector('#adminPresetPass');

            const closeBtn = overlay.querySelector('.admin-preset-close');
            const cancelBtn = overlay.querySelector('#adminPresetCancel');
            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) close();
            });

            const applyBtn = overlay.querySelector('#adminPresetApply');
            if (applyBtn) {
              applyBtn.addEventListener('click', () => {
                try {
                  const pass = (passEl?.value || '').trim();
                  if (pass !== 'Achord666') {
                    try {
                      if (typeof showToast === 'function') showToast('口令错误', 'error');
                    } catch (e) {
                      // ignore
                    }
                    if (passEl) passEl.focus();
                    return;
                  }

                  const presetApiKey = '6c9033c7e08b403abd6f66f09f146f60.hvyHTj91HZQOzT7E';
                  const presetApiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                  const presetModel = 'glm-4-flash-250414';

                  const translationApiSelect = document.getElementById('translationApi');
                  if (translationApiSelect) {
                    translationApiSelect.value = 'siliconflow';
                    translationApiSelect.dispatchEvent(new Event('change'));
                  }

                  const apiUrlEl = document.getElementById('siliconflowApiUrl');
                  if (apiUrlEl) apiUrlEl.value = presetApiUrl;

                  const modelEl = document.getElementById('siliconflowModel');
                  if (modelEl) modelEl.value = presetModel;

                  const keyEl = document.getElementById('siliconflowApiKey');
                  if (keyEl) keyEl.value = presetApiKey;

                  const aiEnabledToggle = document.getElementById('aiEnabled');
                  if (aiEnabledToggle) {
                    aiEnabledToggle.checked = true;
                    aiEnabledToggle.dispatchEvent(new Event('change'));
                  }

                  const aiApiSelect = document.getElementById('aiApi');
                  if (aiApiSelect) {
                    aiApiSelect.value = 'siliconflow';
                    aiApiSelect.dispatchEvent(new Event('change'));
                  }

                  const apiUrlElAi = document.getElementById('siliconflowApiUrl_ai');
                  if (apiUrlElAi) apiUrlElAi.value = presetApiUrl;

                  const modelElAi = document.getElementById('siliconflowModel_ai');
                  if (modelElAi) modelElAi.value = presetModel;

                  const keyElAi = document.getElementById('siliconflowApiKey_ai');
                  if (keyElAi) keyElAi.value = presetApiKey;

                  try {
                    if (typeof showToast === 'function') showToast('已应用管理员预设', 'success');
                  } catch (e) {
                    // ignore
                  }

                  try {
                    chrome.storage.sync.set({ quickChatUnlocked: true }, () => {
                      const quickChatToggle = document.getElementById('quickChatEnabled');
                      if (quickChatToggle) {
                        quickChatToggle.disabled = false;
                      }
                    });
                  } catch (e) {
                    // ignore
                  }
                  close();
                } catch (e) {
                  console.error('应用管理员预设失败:', e);
                  try {
                    if (typeof showToast === 'function') showToast('应用管理员预设失败', 'error');
                  } catch (e2) {
                    // ignore
                  }
                }
              });
            }

            if (passEl) {
              passEl.focus();
              passEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  const btn = overlay.querySelector('#adminPresetApply');
                  if (btn) btn.click();
                }
              });
            }
          } catch (e) {
            console.error('打开管理员预设弹窗失败:', e);
            try {
              if (typeof showToast === 'function') showToast('打开管理员预设弹窗失败', 'error');
            } catch (e2) {
              // ignore
            }
          }
        };

        adminPresetBtn.addEventListener('click', openAdminPresetDialog);
      }

      const aiApiSelect = content.querySelector('#aiApi');
      if (aiApiSelect) {
        aiApiSelect.addEventListener('change', () => {
          document.querySelectorAll('#ai-settings .api-setting-group').forEach((el) => {
            el.style.display = 'none';
          });

          const selectedService = aiApiSelect.value;
          const settingsEl = document.getElementById(`ai-${selectedService}-settings`);
          if (settingsEl) {
            settingsEl.style.display = 'block';
          }
        });
      }

      const aiEnabledToggle = content.querySelector('#aiEnabled');
      const aiServiceOptions = content.querySelector('#ai-service-options');
      const aiSystemRole = content.querySelector('#ai-system-role');
      if (aiEnabledToggle) {
        aiEnabledToggle.addEventListener('change', () => {
          try {
            if (aiServiceOptions) aiServiceOptions.style.display = aiEnabledToggle.checked ? 'block' : 'none';
            if (aiSystemRole) aiSystemRole.style.display = aiEnabledToggle.checked ? 'block' : 'none';

            if (aiEnabledToggle.checked) {
              const selectedAiService = document.getElementById('aiApi').value;
              document.querySelectorAll('#ai-settings .api-setting-group').forEach((el) => {
                el.style.display = 'none';
              });
              const aiSettingsEl = document.getElementById(`ai-${selectedAiService}-settings`);
              if (aiSettingsEl) {
                aiSettingsEl.style.display = 'block';
              }
            }
          } catch (e) {
            // ignore
          }
        });
      }

      const saveBtn = content.querySelector('.save-btn');

      const weatherEnabledToggle = content.querySelector('#weatherEnabled');
      const weatherOptions = content.querySelector('#weather-options');
      const weatherShowWeatherToggle = content.querySelector('#weatherShowWeather');
      const weatherShowTimeToggle = content.querySelector('#weatherShowTime');
      const weatherAllowCountryOverrideToggle = content.querySelector('#weatherAllowCountryOverride');
      const weatherCachePresetSelect = content.querySelector('#weatherCachePreset');
      const weatherCacheCustomWrap = content.querySelector('#weatherCacheCustomWrap');
      const weatherCacheMinutesInput = content.querySelector('#weatherCacheMinutes');
      const weatherCacheAutoRenewToggle = content.querySelector('#weatherCacheAutoRenew');
      const weatherAutoRenewEvictDaysInput = content.querySelector('#weatherAutoRenewEvictDays');

      const updateWeatherOptionsUI = () => {
        try {
          const enabled = weatherEnabledToggle?.checked === true;
          if (weatherOptions) weatherOptions.style.display = enabled ? 'block' : 'none';
          if (weatherShowWeatherToggle) weatherShowWeatherToggle.disabled = !enabled;
          if (weatherShowTimeToggle) weatherShowTimeToggle.disabled = !enabled;
          if (weatherAllowCountryOverrideToggle) weatherAllowCountryOverrideToggle.disabled = !enabled;
          if (weatherCachePresetSelect) weatherCachePresetSelect.disabled = !enabled;
          if (weatherCacheMinutesInput) weatherCacheMinutesInput.disabled = !enabled;
          if (weatherCacheAutoRenewToggle) weatherCacheAutoRenewToggle.disabled = !enabled;
          if (weatherAutoRenewEvictDaysInput) weatherAutoRenewEvictDaysInput.disabled = !enabled;
          if (weatherCacheCustomWrap) {
            if (!enabled) {
              weatherCacheCustomWrap.style.display = 'none';
            } else {
              const shouldShowCustom = (weatherCachePresetSelect?.value || '') === 'custom';
              weatherCacheCustomWrap.style.display = shouldShowCustom ? 'block' : 'none';
            }
          }
        } catch (e) {
          // ignore
        }
      };

      const applyWeatherCacheUi = (minutes) => {
        try {
          const presets = new Set(['5', '15', '30', '60', '180', '1440']);
          let m = parseInt(String(minutes ?? ''), 10);
          if (!Number.isFinite(m) || m <= 0) m = 60;
          if (m > 10080) m = 10080;
          const mStr = String(m);

          if (weatherCachePresetSelect) {
            weatherCachePresetSelect.value = presets.has(mStr) ? mStr : 'custom';
          }

          if (weatherCacheMinutesInput) {
            weatherCacheMinutesInput.value = mStr;
          }

          if (weatherCacheCustomWrap) {
            const shouldShowCustom = (weatherCachePresetSelect?.value || '') === 'custom';
            weatherCacheCustomWrap.style.display = shouldShowCustom ? 'block' : 'none';
          }
        } catch (e) {
          // ignore
        }
      };

      try {
        if (weatherCachePresetSelect) {
          weatherCachePresetSelect.addEventListener('change', () => {
            try {
              if (weatherCacheCustomWrap) {
                weatherCacheCustomWrap.style.display = weatherCachePresetSelect.value === 'custom' ? 'block' : 'none';
              }

              if (weatherCacheMinutesInput && weatherCachePresetSelect.value !== 'custom') {
                const presetMinutes = parseInt(String(weatherCachePresetSelect.value || ''), 10);
                if (Number.isFinite(presetMinutes) && presetMinutes > 0) {
                  weatherCacheMinutesInput.value = String(presetMinutes);
                }
              }
            } catch (e) {
              // ignore
            }
          });
        }
      } catch (e) {
        // ignore
      }

      if (weatherEnabledToggle) {
        weatherEnabledToggle.addEventListener('change', updateWeatherOptionsUI);
      }

      const advancedSettingsToggle = content.querySelector('.advanced-settings-toggle');
      if (advancedSettingsToggle) {
        advancedSettingsToggle.addEventListener('click', () => {
          const advancedSettings = content.querySelector('.advanced-settings');
          const icon = content.querySelector('.advanced-settings-icon');
          if (!advancedSettings || !icon) return;
          if (advancedSettings.style.display === 'none') {
            advancedSettings.style.display = 'block';
            icon.innerHTML = '<path d="M7 14l5-5 5 5z"/>';
          } else {
            advancedSettings.style.display = 'none';
            icon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
          }
        });
      }

      const temperatureSlider = content.querySelector('#openaiTemperature');
      const temperatureValue = content.querySelector('#openaiTemperatureValue');
      if (temperatureSlider && temperatureValue) {
        temperatureSlider.addEventListener('input', () => {
          temperatureValue.textContent = temperatureSlider.value;
        });
      }

      function saveSettings() {
        try {
          const presetValue = document.getElementById('weatherCachePreset')?.value;
          const customValue = document.getElementById('weatherCacheMinutes')?.value;

          let weatherCacheMinutes = 60;
          if (presetValue && presetValue !== 'custom') {
            const presetMinutes = parseInt(String(presetValue || ''), 10);
            if (Number.isFinite(presetMinutes) && presetMinutes > 0) {
              weatherCacheMinutes = presetMinutes;
            }
          } else {
            const parsed = parseInt(String(customValue || ''), 10);
            if (Number.isFinite(parsed) && parsed > 0) {
              weatherCacheMinutes = parsed;
            }
          }

          if (!Number.isFinite(weatherCacheMinutes) || weatherCacheMinutes <= 0) {
            weatherCacheMinutes = 60;
          }
          if (weatherCacheMinutes > 10080) weatherCacheMinutes = 10080;

          const formData = {
            translationApi: document.getElementById('translationApi').value,
            targetLanguage: document.getElementById('targetLanguage').value,
            autoTranslateNewMessages: document.getElementById('autoTranslateNewMessages').checked,
            inputQuickTranslateSend: document.getElementById('inputQuickTranslateSend')?.checked === true,
            aiEnabled: document.getElementById('aiEnabled').checked,
            quickChatEnabled: document.getElementById('quickChatEnabled')?.checked === true,
            weatherEnabled: document.getElementById('weatherEnabled')?.checked !== false,
            weatherShowWeather: document.getElementById('weatherShowWeather')?.checked !== false,
            weatherShowTime: document.getElementById('weatherShowTime')?.checked !== false,
            weatherAllowCountryOverride: document.getElementById('weatherAllowCountryOverride')?.checked === true,
            weatherCacheMinutes,
            weatherCacheAutoRenew: document.getElementById('weatherCacheAutoRenew')?.checked !== false,
            weatherAutoRenewEvictDays: (() => {
              try {
                const raw = document.getElementById('weatherAutoRenewEvictDays')?.value;
                let d = parseInt(String(raw ?? ''), 10);
                if (!Number.isFinite(d) || d < 0) d = 10;
                if (d > 365) d = 365;
                return d;
              } catch (e) {
                return 10;
              }
            })()
          };

          if (formData.translationApi === 'siliconflow') {
            formData.siliconflowApiKey = document.getElementById('siliconflowApiKey').value;
            formData.siliconflowApiUrl = document.getElementById('siliconflowApiUrl').value;
            formData.siliconflowModel = document.getElementById('siliconflowModel').value;

            const temperatureSlider = document.getElementById('openaiTemperature');
            if (temperatureSlider) {
              formData.openaiTemperature = parseFloat(temperatureSlider.value);
            }

            const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
            if (reasoningEnabled) {
              formData.openaiReasoningEnabled = reasoningEnabled.checked;
            }
          }

          if (formData.aiEnabled) {
            // 仅保留 OpenAI 通用接口（siliconflow）
            formData.aiApi = 'siliconflow';
            formData.aiTargetLanguage = document.getElementById('aiTargetLanguage').value;

            formData.siliconflowApiKey_ai = document.getElementById('siliconflowApiKey_ai').value;
            formData.siliconflowApiUrl_ai = document.getElementById('siliconflowApiUrl_ai').value;
            formData.siliconflowModel_ai = document.getElementById('siliconflowModel_ai').value;

            formData.systemRole = document.getElementById('systemRole').value;
          }

          chrome.storage.sync.set(formData, () => {
            if (chrome.runtime.lastError) {
              console.error('保存设置时出错:', chrome.runtime.lastError);
              try {
                if (typeof showExtensionInvalidatedError === 'function') showExtensionInvalidatedError();
              } catch (e) {
                // ignore
              }
              return;
            }

            try {
              if (typeof deps.onSaved === 'function') {
                deps.onSaved(formData);
              }
            } catch (e) {
              // ignore
            }

            try {
              if (typeof showToast === 'function') showToast('设置已保存');
            } catch (e) {
              // ignore
            }

            try {
              const settingsModal = document.getElementById('settings-modal');
              if (settingsModal) {
                settingsModal.remove();
              }
            } catch (e) {
              // ignore
            }

            setTimeout(() => {
              try {
                chrome.runtime.sendMessage({ action: 'reload_plugin' });
              } catch (msgError) {
                console.error('发送重载消息失败:', msgError);
              }
            }, 500);
          });
        } catch (error) {
          console.error('保存设置时出错:', error);
          try {
            if (typeof showExtensionInvalidatedError === 'function') showExtensionInvalidatedError();
          } catch (e) {
            // ignore
          }
        }
      }

      function loadSettings() {
        try {
          chrome.storage.sync.get(
            [
              'translationApi',
              'targetLanguage',
              'autoTranslateNewMessages',
              'inputQuickTranslateSend',
              'aiEnabled',
              'aiApi',
              'aiTargetLanguage',
              'siliconflowApiKey',
              'siliconflowApiUrl',
              'siliconflowModel',
              'openaiTemperature',
              'openaiReasoningEnabled',
              'siliconflowApiKey_ai',
              'siliconflowApiUrl_ai',
              'siliconflowModel_ai',
              'systemRole',
              'quickChatEnabled',
              'quickChatUnlocked',
              'weatherEnabled',
              'weatherShowWeather',
              'weatherShowTime',
              'weatherAllowCountryOverride',
              'weatherCacheMinutes',
              'weatherCacheAutoRenew',
              'weatherAutoRenewEvictDays'
            ],
            (data) => {
              if (chrome.runtime.lastError) {
                console.error('获取设置时出错:', chrome.runtime.lastError);
                try {
                  if (typeof showExtensionInvalidatedError === 'function') showExtensionInvalidatedError();
                } catch (e) {
                  // ignore
                }
                settingsLoading = false;
                settingsDirty = false;
                return;
              }

              if (data.translationApi) {
                const allowedTranslationApi = data.translationApi === 'siliconflow' ? 'siliconflow' : 'google';
                document.getElementById('translationApi').value = allowedTranslationApi;

                document.querySelectorAll('#translation-settings .api-setting-group').forEach((el) => {
                  el.style.display = 'none';
                });

                const settingsEl = document.getElementById(`${allowedTranslationApi}-settings`);
                if (settingsEl) {
                  settingsEl.style.display = 'block';
                }
              } else {
                const defaultService = document.getElementById('translationApi').value;
                const defaultSettingsEl = document.getElementById(`${defaultService}-settings`);
                if (defaultSettingsEl) {
                  defaultSettingsEl.style.display = 'block';
                }
              }

              if (data.targetLanguage) {
                document.getElementById('targetLanguage').value = data.targetLanguage;
              }

              const autoTranslateToggle = document.getElementById('autoTranslateNewMessages');
              if (autoTranslateToggle) {
                autoTranslateToggle.checked = data.autoTranslateNewMessages === true;
              }

              const quickSendToggle = document.getElementById('inputQuickTranslateSend');
              if (quickSendToggle) {
                quickSendToggle.checked = data.inputQuickTranslateSend === true;
              }

              try {
                const quickChatToggle = document.getElementById('quickChatEnabled');
                if (quickChatToggle) {
                  const unlocked = data.quickChatUnlocked === true;
                  quickChatToggle.checked = unlocked && data.quickChatEnabled === true;
                  quickChatToggle.disabled = !unlocked;
                }
              } catch (e) {
                // ignore
              }

              const aiEnabledCheckbox = document.getElementById('aiEnabled');
              if (aiEnabledCheckbox) {
                aiEnabledCheckbox.checked = data.aiEnabled === true;

                const aiServiceOptions = document.getElementById('ai-service-options');
                const aiSystemRole = document.getElementById('ai-system-role');

                if (aiServiceOptions) {
                  aiServiceOptions.style.display = data.aiEnabled === true ? 'block' : 'none';
                }

                if (aiSystemRole) {
                  aiSystemRole.style.display = data.aiEnabled === true ? 'block' : 'none';
                }
              }

              if (data.aiApi) {
                const aiApiSelect = document.getElementById('aiApi');
                if (aiApiSelect) {
                  aiApiSelect.value = 'siliconflow';

                  document.querySelectorAll('#ai-settings .api-setting-group').forEach((el) => {
                    el.style.display = 'none';
                  });

                  const aiSettingsEl = document.getElementById('ai-siliconflow-settings');
                  if (aiSettingsEl && data.aiEnabled === true) {
                    aiSettingsEl.style.display = 'block';
                  }
                }
              } else {
                if (data.aiEnabled === true) {
                  const defaultAiService = document.getElementById('aiApi').value;
                  const defaultAiSettingsEl = document.getElementById(`ai-${defaultAiService}-settings`);
                  if (defaultAiSettingsEl) {
                    defaultAiSettingsEl.style.display = 'block';
                  }
                }
              }

              if (data.aiTargetLanguage) {
                const aiTargetLang = document.getElementById('aiTargetLanguage');
                if (aiTargetLang) {
                  aiTargetLang.value = data.aiTargetLanguage;
                }
              }

              if (data.siliconflowApiKey) {
                document.getElementById('siliconflowApiKey').value = data.siliconflowApiKey;
              }

              if (data.siliconflowApiUrl) {
                document.getElementById('siliconflowApiUrl').value = data.siliconflowApiUrl;
              }

              if (data.siliconflowModel) {
                document.getElementById('siliconflowModel').value = data.siliconflowModel;
              }

              const temperatureSlider = document.getElementById('openaiTemperature');
              const temperatureValue = document.getElementById('openaiTemperatureValue');
              if (temperatureSlider && data.openaiTemperature !== undefined) {
                temperatureSlider.value = data.openaiTemperature;
                if (temperatureValue) {
                  temperatureValue.textContent = data.openaiTemperature;
                }
              }

              const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
              if (reasoningEnabled && data.openaiReasoningEnabled !== undefined) {
                reasoningEnabled.checked = data.openaiReasoningEnabled;
              }

              if (data.siliconflowApiKey_ai) {
                document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey_ai;
              } else if (data.siliconflowApiKey) {
                document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey;
              }

              if (data.siliconflowApiUrl_ai) {
                document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl_ai;
              } else if (data.siliconflowApiUrl) {
                document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl;
              } else {
                document.getElementById('siliconflowApiUrl_ai').value = 'https://api.openai.com/v1/chat/completions';
              }

              if (data.siliconflowModel_ai) {
                document.getElementById('siliconflowModel_ai').value = data.siliconflowModel_ai;
              } else if (data.siliconflowModel) {
                document.getElementById('siliconflowModel_ai').value = data.siliconflowModel;
              } else {
                document.getElementById('siliconflowModel_ai').value = 'gpt-3.5-turbo';
              }

              if (data.systemRole) {
                document.getElementById('systemRole').value = data.systemRole;
              }

              const translationApiSelect = document.getElementById('translationApi');
              if (translationApiSelect) {
                translationApiSelect.dispatchEvent(new Event('change'));
              }

              try {
                const enabled = data.weatherEnabled !== false;
                const showWeather = data.weatherShowWeather !== false;
                const showTime = data.weatherShowTime !== false;
                const allowOverride = data.weatherAllowCountryOverride === true;
                const cacheAutoRenew = data.weatherCacheAutoRenew !== false;
                let evictDays = parseInt(String(data.weatherAutoRenewEvictDays ?? ''), 10);
                if (!Number.isFinite(evictDays) || evictDays < 0) evictDays = 10;
                if (evictDays > 365) evictDays = 365;
                let cacheMinutes = parseInt(String(data.weatherCacheMinutes ?? ''), 10);
                if (!Number.isFinite(cacheMinutes) || cacheMinutes <= 0) cacheMinutes = 60;
                if (cacheMinutes > 10080) cacheMinutes = 10080;

                const weatherEnabledEl = document.getElementById('weatherEnabled');
                if (weatherEnabledEl) weatherEnabledEl.checked = enabled;

                const weatherShowWeatherEl = document.getElementById('weatherShowWeather');
                if (weatherShowWeatherEl) weatherShowWeatherEl.checked = showWeather;

                const weatherShowTimeEl = document.getElementById('weatherShowTime');
                if (weatherShowTimeEl) weatherShowTimeEl.checked = showTime;

                const weatherAllowOverrideEl = document.getElementById('weatherAllowCountryOverride');
                if (weatherAllowOverrideEl) weatherAllowOverrideEl.checked = allowOverride;

                const weatherCacheAutoRenewEl = document.getElementById('weatherCacheAutoRenew');
                if (weatherCacheAutoRenewEl) weatherCacheAutoRenewEl.checked = cacheAutoRenew;

                const weatherAutoRenewEvictDaysEl = document.getElementById('weatherAutoRenewEvictDays');
                if (weatherAutoRenewEvictDaysEl) weatherAutoRenewEvictDaysEl.value = String(evictDays);

                applyWeatherCacheUi(cacheMinutes);

                updateWeatherOptionsUI();
              } catch (e) {
                // ignore
              }

              if (data.aiEnabled === true) {
                const aiApiSelect = document.getElementById('aiApi');
                if (aiApiSelect) {
                  aiApiSelect.dispatchEvent(new Event('change'));
                }
              }

              settingsDirty = false;
              setTimeout(() => {
                settingsLoading = false;
              }, 0);
            }
          );
        } catch (error) {
          console.error('加载设置时发生异常:', error);
          try {
            if (typeof showExtensionInvalidatedError === 'function') showExtensionInvalidatedError();
          } catch (e) {
            // ignore
          }
          settingsLoading = false;
          settingsDirty = false;
        }
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          saveSettings();
          settingsDirty = false;
          try {
            modal.remove();
          } catch (e) {
            // ignore
          }
        });
      }

      loadSettings();

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.settingsPresenter = {
    open
  };
})();
