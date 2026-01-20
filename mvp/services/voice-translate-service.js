(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.voiceTranslateService) return;

  async function translateFromBlobUrl(blobUrl, deps = {}) {
    const sttSvc = deps.voiceTranscribeService || window.WAAP?.services?.voiceTranscribeService;

    if (!sttSvc) {
      throw new Error('语音翻译失败：未找到 voiceTranscribeService');
    }

    if (typeof sttSvc.transcribeFromBlobUrl !== 'function') {
      if (typeof sttSvc.transcribeAndTranslateFromBlobUrl === 'function') {
        return await sttSvc.transcribeAndTranslateFromBlobUrl(blobUrl, deps);
      }
      throw new Error('语音翻译失败：STT 服务不可用');
    }

    const stt = await sttSvc.transcribeFromBlobUrl(blobUrl, deps);
    const transcript = stt?.transcript || '';

    let translated = null;
    try {
      const orch = deps.translationOrchestratorService || window.WAAP?.services?.translationOrchestratorService;
      if (orch?.translateText) {
        translated = await orch.translateText(transcript, {
          getTranslationSettings: window.getTranslationSettings,
          getTranslationService: window.getTranslationService,
          ApiServices: window.ApiServices,
          showToast: deps.showToast || window.showToast,
          showSettingsModal: window.showSettingsModal
        });
      }
    } catch (e) {
      translated = null;
    }

    return { transcript, translated, meta: stt?.meta || null };
  }

  window.WAAP.services.voiceTranslateService = {
    translateFromBlobUrl
  };
})();
