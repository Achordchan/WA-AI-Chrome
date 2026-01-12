(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.translationOrchestratorService) return;

  async function translateText(text, deps = {}) {
    try {
      const getTranslationSettings = deps.getTranslationSettings || window.getTranslationSettings;
      const getTranslationService = deps.getTranslationService || window.getTranslationService;
      const ApiServices = deps.ApiServices || window.ApiServices;
      const showToast = deps.showToast || window.showToast;
      const showSettingsModal = deps.showSettingsModal || window.showSettingsModal;

      const getErrStatus = (err) => {
        try {
          if (err && typeof err === 'object' && typeof err.status === 'number') return err.status;
        } catch (e) {
          // ignore
        }
        return undefined;
      };

      const safeToast = (message, type = 'info', duration = 3200) => {
        try {
          if (typeof showToast === 'function') {
            showToast(message, type, duration);
          }
        } catch (e) {
          // ignore
        }
      };

      const safeOpenSettings = () => {
        try {
          if (typeof showSettingsModal === 'function') {
            showSettingsModal();
            return true;
          }
        } catch (e) {
          // ignore
        }
        return false;
      };

      const makeAuthError = (status, serviceName = 'AI翻译') => {
        try {
          const s = status || '401/403';
          const err = new Error(`翻译失败：${serviceName}鉴权失败（${s}）。请打开设置填写正确的 API Key，或切换回免费的 Google 翻译。`);
          err.waapNoLegacyFallback = true;
          err.waapUserVisible = true;
          err.status = status;
          err.code = 'AUTH_ERROR';
          return err;
        } catch (e) {
          const err = new Error('翻译失败：鉴权失败。请检查 API Key 或切换 Google 翻译。');
          err.waapNoLegacyFallback = true;
          err.waapUserVisible = true;
          err.code = 'AUTH_ERROR';
          return err;
        }
      };

      if (typeof getTranslationSettings !== 'function') {
        throw new Error('Translation settings function not found');
      }
      if (typeof getTranslationService !== 'function') {
        throw new Error('Translation service function not found');
      }
      if (!ApiServices?.translation) {
        throw new Error('Translation API services not available');
      }

      const translationSettings = await getTranslationSettings();
      const service = translationSettings.service;
      const targetLang = translationSettings.targetLang;

      const { apiKey, secretKey, apiUrl, model } = await getTranslationService();

      let translation;

      if (service === 'google') {
        translation = await ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        const normalizedTargetLang = targetLang === 'zh-CN' ? 'zh' : targetLang;
        try {
          translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, normalizedTargetLang);
        } catch (siliconflowError) {
          const errStatus = getErrStatus(siliconflowError);
          const errMsg = String(siliconflowError?.message || '');
          const is429 = errStatus === 429 || /\b429\b/.test(errMsg);
          const isAuth = errStatus === 401 || errStatus === 403 || /\b401\b/.test(errMsg) || /\b403\b/.test(errMsg);

          if (isAuth) {
            safeToast(`AI翻译鉴权失败（${errStatus || '401/403'}），已为你打开设置：请填写正确的 Key 或切换到免费 Google 翻译`, 'error', 5200);
            safeOpenSettings();
            throw makeAuthError(errStatus, 'AI翻译');
          }

          if (is429) {
            try {
              if (typeof showToast === 'function') {
                showToast('AI翻译请求过于频繁（429），2秒后自动重试一次…', 'info', 2200);
              }
            } catch (e) {
              // ignore
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));

            try {
              translation = await ApiServices.translation[service](text, apiKey, apiUrl, model, normalizedTargetLang);
            } catch (retryError) {
              const retryStatus = getErrStatus(retryError);
              const retryMsg = String(retryError?.message || '');
              const retryIs429 = retryStatus === 429 || /\b429\b/.test(retryMsg);
              const retryIsAuth = retryStatus === 401 || retryStatus === 403 || /\b401\b/.test(retryMsg) || /\b403\b/.test(retryMsg);

              if (retryIs429) {
                try {
                  if (typeof showToast === 'function') {
                    showToast('AI翻译仍被限流（429），请稍后再试', 'error', 3500);
                  }
                } catch (e) {
                  // ignore
                }
                throw new Error('AI翻译请求太频繁（429），已自动重试仍失败，请稍后再试');
              }

              if (retryIsAuth) {
                safeToast(`AI翻译鉴权失败（${retryStatus || '401/403'}），已为你打开设置：请填写正确的 Key 或切换到免费 Google 翻译`, 'error', 5200);
                safeOpenSettings();
                throw makeAuthError(retryStatus, 'AI翻译');
              }

              safeToast('AI翻译失败，已自动回退到谷歌翻译', 'info', 3200);
              translation = await ApiServices.translation.google(text, 'auto', targetLang);
            }
          } else {
            safeToast('AI翻译失败，已自动回退到谷歌翻译', 'info', 3200);
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

  window.WAAP.services.translationOrchestratorService = {
    translateText
  };
})();
