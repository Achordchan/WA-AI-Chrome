/*
用途：输入框翻译（input-translate.js）所需的“翻译请求链路”抽离。
说明：把 translateText/googleTranslate/aiTranslate/modalTranslation/verifyTranslation 等网络与服务调用逻辑集中到一个 service，
      让 input-translate.js 更接近 orchestrator（薄代理）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.inputTranslateTranslationService) return;

  function normalizeTargetLang(lang) {
    const raw = String(lang || '').trim();
    if (!raw) return 'zh';
    const lower = raw.toLowerCase();
    if (lower === 'zh-cn' || lower === 'zh-hans') return 'zh';
    if (lower === 'zh-tw' || lower === 'zh-hant') return 'zh';
    return lower.split('-')[0] || 'zh';
  }

  function getLangName(targetLang, deps = {}) {
    try {
      const normalized = normalizeTargetLang(targetLang);
      const map = deps.LANGUAGES;
      if (map && typeof map === 'object' && map[normalized]) return map[normalized];
    } catch (e) {
      // ignore
    }
    return '中文';
  }

  async function translateText(text, targetLang = 'zh', deps = {}) {
    const getTranslationService = deps.getTranslationService || window.getTranslationService;
    const ApiServices = deps.ApiServices || window.ApiServices;

    try {
      if (typeof getTranslationService !== 'function') {
        throw new Error('getTranslationService 不可用');
      }
      if (!ApiServices?.translation) {
        throw new Error('ApiServices.translation 不可用');
      }

      const { service, apiKey, secretKey, apiUrl, model } = await getTranslationService();
      let translation;

      if (service === 'google') {
        translation = await ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
      } else {
        translation = await ApiServices.translation.google(text, 'auto', targetLang);
      }

      if (translation && typeof translation === 'object' && translation.hasThinking) {
        return translation.translation;
      }

      return translation;
    } catch (error) {
      throw new Error(error?.message || '翻译失败');
    }
  }

  async function googleTranslate(text, targetLang, deps = {}) {
    const fetchFn = deps.fetch || window.fetch;

    try {
      if (typeof fetchFn !== 'function') throw new Error('fetch 不可用');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`;
      const response = await fetchFn(url);
      const data = await response.json();

      const translation = data[0]
        .map((item) => item[0])
        .filter(Boolean)
        .join('');

      return translation;
    } catch (error) {
      throw error;
    }
  }

  async function aiTranslate(text, targetLang, deps = {}) {
    const fetchFn = deps.fetch || window.fetch;
    const getAiService = deps.getAiService || window.getAiService;
    const ApiServices = deps.ApiServices || window.ApiServices;

    try {
      if (typeof getAiService !== 'function') throw new Error('getAiService 不可用');

      const { service, apiKey, apiUrl, model } = await getAiService();
      const normalizedTargetLang = normalizeTargetLang(targetLang);

      if (service === 'siliconflow') {
        if (!ApiServices?.translation?.siliconflow) throw new Error('ApiServices.translation.siliconflow 不可用');
        return await ApiServices.translation.siliconflow(text, apiKey, apiUrl, model, normalizedTargetLang);
      }

      throw new Error('AI 翻译仅支持 OpenAI 通用接口（siliconflow）');
    } catch (error) {
      throw error;
    }
  }

  async function performTranslation(text, targetLang, type = 'normal', deps = {}) {
    try {
      if (type === 'ai') {
        return await aiTranslate(text, targetLang, deps);
      }

      const getTranslationService = deps.getTranslationService || window.getTranslationService;
      const ApiServices = deps.ApiServices || window.ApiServices;

      if (typeof getTranslationService !== 'function') throw new Error('getTranslationService 不可用');
      if (!ApiServices?.translation) throw new Error('ApiServices.translation 不可用');

      const { service, apiKey, secretKey, apiUrl, model } = await getTranslationService();
      if (service === 'google') {
        return await ApiServices.translation[service](text, 'auto', targetLang);
      }
      if (service === 'siliconflow') {
        return await ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
      }
      return await ApiServices.translation.google(text, 'auto', targetLang);
    } catch (error) {
      throw error;
    }
  }

  async function modalTranslation(text, targetLang, type = 'normal', deps = {}) {
    try {
      let translation;

      if (type === 'ai') {
        translation = await aiTranslate(text, targetLang, deps);
      } else {
        const getTranslationService = deps.getTranslationService || window.getTranslationService;
        const ApiServices = deps.ApiServices || window.ApiServices;

        if (typeof getTranslationService !== 'function') throw new Error('getTranslationService 不可用');
        if (!ApiServices?.translation) throw new Error('ApiServices.translation 不可用');

        const { service, apiKey, secretKey, apiUrl, model } = await getTranslationService();

        if (service === 'google') {
          translation = await ApiServices.translation[service](text, 'auto', targetLang);
        } else if (service === 'siliconflow') {
          translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
        } else {
          translation = await ApiServices.translation.google(text, 'auto', targetLang);
        }

        if (translation && typeof translation === 'object' && translation.hasThinking) {
          translation = translation.translation;
        }
      }

      return translation;
    } catch (error) {
      throw error;
    }
  }

  async function verifyTranslation(translatedText, originalLang, targetLang, deps = {}) {
    try {
      const backTranslation = await googleTranslate(translatedText, originalLang, deps);
      return backTranslation;
    } catch (error) {
      throw error;
    }
  }

  window.WAAP.services.inputTranslateTranslationService = {
    translateText,
    googleTranslate,
    aiTranslate,
    performTranslation,
    modalTranslation,
    verifyTranslation,
    normalizeTargetLang
  };
})();
