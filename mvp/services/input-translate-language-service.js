/*
用途：输入框翻译（input-translate.js）语言相关逻辑的 MVP Service。
说明：集中管理语言列表、语言搜索匹配、以及“按聊天对象记忆目标语言”的 localStorage 读写。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.inputTranslateLanguageService) return;

  const LANGUAGE_OPTIONS = [
    { code: 'zh', zh: '中文', en: 'Chinese', py: 'zw' },
    { code: 'en', zh: '英语', en: 'English', py: 'yy' },
    { code: 'ja', zh: '日语', en: 'Japanese', py: 'ry' },
    { code: 'ko', zh: '韩语', en: 'Korean', py: 'hy' },
    { code: 'fr', zh: '法语', en: 'French', py: 'fy' },
    { code: 'de', zh: '德语', en: 'German', py: 'dy' },
    { code: 'es', zh: '西班牙语', en: 'Spanish', py: 'xbyy' },
    { code: 'it', zh: '意大利语', en: 'Italian', py: 'ydly' },
    { code: 'pt', zh: '葡萄牙语', en: 'Portuguese', py: 'ptyy' },
    { code: 'ru', zh: '俄语', en: 'Russian', py: 'ey' },
    { code: 'ar', zh: '阿拉伯语', en: 'Arabic', py: 'alby' },
    { code: 'hi', zh: '印地语', en: 'Hindi', py: 'ydy' },
    { code: 'th', zh: '泰语', en: 'Thai', py: 'ty' },
    { code: 'vi', zh: '越南语', en: 'Vietnamese', py: 'vny' },
    { code: 'id', zh: '印尼语', en: 'Indonesian', py: 'yny' },
    { code: 'ms', zh: '马来语', en: 'Malay', py: 'mly' },
    { code: 'tr', zh: '土耳其语', en: 'Turkish', py: 'teqy' },
    { code: 'nl', zh: '荷兰语', en: 'Dutch', py: 'hly' },
    { code: 'sv', zh: '瑞典语', en: 'Swedish', py: 'rdy' },
    { code: 'no', zh: '挪威语', en: 'Norwegian', py: 'nwy' },
    { code: 'da', zh: '丹麦语', en: 'Danish', py: 'dmy' },
    { code: 'fi', zh: '芬兰语', en: 'Finnish', py: 'fly' },
    { code: 'pl', zh: '波兰语', en: 'Polish', py: 'bly' },
    { code: 'cs', zh: '捷克语', en: 'Czech', py: 'jky' },
    { code: 'el', zh: '希腊语', en: 'Greek', py: 'xly' },
    { code: 'he', zh: '希伯来语', en: 'Hebrew', py: 'xbly' },
    { code: 'fa', zh: '波斯语', en: 'Persian', py: 'bsy' },
    { code: 'ur', zh: '乌尔都语', en: 'Urdu', py: 'wedy' },
    { code: 'uk', zh: '乌克兰语', en: 'Ukrainian', py: 'wkly' },
    { code: 'ro', zh: '罗马尼亚语', en: 'Romanian', py: 'lmnyy' },
    { code: 'hu', zh: '匈牙利语', en: 'Hungarian', py: 'xgly' },
    { code: 'bn', zh: '孟加拉语', en: 'Bengali', py: 'mjly' },
    { code: 'ta', zh: '泰米尔语', en: 'Tamil', py: 'tmy' },
    { code: 'te', zh: '泰卢固语', en: 'Telugu', py: 'tlgy' }
  ];

  const LANGUAGES = Object.fromEntries(LANGUAGE_OPTIONS.map((l) => [l.code, l.zh]));

  function getLanguageOptions() {
    return LANGUAGE_OPTIONS;
  }

  function getLanguagesMap() {
    return LANGUAGES;
  }

  function normalizeLangQuery(q) {
    return (q || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  }

  function langMatchesQuery(lang, query) {
    const q = normalizeLangQuery(query);
    if (!q) return true;
    const hay = [lang.code, lang.zh, (lang.en || '').toLowerCase(), (lang.py || '').toLowerCase()]
      .filter(Boolean)
      .join('|')
      .toLowerCase();
    return hay.includes(q);
  }

  function getChatLanguagePreferenceKey(chatWindow) {
    try {
      const w = window.WeatherInfo;
      const existing = w && w.currentPhoneNumber ? String(w.currentPhoneNumber) : '';
      if (existing && /^\d{6,}$/.test(existing)) {
        return `phone:${existing}`;
      }
      if (w && typeof w.tryGetWhatsAppNumber === 'function') {
        const n = w.tryGetWhatsAppNumber();
        const numbersOnly = n ? String(n).replace(/[^\d]/g, '') : '';
        if (numbersOnly && /^\d{6,}$/.test(numbersOnly)) {
          return `phone:${numbersOnly}`;
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const root = chatWindow || document.getElementById('main') || document;
      const nameElement = root.querySelector('header._amid span[class*="_ao3e"]');
      const chatName = nameElement?.textContent?.trim();
      if (chatName) return `name:${chatName}`;
    } catch (e) {
      // ignore
    }

    return 'name:default';
  }

  function rememberLanguageChoice(chatWindow, lang) {
    if (!chatWindow) return;

    const key = getChatLanguagePreferenceKey(chatWindow);

    try {
      const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
      languagePreferences[key] = lang;
      localStorage.setItem('chatLanguagePreferences', JSON.stringify(languagePreferences));

      try {
        console.log('保存语言选择:', {
          key,
          lang,
          timestamp: new Date().toISOString()
        });
      } catch (e2) {
        // ignore
      }
    } catch (error) {
      try {
        console.error('保存语言选择失败:', error);
      } catch (e2) {
        // ignore
      }
    }
  }

  function getRememberedLanguage(chatWindow) {
    if (!chatWindow) return 'en';

    try {
      const key = getChatLanguagePreferenceKey(chatWindow);
      const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
      let rememberedLang = languagePreferences[key];

      if (!rememberedLang && key.startsWith('phone:')) {
        try {
          const root = chatWindow || document.getElementById('main') || document;
          const nameElement = root.querySelector('header._amid span[class*="_ao3e"]');
          const chatName = nameElement?.textContent?.trim() || 'default';
          const legacy = languagePreferences[chatName] || languagePreferences['default'];
          if (legacy) {
            languagePreferences[key] = legacy;
            localStorage.setItem('chatLanguagePreferences', JSON.stringify(languagePreferences));
            rememberedLang = legacy;
          }
        } catch (e) {
          // ignore
        }
      }

      try {
        console.log('获取记忆的语言选择:', {
          key,
          rememberedLang,
          timestamp: new Date().toISOString()
        });
      } catch (e2) {
        // ignore
      }

      return rememberedLang || 'en';
    } catch (error) {
      try {
        console.error('获取语言选择失败:', error);
      } catch (e2) {
        // ignore
      }
      return 'en';
    }
  }

  window.WAAP.services.inputTranslateLanguageService = {
    getLanguageOptions,
    getLanguagesMap,
    langMatchesQuery,
    getChatLanguagePreferenceKey,
    rememberLanguageChoice,
    getRememberedLanguage
  };
})();
