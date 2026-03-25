let pluginStatus = (() => {
  try {
    const svc = window.WAAP?.services?.contentStateService;
    if (svc?.getPluginStatus) {
      const ps = svc.getPluginStatus();
      if (ps && typeof ps === 'object') return ps;
    }
  } catch (e) {
    // ignore
  }

  try {
    const ps = window.WAAP?.state?.pluginStatus;
    if (ps && typeof ps === 'object') return ps;
  } catch (e) {
    // ignore
  }

  return {
    translation: false,
    observer: false,
    apiService: false,
    weatherInfo: false
  };
})();

try {
  if (window.WAAP && window.WAAP.state) {
    if (!window.WAAP.state.pluginStatus) {
      window.WAAP.state.pluginStatus = pluginStatus;
    }
  }
} catch (e) {
  // ignore
}

function getContentState() {
  try {
    try {
      const svc = window.WAAP?.services?.contentStateService;
      if (svc?.getContentState) {
        const v = svc.getContentState();
        if (v && typeof v === 'object') return v;
      }
    } catch (e0) {
      // ignore
    }

    if (!window.WAAP) window.WAAP = {};
    if (!window.WAAP.state) window.WAAP.state = {};
    if (!window.WAAP.state.content) window.WAAP.state.content = {};

    const s = window.WAAP.state.content;
    if (!s.pluginStatus) s.pluginStatus = window.WAAP.state.pluginStatus || pluginStatus;

    if (typeof s.autoTranslateNewMessagesEnabled !== 'boolean') s.autoTranslateNewMessagesEnabled = false;
    if (typeof s.weatherInfoEnabled !== 'boolean') s.weatherInfoEnabled = true;
    if (typeof s.sttEnabled !== 'boolean') s.sttEnabled = false;
    if (typeof s.contentScriptInitStarted !== 'boolean') s.contentScriptInitStarted = false;
    if (typeof s.contentScriptInitialized !== 'boolean') s.contentScriptInitialized = false;

    return s;
  } catch (e) {
    return {
      pluginStatus,
      autoTranslateNewMessagesEnabled: false,
      weatherInfoEnabled: true,
      sttEnabled: false,
      contentScriptInitStarted: false,
      contentScriptInitialized: false
    };
  }
}

function buildDeps(extra = {}) {
  try {
    return Object.assign(
      {
        window: window,
        document: window.document,
        setTimeout: window.setTimeout,
        MutationObserver: window.MutationObserver,
        chrome: window.chrome,
        location: window.location,
        alert: window.alert,
        requestAnimationFrame: window.requestAnimationFrame,
        Event: window.Event
      },
      extra
    );
  } catch (e) {
    return extra || {};
  }
}

try {
  if (window.WAAP?.services?.runtimeMessageRouter?.install) {
    window.WAAP.services.runtimeMessageRouter.install();
  }
} catch (e) {
  // ignore
}

function showTranslateConfirmDialog(messageContainer) {
  try {
    if (window.WAAP?.presenters?.translationPresenter?.confirmTranslateAll) {
      const ok = window.WAAP.presenters.translationPresenter.confirmTranslateAll(messageContainer, {
        translateAllMessages
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  showModuleLoadFailedFallback('批量翻译');
}

function isAutoTranslateEnabled() {
  return getContentState().autoTranslateNewMessagesEnabled === true;
}

function isSttEnabled() {
  return getContentState().sttEnabled === true;
}

function applyAutoTranslateEnabled(enabled) {
  const state = getContentState();
  state.autoTranslateNewMessagesEnabled = enabled === true;
  try {
    const orch = window.WAAP?.services?.settingsStateOrchestrator;
    if (orch?.applyAutoTranslateSideEffects) {
      orch.applyAutoTranslateSideEffects(state.autoTranslateNewMessagesEnabled, {
        autoTranslatePresenter: window.WAAP?.presenters?.autoTranslatePresenter
      });
      return;
    }
  } catch (e0) {
    // ignore
  }
  try {
    if (window.WAAP?.presenters?.autoTranslatePresenter?.setEnabled) {
      window.WAAP.presenters.autoTranslatePresenter.setEnabled(state.autoTranslateNewMessagesEnabled);
    }
  } catch (e) {
    // ignore
  }
}

function applySttEnabled(enabled) {
  const state = getContentState();
  state.sttEnabled = enabled === true;

  try {
    const presenter = window.WAAP?.presenters?.messageProcessingPresenter;
    if (!state.sttEnabled) {
      presenter?.removeVoiceTranscribeButtons?.(document);
      return;
    }
  } catch (e) {
    // ignore
  }

  try {
    const presenter = window.WAAP?.presenters?.messageProcessingPresenter;
    if (!presenter?.processMessage) return;
    const voiceMarkers = document.querySelectorAll(
      'span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]'
    );
    voiceMarkers.forEach((m) => {
      try {
        const root = m.closest?.('div[tabindex="-1"], div[data-pre-plain-text]');
        if (root) presenter.processMessage(root, { isSttEnabled });
      } catch (e2) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }
}
 
 function legacyLoadAutoTranslateSetting() {
  try {
    const fallback = window.WAAP?.legacy?.settingsSyncFallback;
    if (fallback?.loadAutoTranslateSetting) {
      const ok = fallback.loadAutoTranslateSetting({
        chrome: window.chrome,
        onAutoTranslateChanged: (enabled) => {
          applyAutoTranslateEnabled(enabled);
        }
      });
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

 function legacyLoadWeatherInfoSetting() {
  try {
    const fallback = window.WAAP?.legacy?.settingsSyncFallback;
    if (fallback?.loadWeatherInfoSetting) {
      const ok = fallback.loadWeatherInfoSetting({
        chrome: window.chrome,
        onWeatherEnabledChanged: (enabled) => {
          getContentState().weatherInfoEnabled = enabled !== false;
        }
      });
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function legacyLoadSttSetting() {
  try {
    const fallback = window.WAAP?.legacy?.settingsSyncFallback;
    if (fallback?.loadSttSetting) {
      const ok = fallback.loadSttSetting({
        chrome: window.chrome,
        onSttEnabledChanged: (enabled) => {
          applySttEnabled(enabled);
        }
      });
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function legacyInstallSettingsStorageListeners() {
  try {
    const fallback = window.WAAP?.legacy?.settingsSyncFallback;
    if (fallback?.installSettingsStorageListeners) {
      const ok = fallback.installSettingsStorageListeners({
        chrome: window.chrome,
        onAutoTranslateChanged: (enabled) => {
          applyAutoTranslateEnabled(enabled);
        },
        onWeatherEnabledChanged: (enabled) => {
          getContentState().weatherInfoEnabled = enabled !== false;
        },
        onSttEnabledChanged: (enabled) => {
          applySttEnabled(enabled);
        }
      });
      if (ok) return true;
    }
  } catch (e2) {
    // ignore
  }
  return false;
}

function installSettingsSyncService() {
  try {
    const orch = window.WAAP?.services?.settingsStateOrchestrator;
    if (orch?.install) {
      const ok = orch.install({
        chrome: window.chrome,
        settingsSyncService: window.WAAP?.services?.settingsSyncService,
        settingsSyncFallback: window.WAAP?.legacy?.settingsSyncFallback,
        autoTranslatePresenter: window.WAAP?.presenters?.autoTranslatePresenter,
        onStateChanged: (enabled) => {
          getContentState().autoTranslateNewMessagesEnabled = enabled === true;
        },
        onWeatherEnabledChanged: (enabled) => {
          getContentState().weatherInfoEnabled = enabled !== false;
        },
        onSttEnabledChanged: (enabled) => {
          applySttEnabled(enabled);
        }
      });
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    const svc = window.WAAP?.services?.settingsSyncService;
    if (svc?.install) {
      const ok = svc.install({
        onAutoTranslateChanged: (enabled) => {
          applyAutoTranslateEnabled(enabled);
        },
        onWeatherEnabledChanged: (enabled) => {
          getContentState().weatherInfoEnabled = enabled !== false;
        },
        onSttEnabledChanged: (enabled) => {
          applySttEnabled(enabled);
        }
      });
      if (ok) return true;
    }
  } catch (e2) {
    // ignore
  }
  return false;
}

try {
  if (!installSettingsSyncService()) {
    legacyLoadAutoTranslateSetting();
    legacyLoadWeatherInfoSetting();
    legacyLoadSttSetting();
    legacyInstallSettingsStorageListeners();
  }
} catch (e) {
  // ignore
}

function scheduleAutoTranslateOnChatEnter() {
  try {
    if (window.WAAP?.presenters?.autoTranslatePresenter?.scheduleOnChatEnter) {
      return window.WAAP.presenters.autoTranslatePresenter.scheduleOnChatEnter();
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function maybeAutoTranslateNewMessage(messageElement, deps = {}) {
  try {
    if (window.WAAP?.presenters?.autoTranslatePresenter?.maybeAutoTranslateNewMessage) {
      return window.WAAP.presenters.autoTranslatePresenter.maybeAutoTranslateNewMessage(messageElement, deps);
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function autoTranslateNewestMessagesInChat(count = 1) {
  try {
    if (!isAutoTranslateEnabled()) return;
    const getAll = window.WAAP?.services?.whatsappDomService?.getMessageElementsInActiveChat;
    const all = typeof getAll === 'function' ? getAll() : [];
    if (!all || all.length === 0) return;
    const start = Math.max(0, all.length - count);
    const newest = all.slice(start);
    newest.forEach((m) => {
      maybeAutoTranslateNewMessage(m, {
        getMessageTextRoot,
        collectTextContent
      });
    });
  } catch (e) {
    // ignore
  }
}

function triggerAutoTranslateScan() {
  return scheduleAutoTranslateOnChatEnter();
}

function getAutoTranslateState() {
  try {
    if (window.WAAP?.presenters?.autoTranslatePresenter?.getState) {
      return window.WAAP.presenters.autoTranslatePresenter.getState();
    }
  } catch (e) {
    // ignore
  }
  return {
    enabled: isAutoTranslateEnabled(),
    queueLength: -1,
    queueRunning: false
  };
}

 function integrateWeatherInfo(options = {}) {
  try {
    const presenter = window.WAAP?.presenters?.weatherIntegrationPresenter;
    if (presenter?.integrate) {
      return presenter.integrate(options, {
        WeatherInfo: window.WeatherInfo,
        whatsappDomService: window.WAAP?.services?.whatsappDomService,
        isEnabled: () => getContentState().weatherInfoEnabled
      });
    }
  } catch (e) {
    // ignore
  }

  return false;
 }

 // 手动触发天气信息功能的函数（用于调试）
function triggerWeatherInfo() {
  console.log('🔧 手动触发天气信息功能...');
  return integrateWeatherInfo({ force: true });
}

// 在各个功能初始化成功时更新状态
function updatePluginStatus(feature, status) {
  pluginStatus[feature] = status;
  console.log(`Plugin status updated - ${feature}:`, status);
}

try {
  const svc = window.WAAP?.services?.contentActionsBridgeService;
  if (svc?.registerHealthCheck) {
    svc.registerHealthCheck({
      getContentState,
      isAutoTranslateEnabled,
      pluginStatus
    });
  }
} catch (e) {
  // ignore
}

function showModuleLoadFailedFallback(moduleName, fallbackText) {
  try {
    const notice = window.WAAP?.services?.contentFallbackNoticeService;
    if (notice?.showModuleLoadFailed) {
      notice.showModuleLoadFailed(moduleName, { showToast });
      return;
    }

    const text =
      fallbackText || `${moduleName}模块加载失败，请刷新页面或重新加载扩展后重试`;
    if (text && typeof showToast === 'function') {
      showToast(text, 'error', 3000);
    }
  } catch (e) {
    // ignore
  }
}

// 修改初始化函数
async function initialize() {
  try {
    const st = getContentState();
    if (window.WAAP?.presenters?.contentOrchestratorPresenter?.initialize) {
      const result = await window.WAAP.presenters.contentOrchestratorPresenter.initialize({
        isInitialized: () => st.contentScriptInitialized,
        isInitStarted: () => st.contentScriptInitStarted,
        markInitStarted: () => {
          st.contentScriptInitStarted = true;
        },
        markInitialized: () => {
          st.contentScriptInitialized = true;
        },
        markInitFailed: () => {
          st.contentScriptInitStarted = false;
        },
        updatePluginStatus,
        checkAndShowUpdateLog: window.checkAndShowUpdateLog,
        injectStyles,
        observeMessages,
        initializeInputTranslate: window.initializeInputTranslate,
        WeatherInfo: window.WeatherInfo,
        quickChatPresenter: window.WAAP?.presenters?.quickChatPresenter,
        weatherIntegrationPresenter: window.WAAP?.presenters?.weatherIntegrationPresenter,
        integrateWeatherInfo,
        document: window.document,
        setTimeout: window.setTimeout
      });

      return result?.ok === true;
    }
  } catch (e) {
    // ignore
  }

  try {
    getContentState().contentScriptInitStarted = false;
  } catch (e) {
    // ignore
  }

  showModuleLoadFailedFallback('内容初始化');
  return false;
}

// 将初始化函数暴露到window对象
try {
  if (typeof window.initialize !== 'function') {
    window.initialize = initialize;
  }
} catch (e) {
  // ignore
}

function isChatWindowActiveForHeaderButtons() {
  const dom = window.WAAP?.services?.whatsappDomService;
  const main = dom?.getMain ? dom.getMain() : document.querySelector('#main');
  if (!main) return false;

  if (typeof dom?.isChatWindowExists === 'function') {
    if (dom.isChatWindowExists()) return true;
  }

  const header = dom?.getMainHeader ? dom.getMainHeader(main) : main.querySelector('header');
  if (header) return true;

  const footer = dom?.getMainFooter ? dom.getMainFooter(main) : main.querySelector('footer');
  if (footer) return true;

  if (main.querySelector('[data-testid="conversation-panel-messages"], div[data-pre-plain-text]')) return true;

  return false;
}

// 自动启动：只有进入聊天窗口后才会触发一次 initialize()
let autoInitHandle = null;
try {
  if (window.WAAP?.presenters?.autoInitPresenter?.setup) {
    const st = getContentState();
    autoInitHandle = window.WAAP.presenters.autoInitPresenter.setup({
      initialize,
      isChatWindowActive: isChatWindowActiveForHeaderButtons,
      isInitialized: () => st.contentScriptInitialized,
      isInitStarted: () => st.contentScriptInitStarted
    });
  }
} catch (e) {
  // ignore
}

if (!autoInitHandle) {
  try {
    const st = getContentState();
    const tryOnce = () => {
      try {
        if (st.contentScriptInitialized || st.contentScriptInitStarted) return;
        if (!isChatWindowActiveForHeaderButtons()) return;
        initialize();
      } catch (e) {
        // ignore
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(tryOnce, 500);
      });
    } else {
      setTimeout(tryOnce, 500);
    }
  } catch (e) {
    // 忽略自动启动失败，不影响其它功能
  }
}

// 页面加载完成后，自动尝试集成天气信息
try {
  const presenter = window.WAAP?.presenters?.weatherIntegrationPresenter;
  if (presenter?.setupAutoIntegrate) {
    presenter.setupAutoIntegrate({
      document: window.document,
      setTimeout: window.setTimeout,
      integrateWeatherInfo
    });
  }
} catch (e) {
  // ignore
}

async function translateText(text) {
  try {
    if (window.WAAP?.services?.translationOrchestratorService?.translateText) {
      return await window.WAAP.services.translationOrchestratorService.translateText(text, {
        getTranslationSettings: window.getTranslationSettings,
        getTranslationService: window.getTranslationService,
        ApiServices: window.ApiServices,
        showToast,
        showSettingsModal
      });
    }
  } catch (e) {
    try {
      if (e && typeof e === 'object' && e.waapNoLegacyFallback === true) {
        throw e;
      }
      if (e && typeof e === 'object' && e.waapUserVisible === true) {
        throw e;
      }
    } catch (rethrow) {
      throw rethrow;
    }
  }

  showModuleLoadFailedFallback('翻译');
  return '';
}

function addTranslateButton(messageElement) {
  try {
    if (window.WAAP?.presenters?.messageProcessingPresenter?.addTranslateButton) {
      return window.WAAP.presenters.messageProcessingPresenter.addTranslateButton(messageElement, {
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        maybeScrollChatToBottom,
        translateMessage
      });
    }
  } catch (e) {
    // ignore
  }

  return false;
}

function processMessage(message) {
  try {
    if (window.WAAP?.presenters?.messageProcessingPresenter?.processMessage) {
      return window.WAAP.presenters.messageProcessingPresenter.processMessage(message, {
        addTranslateButton,
        chrome: window.chrome,
        showToast: window.showToast,
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        maybeScrollChatToBottom,
        translateMessage,
        isSttEnabled
      });
    }
  } catch (e) {
    // ignore
  }

  return false;
}

function getMessageTextRoot(messageElement) {
  try {
    if (window.WAAP?.presenters?.messageProcessingPresenter?.getMessageTextRoot) {
      const v = window.WAAP.presenters.messageProcessingPresenter.getMessageTextRoot(messageElement);
      if (v) return v;
    }
  } catch (e) {
    // ignore
  }

  if (!messageElement) return null;
  try {
    return messageElement.querySelector?.('.selectable-text') || messageElement;
  } catch (e2) {
    return messageElement;
  }
}

function getChatScrollContainer() {
  try {
    const svc = window.WAAP?.services?.whatsappDomService;
    if (svc?.getChatScrollContainer) {
      return svc.getChatScrollContainer();
    }
  } catch (e) {
    return null;
  }

  try {
    const svc = window.WAAP?.services?.whatsappDomService;
    const main = svc?.getMain ? svc.getMain() : document.querySelector('#main');
    if (!main) return null;
    return main.querySelector('[data-testid="conversation-panel-messages"]') || null;
  } catch (e2) {
    return null;
  }
}

function isNearBottom(el, threshold = 160) {
  try {
    const svc = window.WAAP?.services?.whatsappDomService;
    if (svc?.isNearBottom) {
      return svc.isNearBottom(el, threshold);
    }
  } catch (e) {
    return false;
  }

  try {
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
  } catch (e2) {
    return false;
  }
}

function maybeScrollChatToBottom(messageContainer) {
  try {
    const svc = window.WAAP?.services?.whatsappDomService;
    if (svc?.maybeScrollChatToBottom) {
      return svc.maybeScrollChatToBottom(messageContainer, {
        requestAnimationFrame: window.requestAnimationFrame
      });
    }
  } catch (e) {
    // ignore
  }

  try {
    if (!messageContainer || messageContainer.dataset.waaiShouldScrollBottom !== 'true') return;
    const scroller = getChatScrollContainer();
    if (!scroller) return;
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
      requestAnimationFrame(() => {
        scroller.scrollTop = scroller.scrollHeight;
      });
    });
  } catch (e2) {
    // ignore
  }
}

async function translateMessage(messageElement) {
  try {
    if (window.WAAP?.presenters?.translateMessagePresenter?.translateMessage) {
      return await window.WAAP.presenters.translateMessagePresenter.translateMessage(messageElement, {
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        displayTranslationResult,
        maybeScrollChatToBottom,
        getChatScrollContainer,
        isNearBottom
      });
    }
  } catch (e) {
    // ignore
  }

  showModuleLoadFailedFallback('翻译');
  return false;
}

function typeWriter(element, text, speed = 10, callback) {
  try {
    const svc = window.WAAP?.services?.translationRenderService;
    if (svc?.typeWriter) {
      return svc.typeWriter(element, text, speed, callback, {
        setTimeout: window.setTimeout
      });
    }
  } catch (e) {
    // ignore
  }

  try {
    if (element) {
      element.textContent = String(text || '');
    }
    if (typeof callback === 'function') {
      callback();
    }
  } catch (e) {
    // ignore
  }

  return {
    stop: () => {},
    finish: () => {}
  };
}

function displayTranslationResult(container, translationText, isDarkMode, renderDeps = {}) {
  try {
    const svc = window.WAAP?.services?.translationRenderService;
    if (svc?.displayTranslationResult) {
      const ok = svc.displayTranslationResult(container, translationText, isDarkMode, {
        document: window.document,
        maybeScrollChatToBottom,
        ...(renderDeps && typeof renderDeps === 'object' ? renderDeps : {})
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'translation-content';
    el.textContent = String(translationText || '');
    container.appendChild(el);
    maybeScrollChatToBottom(container);
  } catch (e) {
    // ignore
  }
}

function collectTextContent(element) {
  try {
    if (window.WAAP?.services?.messageTextService?.collectTextContent) {
      return window.WAAP.services.messageTextService.collectTextContent(element);
    }
  } catch (e) {
    // ignore
  }

  if (!element) return '';
  try {
    return String(element.textContent || '').trim();
  } catch (e) {
    return '';
  }
}

// ...

function addAnalysisButton(messageContainer) {
  try {
    if (messageContainer?.querySelector && messageContainer.querySelector('.analysis-btn-container')) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (window.WAAP?.presenters?.toolbarPresenter?.ensureToolbar) {
      return window.WAAP.presenters.toolbarPresenter.ensureToolbar(messageContainer, {
        showSettingsModal,
        showTranslateConfirmDialog,
        translateAllMessages,
        analyzeConversation,
        checkAiEnabled,
        getAiService: window.getAiService,
        ApiServices: window.ApiServices,
        getMessageTextRoot,
        collectTextContent
      });
    }
  } catch (e) {
    // ignore
  }

  return false;
}

function observeMessages() {
  try {
    if (window.WAAP?.presenters?.messageObserverPresenter?.observeMessages) {
      const cleanup = window.WAAP.presenters.messageObserverPresenter.observeMessages({
        integrateWeatherInfo,
        addAnalysisButton,
        processMessage,
        getMessageTextRoot,
        collectTextContent,
        maybeAutoTranslateNewMessage,
        isAutoTranslateEnabled
      });
      if (typeof cleanup === 'function') return cleanup;
      if (cleanup === true) return () => {};
    }
  } catch (e) {
    // ignore
  }

  return () => {};
}

// 更新样式
function injectStyles() {
  try {
    const fallback = window.WAAP?.legacy?.injectStylesFallback;
    if (fallback?.injectStyles) {
      const ok = fallback.injectStyles({ document: window.document });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }
}

// 添加分析按钮到消息容器
 

// 添加翻译所有消息的函数
async function translateAllMessages(messageContainer) {
  try {
    if (window.WAAP?.presenters?.batchTranslatePresenter?.translateAllMessages) {
      const ok = await window.WAAP.presenters.batchTranslatePresenter.translateAllMessages(messageContainer, {
        showToast,
        ApiServices: window.ApiServices,
        getMessageTextRoot,
        collectTextContent
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  showModuleLoadFailedFallback('批量翻译');
  return false;
}

// 分析对话内容
async function analyzeConversation(messageContainer) {
  try {
    if (window.WAAP?.presenters?.analysisPresenter?.open) {
      await window.WAAP.presenters.analysisPresenter.open(messageContainer, {
        checkAiEnabled,
        showSettingsModal,
        getAiService: window.getAiService,
        ApiServices: window.ApiServices,
        getMessageTextRoot,
        collectTextContent
      });
      return true;
    }
  } catch (error) {
    console.error('Analysis error:', error);
    showAnalysisError(messageContainer, error.message);
    return false;
  }

  showModuleLoadFailedFallback('AI 分析');
  return false;
}

// 添加检查AI功能是否启用的函数
async function checkAiEnabled() {
  try {
    const svc = window.WAAP?.services?.aiSettingsService;
    if (svc?.checkAiEnabled) {
      return await svc.checkAiEnabled({ chrome: window.chrome, logger: console });
    }
  } catch (e) {
    // ignore
  }

  // 内联兜底
  return false;
}

function showAnalysisResult(container, analysis) {
  try {
    const presenter = window.WAAP?.presenters?.analysisPresenter;
    if (presenter?.showResult) return presenter.showResult(container, analysis);
  } catch (e) {
    // ignore
  }

  try {
    const panel = document.createElement('div');
    panel.className = 'analysis-panel';
    const pre = document.createElement('pre');
    pre.className = 'analysis-text';
    pre.textContent = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    panel.appendChild(pre);
    container?.appendChild?.(panel);
  } catch (e) {
    // ignore
  }
}

function showAnalysisError(container, message) {
  try {
    const presenter = window.WAAP?.presenters?.analysisPresenter;
    if (presenter?.showError) return presenter.showError(container, message);
  } catch (e) {
    // ignore
  }

  try {
    const panel = document.createElement('div');
    panel.className = 'analysis-panel analysis-error';
    panel.textContent = `分析失败：${message || '未知错误'}`;
    container?.appendChild?.(panel);
  } catch (e) {
    // ignore
  }
}

// 显示设置模态框
function showSettingsModal() {
  try {
    const st = getContentState();
    const presenter = window.WAAP?.presenters?.settingsPresenter;
    if (presenter?.open) {
      return presenter.open({
        showToast,
        showExtensionInvalidatedError,
        onSaved: (formData) => {
          try {
            st.autoTranslateNewMessagesEnabled = formData?.autoTranslateNewMessages === true;
            st.weatherInfoEnabled = formData?.weatherEnabled !== false;
            applySttEnabled(formData?.sttEnabled === true);
          } catch (e) {
            // ignore
          }

          try {
            if (window.WAAP?.presenters?.autoTranslatePresenter?.setEnabled) {
              window.WAAP.presenters.autoTranslatePresenter.setEnabled(st.autoTranslateNewMessagesEnabled);
            }
            if (st.autoTranslateNewMessagesEnabled) {
              scheduleAutoTranslateOnChatEnter();
            }
          } catch (e) {
            // ignore
          }

          try {
            if (!st.weatherInfoEnabled) {
              window.WeatherInfo?.hideWeatherInfo?.();
            } else {
              integrateWeatherInfo({ force: true });
            }
          } catch (e) {
            // ignore
          }
        }
      });
    }
  } catch (e) {
    // ignore
  }

  showModuleLoadFailedFallback('设置');
  return false;
}





// 添加一个显示扩展上下文失效错误的函数
  function showExtensionInvalidatedError() {
    try {
      const svc = window.WAAP?.services?.contentExtensionInvalidatedBridgeService;
      if (svc?.showExtensionInvalidatedError?.(buildDeps())) return;
    } catch (e) {
      // ignore
    }

    try {
      const fallback = window.WAAP?.legacy?.extensionInvalidatedFallback;
      if (
        fallback?.showExtensionInvalidatedError?.({
          document: window.document,
          location: window.location
        })
      ) return;
    } catch (e) {
      // ignore
    }

    try {
      alert('扩展上下文已失效，请刷新页面或重新加载扩展后重试');
    } catch (e) {
      // ignore
    }
    try {
      location.reload();
    } catch (e2) {
      // ignore
    }
  }

  // 添加显示通知消息的函数
  function showToast(message, type = 'success', duration = 3000) {
    try {
      const svc = window.WAAP?.services?.contentToastBridgeService;
      if (svc?.showToast) {
        return svc.showToast(message, type, duration, buildDeps());
      }
    } catch (e) {
      // ignore
    }

    return legacyShowToast(message, type, duration);
  }

  function legacyShowToast(message, type = 'success', duration = 3000) {
    try {
      const svc = window.WAAP?.services?.contentToastBridgeService;
      if (svc?.legacyShowToast) {
        return svc.legacyShowToast(message, type, duration, buildDeps());
      }
    } catch (e) {
      // ignore
    }

    // 内联兜底：极端情况下 legacy 文件未加载时，仍给一个最简提示
    return '';
  }

  // 关闭设置对话框
  function closeSettingsModal() {
    try {
      const svc = window.WAAP?.services?.contentSettingsBridgeService;
      if (svc?.closeSettingsModal) {
        const ok = svc.closeSettingsModal(buildDeps());
        if (ok) return;
      }
    } catch (e) {
      // ignore
    }

    // 内联兜底
    try {
      document.getElementById('settings-modal')?.remove?.();
    } catch (e2) {
      // ignore
    }
  }

try {
  if (window.WAAP) {
    if (!window.WAAP.core) window.WAAP.core = {};
    if (!window.WAAP.core.actions) window.WAAP.core.actions = {};
  }
} catch (e) {
  // ignore
}

try {
  const svc = window.WAAP?.services?.contentActionsBridgeService;
  if (svc?.registerActions) {
    svc.registerActions({
      initialize,
      translateAllMessages,
      analyzeConversation,
      showSettingsModal,
      closeSettingsModal,
      showToast,
      showTranslateConfirmDialog,
      checkAiEnabled,
      showExtensionInvalidatedError,
      triggerAutoTranslateScan,
      getAutoTranslateState,
      triggerWeatherInfo
    });
  }
} catch (e) {
  // ignore
}

function findDebugTranslationMessageTarget() {
  try {
    const translated = Array.from(document.querySelectorAll('.translation-content'));
    for (let i = translated.length - 1; i >= 0; i -= 1) {
      const root = translated[i]?.closest?.('div[data-pre-plain-text], div[tabindex="-1"]');
      if (root) return root;
    }
  } catch (e) {
    // ignore
  }

  try {
    const buttons = Array.from(document.querySelectorAll('.translate-btn[data-waap-kind="translate"], .translate-btn'));
    for (let i = buttons.length - 1; i >= 0; i -= 1) {
      const root = buttons[i]?.closest?.('div[data-pre-plain-text], div[tabindex="-1"]');
      if (root) return root;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

async function debugRetriggerCurrentMessageTranslation() {
  const target = findDebugTranslationMessageTarget();
  if (!target) {
    throw new Error('未找到可重新翻译的消息，请先打开一个聊天并至少触发过一次单条翻译');
  }

  try {
    const messageContainer = target.closest?.('.message-container') || target.parentElement || target;
    messageContainer
      ?.querySelectorAll?.('.translation-content,.thinking-content,.translation-loading,.translation-error')
      ?.forEach?.((node) => {
        try {
          node.remove();
        } catch (e) {
          // ignore
        }
      });
  } catch (e) {
    // ignore
  }

  return await translateMessage(target);
}

function getDebugInputComposer() {
  try {
    return (
      document.querySelector('footer._ak1i .lexical-rich-text-input div[contenteditable="true"]') ||
      document.querySelector('#main footer div[contenteditable="true"]')
    );
  } catch (e) {
    return null;
  }
}

async function debugRetriggerCurrentInputTranslation() {
  const inputEl = getDebugInputComposer();
  const sourceText = String(inputEl?.textContent || '').trim();
  if (!sourceText) {
    throw new Error('输入框没有可翻译的文本，请先在主聊天输入框输入内容');
  }

  const svc = window.WAAP?.services?.inputTranslateTranslationService;
  if (!svc?.modalTranslation) {
    throw new Error('输入框翻译服务不可用');
  }

  const langSvc = window.WAAP?.services?.inputTranslateLanguageService;
  let targetLang = 'en';
  try {
    if (langSvc?.getRememberedLanguage) {
      targetLang = await langSvc.getRememberedLanguage(document.getElementById('main') || document);
    }
  } catch (e) {
    // ignore
  }

  const result = await svc.modalTranslation(sourceText, targetLang, 'normal', {
    fetch: window.fetch,
    getAiService: window.getAiService,
    getTranslationService: window.getTranslationService,
    ApiServices: window.ApiServices,
    LANGUAGES: langSvc?.getLanguagesMap ? langSvc.getLanguagesMap() : {}
  });

  try {
    console.log('[WAAP][debug-input-translation-result]', {
      targetLang,
      sourceText,
      result
    });
  } catch (e) {
    // ignore
  }

  return result;
}

function installTranslationPromptDebugHelpers() {
  try {
    if (!window.WAAP) window.WAAP = {};
    if (!window.WAAP.debug) window.WAAP.debug = {};
    if (typeof window.WAAP.debug.waapTp === 'function' || typeof window.waapTp === 'function') return;

    const savePromptTemplates = (normal, reasoning) =>
      new Promise((resolve, reject) => {
        try {
          if (!chrome?.storage?.sync?.set) {
            reject(new Error('chrome.storage.sync 不可用'));
            return;
          }
          chrome.storage.sync.set(
            {
              translationPromptTemplate: String(normal || ''),
              translationReasoningPromptTemplate: String(reasoning || normal || '')
            },
            () => {
              if (chrome.runtime?.lastError) {
                reject(new Error(chrome.runtime.lastError.message || '保存提示词失败'));
                return;
              }
              resolve(true);
            }
          );
        } catch (e) {
          reject(e);
        }
      });

    const waapTp = async (promptInput, mode = 'message') => {
      let normalPrompt = '';
      let reasoningPrompt = '';
      let debugMode = String(mode || 'message');

      if (promptInput && typeof promptInput === 'object') {
        normalPrompt = String(promptInput.normal || promptInput.prompt || '');
        reasoningPrompt = String(promptInput.reasoning || normalPrompt);
        if (promptInput.mode) debugMode = String(promptInput.mode);
      } else {
        normalPrompt = String(promptInput || '');
        reasoningPrompt = normalPrompt;
      }

      await savePromptTemplates(normalPrompt, reasoningPrompt);

      if (debugMode === 'input') {
        return await debugRetriggerCurrentInputTranslation();
      }

      return await debugRetriggerCurrentMessageTranslation();
    };

    window.WAAP.debug.waapTp = waapTp;
    window.waapTp = waapTp;
  } catch (e) {
    // ignore
  }
}

installTranslationPromptDebugHelpers();
