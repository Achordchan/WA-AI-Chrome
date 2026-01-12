// 在文件开头添加
window.initializeInputTranslate = initializeInputTranslate;
window.getRememberedLanguage = getRememberedLanguage;
window.addInputTranslateButton = addInputTranslateButton;

function getInputTranslateTranslationService() {
  try {
    return window.WAAP?.services?.inputTranslateTranslationService || null;
  } catch (e) {
    return null;
  }
}

function callInputTranslateTranslationService(methodName, args, deps) {
  const svc = getInputTranslateTranslationService();
  const fn = svc && typeof svc[methodName] === 'function' ? svc[methodName] : null;
  if (!fn) {
    throw new Error('翻译服务未加载，请刷新页面或重新加载扩展后重试');
  }
  return fn(...args, deps);
}

function buildTranslateTextDeps() {
  return {
    getTranslationService: window.getTranslationService,
    ApiServices: window.ApiServices
  };
}

function buildPerformTranslationDeps() {
  return {
    fetch: window.fetch,
    getTranslationService: window.getTranslationService,
    getAiService: window.getAiService,
    ApiServices: window.ApiServices,
    LANGUAGES: getLanguagesMapForInputTranslate()
  };
}

function buildModalTranslationDeps() {
  return {
    fetch: window.fetch,
    getAiService: window.getAiService,
    getTranslationService: window.getTranslationService,
    ApiServices: window.ApiServices,
    LANGUAGES: getLanguagesMapForInputTranslate()
  };
}

function buildVerifyTranslationDeps() {
  return {
    fetch: window.fetch
  };
}

// 翻译文本函数
async function translateText(text, targetLang = 'zh') {
  try {
    return await callInputTranslateTranslationService(
      'translateText',
      [text, targetLang],
      buildTranslateTextDeps()
    );
  } catch (error) {
    throw new Error(error?.message || '翻译失败');
  }
}

function getQuickSendState(el) {
  try {
    const svc = window.WAAP?.services?.inputQuickSendService;
    if (svc?.getQuickSendState) return svc.getQuickSendState(el);
  } catch (e) {
    // ignore
  }

  const init = {
    stage: 'idle',
    sourceTextAtTranslate: '',
    appliedText: '',
    requestId: 0,
    waitToastEl: null,
    waitToastRequestId: 0
  };
  return init;
}

function getLanguageOptionsForInputTranslate() {
  try {
    const svc = window.WAAP?.services?.inputTranslateLanguageService;
    if (svc?.getLanguageOptions) {
      const list = svc.getLanguageOptions();
      if (Array.isArray(list) && list.length) return list;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

function getLanguagesMapForInputTranslate() {
  try {
    const svc = window.WAAP?.services?.inputTranslateLanguageService;
    if (svc?.getLanguagesMap) {
      const map = svc.getLanguagesMap();
      if (map && typeof map === 'object') return map;
    }
  } catch (e) {
    // ignore
  }

  return {};
}

// 添加统一的翻译方法
async function performTranslation(text, targetLang, type = 'normal') {
  try {
    return await callInputTranslateTranslationService(
      'performTranslation',
      [text, targetLang, type],
      buildPerformTranslationDeps()
    );
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

function addInputTranslateButton(retryCount = 0, maxRetries = 5) {
  try {
    const svc = window.WAAP?.services?.inputTranslateUiService;
    if (svc?.addInputTranslateButton) {
      return svc.addInputTranslateButton(
        {
          document: window.document,
          setTimeout: window.setTimeout,
          createTranslateModal
        },
        retryCount,
        maxRetries
      );
    }
  } catch (e) {
    // ignore
  }
  return false;
}

// 修改初始化函数
function initializeInputTranslate() {
  console.log('初始化输入框翻译功能...');
 
  // 安装“回车快捷翻译发送”监听（是否生效取决于开关 inputQuickTranslateSendEnabled）
  try {
    const qs = window.WAAP?.services?.inputQuickSendService;
    if (qs?.ensureInstalled) {
      qs.ensureInstalled({
        document: window.document,
        setTimeout: window.setTimeout,
        chrome: window.chrome,
        getRememberedLanguage,
        modalTranslation
      });
    }
  } catch (e) {
    // ignore
  }

  // 创建 MutationObserver 实例
  let uiCleanup = null;
  try {
    const ui = window.WAAP?.services?.inputTranslateUiService;
    if (ui?.ensureInstalled) {
      uiCleanup = ui.ensureInstalled({
        document: window.document,
        setTimeout: window.setTimeout,
        MutationObserver: window.MutationObserver,
        createTranslateModal
      });
    }
  } catch (e) {
    // ignore
  }

  // 导出清理函数
  return () => {
    console.log('清理输入框翻译功能...');
    try {
      if (typeof uiCleanup === 'function') uiCleanup();
    } catch (e) {
      // ignore
    }
  };
}

// 输入框翻译的通用样式由 legacy 模块统一注入（避免本文件过大）
try {
  const stylesFallback = window.WAAP?.legacy?.inputTranslateStylesFallback;
  if (stylesFallback?.ensureStyles) {
    stylesFallback.ensureStyles({ document: window.document });
  }
} catch (e) {
  // ignore
}

// 修改 modalTranslation 方法
async function modalTranslation(text, targetLang, type = 'normal') {
  try {
    return await callInputTranslateTranslationService(
      'modalTranslation',
      [text, targetLang, type],
      buildModalTranslationDeps()
    );
  } catch (error) {
    console.error('模态框翻译失败:', error);
    throw error;
  }
}

// 新增验证翻译方法
async function verifyTranslation(translatedText, originalLang, targetLang) {
  try {
    return await callInputTranslateTranslationService(
      'verifyTranslation',
      [translatedText, originalLang, targetLang],
      buildVerifyTranslationDeps()
    );
  } catch (error) {
    throw error;
  }
}

// 使用聊天对象名字存储语言选择
function rememberLanguageChoice(chatWindow, lang) {
  try {
    const svc = window.WAAP?.services?.inputTranslateLanguageService;
    if (svc?.rememberLanguageChoice) return svc.rememberLanguageChoice(chatWindow, lang);
  } catch (e) {
    // ignore
  }
}

// 获取记忆的语言选择
function getRememberedLanguage(chatWindow) {
  try {
    const svc = window.WAAP?.services?.inputTranslateLanguageService;
    if (svc?.getRememberedLanguage) return svc.getRememberedLanguage(chatWindow);
  } catch (e) {
    // ignore
  }
  return 'en';
}

function buildTranslateModalDeps() {
  const languageOptions = getLanguageOptionsForInputTranslate();
  const langSvc = window.WAAP?.services?.inputTranslateLanguageService;

  const getChatLanguagePreferenceKey = (chatWindow) => {
    try {
      return langSvc?.getChatLanguagePreferenceKey
        ? langSvc.getChatLanguagePreferenceKey(chatWindow)
        : 'name:default';
    } catch (e) {
      return 'name:default';
    }
  };

  const langMatchesQuery = (lang, query) => {
    try {
      return langSvc?.langMatchesQuery ? langSvc.langMatchesQuery(lang, query) : true;
    } catch (e) {
      return true;
    }
  };

  return {
    document: window.document,
    setTimeout: window.setTimeout,
    modalTranslation,
    verifyTranslation,
    getRememberedLanguage,
    rememberLanguageChoice,
    getChatLanguagePreferenceKey,
    LANGUAGE_OPTIONS: languageOptions,
    langMatchesQuery,
    getQuickSendState
  };
}

// 修改创建模态框的函数
function createTranslateModal(text, inputBox, options = {}) {
  try {
    const view = window.WAAP?.views?.inputTranslateModalView;
    if (view?.createTranslateModal) {
      return view.createTranslateModal(text, inputBox, options, buildTranslateModalDeps());
    }
  } catch (e) {
    // ignore
  }

  try {
    const fallback = window.WAAP?.legacy?.inputTranslateModalFallback;
    if (fallback?.createTranslateModal) {
      return fallback.createTranslateModal(text, inputBox, options, buildTranslateModalDeps());
    }
  } catch (e2) {
    // ignore
  }

  return null;
}

// 添加错误显示函数
function showTranslationError(message, code) {
  try {
    const fallback = window.WAAP?.legacy?.inputTranslateToastFallback;
    if (fallback?.showTranslationError) {
      return fallback.showTranslationError(message, code, {
        document: window.document,
        setTimeout: window.setTimeout
      });
    }
  } catch (e) {
    // ignore
  }

  // 极小兜底：避免 UI 缺失时完全无反馈
  try {
    const text = code ? `${message} (${code})` : message;
    console.error(text);
  } catch (e) {
    // ignore
  }
}

// 启动输入框翻译功能
// 由 MVP inputTranslatePresenter 统一调用 initializeInputTranslate()