/*
用途：隐私记录 Service（负责本机隐私记录：读取/导出/导入/单条重置/全部清空）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.privacyRecordsService) return;

  function safeJsonParse(raw, fallback) {
    try {
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function normalizePhoneKey(k) {
    const raw = String(k || '');
    if (raw.startsWith('phone:')) return raw.replace(/^phone:/, '').replace(/[^\d]/g, '');
    return raw.replace(/[^\d]/g, '');
  }

  function langLabel(code) {
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
  }

  function buildCountryLabel(item) {
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
  }

  async function getRawStorage() {
    let weatherCorrections = {};
    let weatherResolved = {};
    let chatPhoneCache = {};

    try {
      if (chrome?.storage?.local) {
        const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved', 'waapChatPhoneCacheV1']);
        weatherCorrections = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
        weatherResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
        chatPhoneCache = res && res.waapChatPhoneCacheV1 ? res.waapChatPhoneCacheV1 : {};
      }
    } catch (e) {
      weatherCorrections = {};
      weatherResolved = {};
      chatPhoneCache = {};
    }

    const langPrefsRaw = (() => {
      try {
        return localStorage.getItem('chatLanguagePreferences');
      } catch (e) {
        return null;
      }
    })();
    const chatLanguagePreferences = safeJsonParse(langPrefsRaw, {});

    return {
      weatherCountryCorrections: weatherCorrections || {},
      weatherCountryResolved: weatherResolved || {},
      chatPhoneCache: chatPhoneCache || {},
      chatLanguagePreferences: chatLanguagePreferences || {}
    };
  }

  async function maybeAutoResolveCountries(phoneList, current) {
    try {
      const w = window.WeatherInfo;
      if (!w || typeof w.identifyCountry !== 'function') return current;
      if (!chrome?.storage?.local) return current;

      const updates = {};
      let count = 0;
      for (const phone of phoneList) {
        if (count >= 200) break;
        const hasManual = !!(current.weatherCountryCorrections && (current.weatherCountryCorrections[phone] || current.weatherCountryCorrections[String(phone)]));
        const hasResolved = !!(current.weatherCountryResolved && (current.weatherCountryResolved[phone] || current.weatherCountryResolved[String(phone)]));
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

      if (Object.keys(updates).length === 0) return current;

      const mergedResolved = { ...(current.weatherCountryResolved || {}), ...updates };
      await chrome.storage.local.set({ weatherCountryResolved: mergedResolved });

      try {
        if (w.resolvedCountries && typeof w.resolvedCountries.set === 'function') {
          Object.keys(updates).forEach((k) => {
            w.resolvedCountries.set(k, updates[k]);
          });
        }
      } catch (e2) {
        // ignore
      }

      return { ...current, weatherCountryResolved: mergedResolved };
    } catch (e) {
      return current;
    }
  }

  async function getPrivacyRows() {
    const current = await getRawStorage();

    const numbers = new Set();
    Object.keys(current.weatherCountryCorrections || {}).forEach((k) => {
      const n = normalizePhoneKey(k);
      if (n) numbers.add(n);
    });
    Object.keys(current.weatherCountryResolved || {}).forEach((k) => {
      const n = normalizePhoneKey(k);
      if (n) numbers.add(n);
    });
    Object.keys(current.chatLanguagePreferences || {}).forEach((k) => {
      const n = normalizePhoneKey(k);
      if (n) numbers.add(n);
    });

    // chatKey -> phone 缓存（从侧栏兜底获取）
    Object.keys(current.chatPhoneCache || {}).forEach((chatKey) => {
      try {
        const entry = current.chatPhoneCache[chatKey];
        const phoneDigits = entry && typeof entry === 'object'
          ? normalizePhoneKey(entry.phoneDigits || entry.phoneE164 || '')
          : normalizePhoneKey(entry || '');
        if (phoneDigits) numbers.add(phoneDigits);
      } catch (e) {
        // ignore
      }
    });

    const list = Array.from(numbers)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));

    const afterResolved = await maybeAutoResolveCountries(list, current);

    return list.map((phone) => {
      const correction = afterResolved.weatherCountryCorrections && (afterResolved.weatherCountryCorrections[phone] || afterResolved.weatherCountryCorrections[String(phone)]);
      const resolved = afterResolved.weatherCountryResolved && (afterResolved.weatherCountryResolved[phone] || afterResolved.weatherCountryResolved[String(phone)]);

      let lang = null;
      if (afterResolved.chatLanguagePreferences) {
        lang = afterResolved.chatLanguagePreferences[`phone:${phone}`] || null;
      }

      return {
        phone,
        countryLabel: buildCountryLabel(correction || resolved),
        langLabel: lang ? langLabel(lang) : '暂无数据'
      };
    });
  }

  async function exportConfig() {
    const current = await getRawStorage();

    const payload = {
      version: '3.1.0',
      exportedAt: new Date().toISOString(),
      weatherCountryCorrections: current.weatherCountryCorrections || {},
      weatherCountryResolved: current.weatherCountryResolved || {},
      waapChatPhoneCacheV1: current.chatPhoneCache || {},
      chatLanguagePreferences: current.chatLanguagePreferences || {}
    };

    return {
      fileName: `wa-ai-privacy-config-${new Date().toISOString().slice(0, 10)}.json`,
      jsonText: JSON.stringify(payload, null, 2)
    };
  }

  async function importConfigText(text) {
    const data = safeJsonParse(text, null);
    if (!data || typeof data !== 'object') {
      return { ok: false, reason: 'invalid_json' };
    }

    const incomingWeather = data.weatherCountryCorrections && typeof data.weatherCountryCorrections === 'object' ? data.weatherCountryCorrections : {};
    const incomingResolved = data.weatherCountryResolved && typeof data.weatherCountryResolved === 'object' ? data.weatherCountryResolved : {};
    const incomingPhoneCache = data.waapChatPhoneCacheV1 && typeof data.waapChatPhoneCacheV1 === 'object' ? data.waapChatPhoneCacheV1 : {};
    const incomingLang = data.chatLanguagePreferences && typeof data.chatLanguagePreferences === 'object' ? data.chatLanguagePreferences : {};

    try {
      if (chrome?.storage?.local) {
        const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved', 'waapChatPhoneCacheV1']);
        const current = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
        const currentResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
        const currentPhoneCache = res && res.waapChatPhoneCacheV1 ? res.waapChatPhoneCacheV1 : {};
        const merged = { ...current, ...incomingWeather };
        const mergedResolved = { ...currentResolved, ...incomingResolved };
        const mergedPhoneCache = { ...currentPhoneCache, ...incomingPhoneCache };
        await chrome.storage.local.set({ weatherCountryCorrections: merged, weatherCountryResolved: mergedResolved, waapChatPhoneCacheV1: mergedPhoneCache });
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

    return { ok: true };
  }

  function removeKeysByPhone(obj, phoneDigits) {
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
  }

  async function resetOne(phoneDigits) {
    const phone = String(phoneDigits || '').replace(/[^\d]/g, '');
    if (!phone) return { ok: false, reason: 'invalid_phone' };

    try {
      if (chrome?.storage?.local) {
        const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved', 'waapChatPhoneCacheV1']);
        const currentC = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
        const currentR = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
        const currentP = res && res.waapChatPhoneCacheV1 ? res.waapChatPhoneCacheV1 : {};
        const nextC = removeKeysByPhone(currentC, phone);
        const nextR = removeKeysByPhone(currentR, phone);

        const nextP = { ...currentP };
        Object.keys(nextP).forEach((k) => {
          try {
            const entry = nextP[k];
            const digits = entry && typeof entry === 'object'
              ? normalizePhoneKey(entry.phoneDigits || entry.phoneE164 || '')
              : normalizePhoneKey(entry || '');
            if (digits && digits === phone) {
              delete nextP[k];
            }
          } catch (e) {
            // ignore
          }
        });

        await chrome.storage.local.set({ weatherCountryCorrections: nextC, weatherCountryResolved: nextR, waapChatPhoneCacheV1: nextP });
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

    return { ok: true };
  }

  async function clearAll() {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.remove(['weatherCountryCorrections', 'weatherCountryResolved', 'waapChatPhoneCacheV1']);
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

    return { ok: true };
  }

  window.WAAP.services.privacyRecordsService = {
    getPrivacyRows,
    exportConfig,
    importConfigText,
    resetOne,
    clearAll
  };
})();
