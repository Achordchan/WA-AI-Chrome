/*
用途：翻译文本 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP translationOrchestratorService 不可用时，按设置选择翻译服务，并提供 429 重试与 Google fallback。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.translateTextFallback) return;

  async function legacyTranslateText(text, deps = {}) {
    try {
      const getTranslationSettings = deps.getTranslationSettings || window.getTranslationSettings;
      const getTranslationService = deps.getTranslationService || window.getTranslationService;
      const ApiServices = deps.ApiServices || window.ApiServices;
      const showToast = deps.showToast || (() => {});
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      if (typeof getTranslationSettings !== 'function' || typeof getTranslationService !== 'function' || !ApiServices?.translation) {
        throw new Error('Translation dependencies not available');
      }

      // 获取翻译服务设置
      const translationSettings = await getTranslationSettings();

      // 从设置中获取服务和目标语言
      const service = translationSettings?.service;
      const targetLang = translationSettings?.targetLang;

      // 获取API密钥等信息
      const { apiKey, secretKey, apiUrl, model } = await getTranslationService();

      let translation;

      if (service === 'google') {
        translation = await ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        const normalizedTargetLang = targetLang === 'zh-CN' ? 'zh' : targetLang;
        try {
          translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, normalizedTargetLang);
        } catch (siliconflowError) {
          const errStatus = (siliconflowError && typeof siliconflowError === 'object') ? siliconflowError.status : undefined;
          const errMsg = String(siliconflowError?.message || '');
          const is429 = errStatus === 429 || /\b429\b/.test(errMsg);

          if (is429) {
            try {
              showToast('AI翻译请求过于频繁（429），2秒后自动重试一次…', 'info', 2200);
            } catch (e) {
              // ignore
            }

            await new Promise((resolve) => setTimeoutRef(resolve, 2000));

            try {
              translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, normalizedTargetLang);
            } catch (retryError) {
              const retryStatus = (retryError && typeof retryError === 'object') ? retryError.status : undefined;
              const retryMsg = String(retryError?.message || '');
              const retryIs429 = retryStatus === 429 || /\b429\b/.test(retryMsg);

              if (retryIs429) {
                try {
                  showToast('AI翻译仍被限流（429），请稍后再试', 'error', 3500);
                } catch (e) {
                  // ignore
                }
                throw new Error('AI翻译请求太频繁（429），已自动重试仍失败，请稍后再试');
              }

              translation = await ApiServices.translation.google(text, 'auto', targetLang);
            }
          } else {
            translation = await ApiServices.translation.google(text, 'auto', targetLang);
          }
        }
      } else {
        translation = await ApiServices.translation.google(text, 'auto', targetLang);
      }

      return translation;
    } catch (error) {
      try {
        const msg = String(error?.message || '');
        if (msg.includes('API Key')) {
          return '翻译失败: 翻译服务需要设置有效的API密钥';
        }
      } catch (e) {
        // ignore
      }
      return '翻译失败，请检查设置和网络连接';
    }
  }

  window.WAAP.legacy.translateTextFallback = {
    legacyTranslateText
  };
})();
