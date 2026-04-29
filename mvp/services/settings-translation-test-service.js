(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.settingsTranslationTestService) return;

  const TEST_TEXT = 'hello';
  const TEST_TARGET_LANG = 'zh-CN';

  function getFormService() {
    return window.WAAP?.services?.settingsFormService || null;
  }

  function getField(root, id) {
    try {
      return root?.querySelector?.(`#${id}`) || document.getElementById(id) || null;
    } catch (e) {
      return null;
    }
  }

  function getStatusEl(root, provider) {
    return getField(root, provider === 'deepl' ? 'deeplTestStatus' : 'openaiTestStatus');
  }

  function getButtonEl(root, provider) {
    return getField(root, provider === 'deepl' ? 'testDeepLTranslation' : 'testOpenAITranslation');
  }

  function getProviderName(provider) {
    return provider === 'deepl' ? 'DeepL' : 'OpenAI';
  }

  function normalizeResult(result) {
    if (result && typeof result === 'object' && typeof result.translation === 'string') {
      return result.translation.trim();
    }
    return String(result || '').trim();
  }

  function isExpectedTranslation(text) {
    return /你好|您好/.test(String(text || ''));
  }

  function truncate(text) {
    const raw = String(text || '').trim();
    return raw.length > 40 ? `${raw.slice(0, 40)}...` : raw;
  }

  function setStatus(root, provider, status, message) {
    const el = getStatusEl(root, provider);
    if (!el) return false;
    el.className = `translation-test-status is-${status || 'pending'}`;
    el.textContent = message || '未验证';
    return true;
  }

  function setButtonLoading(root, provider, loading) {
    const btn = getButtonEl(root, provider);
    if (!btn) return false;
    btn.disabled = loading === true;
    btn.textContent = loading ? '正在测试...' : '测试翻译';
    return true;
  }

  function clearProviderState(root, provider) {
    const formService = getFormService();
    const state = formService?.getTranslationVerificationState?.(root) || {};
    if (state.provider === provider) {
      formService.setTranslationVerificationState?.(root, {});
    }
  }

  function validateProviderConfig(root, provider) {
    const formService = getFormService();
    const profile = formService?.getTranslationVerificationProfile?.(root, provider) || { provider };
    if (provider === 'deepl' && !profile.apiKey) {
      return { ok: false, message: 'DeepL API Key 为必填项' };
    }
    if (provider === 'siliconflow' && !profile.apiKey) {
      return { ok: false, message: 'OpenAI API Key 为必填项' };
    }
    return { ok: true, profile };
  }

  async function saveVerifiedState(state) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({
          translationServiceVerifiedProvider: state.provider,
          translationServiceVerifiedSignature: state.signature,
          translationServiceVerifiedAt: state.verifiedAt,
          translationServiceVerifiedLabel: state.label
        }, () => resolve(!chrome.runtime.lastError));
      } catch (e) {
        resolve(false);
      }
    });
  }

  async function runProviderTranslation(provider, profile) {
    if (!window.ApiServices?.translation) {
      throw new Error('翻译服务未就绪，请刷新页面后重试');
    }

    if (provider === 'deepl') {
      return window.ApiServices.translation.deepl(TEST_TEXT, profile.apiKey, TEST_TARGET_LANG, {
        source: 'settings-test'
      });
    }

    return window.ApiServices.translation.siliconflow(
      TEST_TEXT,
      profile.apiKey,
      profile.apiUrl,
      profile.model,
      TEST_TARGET_LANG,
      { source: 'settings-test' }
    );
  }

  async function syncProviderStatus(root, provider) {
    const formService = getFormService();
    if (!formService?.buildTranslationVerificationSignature) return false;

    try {
      const profileValidation = validateProviderConfig(root, provider);
      if (!profileValidation.ok) {
        clearProviderState(root, provider);
        setStatus(root, provider, 'pending', '未验证');
        return false;
      }

      const signature = await formService.buildTranslationVerificationSignature(root, provider);
      const state = formService.getTranslationVerificationState?.(root) || {};
      if (state.provider === provider && state.signature === signature) {
        setStatus(root, provider, 'success', state.label ? `已验证：${state.label}` : '已验证');
        if (provider === 'deepl') formService.updateDeepLPlanFeedback?.(root);
        return true;
      }

      clearProviderState(root, provider);
      setStatus(root, provider, 'pending', '未验证，保存前请先测试');
      return false;
    } catch (e) {
      setStatus(root, provider, 'pending', '未验证');
      return false;
    }
  }

  async function syncStatus(root) {
    await syncProviderStatus(root, 'deepl');
    await syncProviderStatus(root, 'siliconflow');
  }

  async function runTest(root, provider, deps = {}) {
    const formService = getFormService();
    const showToast = deps.showToast || window.showToast;
    const name = getProviderName(provider);

    try {
      const validation = validateProviderConfig(root, provider);
      if (!validation.ok) {
        setStatus(root, provider, 'error', validation.message);
        if (typeof showToast === 'function') showToast(validation.message, 'error', 3000);
        return { ok: false, message: validation.message };
      }

      setButtonLoading(root, provider, true);
      setStatus(root, provider, 'testing', `正在测试 ${name}...`);

      const result = await runProviderTranslation(provider, validation.profile);
      const translation = normalizeResult(result);
      if (!isExpectedTranslation(translation)) {
        throw new Error(`测试翻译结果不正确：${truncate(translation) || '空结果'}`);
      }

      const signature = await formService.buildTranslationVerificationSignature(root, provider);
      const label = provider === 'deepl'
        ? (String(validation.profile.apiKey || '').trim().toLowerCase().endsWith(':fx') ? 'Free plan' : 'Pro plan')
        : 'OpenAI 已验证';
      const state = {
        provider,
        signature,
        verifiedAt: new Date().toISOString(),
        label
      };

      formService.setTranslationVerificationState?.(root, state);
      await saveVerifiedState(state);
      setStatus(root, provider, 'success', provider === 'deepl' ? `已验证：${label}` : '已验证');
      if (provider === 'deepl') formService.updateDeepLPlanFeedback?.(root);
      if (typeof showToast === 'function') showToast(`${name} 测试翻译通过`, 'success', 2600);
      return { ok: true, translation, label };
    } catch (e) {
      const message = e?.message || `${name} 测试翻译失败`;
      setStatus(root, provider, 'error', message);
      if (typeof showToast === 'function') showToast(message, 'error', 4200);
      return { ok: false, message };
    } finally {
      setButtonLoading(root, provider, false);
    }
  }

  window.WAAP.services.settingsTranslationTestService = {
    runTest,
    syncStatus,
    syncProviderStatus
  };
})();
