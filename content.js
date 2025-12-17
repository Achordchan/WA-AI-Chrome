let pluginStatus = {
  translation: false,
  observer: false,
  apiService: false,
  weatherInfo: false
};

// 供 popup.html / popup.js 检测插件加载状态、以及手动打开更新说明
try {
  if (chrome?.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (!request || !request.type) return;

        const isChatWindowExists = () => {
          try {
            const main = document.querySelector('#main');
            if (!main) return false;
            const header = main.querySelector('header');
            if (!header) return false;

            // footer 在进入会话后才会出现
            const footer = document.querySelector('footer._ak1i') || main.querySelector('footer');
            if (!footer) return false;

            // 输入框存在则基本可以认为已进入对话
            const editable = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') || footer.querySelector('div[contenteditable="true"]');
            return !!editable;
          } catch (e) {
            return false;
          }
        };

        const isButtonsLoaded = () => {
          try {
            // 优先用运行状态判断
            if (pluginStatus && (pluginStatus.translation || pluginStatus.observer || pluginStatus.apiService)) {
              // 只要进入聊天窗口，且翻译/观察器已初始化，就认为按钮应已加载
              if (isChatWindowExists() && pluginStatus.translation && pluginStatus.observer) return true;
            }

            // DOM 兜底：任意一个核心按钮存在即可
            const hasAny = !!(
              document.querySelector('.analysis-btn-container') ||
              document.querySelector('.translate-all-btn') ||
              document.querySelector('.translate-btn') ||
              document.querySelector('.translate-btn-container')
            );
            return hasAny;
          } catch (e) {
            return false;
          }
        };

        if (request.type === 'CHECK_CHAT_WINDOW') {
          sendResponse({ exists: isChatWindowExists() });
          return;
        }

        if (request.type === 'CHECK_BUTTONS') {
          sendResponse({ success: isButtonsLoaded() });
          return;
        }

        if (request.type === 'SHOW_UPDATE_LOG') {
          try {
            if (typeof window.showUpdateLogManually === 'function') {
              window.showUpdateLogManually();
            } else if (typeof window.checkAndShowUpdateLog === 'function') {
              window.checkAndShowUpdateLog();
            }
          } catch (e) {
            // ignore
          }
          sendResponse({ success: true });
          return;
        }
      } catch (e) {
        try {
          sendResponse({ success: false, error: e?.message || 'unknown' });
        } catch (e2) {
          // ignore
        }
      }
    });
  }
} catch (e) {
  // ignore
}

 let autoTranslateNewMessagesEnabled = false;
let lastAutoTranslateAt = 0;
const AUTO_TRANSLATE_THROTTLE_MS = 900;
const AUTO_TRANSLATE_IGNORE_AFTER_CHAT_SWITCH_MS = 1200;
let lastAutoTranslateChatKey = '';
let lastAutoTranslateChatSwitchAt = 0;
let autoTranslateChatEnterTimer = null;

 const autoTranslatedMessageKeys = new Set();
 const autoTranslatedMessageKeyRing = [];
 const AUTO_TRANSLATE_KEY_RING_MAX = 500;

 let autoTranslateQueue = [];
 let autoTranslateQueueRunning = false;

 function loadAutoTranslateSetting() {
 try {
   if (!chrome?.storage?.sync) return;
   chrome.storage.sync.get(['autoTranslateNewMessages'], (data) => {
     autoTranslateNewMessagesEnabled = data.autoTranslateNewMessages === true;
    });
 } catch (e) {
   // ignore
 }
}

try {
  loadAutoTranslateSetting();
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      if (!changes.autoTranslateNewMessages) return;
      autoTranslateNewMessagesEnabled = changes.autoTranslateNewMessages.newValue === true;
    });
  }
} catch (e) {
  // ignore
}

 function rememberAutoTranslatedKey(key) {
  if (!key) return;
  if (autoTranslatedMessageKeys.has(key)) return;
  autoTranslatedMessageKeys.add(key);
  autoTranslatedMessageKeyRing.push(key);
   if (autoTranslatedMessageKeyRing.length > AUTO_TRANSLATE_KEY_RING_MAX) {
     const old = autoTranslatedMessageKeyRing.shift();
     if (old) autoTranslatedMessageKeys.delete(old);
   }
 }

 function getActiveChatKeyForAutoTranslate() {
  const main = document.querySelector('#main');
  if (!main) return '';
  const header = main.querySelector('header');
  if (!header) return '';
  const text = (header.innerText || '').trim();
  if (!text) return '';
   return (
     text
       .split('\n')
       .map(s => s.trim())
       .filter(Boolean)[0] || ''
   );
 }

 function isAmongNewestMessagesInActiveChat(messageElement, newestCount = 3) {
   try {
     const main = document.querySelector('#main');
     if (!main) return false;
     if (!main.contains(messageElement)) return false;
     const all = Array.from(main.querySelectorAll('div[data-pre-plain-text]'));
     if (all.length === 0) return false;
     const start = Math.max(0, all.length - newestCount);
     const tail = all.slice(start);
     return tail.includes(messageElement);
   } catch (e) {
     return false;
   }
 }

 function getAutoTranslateMessageKey(messageElement, extractedText = '') {
  try {
    const wrapperId = messageElement?.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
    const pre = messageElement?.getAttribute?.('data-pre-plain-text') || '';
    if (wrapperId) return wrapperId;
    if (pre) return pre;
    const text = (extractedText || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 120);
  } catch (e) {
    return '';
  }
 }

 function shouldAutoTranslateNewMessage(messageElement) {
 if (!autoTranslateNewMessagesEnabled) return false;
 if (!messageElement || !(messageElement instanceof Element)) return false;

  const now = Date.now();
  if (lastAutoTranslateChatSwitchAt && now - lastAutoTranslateChatSwitchAt < AUTO_TRANSLATE_IGNORE_AFTER_CHAT_SWITCH_MS) {
    // 切换聊天窗口时 WhatsApp 会批量渲染历史消息；此阶段不做任何自动翻译。
    return false;
  }

   if (messageElement.dataset.waaiAutoTranslateQueued === 'true') return false;
   if (messageElement.dataset.waaiAutoTranslated === 'true') return false;

   const main = document.querySelector('#main');
   if (!main || !main.contains(messageElement)) return false;

   const container = messageElement.closest('.message-container') || messageElement.parentElement;
  if (container && container.querySelector('.translation-content')) return false;

   const textRoot = getMessageTextRoot(messageElement);
   const text = textRoot ? collectTextContent(textRoot) : '';
   if (!text || !text.trim()) return false;

   const key = getAutoTranslateMessageKey(messageElement, text);
   if (key && autoTranslatedMessageKeys.has(key)) return false;

   messageElement.dataset.waaiAutoTranslateKey = key;
  return true;
}

function getMessagesInActiveChat() {
  try {
    const main = document.querySelector('#main');
    if (!main) return [];
    return Array.from(main.querySelectorAll('div[data-pre-plain-text]'));
  } catch (e) {
    return [];
  }
}

function primeAutoTranslateSeenInChat(excludeNewestCount = 3) {
  try {
    const all = getMessagesInActiveChat();
    if (all.length === 0) return;
    const cutoff = Math.max(0, all.length - excludeNewestCount);
    for (let i = 0; i < cutoff; i++) {
      const m = all[i];
      const wrapperId = m?.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
      const pre = m?.getAttribute?.('data-pre-plain-text') || '';
      const key = wrapperId || pre;
      if (key) rememberAutoTranslatedKey(key);
    }
  } catch (e) {
    // ignore
  }
}

function autoTranslateNewestMessagesInChat(count = 1) {
  try {
    if (!autoTranslateNewMessagesEnabled) return;
    const all = getMessagesInActiveChat();
    if (all.length === 0) return;
    const start = Math.max(0, all.length - count);
    const newest = all.slice(start);
    newest.forEach((m) => {
      maybeAutoTranslateNewMessage(m);
    });
  } catch (e) {
    // ignore
  }
}

function scheduleAutoTranslateOnChatEnter() {
  try {
    if (autoTranslateChatEnterTimer) {
      clearTimeout(autoTranslateChatEnterTimer);
    }
    // 等待 WhatsApp 完成渲染（尤其是“点进聊天窗口”时）
    autoTranslateChatEnterTimer = setTimeout(() => {
      // 切换聊天窗口时，只做“已见”预登记：防止后续 DOM 变动把历史消息当成新消息自动翻译。
      primeAutoTranslateSeenInChat(0);
    }, 700);
  } catch (e) {
    // ignore
  }
}

window.triggerAutoTranslateScan = function() {
  scheduleAutoTranslateOnChatEnter();
};

window.getAutoTranslateState = function() {
  return {
    enabled: autoTranslateNewMessagesEnabled,
    queueLength: Array.isArray(autoTranslateQueue) ? autoTranslateQueue.length : -1,
    queueRunning: !!autoTranslateQueueRunning,
    lastAutoTranslateAt,
    lastChatKey: lastAutoTranslateChatKey,
    lastChatSwitchAt: lastAutoTranslateChatSwitchAt
  };
};

function enqueueAutoTranslate(messageElement) {
   if (!messageElement) return;
   const key = messageElement.dataset.waaiAutoTranslateKey || '';
   if (key) rememberAutoTranslatedKey(key);

   console.log('🌐 自动翻译排队:', key || '(no-key)');

   messageElement.dataset.waaiAutoTranslateQueued = 'true';
   autoTranslateQueue.push(messageElement);
   runAutoTranslateQueue();
 }

 async function runAutoTranslateQueue() {
   if (autoTranslateQueueRunning) return;
   autoTranslateQueueRunning = true;
   try {
     while (autoTranslateQueue.length > 0) {
       const messageElement = autoTranslateQueue.shift();
       if (!messageElement) continue;

       console.log('🌐 自动翻译执行');

       const container = messageElement.closest('.message-container') || messageElement.parentElement;
       if (container && container.querySelector('.translation-content')) {
         messageElement.dataset.waaiAutoTranslateQueued = 'false';
         messageElement.dataset.waaiAutoTranslated = 'true';
         continue;
       }

       const now = Date.now();
       const waitMs = Math.max(0, AUTO_TRANSLATE_THROTTLE_MS - (now - lastAutoTranslateAt));
       if (waitMs > 0) {
         await new Promise(r => setTimeout(r, waitMs));
       }
       lastAutoTranslateAt = Date.now();

       try {
         if (document.contains(messageElement)) {
           await translateMessage(messageElement);
         }
       } catch (e) {
         // ignore
       }

       messageElement.dataset.waaiAutoTranslateQueued = 'false';
       messageElement.dataset.waaiAutoTranslated = 'true';
     }
   } finally {
     autoTranslateQueueRunning = false;
   }
 }

 function maybeAutoTranslateNewMessage(messageElement) {
   try {
     if (!shouldAutoTranslateNewMessage(messageElement)) return;
     enqueueAutoTranslate(messageElement);
   } catch (e) {
     // ignore
   }
 }

 // 天气信息集成函数
 let lastWeatherChatKey = '';
 let lastWeatherTriggerAt = 0;
 const WEATHER_CHAT_SWITCH_THROTTLE_MS = 1200;

 function getActiveChatKeyForWeather() {
  const main = document.querySelector('#main');
  if (!main) return '';
  const header = main.querySelector('header');
  if (!header) return '';

  const text = (header.innerText || '').trim();
  if (!text) return '';

  // header 往往包含多行（联系人名/状态/按钮），取第一行做稳定 key
  const firstLine = text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)[0] || '';

  return firstLine;
}

function integrateWeatherInfo(options = {}) {
  const force = options && options.force === true;
  
  // 检查WeatherInfo是否可用
  if (typeof window.WeatherInfo === 'undefined') {
    console.warn('⚠️ WeatherInfo模块未加载，跳过天气功能集成');
    return false;
  }
  
  try {
    // 检查是否有聊天窗口
    const main = document.querySelector('#main');
    const chatActive = !!(main && (
      (typeof window.WeatherInfo?.isChatWindowActive === 'function' && window.WeatherInfo.isChatWindowActive()) ||
      main.querySelector('header')
    ));

    const chatKey = getActiveChatKeyForWeather();
    const now = Date.now();
    if (!force) {
      if (!chatKey) {
        console.log('ℹ️ 当前无法识别聊天窗口 key，跳过天气更新');
        return false;
      }
      if (chatKey === lastWeatherChatKey) {
        return false;
      }
      if (now - lastWeatherTriggerAt < WEATHER_CHAT_SWITCH_THROTTLE_MS) {
        return false;
      }
      lastWeatherChatKey = chatKey;
      lastWeatherTriggerAt = now;
    }

    if (chatActive) {
      console.log('🌤️ 开始集成天气信息功能...');
      // 触发天气信息检查
      if (typeof window.WeatherInfo.checkForNewChatWindow === 'function') {
        console.log('🔍 检查新聊天窗口的天气信息...');
        window.WeatherInfo.checkForNewChatWindow();
      }
      
      // 如果有提取电话号码的功能，也触发一下
      if (typeof window.WeatherInfo.extractPhoneNumber === 'function') {
        console.log('📞 尝试提取电话号码...');
        setTimeout(() => {
          window.WeatherInfo.extractPhoneNumber();
        }, 1000);
      }
      return true;
    } else {
      console.log('ℹ️ 当前没有活跃的聊天窗口');
      return false;
    }
  } catch (error) {
    console.error('❌ 集成天气信息功能时出错:', error);
    return false;
  }
}

// 手动触发天气信息功能的函数（用于调试）
window.triggerWeatherInfo = function() {
  console.log('🔧 手动触发天气信息功能...');
  return integrateWeatherInfo({ force: true });
};

// 测试函数 - 在控制台可调用 window.testTranslationServiceSwitch() 测试通知
window.testTranslationServiceSwitch = function() {
  showNotification('翻译服务已从baidu切换至google: 百度翻译API签名验证失败');
};

// 在各个功能初始化成功时更新状态
function updatePluginStatus(feature, status) {
  pluginStatus[feature] = status;
  console.log(`Plugin status updated - ${feature}:`, status);
}

// 修改初始化函数
let contentScriptInitStarted = false;
let contentScriptInitialized = false;
async function initialize() {
  if (contentScriptInitialized || contentScriptInitStarted) {
    return;
  }
  contentScriptInitStarted = true;
  try {
    // 检查并显示更新日志
    await window.checkAndShowUpdateLog();
    
    console.log('Initializing message translation...');
    injectStyles();
    updatePluginStatus('translation', true);
    
    observeMessages();
    updatePluginStatus('observer', true);
    
    // 初始化输入框翻译功能
    if (typeof window.initializeInputTranslate === 'function') {
      window.initializeInputTranslate();
      updatePluginStatus('apiService', true);
    } else {
      console.error('Input translate initialization function not found');
      updatePluginStatus('apiService', false);
    }
    
    // 初始化天气信息功能
    if (typeof window.WeatherInfo !== 'undefined') {
      console.log('正在初始化天气信息功能...');
      try {
        // 设置聊天窗口观察器
        window.WeatherInfo.setupChatWindowObserver();
        updatePluginStatus('weatherInfo', true);
        console.log('✅ 天气信息功能初始化成功');
             } catch (error) {
         console.error('❌ 天气信息功能初始化失败:', error);
         updatePluginStatus('weatherInfo', false);
       }
     } else {
       console.warn('⚠️ WeatherInfo 模块未找到，天气功能将不可用');
       updatePluginStatus('weatherInfo', false);
    }
    contentScriptInitialized = true;
  } catch (error) {
    console.error('Initialization error:', error);
    // 更新对应功能的状态为失败
    updatePluginStatus('translation', false);
    updatePluginStatus('observer', false);
    updatePluginStatus('apiService', false);
    updatePluginStatus('weatherInfo', false);
    contentScriptInitStarted = false;
  }
}

// 将初始化函数暴露到window对象
window.initialize = initialize;

let initializeAutoStarted = false;
let lastAutoInitCheckAt = 0;
let initObserver = null;

function isChatWindowActiveForHeaderButtons() {
  const main = document.querySelector('#main');
  if (!main) return false;

  // 右上角按钮挂在 main 内部的 header 上
  const header = main.querySelector('header');
  if (!header) return false;

  return true;
}

function maybeAutoInitialize() {
  const now = Date.now();
  if (now - lastAutoInitCheckAt < 500) {
    return;
  }
  lastAutoInitCheckAt = now;

  if (initializeAutoStarted || contentScriptInitialized || contentScriptInitStarted) {
    return;
  }

  if (!isChatWindowActiveForHeaderButtons()) {
    return;
  }

  initializeAutoStarted = true;
  initialize();

  if (initObserver) {
    initObserver.disconnect();
    initObserver = null;
  }
}

// 自动启动：只有进入聊天窗口后才会触发一次 initialize()
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        maybeAutoInitialize();
      }, 500);
    });
  } else {
    setTimeout(() => {
      maybeAutoInitialize();
    }, 500);
  }

  initObserver = new MutationObserver(() => {
    maybeAutoInitialize();
  });
  initObserver.observe(document.body, { childList: true, subtree: true });
} catch (e) {
  // 忽略自动启动失败，不影响其它功能
}

// 页面加载完成后，自动尝试集成天气信息
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM内容已加载，准备集成天气信息...');
  setTimeout(() => {
    integrateWeatherInfo();
  }, 3000);
});

// 如果已经加载完成，立即执行
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('📄 页面已完全加载，准备集成天气信息...');
  setTimeout(() => {
    integrateWeatherInfo();
  }, 2000);
}

async function translateText(text) {
  try {
    // 获取翻译服务设置
    const translationSettings = await window.getTranslationSettings();
    console.log('获取翻译设置:', translationSettings);
    
    // 从设置中获取服务和目标语言
    const service = translationSettings.service;
    const targetLang = translationSettings.targetLang;
    
    console.log('使用翻译服务:', service);
    
    // 获取API密钥等信息
    const { apiKey, secretKey, apiUrl, model } = await window.getTranslationService();
    
    // 执行翻译
    let translation;
    
    if (service === 'baidu') {
      // 百度翻译需要额外的secretKey参数
      console.log('调用百度翻译服务', { 
        apiKeyLength: apiKey?.length, 
        secretKeyLength: secretKey?.length, 
        textLength: text.length,
        textPreview: text.replace(/\n/g, '\\n').substring(0, 30) + (text.length > 30 ? '...' : '')
      });
      try {
        translation = await window.ApiServices.translation[service](text, apiKey, secretKey, 'auto', targetLang === 'zh-CN' ? 'zh' : targetLang);
        console.log('百度翻译结果:', { 
          success: !!translation, 
          resultLength: translation?.length,
          resultPreview: translation ? 
            translation.replace(/\n/g, '\\n').substring(0, 30) + (translation.length > 30 ? '...' : '') : 
            null
        });
      } catch (baiduError) {
        console.error('百度翻译失败，尝试回退到Google翻译:', baiduError);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
        console.log('回退到Google翻译结果:', { success: !!translation, resultLength: translation?.length });
      }
    } else if (service === 'google') {
      // 谷歌翻译不需要 apiKey
      console.log('调用谷歌翻译服务', { 
        from: 'auto', 
        to: targetLang, 
        textLength: text.length,
        textPreview: text.replace(/\n/g, '\\n').substring(0, 30) + (text.length > 30 ? '...' : '')
      });
      translation = await window.ApiServices.translation[service](text, 'auto', targetLang);
      console.log('谷歌翻译结果:', { success: !!translation, resultLength: translation?.length });
    } else if (service === 'siliconflow') {
      // Openai翻译需要额外参数
      console.log('调用OpenAI翻译:', {
        service,
        hasApiKey: !!apiKey,
        apiUrl,
        model,
        textLength: text.length,
        textPreview: text.replace(/\n/g, '\\n').substring(0, 30) + (text.length > 30 ? '...' : '')
      });
      try {
        const normalizedTargetLang = targetLang === 'zh-CN' ? 'zh' : targetLang;
        translation = await window.ApiServices.translation[service](text, apiKey, apiUrl, model, normalizedTargetLang);
        
        // 检查是否是带有思考过程的对象结果
        if (translation && typeof translation === 'object' && translation.hasThinking) {
          console.log('OpenAI翻译返回思考过程:', {
            thinkingLength: translation.thinking?.length || 0,
            translationLength: translation.translation?.length || 0,
            translationPreview: translation.translation ? 
              translation.translation.replace(/\n/g, '\\n').substring(0, 30) + 
              (translation.translation.length > 30 ? '...' : '') : 
              null
          });
        } else {
          // 普通文本结果
          console.log('OpenAI翻译结果:', { 
            success: !!translation, 
            resultLength: translation?.length,
            resultPreview: typeof translation === 'string' && translation ? 
              translation.replace(/\n/g, '\\n').substring(0, 30) + (translation.length > 30 ? '...' : '') : 
              '非文本结果'
          });
        }
      } catch (siliconflowError) {
        console.error('OpenAI翻译失败，尝试回退到Google翻译:', siliconflowError);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
        console.log('回退到Google翻译结果:', { success: !!translation, resultLength: translation?.length });
      }
    } else {
      // 其他翻译服务
      console.log('调用其他翻译服务:', service, { apiKeyLength: apiKey?.length, textLength: text.length });
      try {
        translation = await window.ApiServices.translation[service](text, apiKey);
        console.log('翻译结果:', { service, success: !!translation, resultLength: translation?.length });
      } catch (serviceError) {
        console.error(`${service}翻译失败，尝试回退到Google翻译:`, serviceError);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
        console.log('回退到Google翻译结果:', { success: !!translation, resultLength: translation?.length });
      }
    }
    return translation;
  } catch (error) {
    console.error('Translation failed:', error);
    // 显示更友好的错误消息
    if (error.message.includes('百度翻译错误: 54001')) {
      return '翻译失败: 百度翻译签名错误，请检查API ID和密钥设置';
    } else if (error.message.includes('API Key')) {
      return '翻译失败: 翻译服务需要设置有效的API密钥';
    } else {
      return '翻译失败，请检查设置和网络连接';
    }
  }
}

// 修改添加翻译按钮的函数
function addTranslateButton(messageElement) {
  console.log('添加翻译按钮到消息:', messageElement);
  
  // 检查是否已经添加过按钮
  if (messageElement.querySelector('.translate-btn-container')) {
    console.log('按钮已存在，跳过添加');
    return;
  }
  
  // 创建翻译按钮
  const translateBtn = document.createElement('button');
  translateBtn.className = 'translate-btn';
  translateBtn.innerHTML = `译`;
  translateBtn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('翻译按钮被点击');

    await translateMessage(messageElement);
  };

  // 创建按钮容器
  const buttonContainer = document.createElement('span');
  buttonContainer.className = 'translate-btn-container';
  buttonContainer.appendChild(translateBtn);
  
  // 将按钮放到消息文本最开头（inline），而不是悬浮在角落
  const textRoot = getMessageTextRoot(messageElement);
  if (textRoot && textRoot.firstChild) {
    textRoot.insertBefore(buttonContainer, textRoot.firstChild);
  } else if (textRoot) {
    textRoot.appendChild(buttonContainer);
  } else if (messageElement.firstChild) {
    messageElement.insertBefore(buttonContainer, messageElement.firstChild);
  } else {
    messageElement.appendChild(buttonContainer);
  }
  
  console.log('按钮添加成功');
}

// 修改消息处理函数
function processMessage(message) {
  if (!message.dataset.processed) {
    console.log('处理消息:', message);

    // 为消息添加包装器类
    message.classList.add('message-wrapper');
    message.classList.add('waai-message');
    // 确保消息容器有相对定位
    message.style.position = 'relative';
    // 添加翻译按钮（以 data-pre-plain-text 根节点为锚点，避免 WhatsApp DOM 变动影响）
    addTranslateButton(message);
    message.dataset.processed = 'true';
  }
}

function getMessageTextRoot(messageElement) {
  if (!messageElement) return null;

  const isInsideQuotedBlock = (el) => {
    try {
      if (!el) return false;
      const qa = el.closest('[data-testid*="quoted"], [data-testid*="reply"], [aria-label*="引用"], [aria-label*="回复"]');
      return !!(qa && messageElement.contains(qa));
    } catch (e) {
      return false;
    }
  };

  // 老版本/某些结构中仍然存在 selectable-text
  const selectable = messageElement.querySelector('.selectable-text');
  if (selectable && !isInsideQuotedBlock(selectable)) return selectable;

  // WhatsApp 新版结构中，经常是多个 span/div 组合，这里选取“最长且像正文”的一个
  const candidates = messageElement.querySelectorAll('span[dir], div[dir]');
  let best = null;
  let bestLen = 0;
  let bestQuoted = null;
  let bestQuotedLen = 0;
  candidates.forEach((el) => {
    const inQuoted = isInsideQuotedBlock(el);
    const t = (el.textContent || '').replace(/\u200e/g, '').trim();
    if (!t) return;
    if (/^\d{1,2}:\d{2}$/.test(t)) return;
    if (t === 'msg-dblcheck') return;
    if (inQuoted) {
      if (t.length > bestQuotedLen) {
        bestQuoted = el;
        bestQuotedLen = t.length;
      }
      return;
    }
    if (t.length > bestLen) {
      best = el;
      bestLen = t.length;
    }
  });
  if (best) return best;
  if (bestQuoted) return bestQuoted;

  // 当前日志里稳定存在的节点
  if (messageElement.classList && messageElement.classList.contains('copyable-text')) {
    return messageElement;
  }

  // 兜底：直接用消息根节点
  return messageElement;
}

function getChatScrollContainer() {
  try {
    const main = document.querySelector('#main');
    if (!main) return null;

    const preferred = main.querySelector('[data-testid="conversation-panel-messages"]');
    if (preferred) return preferred;

    const candidates = main.querySelectorAll('div,section');
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      if (!style) continue;
      if (!/(auto|scroll)/.test(style.overflowY || '')) continue;
      if (el.scrollHeight > el.clientHeight + 50) return el;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function isNearBottom(el, threshold = 160) {
  try {
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
  } catch (e) {
    return false;
  }
}

function maybeScrollChatToBottom(messageContainer) {
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
  } catch (e) {
    // ignore
  }
}

// 更新翻译消息的函数
async function translateMessage(messageElement) {
  try {
    // 确保元素存在
    if (!messageElement) {
      console.error('translateMessage: 消息元素不存在');
      return;
    }

    // 获取消息容器 - 修改查找逻辑
    let messageContainer = messageElement.closest('.message-container');
    
    // 如果没有找到标准消息容器，尝试使用消息元素本身作为容器
    if (!messageContainer) {
      console.log('translateMessage: 使用替代消息容器查找方法');
      // 如果消息元素有父DIV，使用它作为容器
      messageContainer = messageElement.parentElement;
      
      // 如果还是找不到合适的容器，直接使用消息元素本身
      if (!messageContainer) {
        messageContainer = messageElement;
      }
      
      // 为找到的容器添加消息容器类，以便后续处理
      messageContainer.classList.add('message-container');
    }

    try {
      const scroller = getChatScrollContainer();
      const shouldScroll = scroller ? isNearBottom(scroller) : false;
      messageContainer.dataset.waaiShouldScrollBottom = shouldScroll ? 'true' : 'false';
    } catch (e) {
      // ignore
    }

    // 检查是否已经有翻译
    const existingTranslation = messageContainer.querySelector('.translation-content');
    if (existingTranslation) {
      // 已经有翻译，切换显示/隐藏
      if (existingTranslation.style.display === 'none') {
        existingTranslation.style.display = 'block';
        // 同时显示思考过程（如果有）
        const thinkingContent = messageContainer.querySelector('.thinking-content');
        if (thinkingContent) {
          thinkingContent.style.display = 'block';
        }
        maybeScrollChatToBottom(messageContainer);
      } else {
        existingTranslation.style.display = 'none';
        // 同时隐藏思考过程（如果有）
        const thinkingContent = messageContainer.querySelector('.thinking-content');
        if (thinkingContent) {
          thinkingContent.style.display = 'none';
        }
      }
      return;
    }

    // 创建加载指示器
    const loadingElement = document.createElement('div');
    loadingElement.className = 'translation-loading';
    loadingElement.innerHTML = '翻译中<span class="loading-dots"></span>';
    messageContainer.appendChild(loadingElement);

    try {
      // 提取原始文本
      const textElement = getMessageTextRoot(messageElement);
      
      if (!textElement) {
        console.error('translateMessage: 无法找到可选择文本元素');
        messageContainer.removeChild(loadingElement);
        return;
      }
      
      // 收集文本内容 (包括表情)
      const text = collectTextContent(textElement);
      
      if (!text) {
        console.error('translateMessage: 无法获取消息文本');
        messageContainer.removeChild(loadingElement);
        return;
      }
      
      console.log('原始消息文本:', text);
      
      // 翻译文本
      const translation = await translateText(text);
      console.log('获得翻译结果:', translation);
      
      // 移除加载指示器
      messageContainer.removeChild(loadingElement);
      
      // 创建翻译元素
      if (translation) {
        // 检查是否返回了带有思考过程的翻译对象（针对OpenAI接口的推理模式）
        if (typeof translation === 'object' && translation.hasThinking) {
          // 先创建思考过程容器（如果有）
          if (translation.thinking) {
            const thinkingElement = document.createElement('div');
            thinkingElement.className = 'thinking-content';
            
            // 检测是否为暗黑模式
            const isDarkMode = document.body.classList.contains('dark') || 
                              window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                              document.documentElement.getAttribute('data-theme') === 'dark';
            
            // 根据模式选择不同的样式
            if (isDarkMode) {
              thinkingElement.style.cssText = `
                background-color: rgba(20, 75, 150, 0.3);
                border-left: 3px solid #3b82f6;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #e0e0e0;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            } else {
              thinkingElement.style.cssText = `
                background-color: rgba(240, 247, 255, 0.8);
                border-left: 3px solid #2196F3;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #333;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            }
            
            // 添加空容器，用于打字机效果
            thinkingElement.innerHTML = '';
            messageContainer.appendChild(thinkingElement);
            
            // 应用打字机效果
            typeWriter(thinkingElement, translation.thinking, 5, () => {
              // 思考完成后，显示翻译结果
              displayTranslationResult(messageContainer, translation.translation, isDarkMode);
            });
          } else {
            // 没有思考过程，直接显示翻译
            const isDarkMode = document.body.classList.contains('dark') || 
                              window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                              document.documentElement.getAttribute('data-theme') === 'dark';
            displayTranslationResult(messageContainer, translation.translation, isDarkMode);
          }
        } else {
          // 普通翻译结果，直接显示
          const isDarkMode = document.body.classList.contains('dark') || 
                            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                            document.documentElement.getAttribute('data-theme') === 'dark';
          displayTranslationResult(messageContainer, translation, isDarkMode);
        }
      }
    } catch (error) {
      console.error('Translate error:', error);
      if (messageContainer.contains(loadingElement)) {
        // 替换加载指示器为错误消息
        loadingElement.textContent = `翻译失败: ${error.message}`;
        loadingElement.className = 'translation-error';
        
        // 3秒后自动删除错误消息
        setTimeout(() => {
          if (messageContainer.contains(loadingElement)) {
            messageContainer.removeChild(loadingElement);
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Translation function error:', error);
  }
}

// 打字机效果函数
function typeWriter(element, text, speed = 10, callback) {
  let i = 0;
  
  // 添加打字中的光标类
  element.classList.add('typing');
  
  // 分析文本长度，调整打字速度
  // 如果文本较长(>500字符)，增加打字速度
  let adjustedSpeed = speed;
  if (text.length > 1000) {
    adjustedSpeed = 1; // 非常长的文本，更快的速度
  } else if (text.length > 500) {
    adjustedSpeed = 3; // 长文本，较快速度
  }
  
  // 模拟更真实的打字，根据字符类型变化速度
  const getCharSpeed = (char) => {
    // 标点符号和段落结束处短暂停顿
    if (['.', '!', '?', '。', '！', '？', '\n'].includes(char)) {
      return adjustedSpeed * 20;
    }
    // 逗号、分号短暂停顿
    if ([',', ';', '，', '；', '、'].includes(char)) {
      return adjustedSpeed * 10;
    }
    // 普通字符
    return adjustedSpeed;
  };
  
  const typeNextChar = () => {
    if (i < text.length) {
      // 当前字符
      const char = text.charAt(i);
      element.textContent += char;
      i++;
      
      // 自动滚动到底部
      element.scrollTop = element.scrollHeight;
      
      // 获取下一个字符的延迟时间
      const nextDelay = getCharSpeed(char);
      
      // 递归调用下一个字符
      setTimeout(typeNextChar, nextDelay);
    } else {
      // 完成后移除打字光标
      element.classList.remove('typing');
      if (typeof callback === 'function') {
        // 短暂延迟后执行回调，给用户一些阅读思考过程的时间
        setTimeout(callback, 500);
      }
    }
  };
  
  // 开始打字
  typeNextChar();
  
  // 返回控制方法，允许在需要时停止
  return {
    stop: () => {
      i = text.length; // 设置为文本长度，停止打字
      element.classList.remove('typing');
    },
    finish: () => {
      element.textContent = text;
      element.classList.remove('typing');
      if (typeof callback === 'function') {
        callback();
      }
    }
  };
}

// 显示翻译结果
function displayTranslationResult(container, translationText, isDarkMode) {
  const translationElement = document.createElement('div');
  translationElement.className = 'translation-content';
  
  if (isDarkMode) {
    translationElement.style.cssText = `
      background-color: rgba(60, 150, 80, 0.2);
      border-left: 3px solid #4ade80;
      padding: 10px;
      margin-top: 5px;
      font-size: 0.95em;
      white-space: pre-wrap;
      border-radius: 0 5px 5px 0;
      color: #e0e0e0;
    `;
  } else {
    translationElement.style.cssText = `
      background-color: rgba(232, 245, 233, 0.8);
      border-left: 3px solid #4CAF50;
      padding: 10px;
      margin-top: 5px;
      font-size: 0.95em;
      white-space: pre-wrap;
      border-radius: 0 5px 5px 0;
      color: #333;
    `;
  }
  
  translationElement.textContent = translationText;
  container.appendChild(translationElement);
  maybeScrollChatToBottom(container);
}

// 收集文本内容的辅助函数
function collectTextContent(element) {
  if (!element) return '';
  
  // 克隆节点以避免修改原始DOM
  const elementClone = element.cloneNode(true);

  // 移除可能存在的翻译按钮/翻译结果/思考过程/加载提示
  elementClone.querySelectorAll('.translate-btn-container,.translation-content,.thinking-content,.translation-loading,.translation-error').forEach((n) => n.remove());

  // 移除常见状态图标/回执文本节点
  elementClone.querySelectorAll('[data-icon="msg-dblcheck"],[aria-label="msg-dblcheck"],.msg-dblcheck').forEach((n) => n.remove());

  let text = '';
  let lastPiece = '';

  const walker = document.createTreeWalker(
    elementClone,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const raw = (node.textContent || '').replace(/\u200e/g, '');
        const value = raw.trim();
        if (!value) return NodeFilter.FILTER_REJECT;
        if (value === 'msg-dblcheck') return NodeFilter.FILTER_REJECT;
        if (/^\d{1,2}:\d{2}$/.test(value)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  while (walker.nextNode()) {
    const value = walker.currentNode.textContent.replace(/\u200e/g, '').trim();
    if (!value) continue;

    // 去掉 DOM 导致的连续重复片段
    if (value === lastPiece) {
      continue;
    }

    const lastChar = text.length ? text[text.length - 1] : '';
    const firstChar = value[0];
    const needSpace = lastChar && !/\s/.test(lastChar) && !/\s/.test(firstChar);
    text += (needSpace ? ' ' : '') + value;
    lastPiece = value;
  }

  // 清理文本
  text = text.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();

  // 如果整段文本被重复拼接了多次（WhatsApp DOM 更新后常见），做一次压缩
  const dedupeRepeatedBlock = (s) => {
    const normalized = s.replace(/\s+/g, ' ').trim();
    if (!normalized) return s;

    for (let times = 5; times >= 2; times--) {
      if (normalized.length % times !== 0) continue;
      const partLen = normalized.length / times;
      const part = normalized.slice(0, partLen);
      if (part.repeat(times) === normalized) {
        return part;
      }
    }
    return s;
  };

  text = dedupeRepeatedBlock(text);

  return text;
}

// ...

// 修改 handleRetry 函数
function handleRetry(reason, retryCount, maxRetries, messageContainer) {
  if (retryCount < maxRetries) {
    console.log(`${reason} 未就绪，${retryCount + 1}/${maxRetries} 次重试...`);
    setTimeout(() => {
      // 重新获取 main 元素
      const main = document.querySelector('#main');
      if (main) {
        addAnalysisButton(main, retryCount + 1, maxRetries);
      } else {
        console.log('未找到 main 元素，跳过添加按钮');
      }
    }, 1000 * (retryCount + 1)); // 递增延迟
    return false;
  }
  console.warn(`超过最大重试次数(${maxRetries})，放弃添加分析按钮组`);
  return false;
}

// 添加分析按钮的函数 - 主要实现
function addAnalysisButton(messageContainer, retryCount = 0, maxRetries = 5) {
  console.log('尝试添加分析按钮组...');

  // 类型检查
  if (!messageContainer || !(messageContainer instanceof Element)) {
    console.warn('无效的消息容器:', messageContainer);
    return handleRetry('invalid container', retryCount, maxRetries);
  }

  // 防止重复添加
  if (messageContainer.querySelector('.analysis-btn-container')) {
    console.log('按钮组已存在，跳过添加');
    return true;
  }

  // 查找必要的DOM元素
  const header = messageContainer.querySelector('header');
  if (!header) {
    console.log('未找到header元素');
    return handleRetry('header', retryCount, maxRetries, messageContainer);
  }

  try {
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'analysis-btn-container';
    buttonContainer.innerHTML = `
      <button class="settings-btn" title="设置">
        <svg viewBox="0 0 24 24" height="20" width="20">
          <path fill="currentColor" d="M12 3.75a8.25 8.25 0 0 0-8.25 8.25c0 4.547 3.703 8.25 8.25 8.25a8.25 8.25 0 0 0 0-16.5zM2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm7.688-2.344a2.344 2.344 0 1 1 4.687 0 2.344 2.344 0 0 1-4.687 0zM12 8.25a1.406 1.406 0 1 0 0 2.812 1.406 1.406 0 0 0 0-2.812zm-3.75 7.5h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5z"/>
        </svg>
      </button>
      <button class="translate-all-btn" title="批量翻译">
        <svg viewBox="0 0 24 24" height="20" width="20">
          <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
      </button>
      <button class="analysis-btn" title="AI分析">
        <svg viewBox="0 0 24 24" height="20" width="20">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
        </svg>
      </button>
    `;

    // 添加事件监听器
    addButtonEventListeners(buttonContainer, messageContainer);

    // 添加到header
    header.appendChild(buttonContainer);
    console.log('成功添加分析按钮组');
    return true;
  } catch (error) {
    console.error('添加分析按钮组时发生错误:', error);
    return handleRetry('error', retryCount, maxRetries, messageContainer);
  }
}

// 添加按钮事件监听器
function addButtonEventListeners(buttonContainer, messageContainer) {
  // 设置按钮事件
  buttonContainer.querySelector('.settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    // 优先打开当前页面的设置模态框（包含自动翻译等开关）
    // 如果用户按住 Cmd/Ctrl/Alt，则仍然打开扩展 Options 页面
    const openOptions = e.metaKey || e.ctrlKey || e.altKey;
    if (!openOptions && typeof showSettingsModal === 'function') {
      showSettingsModal();
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    } catch (err) {
      // ignore
    }
  });

  // 批量翻译按钮事件
  buttonContainer.querySelector('.translate-all-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    showTranslateConfirmDialog(messageContainer);
  });

  // AI分析按钮事件
  buttonContainer.querySelector('.analysis-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await analyzeConversation(messageContainer);
  });
}

// 修改观察消息的函数
function observeMessages() {
  console.log('初始化消息观察器...');
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // 聊天窗口切换时（header变化/主区域重绘），尝试刷新天气信息（由 chatKey 去重）
        integrateWeatherInfo();

         try {
           const chatKey = getActiveChatKeyForAutoTranslate();
           const now = Date.now();
           if (chatKey && chatKey !== lastAutoTranslateChatKey) {
             lastAutoTranslateChatKey = chatKey;
             lastAutoTranslateChatSwitchAt = now;
             scheduleAutoTranslateOnChatEnter();
           }
         } catch (e) {
           // ignore
         }

        // 检测到新的聊天窗口时的处理
        const main = document.querySelector('#main');
        if (main && !main.querySelector('.analysis-btn-container')) {
          console.log('检测到新的聊天窗口，尝试添加按钮组...');
          addAnalysisButton(main);
          
          // 同时检查是否需要显示天气信息
          setTimeout(() => {
            integrateWeatherInfo();
          }, 1500); // 给页面一些时间完全加载
        }

        // 处理新增的消息
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // 元素节点
            // 查找消息元素（node 本身也可能就是 message）
            const collected = [];
            if (node.matches && node.matches('div[data-pre-plain-text]')) {
              collected.push(node);
            }
            const nested = node.querySelectorAll ? node.querySelectorAll('div[data-pre-plain-text]') : [];
            nested.forEach(m => collected.push(m));

            collected.forEach(message => {
              if (!message.dataset.processed) {
                processMessage(message);
              }
              // 自动翻译：即使消息已被处理过（比如开关是后开、或 WhatsApp 先渲染后标记），
              // 也允许尝试一次；内部会做开关/去重/已翻译判断。
              maybeAutoTranslateNewMessage(message);
            });
          }
        });
      }
    }
  });

  // 配置观察选项
  const config = {
    childList: true,
    subtree: true
  };

  // 开始观察整个文档
  observer.observe(document.body, config);
  
  // 初始处理已有消息
  const messages = document.querySelectorAll('div[data-pre-plain-text]');
  messages.forEach(message => {
    if (!message.dataset.processed) {
      processMessage(message);
    }
  });

  // 如果已开启自动翻译，进入聊天后也触发一次“底部消息扫描”（覆盖某些情况下 addedNodes 不稳定的问题）
  if (autoTranslateNewMessagesEnabled) {
    scheduleAutoTranslateOnChatEnter();
  }

  // 初始尝试添加按钮
  const main = document.querySelector('#main');
  if (main) {
    addAnalysisButton(main);
    
    // 同时初始化天气信息功能
    setTimeout(() => {
      integrateWeatherInfo();
    }, 2000); // 延迟执行，确保所有功能都已加载
  }

  // 返回清理函数
  return () => {
    console.log('清理消息观察器...');
    observer.disconnect();
  };
}

// 更新样式
function injectStyles() {
  const styles = `
    .translate-btn-container {
      position: static;
      display: inline-flex;
      align-items: center;
      margin-right: 6px;
      opacity: 0.9;
    }

    div[data-pre-plain-text]:hover .translate-btn-container {
      opacity: 1;
    }

    div[data-pre-plain-text] .translate-btn {
      height: 22px;
      padding: 0 8px;
      background: rgba(255, 255, 255, 0.75);
      color: #0f766e;
      border: 1px solid rgba(15, 118, 110, 0.22);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    div[data-pre-plain-text] .translate-btn:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 118, 110, 0.35);
    }

    body.dark div[data-pre-plain-text] .translate-btn,
    [data-theme="dark"] div[data-pre-plain-text] .translate-btn {
      background: rgba(20, 20, 20, 0.55);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.22);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
    }

    body.dark div[data-pre-plain-text] .translate-btn:hover,
    [data-theme="dark"] div[data-pre-plain-text] .translate-btn:hover {
      background: rgba(20, 20, 20, 0.72);
      border-color: rgba(52, 211, 153, 0.34);
    }

    .translation {
      color: #667781;
      font-size: 14px;
      margin-top: 4px;
      padding-left: 4px;
      border-left: 2px solid #25D366;
    }

    .translation p {
      margin: 4px 0;
    }

    .translation p:first-child {
      margin-top: 0;
    }

    .translation p:last-child {
      margin-bottom: 0;
    }

    .translation-loading {
      color: #667781;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #00a884;
      background-color: rgba(0, 168, 132, 0.05);
      border-radius: 0 4px 4px 0;
      display: flex;
      align-items: center;
    }

    /* 深色模式适配 */
    html[data-theme='dark'] .translation-loading,
    .dark .translation-loading {
      color: #aebac1;
      background-color: rgba(0, 168, 132, 0.1);
    }

    .loading-dots {
      display: inline-block;
      width: 20px;
      text-align: left;
      position: relative;
      margin-left: 4px;
    }
    
    .loading-dots:after {
      content: '';
      animation: ellipsis 1.5s infinite;
      position: absolute;
      left: 0;
    }
    
    @keyframes ellipsis {
      0% { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
      100% { content: '.'; }
    }

    .thinking-content {
      position: relative;
      overflow-y: auto;
      max-height: 300px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }

    .thinking-content::-webkit-scrollbar {
      width: 6px;
    }

    .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    html[data-theme='dark'] .thinking-content::-webkit-scrollbar-thumb,
    .dark .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
    }

    /* 闪烁的光标效果 */
    .thinking-content.typing::after {
      content: '|';
      display: inline-block;
      animation: blinkCursor 0.8s infinite;
      font-weight: normal;
      color: #666;
    }

    html[data-theme='dark'] .thinking-content.typing::after,
    .dark .thinking-content.typing::after {
      color: #ccc;
    }

    @keyframes blinkCursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .translation-content {
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .translation-error {
      color: #e53935;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #e53935;
      background-color: rgba(229, 57, 53, 0.05);
      border-radius: 0 4px 4px 0;
    }

    html[data-theme='dark'] .translation-error,
    .dark .translation-error {
      color: #ff6b6b;
      background-color: rgba(229, 57, 53, 0.1);
    }

    .analysis-btn-container {
      display: flex;
      align-items: center;
      margin-left: 12px;
      gap: 4px;
    }

    .settings-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .settings-modal iframe {
      width: 80%;
      max-width: 800px;
      height: 80vh;
      border: none;
      border-radius: 8px;
      background: white;
    }

    html[data-theme='dark'] .settings-modal iframe,
    .dark .settings-modal iframe {
      background: #1f2937;
    }

    .analysis-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 50%;
      transition: all 0.2s;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .analysis-btn:hover {
      background-color: rgba(134, 150, 160, 0.1);
      color: #1296db;
    }

    html[data-theme='dark'] .analysis-btn:hover,
    .dark .analysis-btn:hover {
      background-color: rgba(134, 150, 160, 0.2);
    }

    .analysis-panel {
      position: fixed;
      right: 20px;
      top: 20px;
      width: 380px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }

    html[data-theme='dark'] .analysis-panel,
    .dark .analysis-panel {
      background: #1f2937;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .analysis-content {
      padding: 20px;
    }

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e9edef;
    }

    html[data-theme='dark'] .analysis-header,
    .dark .analysis-header {
      border-bottom: 1px solid #374151;
    }

    .analysis-header h3 {
      margin: 0;
      color: #41525d;
      font-size: 18px;
      font-weight: 600;
    }

    html[data-theme='dark'] .analysis-header h3,
    .dark .analysis-header h3 {
      color: #e5e7eb;
    }

    .close-btn {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 22px;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    /* 输入框高亮效果 */
    .input-highlight {
      animation: inputHighlight 1.5s ease-in-out 3;
    }

    @keyframes inputHighlight {
      0% {
        border-color: #e9edef;
        box-shadow: none;
      }
      50% {
        border-color: #ff3b30;
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
      }
      100% {
        border-color: #e9edef;
        box-shadow: none;
      }
    }

    /* 这是一个更强调的红色脉动效果 */
    .input-required {
      animation: inputRequired 1.5s ease-in-out 3;
    }
    
    @keyframes inputRequired {
      0% {
        border-color: #e9edef;
        box-shadow: none;
      }
      50% {
        border-color: #ff3b30;
        box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.3);
        transform: translateY(-2px);
      }
      100% {
        border-color: #e9edef;
        box-shadow: none;
        transform: translateY(0);
      }
    }

    .analysis-section h4 {
      color: #41525d;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    .analysis-mood {
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
      padding: 12px 16px;
      background: #f0f2f5;
      border-radius: 8px;
    }

    .analysis-topics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .topic-item {
      background: #e7f7ef;
      color: #00a884;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    .analysis-attitudes {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
    }

    .attitude-item {
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.5;
    }

    .attitude-item:last-child {
      margin-bottom: 0;
    }

    .attitude-label {
      color: #41525d;
      font-weight: 500;
    }

    .attitude-value {
      color: #667781;
    }

    .analysis-suggestions {
      margin-bottom: 16px;
    }

    .suggestion-item {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
    }

    .suggested-reply {
      margin-top: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #dcf8c6 0%, #e7f7ef 100%);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 168, 132, 0.1);
    }

    .suggested-reply h4 {
      color: #075e54;
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    .reply-text {
      position: relative;
      color: #111b21;
      font-size: 14px;
      line-height: 1.6;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      border: 1px solid rgba(0, 168, 132, 0.2);
      white-space: pre-wrap;
    }

    .reply-text::before,
    .reply-text::after {
      content: '"';
      position: absolute;
      font-size: 24px;
      color: #00a884;
      opacity: 0.5;
    }

    .reply-text::before {
      left: 8px;
      top: 4px;
    }

    .reply-text::after {
      right: 8px;
      bottom: 4px;
    }

    .analysis-loading {
      padding: 40px 20px;
      text-align: center;
      color: #667781;
      font-size: 14px;
    }

    .loading-dots {
      display: inline-block;
      margin-left: 4px;
      animation: loadingDots 1.5s infinite;
    }

    @keyframes loadingDots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60% { content: '...'; }
      80%, 100% { content: ''; }
    }

    /* 消息列表样式 */
    .chat-list {
      border: 1px solid #e9edef;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;
      background-color: #fff;
      margin: 12px 0;
    }

    .chat-list-header {
      background-color: #f0f2f5;
      padding: 12px;
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e9edef;
    }

    .chat-list-header label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #41525d;
      font-size: 14px;
    }

    .chat-list-header input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .selected-count {
      color: #667781;
      font-size: 13px;
    }

    .chat-message {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      border-bottom: 1px solid #e9edef;
      transition: background-color 0.2s;
    }

    .chat-message:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .chat-message.me {
      background-color: rgba(217, 253, 211, 0.1);
    }

    .chat-message.other {
      background-color: #ffffff;
    }

    .message-select {
      display: flex;
      align-items: center;
      padding: 0 12px;
    }

    .message-select input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .message-sender {
      font-size: 13px;
      font-weight: 500;
    }

    .sender-me {
      color: #1fa855;
    }

    .sender-other {
      color: #53bdeb;
    }

    .message-time {
      color: #667781;
      font-size: 12px;
    }

    .message-text {
      color: #111b21;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }

    /* 开始分析按钮样式 */
    .analysis-actions {
      padding: 16px 0 0;
      text-align: right;
    }

    .start-analysis {
      background: #00a884;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .start-analysis:hover {
      background: #008f72;
    }

    .start-analysis:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }

    /* 滚动条样式 */
    .chat-list::-webkit-scrollbar {
      width: 6px;
    }

    .chat-list::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .chat-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .chat-list::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    .prompt-input {
      margin-bottom: 16px;
    }

    .prompt-input label {
      display: block;
      margin-bottom: 8px;
      color: #41525d;
      font-size: 14px;
    }

    .prompt-input textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      font-family: inherit;
    }

    .prompt-input textarea:focus {
      outline: none;
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section h4 {
      color: #41525d;
      font-size: 16px;
      margin: 0 0 16px;
    }
  `;

  // 创建样式元素
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

// 添加一个处理过的消息ID集合
const processedMessages = new Set();

// 添加一个函数来检查元素是否在视口中
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  const buffer = 100; // 添加冲区，提前加载即将进入的元素
  
  return (
    rect.top >= -buffer &&
    rect.left >= -buffer &&
    rect.bottom <= (window.innerHeight + buffer) &&
    rect.right <= (window.innerWidth + buffer)
  );
}

// 添加节流函数
function throttle(func, limit) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// 修改观察器逻辑
function observeInputArea() {
  let isProcessing = false;
  const observer = new MutationObserver((mutations) => {
    if (isProcessing) return;
    
    isProcessing = true;
    setTimeout(() => {
      const footer = document.querySelector('footer');
      if (footer) {
        // 入框翻译按钮
        if (!footer.querySelector('.input-translate-btn')) {
          addInputTranslateButton();
        }
        // 添加入框翻译器
        if (!footer.querySelector('.input-translator-btn')) {
          addInputTranslator();
        }
      }
      isProcessing = false;
    }, 500);
  });

  const appContainer = document.querySelector('#app');
  if (appContainer) {
    observer.observe(appContainer, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  return () => observer.disconnect();
}

// 添加分析按钮到消息容器
function addAnalysisButton(messageContainer) {
  // 防止重复添加
  if (messageContainer.querySelector('.analysis-btn-container')) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'analysis-btn-container';
  buttonContainer.innerHTML = `
    <button class="settings-btn" title="设置">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M998.4 358.4c-12.8 6.4-32 12.8-44.8 12.8-38.4 0-76.8-19.2-96-57.6-32-51.2-12.8-115.2 32-147.2-70.4-76.8-160-128-262.4-153.6-6.4 57.6-57.6 102.4-115.2 102.4S403.2 70.4 396.8 12.8c-102.4 25.6-192 76.8-262.4 153.6 44.8 32 57.6 96 32 147.2-19.2 38.4-57.6 57.6-96 57.6-12.8 0-32 0-44.8-12.8C6.4 409.6 0 460.8 0 512s6.4 102.4 25.6 153.6c12.8-6.4 32-12.8 44.8-12.8 38.4 0 76.8 19.2 96 57.6 32 51.2 12.8 115.2-32 147.2 70.4 76.8 160 128 262.4 153.6 6.4-57.6 51.2-102.4 115.2-102.4s108.8 44.8 115.2 102.4c102.4-25.6 192-76.8 262.4-153.6-44.8-32-57.6-96-32-147.2 19.2-38.4 57.6-57.6 96-57.6 12.8 0 32 0 44.8 12.8 19.2-51.2 25.6-102.4 25.6-153.6s-6.4-102.4-25.6-153.6z m-44.8 230.4c-64 0-121.6 32-153.6 89.6-32 57.6-32 121.6 0 172.8-38.4 32-89.6 64-134.4 76.8-32-44.8-89.6-83.2-153.6-83.2s-121.6 32-153.6 89.6c-51.2-19.2-96-44.8-134.4-76.8 32-51.2 32-121.6 0-172.8-32-57.6-89.6-96-153.6-96C64 563.2 64 537.6 64 512s0-51.2 6.4-76.8c64 0 121.6-32 153.6-89.6 32-57.6 32-121.6 0-172.8 38.4-32 83.2-64 134.4-76.8 32 44.8 89.6 83.2 153.6 83.2s121.6-32 153.6-89.6c51.2 19.2 96 44.8 134.4 76.8-32 51.2-32 121.6 0 172.8 32 51.2 89.6 89.6 153.6 89.6 6.4 32 6.4 57.6 6.4 83.2s0 51.2-6.4 76.8zM512 320C403.2 320 320 403.2 320 512s83.2 192 192 192 192-83.2 192-192-83.2-192-192-192z m0 320c-70.4 0-128-57.6-128-128s57.6-128 128-128 128 57.6 128 128-57.6 128-128 128z"/>
      </svg>
    </button>
    <button class="translate-all-btn" title="翻译全部消息">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M666.296 824.08c-12.56-30.72-54.224-83.312-123.576-156.384-18.616-19.552-17.456-34.448-10.704-78.896v-5.12c4.424-30.48 12.104-48.4 114.504-64.696 52.128-8.144 65.624 12.56 84.712 41.424l6.28 9.544a101 101 0 0 0 51.44 41.656c9.072 4.192 20.24 9.312 35.368 17.92 36.768 20.24 36.768 43.28 36.768 94.024v5.816a215.28 215.28 0 0 1-41.424 139.632 472.44 472.44 0 0 1-152.2 88.208c27.92-52.368 6.512-114.504 0-132.424l-1.168-0.696zM512 40.96a468.016 468.016 0 0 1 203.872 46.544 434.504 434.504 0 0 0-102.872 82.616c-7.44 10.24-13.728 19.784-19.776 28.632-19.552 29.552-29.096 42.816-46.544 44.912a200.84 200.84 0 0 1-33.752 0c-34.208-2.32-80.752-5.12-95.648 35.376-9.544 25.84-11.168 95.648 19.552 131.96 5.28 8.616 6.224 19.2 2.56 28.624a56.08 56.08 0 0 1-16.528 25.832 151.504 151.504 0 0 1-23.272-23.28 151.28 151.28 0 0 0-66.56-52.824c-10-2.792-21.176-5.12-31.88-7.44-30.256-6.288-64.24-13.504-72.152-30.496a119.16 119.16 0 0 1-5.816-46.544 175.48 175.48 0 0 0-11.168-74 70.984 70.984 0 0 0-44.456-39.568A469.64 469.64 0 0 1 512 40.96zM0 512c0 282.768 229.232 512 512 512 282.768 0 512-229.232 512-512 0-282.768-229.232-512-512-512C229.232 0 0 229.232 0 512z"/>
      </svg>
    </button>
    <button class="analysis-btn" title="AI 分析对话">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M535.311 49.212a343.944 343.944 0 0 1 330.752 249.615h-84.149a264.614 264.614 0 0 0-59.331-92.702 263.65 263.65 0 0 0-187.272-77.402h-82.16a264.192 264.192 0 0 0-264.735 264.794v58.73a42.104 42.104 0 0 1-3.132 15.54l-87.1 203.415 83.606 16.806c18.553 3.553 31.925 19.877 31.925 38.912v106.496c0 23.13 4.096 39.273 9.818 50.959 5.783 11.625 12.89 19.395 21.745 25.84 17.71 12.65 45.297 18.01 69.632 17.89 16.746 0 32.286-2.53 37.587-3.975 48.248-12.89 132.096-36.081 203.716-55.959 71.68-19.817 131.011-36.382 131.072-36.382l21.504 76.499c-0.12 0.12-238.17 66.56-335.812 92.642a242.748 242.748 0 0 1-58.067 6.746 219.738 219.738 0 0 1-85.775-16.263 148.119 148.119 0 0 1-77.04-72.343c-11.807-24.094-17.89-52.947-17.89-85.654v-73.97l-99.63-19.937a40.237 40.237 0 0 1-27.347-20.54 40.297 40.297 0 0 1-1.385-34.033l103.183-241.002v-50.417A344.124 344.124 0 0 1 453.15 49.212zM734.45 382.615l126.615 394.54h-94.992l-24.214-88.184H618.014l-27.106 88.125h-89.57l131.313-394.481H734.45z m259.915 0v394.48h-92.642v-394.48h92.642zM683.008 458.27h-1.205L635 622.23h88.607l-40.599-163.96z"/>
      </svg>
    </button>
  `;

  // 添加点击事件处理
  buttonContainer.querySelector('.settings-btn').addEventListener('click', () => {
    showSettingsModal();
  });
  
  buttonContainer.querySelector('.translate-all-btn').addEventListener('click', async () => {
    // 创建确认对话框
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
      <div class="confirm-content">
        <h3>批量翻译确认</h3>
        <p>该操作将使用Google翻译来翻译当前聊天记录中显示的所有消息。</p>
        <p style="color: #00a884; margin-top: 8px;">注：此功能将直接调用Google翻译，不支持其他模型，无思考过程。</p>
        <div class="confirm-buttons">
          <button class="cancel-btn">取消</button>
          <button class="confirm-btn">确认翻译</button>
        </div>
      </div>
    `;

    // 添加确认对话框样式
    const dialogStyles = `
      .confirm-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .confirm-content {
        background: white;
        border-radius: 8px;
        padding: 20px;
        width: 90%;
        max-width: 400px;
      }

      .confirm-content h3 {
        margin: 0 0 12px;
        color: #41525d;
        font-size: 16px;
      }

      .confirm-content p {
        margin: 0 0 20px;
        color: #667781;
        font-size: 14px;
        line-height: 1.5;
      }

      .confirm-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .confirm-buttons button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .cancel-btn {
        background: #f0f2f5;
        color: #667781;
      }

      .cancel-btn:hover {
        background: #e9edef;
      }

      .confirm-btn {
        background: #00a884;
        color: white;
      }

      .confirm-btn:hover {
        background: #008f72;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = dialogStyles;
    document.head.appendChild(styleElement);

    document.body.appendChild(confirmDialog);

    // 处理按钮点击事件
    confirmDialog.querySelector('.cancel-btn').onclick = () => {
      confirmDialog.remove();
    };

    confirmDialog.querySelector('.confirm-btn').onclick = async () => {
      confirmDialog.remove();
      await translateAllMessages(messageContainer);
    };

    // 点击背景关闭对话框
    confirmDialog.addEventListener('click', (e) => {
      if (e.target === confirmDialog) {
        confirmDialog.remove();
      }
    });
  });
  
  buttonContainer.querySelector('.analysis-btn').addEventListener('click', async () => {
    await analyzeConversation(messageContainer);
  });

  // 更新样式
  const styles = `
    .analysis-btn-container {
      display: flex;
      align-items: center;
      margin-left: 12px;
      gap: 4px;
    }

    .settings-btn,
    .translate-all-btn,
    .analysis-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 50%;
      transition: all 0.2s;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .settings-btn:hover,
    .translate-all-btn:hover,
    .analysis-btn:hover {
      background-color: rgba(134, 150, 160, 0.1);
      color: #1296db;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // 添加到消息容器的适当位置
  const header = messageContainer.querySelector('header');
  if (header) {
    header.appendChild(buttonContainer);
  }
}

// 添加翻译所有消息的函数
async function translateAllMessages(messageContainer) {
  // 显示浮动消息框，提示用户翻译开始
  const notificationId = showToast('正在使用Google翻译批量翻译所有消息...', 'info', 0);
  
  try {
    // 获取所有消息
    const messages = messageContainer.querySelectorAll('div[data-pre-plain-text]');
    let translatedCount = 0;
    
    // 遍历所有消息进行翻译
    for (const message of messages) {
      try {
        // 获取消息容器（批量翻译是否重复，应该以容器为准判断）
        let msgContainer = message.closest('.message-container');
        if (!msgContainer) {
          msgContainer = message.parentElement;
          if (!msgContainer) {
            msgContainer = message;
          }
          msgContainer.classList.add('message-container');
        }

        // 如果已经翻译过/正在翻译/上次翻译失败的提示还在，就跳过，避免重复翻译
        // 但：如果用户手动把翻译隐藏了，批量翻译应把它重新显示出来。
        const existingTranslation = msgContainer.querySelector('.translation-content');
        if (existingTranslation) {
          if (existingTranslation.style.display === 'none') {
            existingTranslation.style.display = 'block';
            const thinkingContent = msgContainer.querySelector('.thinking-content');
            if (thinkingContent) thinkingContent.style.display = 'block';
          }
          continue;
        }
        if (msgContainer.querySelector('.translation-loading') || msgContainer.querySelector('.translation-error')) {
          continue;
        }

        // 获取文本元素
        const textElement = getMessageTextRoot(message);
        if (!textElement) continue;

        // 收集文本内容
        const text = collectTextContent(textElement);
        if (!text) continue;

        // 直接使用Google翻译服务，不使用当前用户设置的翻译服务
        const translation = await window.ApiServices.translation.google(text, 'auto', 'zh-CN');
        
        // 创建翻译结果元素（不包含思考过程）
        if (translation) {
          // 检测是否为暗黑模式
          const isDarkMode = document.body.classList.contains('dark') || 
                            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                            document.documentElement.getAttribute('data-theme') === 'dark';
          
          // 创建翻译结果元素
          const translationElement = document.createElement('div');
          translationElement.className = 'translation-content';
          
          // 应用样式
          if (isDarkMode) {
            translationElement.style.cssText = `
              background-color: rgba(10, 110, 200, 0.1);
              border-left: 3px solid #1e88e5;
              color: #e2e2e2;
              padding: 8px 12px;
              margin-top: 5px;
              font-size: 14px;
              border-radius: 0 4px 4px 0;
              position: relative;
              animation: fadeIn 0.3s ease-in-out;
            `;
          } else {
            translationElement.style.cssText = `
              background-color: rgba(220, 240, 255, 0.7);
              border-left: 3px solid #2196f3;
              color: #333;
              padding: 8px 12px;
              margin-top: 5px;
              font-size: 14px;
              border-radius: 0 4px 4px 0;
              position: relative;
              animation: fadeIn 0.3s ease-in-out;
            `;
          }
          
          // 设置翻译内容
          translationElement.textContent = translation;
          
          // 添加到消息容器
          msgContainer.appendChild(translationElement);
          translatedCount++;
          
          // 更新浮动消息框内容显示进度
          if (translatedCount % 5 === 0 || translatedCount === messages.length) {
            const toastElement = document.getElementById(notificationId);
            if (toastElement && toastElement.querySelector('.toast-content')) {
              toastElement.querySelector('.toast-content').textContent = 
                `正在使用Google翻译批量翻译所有消息... (${translatedCount}/${messages.length})`;
            }
          }
        }
      } catch (error) {
        console.error('翻译消息失败:', error);
        // 失败时继续处理下一条，不中断整体翻译
        continue;
      }
    }
    
    // 更新浮动消息框，显示翻译完成
    const toastElement = document.getElementById(notificationId);
    if (toastElement && toastElement.querySelector('.toast-content')) {
      toastElement.querySelector('.toast-content').textContent = 
        `批量翻译完成！已翻译 ${translatedCount} 条消息`;
      setTimeout(() => {
        if (document.getElementById(notificationId)) {
          document.getElementById(notificationId).remove();
        }
      }, 3000);
    }
  } catch (error) {
    console.error('批量翻译失败:', error);
    // 显示错误提示
    const toastElement = document.getElementById(notificationId);
    if (toastElement) {
      if (toastElement.querySelector('.toast-content')) {
        toastElement.querySelector('.toast-content').textContent = 
          `批量翻译失败: ${error.message || '未知错误'}`;
      }
      toastElement.className = toastElement.className.replace('info', 'error');
      setTimeout(() => {
        if (document.getElementById(notificationId)) {
          document.getElementById(notificationId).remove();
        }
      }, 3000);
    }
  }
}

// 分析对话内容
async function analyzeConversation(messageContainer) {
  try {
    // 先检查AI功能是否启用
    const aiEnabled = await checkAiEnabled();
    if (!aiEnabled) {
      // 显示AI功能未启用的提示
      const toast = document.createElement('div');
      toast.className = 'settings-toast error';
      toast.textContent = 'AI分析功能未启用，请在设置中开启并配置API参数';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      // 自动打开设置面板并自动勾选AI功能
      setTimeout(() => {
        showSettingsModal();
        
        // 等待模态框完全加载
        setTimeout(() => {
          // 自动勾选AI功能开关
          const aiEnabledCheckbox = document.getElementById('aiEnabled');
          if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
            aiEnabledCheckbox.checked = true;
            // 手动触发change事件显示AI服务选项
            const changeEvent = new Event('change');
            aiEnabledCheckbox.dispatchEvent(changeEvent);
          }
          
          // 获取当前选中的AI服务并高亮其API输入框
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            const service = aiApiSelect.value; // 使用当前选择的服务
            const aiApiInputId = `${service}ApiKey_ai`;
            const aiApiInput = document.getElementById(aiApiInputId);
            
            if (aiApiInput) {
              // 给API KEY输入框添加高亮样式
              aiApiInput.classList.add('input-required');
              
              // 确保输入框可见（滚动到视图）
              aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // 给输入框添加焦点
              aiApiInput.focus();
              
              // 添加input事件监听器，当用户开始输入时移除高亮效果
              const handleInput = () => {
                aiApiInput.classList.remove('input-required');
                // 移除事件监听器，避免重复操作
                aiApiInput.removeEventListener('input', handleInput);
              };
              
              aiApiInput.addEventListener('input', handleInput);
              
              // 无论如何，5秒后自动移除高亮效果
              setTimeout(() => {
                aiApiInput.classList.remove('input-required');
              }, 5000);
            }
          }
        }, 300); // 给一点延迟确保DOM已更新
      }, 500);
      
      return;
    }
    
    // 检查是否已配置API
    const { service, apiKey, apiUrl, model } = await window.getAiService();
    if (!apiKey) {
      // 显示API未配置的提示
      const toast = document.createElement('div');
      toast.className = 'settings-toast error';
      toast.textContent = `请先在设置中配置${service === 'deepseek' ? 'DeepSeek' : 'OpenAI'}AI分析API Key`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      // 自动打开设置面板
      setTimeout(() => {
        showSettingsModal();
        
        // 等待模态框完全加载
        setTimeout(() => {
          // 获取AI分析API输入框
          const aiApiInputId = `${service}ApiKey_ai`;
          const aiApiInput = document.getElementById(aiApiInputId);
          
          if (aiApiInput) {
            // 确保首先显示AI服务选项
            const aiEnabledCheckbox = document.getElementById('aiEnabled');
            if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
              aiEnabledCheckbox.checked = true;
              // 手动触发change事件显示AI服务选项
              const changeEvent = new Event('change');
              aiEnabledCheckbox.dispatchEvent(changeEvent);
            }
            
            // 确保当前选择的AI服务与检测到的服务一致
            const aiApiSelect = document.getElementById('aiApi');
            if (aiApiSelect && aiApiSelect.value !== service) {
              aiApiSelect.value = service;
              // 手动触发change事件显示对应的API KEY输入框
              const changeEvent = new Event('change');
              aiApiSelect.dispatchEvent(changeEvent);
            }
            
            // 给API KEY输入框添加高亮样式
            aiApiInput.classList.add('input-required');
            
            // 确保输入框可见（滚动到视图）
            aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 给输入框添加焦点
            aiApiInput.focus();
            
            // 添加input事件监听器，当用户开始输入时移除高亮效果
            const handleInput = () => {
              aiApiInput.classList.remove('input-required');
              // 移除事件监听器，避免重复操作
              aiApiInput.removeEventListener('input', handleInput);
            };
            
            aiApiInput.addEventListener('input', handleInput);
            
            // 无论如何，5秒后自动移除高亮效果
            setTimeout(() => {
              aiApiInput.classList.remove('input-required');
            }, 5000);
          }
        }, 300); // 给一点延迟确保DOM已更新
      }, 500);
      
      return;
    }
    
    // 显示聊天记录选择面板
    const panel = document.createElement('div');
    panel.className = 'analysis-panel';
    panel.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-header">
          <h3>选择要分析的聊天记录</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="chat-list">
          <div class="chat-list-header">
            <label>
              <input type="checkbox" class="select-all">
              全选
            </label>
            <span class="selected-count"></span>
          </div>
          <div class="chat-messages"></div>
        </div>
        <div class="analysis-actions">
          <button class="export-chat" style="background: #f5f5f5; border: 1px solid #ddd; color: #666; padding: 8px 16px; border-radius: 4px; margin-right: 12px; cursor: pointer;">导出聊天</button>
          <button class="start-analysis">开始分析</button>
        </div>
      </div>
    `;

    messageContainer.appendChild(panel);

    // 获取开始分析按钮引用
    const startButton = panel.querySelector('.start-analysis');
    const exportButton = panel.querySelector('.export-chat');

    // 收集对话内容
    const messages = [];
    const messageElements = messageContainer.querySelectorAll('div[data-pre-plain-text]');
    const chatList = panel.querySelector('.chat-messages');
    
    messageElements.forEach(element => {
      const messageContainer = element.closest('.message-in, .message-out');
      const preText = element.getAttribute('data-pre-plain-text');
      let time = '';
      let text = '';
      // 根据消息容器的类名判断是否为自己发送的消息
      let isMe = messageContainer && messageContainer.classList.contains('message-out');
      // 根据是否为自己发送设置显示的发送者名称
      let sender = isMe ? '我方' : '对方';
      
      // 解析时间
      if (preText) {
        const timeMatch = preText.match(/(\d{1,2}:\d{2}(?:\s*(?:上午|下午|AM|PM)?)?)/);
        if (timeMatch) {
          time = timeMatch[1];
        }
      }
      
      // 获取消息文本（复用更稳的正文提取逻辑，避免 WhatsApp DOM 变化导致为空）
      try {
        const textRoot = getMessageTextRoot(element);
        text = collectTextContent(textRoot);
      } catch (e) {
        text = '';
      }
      
      // 只有当消息有实际内容时才添加到列表
      if (text) {
        const messageItem = document.createElement('div');
        messageItem.className = `chat-message ${isMe ? 'me' : 'other'}`;
        messageItem.innerHTML = `
          <label class="message-select">
            <input type="checkbox" data-sender="${sender}" data-text="${text.replace(/"/g, '&quot;')}" data-time="${time}" checked>
          </label>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender ${isMe ? 'sender-me' : 'sender-other'}">${sender}</span>
              <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${text}</div>
          </div>
        `;
        chatList.appendChild(messageItem);
      }
    });

    // 在添加完所有消息后，更新选中计数和钮状态
    const updateSelectionStatus = () => {
      const selectedCount = panel.querySelectorAll('.chat-message input[type="checkbox"]:checked').length;
      const totalCount = panel.querySelectorAll('.chat-message input[type="checkbox"]').length;
      const selectedCountElement = panel.querySelector('.selected-count');
      
      selectedCountElement.textContent = `已选择 ${selectedCount}/${totalCount} 条消息`;
      startButton.disabled = selectedCount === 0;
      exportButton.disabled = selectedCount === 0;
    };

    // 初始化时调用一次更新状态
    updateSelectionStatus();

    // 添加复选框变化事件监听
    panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectionStatus);
    });

    // 全选复选框事件监听
    const selectAllCheckbox = panel.querySelector('.select-all');
    selectAllCheckbox.checked = true; // 默认选中全选
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach(cb => {
        cb.checked = isChecked;
      });
      updateSelectionStatus();
    });

    // 导出聊天按钮点击事件
    exportButton.addEventListener('click', () => {
      try {
        // 获取对方名字 - 使用更新后的选择器
        let headerName = '';
        const headerElement = document.querySelector('span.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu._ao3e');
        if (headerElement) {
          headerName = headerElement.textContent.trim() || '未知联系人';
        } else {
          // 备用选择器
          const backupElement = document.querySelector('[data-testid="conversation-info-header-chat-title"], ._amig, .xliyjgo2');
          headerName = backupElement ? backupElement.textContent.trim() : '未知联系人';
          console.log('使用备用选择器获取标题:', headerName);
        }

        // 获取聊天内容
        const messages = document.querySelectorAll('.copyable-text[data-pre-plain-text]');
        let chatContent = `聊天记录导出时间: ${new Date().toLocaleString()}\n`;
        chatContent += `对话者: ${headerName}\n\n`;

        messages.forEach(msg => {
          try {
            const preText = msg.getAttribute('data-pre-plain-text') || '';
            // 只获取原始消息文本，排除翻译按钮和翻译结果
            const messageText = msg.querySelector('.selectable-text')?.textContent || '';
            
            // 移除末尾的"译"字（如果存在）
            const cleanedText = messageText.replace(/译$/, '');
            
            if (cleanedText) {
              chatContent += `${preText}${cleanedText}\n`;
            }
          } catch (err) {
            console.warn('处理单条消息时出错:', err);
          }
        });

        // 创建并下载文件
        const fileName = `WhatsApp-${headerName}-${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('聊天记录导出成功，对话者:', headerName);
      } catch (error) {
        console.error('导出聊天记录时发生错误:', error);
      }
    });

    // 开始分析按钮点击事件
    startButton.addEventListener('click', async () => {
      try {
        console.log('开始分析按钮被点击');
        
        const selectedMessages = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked'))
          .map(cb => ({
            sender: cb.dataset.sender,
            text: cb.dataset.text
          }));
        
        console.log('选中的消息内容:', selectedMessages);
        
        if (selectedMessages.length === 0) {
          console.warn('没有选中任何消息，终止分析');
          return;
        }
        
        // 显示加载状态
        panel.innerHTML = `
          <div class="analysis-loading">
            <span>AI 正在分析对话内容...</span>
            <div class="loading-dots"></div>
          </div>
        `;
        console.log('已显示加载状态');

        // 获取 AI 服务设置
        const { service, apiKey, apiUrl, model } = await window.getAiService();
        console.log('使用的 AI 服务:', service);
        console.log('API Key 长度:', apiKey ? apiKey.length : 0);
        
        // 调用 AI 分析前的日志
        console.log('准备发送分析请求，参数:', {
          service,
          messageCount: selectedMessages.length,
          messages: selectedMessages
        });
        
        // 调用 AI 分析
        let analysis;
        if (service === 'siliconflow') {
          analysis = await window.ApiServices.analysis[service](selectedMessages, apiKey, apiUrl, model);
        } else {
          analysis = await window.ApiServices.analysis[service](selectedMessages, apiKey);
        }
        console.log('AI 分析返回结果:', analysis);

        // 显示分析结果
        console.log('准备显示分析结果');
        showAnalysisResult(messageContainer, analysis);
        console.log('分析结果显示完成');

      } catch (error) {
        console.error('分析过程中发生错误:', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        });
        showAnalysisError(messageContainer, error.message);
      }
    });

    // 关闭按钮事件
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.remove();
    });

  } catch (error) {
    console.error('Analysis error:', error);
    showAnalysisError(messageContainer, error.message);
  }
}

// 添加检查AI功能是否启用的函数
function checkAiEnabled() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['aiEnabled'], (data) => {
      const enabled = data.aiEnabled === true;
      console.log('检查AI功能是否启用:', enabled);
      resolve(enabled);
    });
  });
}

// 修改 showAnalysisResult 函数
function showAnalysisResult(container, analysis) {
  const panel = container.querySelector('.analysis-panel');
  if (!panel) return;

  // 解析 AI 返回的文本内容
  function parseAnalysis(text) {
    const result = {
      mood: '',
      topics: [],
      attitudes: {
        me: '',
        other: ''
      },
      suggestions: [],
      suggestedReply: ''
    };

    try {
      console.log('开始解析文本:', text);

      if (!text || typeof text !== 'string') {
        console.error('无效的分析文本:', text);
        return result;
      }

      // 更灵活地提取建议回复示例，支持不同的引号和格式
      const replyPatterns = [
        /建议回复示例[：:]\s*[""]([^""]+)[""]/,
        /建议回复示例[：:]\s*['']([^'']+)['']/,
        /建议回复[：:]\s*[""]([^""]+)[""]/,
        /建议回复[：:]\s*['']([^'']+)['']/,
        /示例[：:]\s*[""]([^""]+)[""]/,
        /示例[：:]\s*['']([^'']+)['']/,
        /回复示例[：:]\s*[""]([^""]+)[""]/,
        /回复示例[：:]\s*['']([^'']+)['']/,
        /[""]([^""]{10,})[""]/,  // 捕获长度至少10个字符的引号内容
        /['']([^'']{10,})['']/   // 捕获长度至少10个字符的引号内容
      ];

      // 尝试所有可能的格式匹配
      for (const pattern of replyPatterns) {
        const match = text.match(pattern);
        if (match) {
          const reply = match[1].trim();
          // 如果回复内容被方括号包裹，去掉方括号
          result.suggestedReply = reply.replace(/^\[(.*)\]$/, '$1').trim();
          console.log('找到建议回复示例:', result.suggestedReply);
          break;
        }
      }

      // 分别处理各个部分，使用更灵活的匹配方式
      // 首先尝试按照标准格式分段
      const cleanText = text.replace(/\r\n/g, '\n');  // 统一换行符
      
      // 尝试多种分段方法
      let sections = [];
      if (cleanText.includes('\n\n')) {
        sections = cleanText.split('\n\n');
      } else {
        // 如果没有双换行，尝试使用单换行并跳过空行
        sections = cleanText.split('\n')
          .filter(line => line.trim())  // 过滤空行
          .reduce((acc, line) => {
            // 如果是新的段落标题，创建新段落
            if (/^(对话氛围|主要话题|双方态度|建议回复方式|回复示例)/.test(line)) {
              acc.push(line);
            } else if (acc.length > 0) {
              // 否则将内容添加到上一个段落
              acc[acc.length - 1] += '\n' + line;
            }
            return acc;
          }, []);
      }

      console.log('解析的段落数:', sections.length);

      // 更灵活地处理各部分
      for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();

        // 对话氛围部分
        if (/对话氛围/.test(title)) {
          // 如果只有标题行，尝试在其他部分找相关内容
          if (lines.length <= 1) {
            const moodPattern = /氛围[是为：:]\s*(.+)/;
            const moodMatch = cleanText.match(moodPattern);
            if (moodMatch) {
              result.mood = moodMatch[1].replace(/[\[\]]/g, '').trim();
            }
          } else {
            // 标准处理
            result.mood = lines.slice(1).join(' ')
              .replace(/[\[\]]/g, '')
              .trim();
          }
        }
        
        // 主要话题部分
        else if (/主要话题/.test(title)) {
          // 获取除标题外的所有内容
          const topicContent = lines.slice(1).join(' ');
          
          // 尝试多种分割方式提取话题
          let topics = [];
          
          if (topicContent.includes('。')) {
            // 按句号分割
            topics = topicContent
              .replace(/[\[\]]/g, '')  // 移除方括号
              .split(/[。；;]/)  // 按句号或分号分割
              .map(t => t.trim())
              .filter(t => t);
          } else {
            // 可能是列表格式，尝试按行分割
            topics = lines.slice(1)
              .map(line => line.replace(/^[\d\-、]+[\s.]*|[\[\]]/g, '').trim())
              .filter(t => t);
          }
          
          if (topics.length > 0) {
            result.topics = topics;
          }
        }
        
        // 双方态度部分
        else if (/双方态度/.test(title)) {
          // 尝试多种格式匹配
          const mePatterns = [
            /我方态度[：:]\s*(.+)/,
            /我方[：:]\s*(.+)/,
            /我方的态度(是)?[：:)]\s*(.+)/
          ];
          
          const otherPatterns = [
            /对方态度[：:]\s*(.+)/,
            /对方[：:]\s*(.+)/,
            /对方的态度(是)?[：:)]\s*(.+)/
          ];
          
          // 在整个文本中搜索匹配
          for (const line of lines) {
            // 尝试匹配我方态度
            for (const pattern of mePatterns) {
              const match = line.match(pattern);
              if (match) {
                result.attitudes.me = (match[2] || match[1])
                  .replace(/[\[\]]/g, '')
                  .trim();
                break;
              }
            }
            
            // 尝试匹配对方态度
            for (const pattern of otherPatterns) {
              const match = line.match(pattern);
              if (match) {
                result.attitudes.other = (match[2] || match[1])
                  .replace(/[\[\]]/g, '')
                  .trim();
                break;
              }
            }
          }
          
          // 如果仍未找到，尝试在整个文本中查找
          if (!result.attitudes.me) {
            for (const pattern of mePatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.me = (match[2] || match[1])
                  .replace(/[\[\]]/g, '')
                  .trim();
                break;
              }
            }
          }
          
          if (!result.attitudes.other) {
            for (const pattern of otherPatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.other = (match[2] || match[1])
                  .replace(/[\[\]]/g, '')
                  .trim();
                break;
              }
            }
          }
        }
        
        // 建议回复方式部分
        else if (/建议回复方式|回复建议|回复策略/.test(title)) {
          const suggestions = [];
          
          // 跳过标题和可能包含的建议回复示例
          for (const line of lines.slice(1)) {
            const cleanLine = line.replace(/[\[\]]/g, '').trim();
            
            // 过滤掉建议回复示例和引号内容
            if (cleanLine && 
                !cleanLine.includes('建议回复示例') && 
                !cleanLine.includes('回复示例') && 
                !cleanLine.startsWith('"') && 
                !cleanLine.startsWith('"') && 
                !cleanLine.startsWith("'")) {
              suggestions.push(cleanLine);
            }
          }
          
          if (suggestions.length > 0) {
            result.suggestions = suggestions;
          }
        }
      }
      
      // 如果有部分没有成功解析，尝试在全文中查找
      if (!result.mood) {
        const moodPattern = /对话(的)?(氛围|语气)(是|为)?[：:]\s*(.+?)(?=\n|$)/;
        const moodMatch = cleanText.match(moodPattern);
        if (moodMatch) {
          result.mood = moodMatch[4].replace(/[\[\]]/g, '').trim();
        }
      }

      // 对结果进行最终处理，确保不返回空值
      // 如果没有找到特定部分，但文本中包含相关信息，尝试提取
      if (!result.mood && cleanText.length > 0) {
        const firstPara = cleanText.split('\n')[0];
        if (firstPara.length > 10 && !firstPara.includes('对话')) {
          result.mood = firstPara.replace(/[\[\]]/g, '').trim();
        }
      }
      
      // 如果话题为空但文本包含相关信息
      if (result.topics.length === 0 && cleanText.includes('话题')) {
        const topicSection = cleanText.match(/话题[：:]\s*(.+?)(?=\n\n|\n[^\n]|$)/s);
        if (topicSection) {
          result.topics = [topicSection[1].replace(/[\[\]]/g, '').trim()];
        }
      }

      console.log('最终解析结果:', result);
      return result;

    } catch (error) {
      console.error('解析分析结果时出错:', error);
      
      // 即使发生错误，也尝试提取一些基本信息
      if (text && typeof text === 'string') {
        // 提取纯文本作为对话氛围
        const firstLine = text.split('\n')[0];
        if (firstLine && firstLine.length > 0) {
          result.mood = firstLine.replace(/[\[\]]/g, '').trim();
        }
        
        // 尝试提取最长的一段作为回复示例
        const paragraphs = text.split('\n\n');
        if (paragraphs.length > 1) {
          const longestPara = paragraphs.reduce((longest, current) => 
            current.length > longest.length ? current : longest, '');
          if (longestPara.length > 20) {
            result.suggestedReply = longestPara.replace(/[\[\]"]/g, '').trim();
          }
        }
      }
      
      return result;
    }
  }

  const parsedAnalysis = parseAnalysis(analysis);

  // 添加最大高度和滚动样式
  panel.style.maxHeight = '80vh'; // 设置最大高度为视口高度的80%
  panel.style.overflowY = 'auto'; // 添加垂直滚动条

  panel.innerHTML = `
    <div class="analysis-content">
      <div class="analysis-header">
        <h3>AI 对话分析</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="analysis-body">
        <div class="analysis-section">
          <h4>对话氛围</h4>
          <div class="analysis-mood">${parsedAnalysis.mood || '未能识别'}</div>
        </div>
        
        <div class="analysis-section">
          <h4>主要话题</h4>
          <div class="analysis-topics">
            ${parsedAnalysis.topics.length > 0 
              ? parsedAnalysis.topics.map(topic => `
                  <div class="topic-item">${topic}</div>
                `).join('')
              : '<div class="topic-item">未能识别</div>'
            }
          </div>
        </div>
        
        <div class="analysis-section">
          <h4>双方态度</h4>
          <div class="analysis-attitudes">
            <div class="attitude-item">
              <span class="attitude-label">我方态度：</span>
              <span class="attitude-value">${parsedAnalysis.attitudes.me || '未能识别'}</span>
            </div>
            <div class="attitude-item">
              <span class="attitude-label">对方态度：</span>
              <span class="attitude-value">${parsedAnalysis.attitudes.other || '未能识别'}</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-section">
          <h4>建议回复方式</h4>
          <div class="analysis-suggestions">
            ${parsedAnalysis.suggestions.length > 0
              ? parsedAnalysis.suggestions.map(suggestion => `
                  <div class="suggestion-item">
                    <div class="suggestion-text">${suggestion}</div>
                  </div>
                `).join('')
              : '<div class="suggestion-item">未提供建议</div>'
            }
          </div>
        </div>
        ${parsedAnalysis.suggestedReply 
          ? `<div class="suggested-reply">
              <h4>建议回复示例</h4>
              <div class="reply-text">"${parsedAnalysis.suggestedReply}"</div>
            </div>`
          : ''
        }
      </div>
    </div>
  `;

  // 添加关闭按钮事件
  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
  });
}

// 显示分析错误
function showAnalysisError(container, message) {
  const panel = container.querySelector('.analysis-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="analysis-error">
      <span>分析失败: ${message}</span>
      <button class="close-btn">×</button>
    </div>
  `;

  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
  });
}

// 格式化分析结果
function formatAnalysis(analysis) {
  // 将分析结果文本转换 HTML
  return analysis.split('\n').map(line => {
    if (line.match(/^\d\./)) {
      return `<h4>${line}</h4>`;
    }
    return `<p>${line}</p>`;
  }).join('');
}

// 显示设置模态框
function showSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'settings-modal';
  modal.id = 'settings-modal';
  let settingsDirty = false;
  
  const content = document.createElement('div');
  content.className = 'settings-content';
  content.innerHTML = `
    <div class="settings-header">
      <h3>设置</h3>
      <button class="close-btn">×</button>
    </div>
    
    <div class="settings-body">
      <div class="author-info settings-author-info">
        <img src="https://avatars.githubusercontent.com/u/179492542?v=4" alt="Achord" class="author-avatar">
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>作者：Achord</span>
        </div>
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          <span>Tel: 13160235855</span>
        </div>
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <span style="display: flex; align-items: center; gap: 4px;">Email: <a href="mailto:achordchan@gmail.com">achordchan@gmail.com</a></span>
        </div>

        <div class="author-links">
          <div class="info-item">
            <a href="https://www.github.com/Achordchan/WA-AI-chrome" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>项目地址</span>
            </a>
          </div>
          <div class="info-item">
            <a href="${chrome.runtime.getURL('PrivacyPolicy.html')}" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>隐私条款</span>
            </a>
          </div>
          <div class="info-item">
            <a href="${chrome.runtime.getURL('LICENSE')}" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span>开源协议</span>
            </a>
          </div>
          <div class="info-item">
            <a href="https://ifdian.net/a/achord" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7-4.35-10-9.5C-.37 6.9 3.04 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 20.96 2 24.37 6.9 22 11.5 19 16.65 12 21 12 21z"/>
              </svg>
              <span>赞助我</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 翻译服务设置 -->
      <div class="settings-section">
        <h4>翻译服务</h4>
        <div class="service-selection">
          <label for="translationApi">选择翻译服务</label>
          <select id="translationApi">
            <option value="google">Google 翻译</option>
            <option value="deepseek">DeepSeek 翻译</option>
            <option value="dashscope">通义千问翻译(暂未开放)</option>
            <option value="volcengine">火山翻译(暂未开放)</option>
            <option value="baidu">百度翻译</option>
            <option value="siliconflow">OpenAI通用接口</option>
          </select>
        </div>

        <div class="admin-preset" style="margin-top: 10px;">
          <button type="button" class="admin-preset-btn" id="adminPresetBtn">使用管理员预设API接口</button>
        </div>
        
        <!-- 目标语言选择 -->
        <div class="target-language" style="margin-top: 12px;">
          <label for="targetLanguage">目标语言</label>
          <select id="targetLanguage">
            <option value="zh-CN">中文</option>
            <option value="en">英文</option>
          </select>
        </div>

        <div class="settings-section" style="margin-top: 16px;">
          <h4>自动翻译</h4>
          <div class="toggle-switch-container">
            <label for="autoTranslateNewMessages" class="toggle-label">自动翻译新消息</label>
            <label class="toggle-switch">
              <input type="checkbox" id="autoTranslateNewMessages" class="toggle-input">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">开启后，你和对方新发送的消息会自动翻译一次（仅新增消息，不会批量翻译历史记录）。</p>

          <div class="toggle-switch-container" style="margin-top: 12px;">
            <label for="inputQuickTranslateSend" class="toggle-label">输入框快捷翻译发送</label>
            <label class="toggle-switch">
              <input type="checkbox" id="inputQuickTranslateSend" class="toggle-input">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">开启后：按回车会先把输入内容快速翻译并自动替换到输入框，翻译完成后你再按一次回车即可发送（Shift+Enter 换行不受影响）。请先在聊天窗口里点击输入框翻译按钮设置目标语言，我们会按联系人（手机号）把你的选择保存到本地。</p>
        </div>
        
        <!-- 翻译服务API设置 - 根据选择的服务动态显示 -->
        <div class="api-settings" id="translation-settings" style="margin-top: 16px;">
          <!-- Google翻译设置 - 无需API -->
          <div class="api-setting-group" id="google-settings" style="display: none;">
            <p class="api-notice">Google翻译无需API密钥</p>
          </div>
          
          <!-- DeepSeek翻译设置 -->
          <div class="api-setting-group" id="deepseek-settings" style="display: none;">
            <div class="api-key-input">
              <label>DeepSeek API Key</label>
              <div class="api-key-wrapper">
                <input type="password" id="deepseekApiKey">
                <button class="toggle-visibility" data-for="deepseekApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 百度翻译设置 -->
          <div class="api-setting-group" id="baidu-settings" style="display: none;">
            <div class="api-key-input">
              <label>百度翻译 API ID</label>
              <div class="api-key-wrapper">
                <input type="password" id="baiduApiId">
                <button class="toggle-visibility" data-for="baiduApiId">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="api-key-input">
              <label>百度翻译 Secret Key</label>
              <div class="api-key-wrapper">
                <input type="password" id="baiduSecretKey">
                <button class="toggle-visibility" data-for="baiduSecretKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- OpenAI翻译设置 -->
          <div class="api-setting-group" id="siliconflow-settings" style="display: none;">
            <div class="api-key-input">
              <label>OpenAI API Key</label>
              <div class="api-key-wrapper">
                <input type="password" id="siliconflowApiKey">
                <button class="toggle-visibility" data-for="siliconflowApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="api-key-input">
              <label>OpenAI API URL</label>
              <div class="api-key-wrapper">
                <input type="text" id="siliconflowApiUrl" placeholder="https://api.openai.com/v1/chat/completions">
                <button class="toggle-visibility" data-for="siliconflowApiUrl">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="api-key-input">
              <label>OpenAI 模型名称</label>
              <div class="api-key-wrapper">
                <input type="text" id="siliconflowModel" placeholder="gpt-3.5-turbo">
              </div>
            </div>
            
            <!-- 添加更多设置的折叠区域 -->
            <div class="advanced-settings-toggle" style="margin-top: 12px; cursor: pointer;">
              <span style="display: flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 5px;" class="advanced-settings-icon">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
                高级选项
              </span>
            </div>
            
            <div class="advanced-settings" style="display: none; margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
              <!-- 温度设置 -->
              <div class="setting-item">
                <label for="openaiTemperature">温度设置 (0.1-2.0)</label>
                <div style="display: flex; align-items: center;">
                  <input type="range" id="openaiTemperature" min="0.1" max="2.0" step="0.1" value="0.7" style="flex: 1;">
                  <span id="openaiTemperatureValue" style="margin-left: 8px; min-width: 30px;">0.7</span>
                </div>
              </div>
              
              <!-- 推理模型开关 -->
              <div class="setting-item" style="margin-top: 12px;">
                <div class="toggle-switch-container">
                  <label for="openaiReasoningEnabled" class="toggle-label">启用推理过程显示</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="openaiReasoningEnabled" class="toggle-input">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p style="margin-top: 6px; font-size: 12px; color: #666;">启用后，翻译将显示模型的思考过程</p>
              </div>
            </div>
            
            <p class="api-notice" style="margin-top: 8px; font-size: 12px; color: #666;">提示：任何兼容OpenAI接口的服务都可以使用，如硅基流动、智谱、Azure OpenAI、Claude API等</p>
          </div>
          
          <!-- 通义千问翻译设置 -->
          <div class="api-setting-group" id="dashscope-settings" style="display: none;">
            <div class="api-key-input">
              <label>通义千问 API Key</label>
              <div class="api-key-wrapper">
                <input type="password" id="dashscopeApiKey">
                <button class="toggle-visibility" data-for="dashscopeApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 火山翻译设置 -->
          <div class="api-setting-group" id="volcengine-settings" style="display: none;">
            <div class="api-key-input">
              <label>火山引擎 API Key</label>
              <div class="api-key-wrapper">
                <input type="password" id="volcengineApiKey">
                <button class="toggle-visibility" data-for="volcengineApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI服务设置 -->
      <div class="settings-section">
        <h4>AI分析服务</h4>
        
        <!-- 添加AI服务启用开关 -->
        <div class="toggle-switch-container">
          <label for="aiEnabled" class="toggle-label">启用AI分析功能</label>
          <label class="toggle-switch">
            <input type="checkbox" id="aiEnabled" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div id="ai-service-options" style="display: none;">
          <div class="service-selection">
            <label for="aiApi">选择AI服务</label>
            <select id="aiApi">
              <option value="deepseek">DeepSeek</option>
              <option value="siliconflow">OpenAI通用接口</option>
            </select>
          </div>
          
          <!-- AI分析目标语言选择 -->
          <div class="target-language" style="margin-top: 12px;">
            <label for="aiTargetLanguage">分析结果语言</label>
            <select id="aiTargetLanguage">
              <option value="zh-CN">中文</option>
              <option value="en">英文</option>
            </select>
          </div>
          
          <!-- AI服务API设置 - 根据选择的服务动态显示 -->
          <div class="api-settings" id="ai-settings" style="margin-top: 16px;">
            <!-- DeepSeek AI设置 -->
            <div class="api-setting-group" id="ai-deepseek-settings" style="display: none;">
              <div class="api-key-input">
                <label>DeepSeek API Key</label>
                <div class="api-key-wrapper">
                  <input type="password" id="deepseekApiKey_ai">
                  <button class="toggle-visibility" data-for="deepseekApiKey_ai">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- OpenAI通用接口设置 -->
            <div class="api-setting-group" id="ai-siliconflow-settings" style="display: none;">
              <div class="api-key-input">
                <label>OpenAI API Key</label>
                <div class="api-key-wrapper">
                  <input type="password" id="siliconflowApiKey_ai">
                  <button class="toggle-visibility" data-for="siliconflowApiKey_ai">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="api-key-input">
                <label>OpenAI API URL</label>
                <div class="api-key-wrapper">
                  <input type="text" id="siliconflowApiUrl_ai" placeholder="https://api.openai.com/v1/chat/completions">
                  <button class="toggle-visibility" data-for="siliconflowApiUrl_ai">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34-3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="api-key-input">
                <label>OpenAI 模型名称</label>
                <div class="api-key-wrapper">
                  <input type="text" id="siliconflowModel_ai" placeholder="gpt-3.5-turbo">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI系统角色设定 -->
        <div class="settings-section" id="ai-system-role" style="margin-top: 16px; border-bottom: none; padding-bottom: 0; display: none;">
          <h4>AI 系统角色设定</h4>
          <div class="prompt-input">
            <textarea id="systemRole" rows="3" placeholder="设置 AI 分析师的角色特点和专业背景">你是一位专业的对话分析专家和二十年经验的外贸业务员。请分析以下对话内容，结合对方和我方的实际情况，并严格按照固定格式输出分析结果，但是不要输出Markdown格式。</textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button class="save-btn">保存设置</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  const attemptCloseSettingsModal = () => {
    try {
      if (settingsDirty) {
        const ok = window.confirm('设置尚未保存，确定要关闭吗？');
        if (!ok) return;
      }
      modal.remove();
    } catch (e) {
      try { modal.remove(); } catch (e2) {}
    }
  };

  content.addEventListener(
    'input',
    (e) => {
      try {
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        const tag = (t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          settingsDirty = true;
        }
      } catch (e2) {
        // ignore
      }
    },
    true
  );
  content.addEventListener(
    'change',
    (e) => {
      try {
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        const tag = (t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          settingsDirty = true;
        }
      } catch (e2) {
        // ignore
      }
    },
    true
  );

  // 添加事件监听
  const closeBtn = content.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    attemptCloseSettingsModal();
  });
  
  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) return;
  });

  // 切换密码可见性
  const toggleBtns = content.querySelectorAll('.toggle-visibility');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-for');
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // 翻译服务选择变化事件
  const translationApiSelect = content.querySelector('#translationApi');
  translationApiSelect.addEventListener('change', () => {
    // 隐藏所有翻译服务设置
    document.querySelectorAll('#translation-settings .api-setting-group').forEach(el => {
      el.style.display = 'none';
    });
    
    // 显示当前选中的服务设置
    const selectedService = translationApiSelect.value;
    const settingsEl = document.getElementById(`${selectedService}-settings`);
    if (settingsEl) {
      settingsEl.style.display = 'block';
    }
  });

  // 管理员预设
  const adminPresetBtn = content.querySelector('#adminPresetBtn');
  if (adminPresetBtn) {
    const openAdminPresetDialog = () => {
      try {
        const existing = document.querySelector('.admin-preset-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'admin-preset-overlay';
        overlay.innerHTML = `
          <div class="admin-preset-card" role="dialog" aria-modal="true">
            <div class="admin-preset-header">
              <div class="admin-preset-title">管理员预设</div>
              <button type="button" class="admin-preset-close" aria-label="关闭">×</button>
            </div>
            <div class="admin-preset-body">
              <div class="admin-preset-row">
                <label class="admin-preset-label">管理员口令</label>
                <input class="admin-preset-input" type="password" id="adminPresetPass" placeholder="请输入口令">
              </div>
              <div class="admin-preset-hint">将自动把“翻译服务”和“AI分析服务”切换到 OpenAI 通用接口，并填充 API Key / URL / 模型。</div>
            </div>
            <div class="admin-preset-footer">
              <button type="button" class="admin-preset-secondary" id="adminPresetCancel">取消</button>
              <button type="button" class="admin-preset-primary" id="adminPresetApply">应用预设</button>
            </div>
          </div>
        `;

        modal.appendChild(overlay);

        const close = () => {
          try { overlay.remove(); } catch (e) {}
        };

        const passEl = overlay.querySelector('#adminPresetPass');

        const closeBtn = overlay.querySelector('.admin-preset-close');
        const cancelBtn = overlay.querySelector('#adminPresetCancel');
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });

        const applyBtn = overlay.querySelector('#adminPresetApply');
        if (applyBtn) {
          applyBtn.addEventListener('click', () => {
            try {
              const pass = (passEl?.value || '').trim();
              if (pass !== 'Achord666') {
                showToast('口令错误', 'error');
                if (passEl) passEl.focus();
                return;
              }

              const presetApiKey = '6c9033c7e08b403abd6f66f09f146f60.hvyHTj91HZQOzT7E';
              const presetApiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
              const presetModel = 'glm-4-flash-250414';

              const translationApiSelect = document.getElementById('translationApi');
              if (translationApiSelect) {
                translationApiSelect.value = 'siliconflow';
                translationApiSelect.dispatchEvent(new Event('change'));
              }

              const apiUrlEl = document.getElementById('siliconflowApiUrl');
              if (apiUrlEl) apiUrlEl.value = presetApiUrl;

              const modelEl = document.getElementById('siliconflowModel');
              if (modelEl) modelEl.value = presetModel;

              const keyEl = document.getElementById('siliconflowApiKey');
              if (keyEl) keyEl.value = presetApiKey;

              const aiEnabledToggle = document.getElementById('aiEnabled');
              if (aiEnabledToggle) {
                aiEnabledToggle.checked = true;
                aiEnabledToggle.dispatchEvent(new Event('change'));
              }

              const aiApiSelect = document.getElementById('aiApi');
              if (aiApiSelect) {
                aiApiSelect.value = 'siliconflow';
                aiApiSelect.dispatchEvent(new Event('change'));
              }

              const apiUrlElAi = document.getElementById('siliconflowApiUrl_ai');
              if (apiUrlElAi) apiUrlElAi.value = presetApiUrl;

              const modelElAi = document.getElementById('siliconflowModel_ai');
              if (modelElAi) modelElAi.value = presetModel;

              const keyElAi = document.getElementById('siliconflowApiKey_ai');
              if (keyElAi) keyElAi.value = presetApiKey;

              showToast('已应用管理员预设', 'success');
              close();
            } catch (e) {
              console.error('应用管理员预设失败:', e);
              showToast('应用管理员预设失败', 'error');
            }
          });
        }

        if (passEl) {
          passEl.focus();
          passEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const btn = overlay.querySelector('#adminPresetApply');
              if (btn) btn.click();
            }
          });
        }
      } catch (e) {
        console.error('打开管理员预设弹窗失败:', e);
        showToast('打开管理员预设弹窗失败', 'error');
      }
    };

    adminPresetBtn.addEventListener('click', openAdminPresetDialog);
  }
  
  // AI服务选择变化事件
  const aiApiSelect = content.querySelector('#aiApi');
  aiApiSelect.addEventListener('change', () => {
    // 隐藏所有AI服务设置
    document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
      el.style.display = 'none';
    });
    
    // 显示当前选中的服务设置
    const selectedService = aiApiSelect.value;
    const settingsEl = document.getElementById(`ai-${selectedService}-settings`);
    if (settingsEl) {
      settingsEl.style.display = 'block';
    }
  });

  // AI功能开关事件
  const aiEnabledToggle = content.querySelector('#aiEnabled');
  const aiServiceOptions = content.querySelector('#ai-service-options');
  const aiSystemRole = content.querySelector('#ai-system-role');
  
  aiEnabledToggle.addEventListener('change', () => {
    console.log('AI开关状态变化:', aiEnabledToggle.checked);
    // 显示/隐藏AI服务选项和系统角色设置
    aiServiceOptions.style.display = aiEnabledToggle.checked ? 'block' : 'none';
    aiSystemRole.style.display = aiEnabledToggle.checked ? 'block' : 'none';
    
    // 如果AI功能启用，显示当前选中的AI服务设置
    if (aiEnabledToggle.checked) {
      const selectedAiService = document.getElementById('aiApi').value;
      
      // 隐藏所有AI服务设置
      document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
        el.style.display = 'none';
      });
      
      // 显示当前选中的AI服务设置
      const aiSettingsEl = document.getElementById(`ai-${selectedAiService}-settings`);
      if (aiSettingsEl) {
        aiSettingsEl.style.display = 'block';
      }
    }
  });

  // 保存设置
  const saveBtn = content.querySelector('.save-btn');
  saveBtn.addEventListener('click', () => {
    saveSettings();
    settingsDirty = false;
    modal.remove();
  });

  // 添加高级设置折叠功能
  const advancedSettingsToggle = content.querySelector('.advanced-settings-toggle');
  if (advancedSettingsToggle) {
    advancedSettingsToggle.addEventListener('click', () => {
      const advancedSettings = content.querySelector('.advanced-settings');
      const icon = content.querySelector('.advanced-settings-icon');
      if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        icon.innerHTML = '<path d="M7 14l5-5 5 5z"/>';
      } else {
        advancedSettings.style.display = 'none';
        icon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
      }
    });
  }
  
  // 添加温度滑块值显示
  const temperatureSlider = content.querySelector('#openaiTemperature');
  const temperatureValue = content.querySelector('#openaiTemperatureValue');
  if (temperatureSlider && temperatureValue) {
    temperatureSlider.addEventListener('input', () => {
      temperatureValue.textContent = temperatureSlider.value;
    });
  }

  // 修改保存设置函数
  function saveSettings() {
    try {
      const formData = {
        translationApi: document.getElementById('translationApi').value,
        targetLanguage: document.getElementById('targetLanguage').value,
        autoTranslateNewMessages: document.getElementById('autoTranslateNewMessages').checked,
        inputQuickTranslateSend: document.getElementById('inputQuickTranslateSend')?.checked === true,
        aiEnabled: document.getElementById('aiEnabled').checked
      };

      // 根据所选服务获取API Keys
      if (formData.translationApi === 'deepseek') {
        formData.deepseekApiKey = document.getElementById('deepseekApiKey').value;
      } else if (formData.translationApi === 'dashscope') {
        formData.dashscopeApiKey = document.getElementById('dashscopeApiKey').value;
      } else if (formData.translationApi === 'volcengine') {
        formData.volcengineApiKey = document.getElementById('volcengineApiKey').value;
      } else if (formData.translationApi === 'baidu') {
        formData.baiduApiId = document.getElementById('baiduApiId').value;
        formData.baiduSecretKey = document.getElementById('baiduSecretKey').value;
      } else if (formData.translationApi === 'siliconflow') {
        formData.siliconflowApiKey = document.getElementById('siliconflowApiKey').value;
        formData.siliconflowApiUrl = document.getElementById('siliconflowApiUrl').value;
        formData.siliconflowModel = document.getElementById('siliconflowModel').value;
        
        // 保存OpenAI高级设置
        const temperatureSlider = document.getElementById('openaiTemperature');
        if (temperatureSlider) {
          formData.openaiTemperature = parseFloat(temperatureSlider.value);
        }
        
        const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
        if (reasoningEnabled) {
          formData.openaiReasoningEnabled = reasoningEnabled.checked;
        }
      }

      // 获取AI服务设置
      if (formData.aiEnabled) {
        formData.aiApi = document.getElementById('aiApi').value;
        formData.aiTargetLanguage = document.getElementById('aiTargetLanguage').value;
        
        // 根据所选AI服务获取API Keys
        if (formData.aiApi === 'deepseek') {
          formData.deepseekApiKey_ai = document.getElementById('deepseekApiKey_ai').value;
        } else if (formData.aiApi === 'siliconflow') {
          formData.siliconflowApiKey_ai = document.getElementById('siliconflowApiKey_ai').value;
          formData.siliconflowApiUrl_ai = document.getElementById('siliconflowApiUrl_ai').value;
          formData.siliconflowModel_ai = document.getElementById('siliconflowModel_ai').value;
        }
        
        // 获取系统角色
        formData.systemRole = document.getElementById('systemRole').value;
      }

      // 保存设置
      chrome.storage.sync.set(formData, () => {
        if (chrome.runtime.lastError) {
          console.error('保存设置时出错:', chrome.runtime.lastError);
          showExtensionInvalidatedError();
          return;
        }

        // 立即同步到当前页面的运行时变量（不依赖 onChanged 事件）
        autoTranslateNewMessagesEnabled = formData.autoTranslateNewMessages === true;
        if (autoTranslateNewMessagesEnabled) {
          scheduleAutoTranslateOnChatEnter();
        }
        
        // 显示成功提示
        showToast('设置已保存');
        
        // 关闭设置对话框
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
          settingsModal.remove();
        }
        
        // 通知后台服务重新加载插件
        setTimeout(() => {
          try {
            chrome.runtime.sendMessage({ action: 'reload_plugin' });
          } catch (msgError) {
            console.error('发送重载消息失败:', msgError);
            // 这里不必显示错误，因为页面已经刷新或即将刷新
          }
        }, 500);
      });
    } catch (error) {
      console.error('保存设置时出错:', error);
      showExtensionInvalidatedError();
    }
  }

  // 修改加载设置函数
  function loadSettings() {
    try {
      chrome.storage.sync.get([
        // 翻译服务设置
        'translationApi',
        'targetLanguage',
        'autoTranslateNewMessages',
        'inputQuickTranslateSend',
        'aiEnabled',
        'aiApi',
        'aiTargetLanguage',
        'deepseekApiKey',
        'dashscopeApiKey',
        'volcengineApiKey',
        'baiduApiId',
        'baiduSecretKey',
        'siliconflowApiKey',
        'siliconflowApiUrl',
        'siliconflowModel',
        // OpenAI高级设置
        'openaiTemperature',
        'openaiReasoningEnabled',
        // AI服务API Keys
        'deepseekApiKey_ai',
        'dashscopeApiKey_ai',
        'siliconflowApiKey_ai',
        'siliconflowApiUrl_ai',
        'siliconflowModel_ai',
        // 系统角色
        'systemRole'
      ], (data) => {
        // 检查chrome API是否可用
        if (chrome.runtime.lastError) {
          console.error('获取设置时出错:', chrome.runtime.lastError);
          showExtensionInvalidatedError();
          return;
        }
        
        // 设置翻译服务选项
        if (data.translationApi) {
          document.getElementById('translationApi').value = data.translationApi;
          
          // 根据选择的翻译服务显示对应的设置项
          document.querySelectorAll('#translation-settings .api-setting-group').forEach(el => {
            el.style.display = 'none';
          });
          
          const settingsEl = document.getElementById(`${data.translationApi}-settings`);
          if (settingsEl) {
            settingsEl.style.display = 'block';
          }
        } else {
          // 默认选择第一个服务并显示其设置
          const defaultService = document.getElementById('translationApi').value;
          const defaultSettingsEl = document.getElementById(`${defaultService}-settings`);
          if (defaultSettingsEl) {
            defaultSettingsEl.style.display = 'block';
          }
        }
        
        // 设置目标语言
        if (data.targetLanguage) {
          document.getElementById('targetLanguage').value = data.targetLanguage;
        }

        const autoTranslateToggle = document.getElementById('autoTranslateNewMessages');
        if (autoTranslateToggle) {
          autoTranslateToggle.checked = data.autoTranslateNewMessages === true;
        }

        const quickSendToggle = document.getElementById('inputQuickTranslateSend');
        if (quickSendToggle) {
          quickSendToggle.checked = data.inputQuickTranslateSend === true;
        }
        
        // 设置 AI 开关状态
        const aiEnabledCheckbox = document.getElementById('aiEnabled');
        if (aiEnabledCheckbox) {
          // 设置复选框状态
          aiEnabledCheckbox.checked = data.aiEnabled === true;
          
          // 根据AI开关状态显示/隐藏AI相关设置
          const aiServiceOptions = document.getElementById('ai-service-options');
          const aiSystemRole = document.getElementById('ai-system-role');
          
          if (aiServiceOptions) {
            aiServiceOptions.style.display = data.aiEnabled === true ? 'block' : 'none';
          }
          
          if (aiSystemRole) {
            aiSystemRole.style.display = data.aiEnabled === true ? 'block' : 'none';
          }
        }
        
        // 设置 AI 服务选项
        if (data.aiApi) {
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            aiApiSelect.value = data.aiApi;
            
            // 隐藏所有AI服务设置
            document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
              el.style.display = 'none';
            });
            
            // 显示当前选中的服务设置
            const aiSettingsEl = document.getElementById(`ai-${data.aiApi}-settings`);
            if (aiSettingsEl && data.aiEnabled === true) {
              aiSettingsEl.style.display = 'block';
            }
          }
        } else {
          // 默认选择第一个AI服务并显示其设置（如果AI功能启用）
          if (data.aiEnabled === true) {
            const defaultAiService = document.getElementById('aiApi').value;
            const defaultAiSettingsEl = document.getElementById(`ai-${defaultAiService}-settings`);
            if (defaultAiSettingsEl) {
              defaultAiSettingsEl.style.display = 'block';
            }
          }
        }
        
        // 设置 AI 目标语言
        if (data.aiTargetLanguage) {
          const aiTargetLang = document.getElementById('aiTargetLanguage');
          if (aiTargetLang) {
            aiTargetLang.value = data.aiTargetLanguage;
          }
        }
        
        // 设置 API 密钥
        if (data.deepseekApiKey) {
          document.getElementById('deepseekApiKey').value = data.deepseekApiKey;
        }
        
        if (data.dashscopeApiKey) {
          document.getElementById('dashscopeApiKey').value = data.dashscopeApiKey;
        }
        
        if (data.volcengineApiKey) {
          document.getElementById('volcengineApiKey').value = data.volcengineApiKey;
        }
        
        if (data.baiduApiId) {
          document.getElementById('baiduApiId').value = data.baiduApiId;
        }
        
        if (data.baiduSecretKey) {
          document.getElementById('baiduSecretKey').value = data.baiduSecretKey;
        }
        
        if (data.siliconflowApiKey) {
          document.getElementById('siliconflowApiKey').value = data.siliconflowApiKey;
        }
        
        if (data.siliconflowApiUrl) {
          document.getElementById('siliconflowApiUrl').value = data.siliconflowApiUrl;
        }
        
        if (data.siliconflowModel) {
          document.getElementById('siliconflowModel').value = data.siliconflowModel;
        }
        
        // 加载OpenAI高级设置
        const temperatureSlider = document.getElementById('openaiTemperature');
        const temperatureValue = document.getElementById('openaiTemperatureValue');
        if (temperatureSlider && data.openaiTemperature !== undefined) {
          temperatureSlider.value = data.openaiTemperature;
          if (temperatureValue) {
            temperatureValue.textContent = data.openaiTemperature;
          }
        }
        
        const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
        if (reasoningEnabled && data.openaiReasoningEnabled !== undefined) {
          reasoningEnabled.checked = data.openaiReasoningEnabled;
        }
        
        // 设置 AI 服务的 API 密钥
        if (data.deepseekApiKey_ai) {
          document.getElementById('deepseekApiKey_ai').value = data.deepseekApiKey_ai;
        } else if (data.deepseekApiKey) {
          // 如果有翻译服务的key但没有AI服务的key，复用翻译服务的key
          document.getElementById('deepseekApiKey_ai').value = data.deepseekApiKey;
        }
        
        if (data.siliconflowApiKey_ai) {
          document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey_ai;
        } else if (data.siliconflowApiKey) {
          // 如果有翻译服务的key但没有AI服务的key，复用翻译服务的key
          document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey;
        }
        
        // 设置OpenAI通用接口服务的API URL和模型名称
        if (data.siliconflowApiUrl_ai) {
          document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl_ai;
        } else if (data.siliconflowApiUrl) {
          // 如果有翻译服务的URL但没有AI服务的URL，复用翻译服务的URL
          document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl;
        } else {
          // 提供默认值
          document.getElementById('siliconflowApiUrl_ai').value = "https://api.openai.com/v1/chat/completions";
        }
        
        if (data.siliconflowModel_ai) {
          document.getElementById('siliconflowModel_ai').value = data.siliconflowModel_ai;
        } else if (data.siliconflowModel) {
          // 如果有翻译服务的模型但没有AI服务的模型，复用翻译服务的模型
          document.getElementById('siliconflowModel_ai').value = data.siliconflowModel;
        } else {
          // 提供默认值
          document.getElementById('siliconflowModel_ai').value = "gpt-3.5-turbo";
        }
        
        // 设置系统角色
        if (data.systemRole) {
          document.getElementById('systemRole').value = data.systemRole;
        }
        
        // 手动触发一次翻译服务选择的change事件，确保正确显示对应输入框
        const translationApiSelect = document.getElementById('translationApi');
        if (translationApiSelect) {
          const changeEvent = new Event('change');
          translationApiSelect.dispatchEvent(changeEvent);
        }
        
        // 如果AI功能启用，手动触发一次AI服务选择的change事件
        if (data.aiEnabled === true) {
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            const changeEvent = new Event('change');
            aiApiSelect.dispatchEvent(changeEvent);
          }
        }
      });
    } catch (error) {
      console.error('加载设置时发生异常:', error);
      showExtensionInvalidatedError();
    }
  }

  // 加载已保存的设置
  loadSettings();
}

  // 更新设置模态框的样式
  const settingsStyles = `
    .settings-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .settings-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 560px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .settings-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e9edef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background: white;
      z-index: 1;
      border-radius: 12px 12px 0 0;
    }

    .settings-header h3 {
      margin: 0;
      font-size: 20px;
      color: #111b21;
      font-weight: 600;
    }

    .settings-body {
      padding: 24px;
      padding-bottom: 96px;
    }

    .settings-author-info {
      margin: 0 0 20px 0;
      padding: 16px 16px;
      border: 1px solid rgba(17, 27, 33, 0.10);
      border-radius: 12px;
      text-align: center;
      background: linear-gradient(to bottom, #ffffff, #f8f9fa);
    }

    .settings-author-info .author-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      margin: 0 auto 12px;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.10);
    }

    .settings-author-info .info-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 8px 0;
      color: #667781;
      font-size: 13px;
    }

    .settings-author-info .info-item svg {
      width: 16px;
      height: 16px;
      color: #00a884;
      flex-shrink: 0;
    }

    .settings-author-info a {
      color: #1a73e8;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .settings-author-info a:hover {
      color: #075e54;
    }

    .settings-author-info .author-links {
      margin-top: 12px;
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .settings-section {
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e9edef;
    }

    .settings-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .settings-section h4 {
      margin: 0 0 16px;
      font-size: 16px;
      color: #111b21;
      font-weight: 600;
    }

    .service-selection {
      margin-bottom: 12px;
    }

    .service-selection label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .api-settings {
      background-color: #f0f2f5;
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }

    .api-setting-group {
      margin-bottom: 8px;
    }

    .api-notice {
      color: #444;
      font-size: 14px;
      margin: 0;
      padding: 8px 0;
    }

    /* 输入框样式 */
    .api-key-input {
      margin-bottom: 12px;
    }

    .api-key-input:last-child {
      margin-bottom: 0;
    }

    .api-key-input label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .api-key-wrapper {
      display: flex;
      position: relative;
    }

    .api-key-wrapper input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font-size: 14px;
      width: 100%;
      transition: border-color 0.2s;
      color: #000;
      background-color: #fff;
    }

    .api-key-wrapper input:focus {
      outline: none;
      border-color: #4caf50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }

    .toggle-visibility {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #555;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-visibility:hover {
      color: #000;
    }

    /* 下拉菜单样式 */
    select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font-size: 14px;
      background-color: white;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='18' height='18' fill='%23555'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      color: #000;
    }

    select:focus {
      outline: none;
      border-color: #4caf50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }

    /* 文本区域样式 */
    textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s;
      color: #000;
      background-color: #fff;
    }

    textarea:focus {
      outline: none;
      border-color: #4caf50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }

    /* 底部按钮区域 */
    .settings-footer {
      padding: 16px 24px;
      border-top: 1px solid #e9edef;
      display: flex;
      justify-content: flex-end;
      background: white;
      border-radius: 0 0 12px 12px;
      position: sticky;
      bottom: 0;
      z-index: 2;
    }

    .admin-preset-btn {
      width: 100%;
      padding: 10px 12px;
      background: rgba(17, 27, 33, 0.06);
      color: #111b21;
      border: 1px solid rgba(17, 27, 33, 0.12);
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    .admin-preset-btn:hover {
      background: rgba(17, 27, 33, 0.09);
      border-color: rgba(17, 27, 33, 0.18);
    }

    .admin-preset-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      backdrop-filter: blur(6px);
      animation: fadeIn 0.18s ease-out;
    }

    .admin-preset-card {
      width: calc(100% - 40px);
      max-width: 520px;
      background: white;
      border-radius: 14px;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      animation: slideUp 0.22s ease-out;
    }

    .admin-preset-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid #e9edef;
      background: white;
    }

    .admin-preset-title {
      font-size: 16px;
      font-weight: 700;
      color: #111b21;
    }

    .admin-preset-close {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: rgba(17, 27, 33, 0.06);
      color: #111b21;
      cursor: pointer;
      font-size: 18px;
      line-height: 32px;
      text-align: center;
    }

    .admin-preset-body {
      padding: 16px 18px;
    }

    .admin-preset-row {
      margin-bottom: 12px;
    }

    .admin-preset-label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      color: #333;
      font-weight: 600;
    }

    .admin-preset-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #bbb;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      color: #000;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .admin-preset-input:focus {
      outline: none;
      border-color: #4caf50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.18);
    }

    .admin-preset-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #667781;
      line-height: 1.4;
    }

    .admin-preset-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 16px;
      border-top: 1px solid #e9edef;
      background: white;
    }

    .admin-preset-secondary {
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(17, 27, 33, 0.14);
      background: rgba(17, 27, 33, 0.04);
      color: #111b21;
      font-weight: 600;
      cursor: pointer;
    }

    .admin-preset-primary {
      padding: 10px 14px;
      border-radius: 10px;
      border: none;
      background: #4caf50;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .save-btn {
      padding: 10px 20px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .save-btn:hover {
      background-color: #3d8b40;
    }

    .save-btn:disabled {
      background-color: #aaa;
      cursor: not-allowed;
    }

    /* 通知样式 */
    .settings-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      background-color: #4caf50;
      color: white;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 1001;
      animation: toastIn 0.3s ease-out;
    }

    .settings-toast.error {
      background-color: #f44336;
    }

    .settings-toast.success {
      background-color: #4caf50;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translate(-50%, 20px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    /* 折叠分类内容 */
    .category-header {
      padding: 12px 16px;
      background-color: #f0f2f5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border-radius: 6px;
    }

    .category-header span {
      font-weight: 500;
      color: #111b21;
    }

    .chevron-icon {
      transition: transform 0.3s;
    }

    .toggle-category.collapsed .chevron-icon {
      transform: rotate(-90deg);
    }

    /* 新增开关样式 */
    .toggle-switch-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 8px 0;
    }

    .toggle-label {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      cursor: pointer;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 46px;
      height: 24px;
      cursor: pointer;
    }

    .toggle-input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
      cursor: pointer;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    .toggle-input:checked + .toggle-slider {
      background-color: #4caf50;
    }

    .toggle-input:focus + .toggle-slider {
      box-shadow: 0 0 1px #4caf50;
    }

    .toggle-input:checked + .toggle-slider:before {
      transform: translateX(22px);
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = settingsStyles;
  document.head.appendChild(styleSheet);

  // 修改导出聊天的函数
  function exportChat(chatContainer) {
    try {
      console.log('开始导出聊天记录');
      
      // 获取所有消息元素
      const messages = chatContainer.querySelectorAll('div[data-pre-plain-text]');
      if (!messages || messages.length === 0) {
        console.warn('未找到可导出的消息');
        return;
      }

      let chatContent = '';
      messages.forEach(msg => {
        try {
          // 安全地获取消息文本
          const messageText = msg.querySelector('.selectable-text')?.textContent || '';
          const preText = msg.getAttribute('data-pre-plain-text') || '';
          
          if (messageText) {
            chatContent += preText + messageText + '\n';
          }
        } catch (err) {
          console.warn('处理单条消息时出错:', err);
        }
      });

      // 创建并下载文件
      const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-chat-${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('聊天记录导出完成');
    } catch (error) {
      console.error('导出聊天记录失败:', error);
    }
  }

  // 修改导出按钮的点击事件处理
  function addExportButton(container) {
    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-chat-btn';
    exportBtn.innerHTML = '导出';
    exportBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 获取聊天容器
      const chatContainer = document.querySelector('#main div[role="application"]');
      if (!chatContainer) {
        console.warn('未找到聊天容器');
        return;
      }
      
      exportChat(chatContainer);
    };
    
    // 添加按钮到容器
    if (container) {
      container.appendChild(exportBtn);
    }
  }

  // 添加一个显示扩展上下文失效错误的函数
  function showExtensionInvalidatedError() {
    const errorMessage = `
      <div class="extension-error">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h3>扩展上下文已失效</h3>
          <p>这可能是由于以下原因导致的：</p>
          <ul>
            <li>浏览器扩展已被更新或重新加载</li>
            <li>浏览器已运行很长时间</li>
            <li>浏览器已更新</li>
          </ul>
          <p>请尝试以下解决方法：</p>
          <ol>
            <li>刷新当前页面</li>
            <li>如果问题仍然存在，请重新启动浏览器</li>
            <li>如果仍未解决，请禁用然后重新启用此扩展</li>
          </ol>
        </div>
        <button class="refresh-btn">刷新页面</button>
      </div>
    `;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'extension-error-overlay';
    errorDiv.innerHTML = errorMessage;
    document.body.appendChild(errorDiv);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .extension-error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
      }
      
      .extension-error {
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
      
      .error-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 15px;
      }
      
      .error-content {
        margin-bottom: 20px;
      }
      
      .error-content h3 {
        color: #e74c3c;
        margin-top: 0;
      }
      
      .refresh-btn {
        background: #2ecc71;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        display: block;
        margin: 0 auto;
      }
      
      .refresh-btn:hover {
        background: #27ae60;
      }
    `;
    document.head.appendChild(style);
    
    // 添加刷新按钮功能
    const refreshBtn = errorDiv.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  // 添加显示通知消息的函数
  function showToast(message, type = 'success', duration = 3000) {
    // 生成唯一ID
    const toastId = 'toast-' + Date.now();
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    
    // 创建内容元素，使其可以单独更新
    const contentElement = document.createElement('div');
    contentElement.className = 'toast-content';
    contentElement.textContent = message;
    toast.appendChild(contentElement);
    
    // 如果是持久性消息（duration为0），添加关闭按钮
    if (duration === 0) {
      const closeButton = document.createElement('button');
      closeButton.className = 'toast-close-btn';
      closeButton.innerHTML = '×';
      closeButton.onclick = () => {
        document.getElementById(toastId)?.remove();
      };
      toast.appendChild(closeButton);
    }
    
    // 添加toast样式
    const style = document.createElement('style');
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: toast-in 0.3s ease;
      }
      
      .toast-success {
        background-color: #2ecc71;
      }
      
      .toast-error {
        background-color: #e74c3c;
      }
      
      .toast-info {
        background-color: #3498db;
      }
      
      .toast-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        margin-left: 12px;
        padding: 0 4px;
        cursor: pointer;
        opacity: 0.8;
      }
      
      .toast-close-btn:hover {
        opacity: 1;
      }
      
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translate(-50%, 20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      
      @keyframes toast-out {
        from {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        to {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
      }
    `;
    
    // 添加样式和toast到文档
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    // 如果不是持久性消息，设置定时器自动移除toast
    if (duration > 0) {
      // 在持续时间结束前添加淡出动画
      setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
          toastElement.style.animation = 'toast-out 0.3s ease forwards';
        }
      }, duration - 300);
      
      // 设置定时器自动移除toast
      setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
          toastElement.remove();
        }
      }, duration);
    }
    
    // 返回toast的ID，以便后续更新其内容
    return toastId;
  }

  // 关闭设置对话框
  function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      // 添加关闭动画
      modal.classList.add('closing');
      // 动画完成后移除模态框
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  


