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
    if (typeof s.contentScriptInitStarted !== 'boolean') s.contentScriptInitStarted = false;
    if (typeof s.contentScriptInitialized !== 'boolean') s.contentScriptInitialized = false;

    return s;
  } catch (e) {
    return {
      pluginStatus,
      autoTranslateNewMessagesEnabled: false,
      weatherInfoEnabled: true,
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

  try {
    const fallback = window.WAAP?.legacy?.translateConfirmDialogFallback;
    if (fallback?.showTranslateConfirmDialog) {
      fallback.showTranslateConfirmDialog(messageContainer, buildDeps({ translateAllMessages }));
    }
  } catch (e2) {
    // ignore
  }
}

function isAutoTranslateEnabled() {
  return getContentState().autoTranslateNewMessagesEnabled === true;
}

function applyAutoTranslateEnabled(enabled) {
  const state = getContentState();
  state.autoTranslateNewMessagesEnabled = enabled === true;
  try {
    const orch = window.WAAP?.services?.settingsStateOrchestrator;
    if (orch?.applyAutoTranslateSideEffects) {
      orch.applyAutoTranslateSideEffects(state.autoTranslateNewMessagesEnabled, {
        autoTranslatePresenter: window.WAAP?.presenters?.autoTranslatePresenter,
        autoTranslateQueue: window.WAAP?.legacy?.autoTranslateQueue
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
  try {
    if (window.WAAP?.legacy?.autoTranslateQueue?.setEnabled) {
      window.WAAP.legacy.autoTranslateQueue.setEnabled(state.autoTranslateNewMessagesEnabled);
    }
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
        }
      });
      if (ok) return true;
    }
  } catch (e) {
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
        autoTranslateQueue: window.WAAP?.legacy?.autoTranslateQueue,
        onStateChanged: (enabled) => {
          getContentState().autoTranslateNewMessagesEnabled = enabled === true;
        },
        onWeatherEnabledChanged: (enabled) => {
          getContentState().weatherInfoEnabled = enabled !== false;
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
    if (window.WAAP?.legacy?.autoTranslateQueue?.scheduleOnChatEnter) {
      return window.WAAP.legacy.autoTranslateQueue.scheduleOnChatEnter();
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
    if (window.WAAP?.legacy?.autoTranslateQueue?.maybeAutoTranslateNewMessage) {
      return window.WAAP.legacy.autoTranslateQueue.maybeAutoTranslateNewMessage(messageElement, deps);
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
  try {
    if (window.WAAP?.legacy?.autoTranslateQueue?.getState) {
      return window.WAAP.legacy.autoTranslateQueue.getState();
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
      const ok = presenter.integrate(options, {
        WeatherInfo: window.WeatherInfo,
        whatsappDomService: window.WAAP?.services?.whatsappDomService,
        isEnabled: () => getContentState().weatherInfoEnabled
      });
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    const fallback = window.WAAP?.legacy?.weatherIntegrationFallback;
    if (fallback?.integrate) {
      return fallback.integrate(options, {
        WeatherInfo: window.WeatherInfo,
        whatsappDomService: window.WAAP?.services?.whatsappDomService,
        isEnabled: () => getContentState().weatherInfoEnabled,
        document: window.document
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

      if (result?.ok) {
        return;
      }
    }
  } catch (e) {
    // ignore
  }

  return legacyInitialize();
}

async function legacyInitialize() {
  let st = null;

  try {
    st = getContentState();
    const fallback = window.WAAP?.legacy?.initializeFallback;
    if (fallback?.legacyInitialize) {
      await fallback.legacyInitialize({
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
        WeatherInfo: window.WeatherInfo
      });
      return;
    }
  } catch (e) {
    // ignore
  }

  // 内联兜底（极端情况下 legacy 文件未加载时）
  try {
    if (st) {
      st.contentScriptInitStarted = false;
    } else {
      getContentState().contentScriptInitStarted = false;
    }
  } catch (e3) {
    // ignore
  }
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
  const main = window.WAAP?.services?.whatsappDomService?.getMain
    ? window.WAAP.services.whatsappDomService.getMain()
    : document.querySelector('#main');
  if (!main) return false;

  // 右上角按钮挂在 main 内部的 header 上
  const header = window.WAAP?.services?.whatsappDomService?.getMainHeader
    ? window.WAAP.services.whatsappDomService.getMainHeader(main)
    : main.querySelector('header');
  if (!header) return false;

  return true;
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
  if (!window.WAAP?.presenters?.contentOrchestratorPresenter?.initialize) {
    const presenter = window.WAAP?.presenters?.weatherIntegrationPresenter;
    if (presenter?.setupAutoIntegrate) {
      presenter.setupAutoIntegrate({
        document: window.document,
        setTimeout: window.setTimeout,
        integrateWeatherInfo
      });
    } else {
      setTimeout(() => {
        try {
          integrateWeatherInfo();
        } catch (e) {
          // ignore
        }
      }, 2500);
    }
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

  return await legacyTranslateText(text);
}

async function legacyTranslateText(text) {
  try {
    const fallback = window.WAAP?.legacy?.translateTextFallback;
    if (fallback?.legacyTranslateText) {
      return await fallback.legacyTranslateText(text, {
        getTranslationSettings: window.getTranslationSettings,
        getTranslationService: window.getTranslationService,
        ApiServices: window.ApiServices,
        showToast,
        setTimeout: window.setTimeout
      });
    }
  } catch (e) {
    // ignore
  }

  // 内联兜底：极端情况下 legacy 文件未加载时
  showModuleLoadFailedFallback('翻译');

  return '';
}

// 修改添加翻译按钮的函数
function addTranslateButton(messageElement) {
  try {
    if (window.WAAP?.presenters?.messageProcessingPresenter?.addTranslateButton) {
      const ok = window.WAAP.presenters.messageProcessingPresenter.addTranslateButton(messageElement, {
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        maybeScrollChatToBottom,
        translateMessage
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  return legacyAddTranslateButton(messageElement);
}

function legacyAddTranslateButton(messageElement) {
  try {
    const fallback = window.WAAP?.legacy?.addTranslateButtonFallback;
    if (fallback?.legacyAddTranslateButton) {
      const ok = fallback.legacyAddTranslateButton(messageElement, {
        document: window.document,
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        maybeScrollChatToBottom,
        translateMessage
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  // 内联兜底：极端情况下 legacy 文件未加载时
  return;
}

// 修改消息处理函数
function processMessage(message) {
  try {
    if (window.WAAP?.presenters?.messageProcessingPresenter?.processMessage) {
      const ok = window.WAAP.presenters.messageProcessingPresenter.processMessage(message, {
        addTranslateButton,
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        maybeScrollChatToBottom,
        translateMessage
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  return legacyProcessMessage(message);
}

function legacyProcessMessage(message) {
  try {
    const fallback = window.WAAP?.legacy?.processMessageFallback;
    if (fallback?.legacyProcessMessage) {
      const ok = fallback.legacyProcessMessage(message, {
        addTranslateButton
      });
      if (ok) return true;
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
    const main = document.querySelector('#main');
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

// 更新翻译消息的函数
async function translateMessage(messageElement) {
  try {
    if (window.WAAP?.presenters?.translateMessagePresenter?.translateMessage) {
      const ok = await window.WAAP.presenters.translateMessagePresenter.translateMessage(messageElement, {
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        displayTranslationResult,
        maybeScrollChatToBottom,
        getChatScrollContainer,
        isNearBottom
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  return await legacyTranslateMessage(messageElement);
}

async function legacyTranslateMessage(messageElement) {
  try {
    const fallback = window.WAAP?.legacy?.translateMessageFallback;
    if (fallback?.legacyTranslateMessage) {
      return await fallback.legacyTranslateMessage(messageElement, {
        document: window.document,
        translateText,
        getMessageTextRoot,
        collectTextContent,
        typeWriter,
        displayTranslationResult,
        maybeScrollChatToBottom,
        getChatScrollContainer,
        isNearBottom,
        setTimeout: window.setTimeout
      });
    }
  } catch (e) {
    // ignore
  }

  // 极端兜底：legacy 文件没加载时，尽量不影响主流程
  showModuleLoadFailedFallback('翻译');
}

// 打字机效果函数
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
    const fallback = window.WAAP?.legacy?.typeWriterFallback;
    if (fallback?.legacyTypeWriter) {
      return fallback.legacyTypeWriter(element, text, speed, callback, {
        setTimeout: window.setTimeout
      });
    }
  } catch (e2) {
    // ignore
  }
  return legacyTypeWriter(element, text, speed, callback);
}

function legacyTypeWriter(element, text, speed = 10, callback) {
  try {
    const fallback = window.WAAP?.legacy?.typeWriterFallback;
    if (fallback?.legacyTypeWriter) {
      return fallback.legacyTypeWriter(element, text, speed, callback, {
        setTimeout: window.setTimeout
      });
    }
  } catch (e) {
    // ignore
  }

  // 极端情况下 legacy 文件也不可用：退回最简单的直接赋值
  try {
    const fallback = window.WAAP?.legacy?.typeWriterFallback;
    if (fallback?.directAssignFallback) {
      return fallback.directAssignFallback(element, text, callback);
    }
  } catch (e2) {
    // ignore
  }

  return {
    stop: () => {},
    finish: () => {}
  };
}

// 显示翻译结果
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
  return legacyDisplayTranslationResult(container, translationText, isDarkMode);
}

function legacyDisplayTranslationResult(container, translationText, isDarkMode) {
  try {
    const fallback = window.WAAP?.legacy?.displayTranslationResultFallback;
    if (fallback?.legacyDisplayTranslationResult) {
      const ok = fallback.legacyDisplayTranslationResult(container, translationText, isDarkMode, {
        document: window.document,
        maybeScrollChatToBottom
      });
      if (ok) return;
    }
  } catch (e) {
    // ignore
  }

  // 极端兜底：legacy 文件没加载时，尽量不影响主流程
  try {
    const fallback = window.WAAP?.legacy?.displayTranslationResultFallback;
    if (fallback?.minimalAppendFallback) {
      fallback.minimalAppendFallback(container, translationText, {
        document: window.document,
        maybeScrollChatToBottom
      });
    }
  } catch (e2) {
    // ignore
  }
}

// 收集文本内容的辅助函数
function collectTextContent(element) {
  try {
    if (window.WAAP?.services?.messageTextService?.collectTextContent) {
      return window.WAAP.services.messageTextService.collectTextContent(element);
    }
  } catch (e) {
    // ignore
  }

  return legacyCollectTextContent(element);
}

function legacyCollectTextContent(element) {
  if (!element) return '';

  // 极端兜底：如果 MVP messageTextService 没加载，就返回一个尽量“接近正文”的纯文本。
  // 注意：正常情况下 collectTextContent 会先走 window.WAAP.services.messageTextService.collectTextContent。
  try {
    const fallback = window.WAAP?.legacy?.messageTextFallback;
    if (fallback?.legacyCollectTextContent) {
      return fallback.legacyCollectTextContent(element, {
        document: window.document
      });
    }
  } catch (e) {
    return '';
  }

  return '';
}

// ...

// 修改 handleRetry 函数
function addAnalysisButton(messageContainer, retryCount = 0, maxRetries = 5) {
  try {
    if (messageContainer?.querySelector && messageContainer.querySelector('.analysis-btn-container')) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (window.WAAP?.presenters?.toolbarPresenter?.ensureToolbar) {
      const ok = window.WAAP.presenters.toolbarPresenter.ensureToolbar(messageContainer, {
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
      if (ok) return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    const orch = window.WAAP?.legacy?.toolbarOrchestrator;
    if (orch?.ensureToolbar) {
      return orch.ensureToolbar(
        messageContainer,
        retryCount,
        maxRetries,
        buildDeps({
          showSettingsModal,
          showTranslateConfirmDialog,
          translateAllMessages,
          analyzeConversation,
          checkAiEnabled,
          getAiService: window.getAiService,
          ApiServices: window.ApiServices,
          getMessageTextRoot,
          collectTextContent,
          toolbarView: window.WAAP?.views?.toolbarView
        })
      );
    }
  } catch (e) {
    // ignore
  }

  return false;
}

// 修改观察消息的函数
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

  return legacyObserveMessages();
}

function legacyObserveMessages() {
  try {
    const orch = window.WAAP?.legacy?.observerOrchestrator;
    if (orch?.observeMessages) {
      return orch.observeMessages(
        buildDeps({
          integrateWeatherInfo,
          addAnalysisButton,
          processMessage,
          getMessageTextRoot,
          collectTextContent,
          maybeAutoTranslateNewMessage,
          isAutoTranslateEnabled,
          scheduleAutoTranslateOnChatEnter
        })
      );
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

// 添加一个处理过的消息ID集合（优先使用 legacy-dom-utils 里的同一个 Set，避免跨模块重复）
const processedMessages = (() => {
  try {
    const set = window.WAAP?.legacy?.domUtils?.processedMessages;
    if (set && typeof set.add === 'function' && typeof set.has === 'function') return set;
  } catch (e) {
    // ignore
  }
  return new Set();
})();

// 添加一个函数来检查元素是否在视口中
function isInViewport(element) {
  try {
    const fn = window.WAAP?.legacy?.domUtils?.isInViewport;
    if (typeof fn === 'function') return fn(element, { window });
  } catch (e) {
    // ignore
  }

  // 内联兜底
  return true;
}

// 添加节流函数
function throttle(func, limit) {
  try {
    const fn = window.WAAP?.legacy?.domUtils?.throttle;
    if (typeof fn === 'function') return fn(func, limit, { setTimeout, clearTimeout });
  } catch (e) {
    // ignore
  }

  // 内联兜底
  return typeof func === 'function' ? func : () => {};
}

// 修改观察器逻辑
function observeInputArea() {
  try {
    const presenter = window.WAAP?.presenters?.inputObserverPresenter;
    if (presenter?.observeInputArea) {
      const cleanup = presenter.observeInputArea({
        addInputTranslateButton: window.addInputTranslateButton,
        addInputTranslator: window.addInputTranslator,
        document: window.document,
        MutationObserver: window.MutationObserver,
        setTimeout: window.setTimeout,
        getAppContainer: () => document.querySelector('#app')
      });
      return cleanup;
    }
  } catch (e) {
    // ignore
  }
  return legacyObserveInputArea();
}

function legacyObserveInputArea() {
  try {
    const orch = window.WAAP?.legacy?.observerOrchestrator;
    if (orch?.observeInputArea) {
      return orch.observeInputArea(
        buildDeps({
          addInputTranslateButton: window.addInputTranslateButton,
          addInputTranslator: window.addInputTranslator
        })
      );
    }
  } catch (e) {
    // ignore
  }
  return () => {};
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

  await legacyTranslateAllMessages(messageContainer);
}

async function legacyTranslateAllMessages(messageContainer) {
  try {
    const orch = window.WAAP?.legacy?.featureOrchestrator;
    if (orch?.legacyTranslateAllMessages) {
      return await orch.legacyTranslateAllMessages(
        messageContainer,
        buildDeps({
          showToast,
          ApiServices: window.ApiServices,
          getMessageTextRoot,
          collectTextContent,
          noticeService: window.WAAP?.services?.contentFallbackNoticeService
        })
      );
    }
  } catch (e) {
    // ignore
  }

  // 内联兜底（极端情况下 legacy 文件未加载时，至少给用户提示）
  showModuleLoadFailedFallback('批量翻译');
}

// 分析对话内容
async function analyzeConversation(messageContainer) {
  try {
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
        return;
      }
    } catch (e2) {
      // ignore
    }
  } catch (error) {
    console.error('Analysis error:', error);
    showAnalysisError(messageContainer, error.message);
  }

  try {
    const orch = window.WAAP?.legacy?.featureOrchestrator;
    if (orch?.legacyAnalyzeConversation) {
      const ok = await orch.legacyAnalyzeConversation(
        messageContainer,
        buildDeps({
          checkAiEnabled,
          showSettingsModal,
          getAiService: window.getAiService,
          ApiServices: window.ApiServices,
          getMessageTextRoot,
          collectTextContent,
          showAnalysisResult,
          showAnalysisError,
          showToast,
          noticeService: window.WAAP?.services?.contentFallbackNoticeService
        })
      );
      if (ok) return;
    }
  } catch (e3) {
    // ignore
  }

  // 内联兜底（极端情况下 legacy 文件未加载时，至少给用户提示）
  showModuleLoadFailedFallback('AI 分析');
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

// 修改 showAnalysisResult / showAnalysisError：改为 MVP 薄封装，避免 content.js 过大
function showAnalysisResult(container, analysis) {
  try {
    const presenter = window.WAAP?.presenters?.analysisPresenter;
    if (presenter?.showResult) return presenter.showResult(container, analysis);
  } catch (e) {
    // ignore
  }

  try {
    const orch = window.WAAP?.legacy?.analysisRenderOrchestrator;
    if (orch?.showAnalysisResult?.(container, analysis, buildDeps({ document: window.document }))) return;
  } catch (e) {
    // ignore
  }

  // 极端兜底：orchestrator 未加载时，尽量降级展示
  try {
    window.WAAP?.legacy?.analysisPanelFallback?.showAnalysisResult?.(container, analysis, { document: window.document });
  } catch (e2) {
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
    const orch = window.WAAP?.legacy?.analysisRenderOrchestrator;
    if (orch?.showAnalysisError?.(container, message, buildDeps({ document: window.document }))) return;
  } catch (e) {
    // ignore
  }

  // 极端兜底：orchestrator 未加载时，尽量降级展示
  try {
    window.WAAP?.legacy?.analysisPanelFallback?.showAnalysisError?.(container, message, { document: window.document });
  } catch (e2) {
    // ignore
  }
}

// 显示设置模态框
function showSettingsModal() {
  try {
    const st = getContentState();
    const orchestrator = window.WAAP?.legacy?.settingsModalOrchestrator;
    if (orchestrator?.showSettingsModal) {
      return orchestrator.showSettingsModal({
        settingsPresenter: window.WAAP?.presenters?.settingsPresenter,
        autoTranslatePresenter: window.WAAP?.presenters?.autoTranslatePresenter,
        WeatherInfo: window.WeatherInfo,
        integrateWeatherInfo,
        scheduleAutoTranslateOnChatEnter,
        showToast,
        showExtensionInvalidatedError,
        legacyShowSettingsModal,
        onAutoTranslateChanged: (enabled) => {
          st.autoTranslateNewMessagesEnabled = enabled === true;
        },
        onWeatherEnabledChanged: (enabled) => {
          st.weatherInfoEnabled = enabled === true;
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return legacyShowSettingsModal();
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
