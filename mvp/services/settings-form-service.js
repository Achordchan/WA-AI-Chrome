(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.settingsFormService) return;

  function getNode(root, selector) {
    try {
      return root?.querySelector?.(selector) || null;
    } catch (e) {
      return null;
    }
  }

  function getField(root, id) {
    return getNode(root, `#${id}`);
  }

  function setDisplay(el, visible) {
    try {
      if (el) el.style.display = visible ? 'block' : 'none';
    } catch (e) {
      // ignore
    }
  }

  function getStorageKeys() {
    return [
      'translationApi',
      'targetLanguage',
      'sttEnabled',
      'sttApiKey',
      'sttApiUrl',
      'sttModel',
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
      'translationPromptTemplate',
      'translationReasoningPromptTemplate',
      'siliconflowApiKey_ai',
      'siliconflowApiUrl_ai',
      'siliconflowModel_ai',
      'systemRole',
      'quickChatEnabled',
      'weatherEnabled',
      'weatherShowWeather',
      'weatherShowTime',
      'weatherCacheMinutes',
      'weatherCacheAutoRenew',
      'weatherAutoRenewEvictDays'
    ];
  }

  function updateTranslationSettingsUI(root) {
    try {
      const select = getField(root, 'translationApi');
      const selectedService = select?.value || 'google';
      root?.querySelectorAll?.('#translation-settings .api-setting-group')?.forEach?.((el) => {
        el.style.display = 'none';
      });
      const settingsEl = getField(root, `${selectedService}-settings`);
      setDisplay(settingsEl, true);
    } catch (e) {
      // ignore
    }
  }

  function updateSttSettingsUI(root) {
    try {
      const enabled = getField(root, 'sttEnabled')?.checked === true;
      setDisplay(getField(root, 'stt-settings'), enabled);
    } catch (e) {
      // ignore
    }
  }

  function updateAiSettingsUI(root) {
    try {
      const enabled = getField(root, 'aiEnabled')?.checked === true;
      setDisplay(getField(root, 'ai-service-options'), enabled);
      setDisplay(getField(root, 'ai-system-role'), enabled);

      root?.querySelectorAll?.('#ai-settings .api-setting-group')?.forEach?.((el) => {
        el.style.display = 'none';
      });

      if (!enabled) return;
      const service = getField(root, 'aiApi')?.value || 'siliconflow';
      const settingsEl = getField(root, `ai-${service}-settings`);
      setDisplay(settingsEl, true);
    } catch (e) {
      // ignore
    }
  }

  function applyWeatherCacheUi(root, minutes) {
    try {
      const presets = new Set(['5', '15', '30', '60', '180', '1440']);
      let m = parseInt(String(minutes ?? ''), 10);
      if (!Number.isFinite(m) || m <= 0) m = 60;
      if (m > 10080) m = 10080;
      const mStr = String(m);

      const presetSelect = getField(root, 'weatherCachePreset');
      const minutesInput = getField(root, 'weatherCacheMinutes');
      const customWrap = getField(root, 'weatherCacheCustomWrap');

      if (presetSelect) {
        presetSelect.value = presets.has(mStr) ? mStr : 'custom';
      }

      if (minutesInput) {
        minutesInput.value = mStr;
      }

      if (customWrap) {
        customWrap.style.display = presetSelect?.value === 'custom' ? 'block' : 'none';
      }
    } catch (e) {
      // ignore
    }
  }

  function updateWeatherOptionsUI(root) {
    try {
      const enabled = getField(root, 'weatherEnabled')?.checked === true;
      const options = getField(root, 'weather-options');
      const showWeather = getField(root, 'weatherShowWeather');
      const showTime = getField(root, 'weatherShowTime');
      const cachePreset = getField(root, 'weatherCachePreset');
      const cacheMinutes = getField(root, 'weatherCacheMinutes');
      const cacheAutoRenew = getField(root, 'weatherCacheAutoRenew');
      const evictDays = getField(root, 'weatherAutoRenewEvictDays');
      const customWrap = getField(root, 'weatherCacheCustomWrap');

      setDisplay(options, enabled);
      if (showWeather) showWeather.disabled = !enabled;
      if (showTime) showTime.disabled = !enabled;
      if (cachePreset) cachePreset.disabled = !enabled;
      if (cacheMinutes) cacheMinutes.disabled = !enabled;
      if (cacheAutoRenew) cacheAutoRenew.disabled = !enabled;
      if (evictDays) evictDays.disabled = !enabled;

      if (customWrap) {
        customWrap.style.display = enabled && cachePreset?.value === 'custom' ? 'block' : 'none';
      }
    } catch (e) {
      // ignore
    }
  }

  function collectFormData(root) {
    const presetValue = getField(root, 'weatherCachePreset')?.value;
    const customValue = getField(root, 'weatherCacheMinutes')?.value;

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
      translationApi: getField(root, 'translationApi')?.value || 'google',
      targetLanguage: getField(root, 'targetLanguage')?.value || 'zh-CN',
      sttEnabled: getField(root, 'sttEnabled')?.checked === true,
      sttApi: 'openai',
      sttApiKey: getField(root, 'sttApiKey')?.value || '',
      sttApiUrl: getField(root, 'sttApiUrl')?.value || '',
      sttModel: getField(root, 'sttModel')?.value || '',
      autoTranslateNewMessages: getField(root, 'autoTranslateNewMessages')?.checked === true,
      inputQuickTranslateSend: getField(root, 'inputQuickTranslateSend')?.checked === true,
      aiEnabled: getField(root, 'aiEnabled')?.checked === true,
      quickChatEnabled: getField(root, 'quickChatEnabled')?.checked === true,
      weatherEnabled: getField(root, 'weatherEnabled')?.checked !== false,
      weatherShowWeather: getField(root, 'weatherShowWeather')?.checked !== false,
      weatherShowTime: getField(root, 'weatherShowTime')?.checked !== false,
      weatherCacheMinutes,
      weatherCacheAutoRenew: getField(root, 'weatherCacheAutoRenew')?.checked !== false,
      weatherAutoRenewEvictDays: (() => {
        let d = parseInt(String(getField(root, 'weatherAutoRenewEvictDays')?.value ?? ''), 10);
        if (!Number.isFinite(d) || d < 0) d = 10;
        if (d > 365) d = 365;
        return d;
      })(),
      translationPromptTemplate: getField(root, 'translationPromptTemplate')?.value || '',
      translationReasoningPromptTemplate: getField(root, 'translationReasoningPromptTemplate')?.value || ''
    };

    if (formData.translationApi === 'siliconflow') {
      formData.siliconflowApiKey = getField(root, 'siliconflowApiKey')?.value || '';
      formData.siliconflowApiUrl = getField(root, 'siliconflowApiUrl')?.value || '';
      formData.siliconflowModel = getField(root, 'siliconflowModel')?.value || '';
      formData.openaiTemperature = parseFloat(String(getField(root, 'openaiTemperature')?.value || '0.7'));
      formData.openaiReasoningEnabled = getField(root, 'openaiReasoningEnabled')?.checked === true;
    }

    if (formData.aiEnabled) {
      formData.aiApi = 'siliconflow';
      formData.aiTargetLanguage = getField(root, 'aiTargetLanguage')?.value || 'zh-CN';
      formData.siliconflowApiKey_ai = getField(root, 'siliconflowApiKey_ai')?.value || '';
      formData.siliconflowApiUrl_ai = getField(root, 'siliconflowApiUrl_ai')?.value || '';
      formData.siliconflowModel_ai = getField(root, 'siliconflowModel_ai')?.value || '';
      formData.systemRole = getField(root, 'systemRole')?.value || '';
    }

    return formData;
  }

  function applyStoredSettings(root, data, deps = {}) {
    try {
      const defaults = typeof deps.getTranslationPromptDefaults === 'function'
        ? deps.getTranslationPromptDefaults()
        : { normal: '', reasoning: '' };

      const allowedTranslationApi = data?.translationApi === 'siliconflow' ? 'siliconflow' : 'google';
      const translationApi = getField(root, 'translationApi');
      if (translationApi) translationApi.value = allowedTranslationApi;
      const targetLanguage = getField(root, 'targetLanguage');
      if (targetLanguage && data?.targetLanguage) targetLanguage.value = data.targetLanguage;

      const sttEnabled = getField(root, 'sttEnabled');
      if (sttEnabled) sttEnabled.checked = data?.sttEnabled === true;
      const sttApiKey = getField(root, 'sttApiKey');
      if (sttApiKey) sttApiKey.value = String(data?.sttApiKey || '');
      const sttApiUrl = getField(root, 'sttApiUrl');
      if (sttApiUrl) sttApiUrl.value = String(data?.sttApiUrl || '');
      const sttModel = getField(root, 'sttModel');
      if (sttModel) sttModel.value = String(data?.sttModel || '');

      const autoTranslate = getField(root, 'autoTranslateNewMessages');
      if (autoTranslate) autoTranslate.checked = data?.autoTranslateNewMessages === true;
      const quickSend = getField(root, 'inputQuickTranslateSend');
      if (quickSend) quickSend.checked = data?.inputQuickTranslateSend === true;
      const quickChat = getField(root, 'quickChatEnabled');
      if (quickChat) quickChat.checked = data?.quickChatEnabled !== false;

      const aiEnabled = getField(root, 'aiEnabled');
      if (aiEnabled) aiEnabled.checked = data?.aiEnabled === true;
      const aiApi = getField(root, 'aiApi');
      if (aiApi) aiApi.value = 'siliconflow';
      const aiTargetLanguage = getField(root, 'aiTargetLanguage');
      if (aiTargetLanguage && data?.aiTargetLanguage) aiTargetLanguage.value = data.aiTargetLanguage;

      const apiKey = getField(root, 'siliconflowApiKey');
      if (apiKey) apiKey.value = String(data?.siliconflowApiKey || '');
      const apiUrl = getField(root, 'siliconflowApiUrl');
      if (apiUrl) apiUrl.value = String(data?.siliconflowApiUrl || '');
      const model = getField(root, 'siliconflowModel');
      if (model) model.value = String(data?.siliconflowModel || '');

      const temperatureSlider = getField(root, 'openaiTemperature');
      const temperatureValue = getField(root, 'openaiTemperatureValue');
      if (temperatureSlider && data?.openaiTemperature !== undefined) {
        temperatureSlider.value = String(data.openaiTemperature);
        if (temperatureValue) temperatureValue.textContent = String(data.openaiTemperature);
      }

      const reasoningEnabled = getField(root, 'openaiReasoningEnabled');
      if (reasoningEnabled && data?.openaiReasoningEnabled !== undefined) {
        reasoningEnabled.checked = data.openaiReasoningEnabled === true;
      }

      const promptNormal = getField(root, 'translationPromptTemplate');
      if (promptNormal) promptNormal.value = String(data?.translationPromptTemplate || defaults.normal || '');
      const promptReasoning = getField(root, 'translationReasoningPromptTemplate');
      if (promptReasoning) {
        promptReasoning.value = String(data?.translationReasoningPromptTemplate || defaults.reasoning || '');
      }

      const aiApiKey = getField(root, 'siliconflowApiKey_ai');
      if (aiApiKey) aiApiKey.value = String(data?.siliconflowApiKey_ai || data?.siliconflowApiKey || '');
      const aiApiUrl = getField(root, 'siliconflowApiUrl_ai');
      if (aiApiUrl) {
        aiApiUrl.value = String(data?.siliconflowApiUrl_ai || data?.siliconflowApiUrl || 'https://api.openai.com/v1/chat/completions');
      }
      const aiModel = getField(root, 'siliconflowModel_ai');
      if (aiModel) aiModel.value = String(data?.siliconflowModel_ai || data?.siliconflowModel || 'gpt-5.4-codex');

      const systemRole = getField(root, 'systemRole');
      if (systemRole && data?.systemRole) systemRole.value = data.systemRole;

      const weatherEnabled = getField(root, 'weatherEnabled');
      if (weatherEnabled) weatherEnabled.checked = data?.weatherEnabled !== false;
      const weatherShowWeather = getField(root, 'weatherShowWeather');
      if (weatherShowWeather) weatherShowWeather.checked = data?.weatherShowWeather !== false;
      const weatherShowTime = getField(root, 'weatherShowTime');
      if (weatherShowTime) weatherShowTime.checked = data?.weatherShowTime !== false;
      const weatherCacheAutoRenew = getField(root, 'weatherCacheAutoRenew');
      if (weatherCacheAutoRenew) weatherCacheAutoRenew.checked = data?.weatherCacheAutoRenew !== false;

      const weatherAutoRenewEvictDays = getField(root, 'weatherAutoRenewEvictDays');
      if (weatherAutoRenewEvictDays) {
        let evictDays = parseInt(String(data?.weatherAutoRenewEvictDays ?? ''), 10);
        if (!Number.isFinite(evictDays) || evictDays < 0) evictDays = 10;
        if (evictDays > 365) evictDays = 365;
        weatherAutoRenewEvictDays.value = String(evictDays);
      }

      let cacheMinutes = parseInt(String(data?.weatherCacheMinutes ?? ''), 10);
      if (!Number.isFinite(cacheMinutes) || cacheMinutes <= 0) cacheMinutes = 60;
      if (cacheMinutes > 10080) cacheMinutes = 10080;
      applyWeatherCacheUi(root, cacheMinutes);

      updateTranslationSettingsUI(root);
      updateSttSettingsUI(root);
      updateAiSettingsUI(root);
      updateWeatherOptionsUI(root);
    } catch (e) {
      // ignore
    }
  }

  window.WAAP.services.settingsFormService = {
    getStorageKeys,
    updateTranslationSettingsUI,
    updateSttSettingsUI,
    updateAiSettingsUI,
    updateWeatherOptionsUI,
    applyWeatherCacheUi,
    collectFormData,
    applyStoredSettings
  };
})();
