// CryptoJS MD5 Implementation (simplified)
var CryptoJS = CryptoJS || {};
CryptoJS.MD5 = function(string) {
  function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    // ... (abbreviated for brevity) ...
    
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  
  function md5blk(s) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  
  function md5(s) {
    var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  
  function hex_md5(s) {
    var result = '';
    var state = md5(s);
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        var byte = (state[i] >> (j * 8)) & 0xFF;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }
  
  function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
  }
  
  return {
    toString: function() {
      return hex_md5(string);
    }
  };
};

// 移除外部库加载，仅使用内置实现

// 提供一个全局的CryptoJS对象，使用内置的MD5实现
(function() {
  // 直接使用内置实现
  console.log('使用内置的MD5实现代替CryptoJS');
  
  // 创建一个简化版的CryptoJS对象
  window.CryptoJS = window.CryptoJS || {};
  
  // 使用已有的MD5函数
  window.CryptoJS.MD5 = function(string) {
    // 返回与CryptoJS兼容的接口
    return {
      toString: function() {
        // 使用之前定义的md5函数
        if (typeof md5 === 'function') {
          return md5(string);
        } else {
          // 如果md5函数不可用，使用上面定义的hex_md5函数
          return hex_md5(string);
        }
      }
    };
  };
  
  window.cryptoJSLoaded = true;
})();

// 替换为完全独立的实现:

// 完全独立的MD5实现
(function() {
  console.log('初始化完全独立的MD5实现');
  
  // 内置MD5实现
  function md5(string) {
    // 检查输入
    if (typeof string !== 'string') {
      console.error('MD5输入必须是字符串，当前类型:', typeof string);
      string = String(string); // 尝试转换为字符串
    }
    
    console.log('MD5输入字符串长度:', string.length);
    
    function md5cycle(x, k) {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }
    
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    
    function md5blk(s) {
      const md5blks = [];
      for (let i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }
    
    function add32(a, b) {
      return (a + b) & 0xFFFFFFFF;
    }
    
    let blks, i;
    const n = string.length;
    blks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < n; i++) {
      blks[i >> 2] |= string.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[14] = n * 8;
    
    let x = [1732584193, -271733879, -1732584194, 271733878];
    for (i = 0; i < blks.length; i += 16) {
      const tempX = x.slice(0);
      md5cycle(tempX, blks.slice(i, i + 16));
      for (let j = 0; j < 4; j++) {
        x[j] = tempX[j];
      }
    }
    
    let result = '';
    for (i = 0; i < 4; i++) {
      let s = (x[i] >>> 0).toString(16); // 确保是无符号整数
      console.log(`第${i+1}块16进制值:`, s, '长度:', s.length);
      while (s.length < 8) {
        s = '0' + s; // 补齐到8位
      }
      result += s;
    }
    
    // 确保结果是32位小写
    result = result.toLowerCase();
    
    console.log('MD5计算结果:', result, '长度:', result.length);
    
    // 最后验证
    if (result.length !== 32) {
      console.error('MD5结果长度不正确:', result.length);
    }
    
    return result;
  }
  
  // 替换全局md5函数，避免循环引用
  window.md5 = md5;
  
  // 创建一个纯粹的CryptoJS对象
  window.CryptoJS = {
    MD5: function(string) {
      const hash = md5(string);
      return {
        toString: function() {
          return hash;
        }
      };
    }
  };
  
  window.cryptoJSLoaded = true;
  console.log('纯内置MD5实现已完成初始化');
})();

let pluginStatus = {
  translation: false,
  observer: false,
  apiService: false
};

// 修改状态检查函数
function checkStatus() {
  const status = {
    isLoaded: true,  // 默认为 true，除非特定条件为 false
    translation: pluginStatus.translation,
    observer: pluginStatus.observer,
    apiService: pluginStatus.apiService
  };

  // 只在开发环境输出状态日志
  if (process.env.NODE_ENV === 'development') {
    console.debug('Plugin status:', status);
  }

  return status;
}

// 添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_STATUS') {
    sendResponse(checkStatus());
    return true;
  }

  if (request.type === 'CHECK_BUTTONS') {
    try {
      // 检查翻译按钮是否存在
      const translateBtnExists = document.querySelector('.translate-btn') !== null;
      
      // 检查分析按钮是否存在
      const analysisBtnExists = document.querySelector('.analysis-btn-container') !== null;
      
      // 检查输入框翻译按钮是否存在
      const inputTranslateBtnExists = document.querySelector('.input-translate-btn') !== null;

      // 如果任意一个按钮存在，就认为插件已经正常加载
      const success = translateBtnExists || analysisBtnExists || inputTranslateBtnExists;
      
      sendResponse({
        success,
        details: {
          translateBtn: translateBtnExists,
          analysisBtn: analysisBtnExists,
          inputTranslateBtn: inputTranslateBtnExists
        }
      });
    } catch (error) {
      console.error('Button check error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.type === 'CHECK_CHAT_WINDOW') {
    try {
      // 检查是否存在聊天窗口
      const chatWindow = document.querySelector('#main');
      sendResponse({ exists: chatWindow !== null });
    } catch (error) {
      console.error('Chat window check error:', error);
      sendResponse({ exists: false });
    }
    return true;
  }

  if (request.type === 'SHOW_UPDATE_LOG') {
    window.showUpdateLogManually();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'notifyServiceSwitch') {
    showNotification(`翻译服务已从${request.from}切换至${request.to}: ${request.reason}`);
  }
});

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'wa-ai-notification';
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;z-index:9999;bottom:20px;right:20px;background:#4CAF50;color:white;padding:12px 15px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px;font-weight:bold;max-width:80%;overflow:hidden;text-overflow:ellipsis;';
  
  // 添加图标
  const icon = document.createElement('span');
  icon.textContent = '🔄 ';
  notification.prepend(icon);
  
  document.body.appendChild(notification);
  
  // 淡入效果
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.transition = 'opacity 0.3s, transform 0.3s';
  
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 淡出效果
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
  
  // 记录日志
  console.log('显示通知:', message);
}

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
async function initialize() {
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
  } catch (error) {
    console.error('Initialization error:', error);
    // 更新对应功能的状态为失败
    updatePluginStatus('translation', false);
    updatePluginStatus('observer', false);
    updatePluginStatus('apiService', false);
  }
}

// 将初始化函数暴露到window对象
window.initialize = initialize;

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
      console.log('调用OpenAI翻译服务', { 
        apiKeyLength: apiKey?.length, 
        hasApiUrl: !!apiUrl,
        hasModel: !!model,
        textLength: text.length,
        textPreview: text.replace(/\n/g, '\\n').substring(0, 30) + (text.length > 30 ? '...' : '')
      });
      try {
        translation = await window.ApiServices.translation[service](text, apiKey, apiUrl, model);
        
        // 检查是否是带有思考过程的对象结果
        if (translation && typeof translation === 'object' && translation.hasThinking) {
          console.log('OpenAI翻译结果 (带思考过程):', { 
            success: true,
            hasThinking: true, 
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
function addTranslateButton(textElement) {
  console.log('添加翻译按钮到消息:', textElement);
  
  // 检查是否已经添加过按钮
  if (textElement.querySelector('.translate-btn-container')) {
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
    
    // 修改查找消息容器的方式
    const messageWrapper = textElement.closest('div[data-pre-plain-text]');
    if (messageWrapper) {
      await translateMessage(messageWrapper);
    } else {
      console.error('无法找到消息wrapper元素');
    }
  };

  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'translate-btn-container';
  buttonContainer.appendChild(translateBtn);
  
  // 将按钮添加到文本元素后面
  textElement.appendChild(buttonContainer);
  
  console.log('按钮添加成功');
}

// 修改消息处理函数
function processMessage(message) {
  if (!message.dataset.processed) {
    console.log('处理消息:', message);
    
    // 查找消息中的文本元素
    const textContainer = message.querySelector('span.selectable-text');
    if (textContainer) {
      // 为消息添加包装器类
      message.classList.add('message-wrapper');
      // 确保消息容器有相对定位
      message.style.position = 'relative';
      // 添加翻译按钮
      addTranslateButton(textContainer);
      message.dataset.processed = 'true';
    }
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
      const textElement = messageElement.querySelector('.selectable-text');
      
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
}

// 收集文本内容的辅助函数
function collectTextContent(element) {
  if (!element) return '';
  
  // 克隆节点以避免修改原始DOM
  const elementClone = element.cloneNode(true);
  
  // 移除可能存在的翻译按钮
  const translateBtn = elementClone.querySelector('.translate-btn-container');
  if (translateBtn) {
    translateBtn.remove();
  }
  
  let text = '';
  
  // 递归遍历节点收集文本
  function traverse(node) {
    // 处理文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
      return;
    }
    
    // 处理元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 如果是换行元素，添加换行符
      if (node.tagName === 'BR' || 
          window.getComputedStyle(node).display === 'block') {
        text += '\n';
      }
      
      // 处理图片和表情符号
      if (node.tagName === 'IMG' && node.alt) {
        text += node.alt; // 添加图片的alt文本（通常是表情符号）
      }
      
      // 递归处理子节点
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }
  
  // 开始遍历
  traverse(elementClone);
  
  // 清理文本（删除多余空格和换行）
  return text.trim()
    .replace(/\n{3,}/g, '\n\n') // 替换3个以上连续换行为2个
    .replace(/\s+$/gm, ''); // 删除每行末尾的空白
}

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
    // 打开设置面板的逻辑
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
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
        // 检查新的聊天窗口
        const main = document.querySelector('#main');
        if (main && !main.querySelector('.analysis-btn-container')) {
          console.log('检测到新的聊天窗口，尝试添加按钮组...');
          addAnalysisButton(main);
        }

        // 处理新增的消息
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // 元素节点
            // 查找消息元素
            const messages = node.querySelectorAll('div[data-pre-plain-text]');
            messages.forEach(message => {
              if (!message.dataset.processed) {
                processMessage(message);
              }
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

  // 初始尝试添加按钮
  const main = document.querySelector('#main');
  if (main) {
    addAnalysisButton(main);
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
      position: relative;
      display: inline-block;
      margin-left: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    div[data-pre-plain-text]:hover .translate-btn-container {
      opacity: 1;
    }

    div[data-pre-plain-text] .translate-btn {
      background-color: #00a884;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    div[data-pre-plain-text] .translate-btn:hover {
      opacity: 1;
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
      if (!message.querySelector('.translation-content')) {
        try {
          // 获取文本元素
          const textElement = message.querySelector('.selectable-text');
          if (textElement) {
            // 收集文本内容
            const text = collectTextContent(textElement);
            if (text) {
              // 获取消息容器
              let messageContainer = message.closest('.message-container');
              if (!messageContainer) {
                messageContainer = message.parentElement;
                if (!messageContainer) {
                  messageContainer = message;
                }
                messageContainer.classList.add('message-container');
              }
              
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
                messageContainer.appendChild(translationElement);
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
            }
          }
        } catch (error) {
          console.error('翻译消息失败:', error);
          // 失败时继续处理下一条，不中断整体翻译
          continue;
        }
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
      
      // 获取消息文本
      const textElement = element.querySelector('span.selectable-text');
      if (textElement) {
        // 克隆节点以避免包含翻译按钮
        const textClone = textElement.cloneNode(true);
        const translateBtn = textClone.querySelector('.translate-btn-container');
        if (translateBtn) {
          translateBtn.remove();
        }
        text = textClone.textContent.trim();
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
  
  const content = document.createElement('div');
  content.className = 'settings-content';
  content.innerHTML = `
    <div class="settings-header">
      <h3>设置</h3>
      <button class="close-btn">×</button>
    </div>
    
    <div class="settings-body">
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
        
        <!-- 目标语言选择 -->
        <div class="target-language" style="margin-top: 12px;">
          <label for="targetLanguage">目标语言</label>
          <select id="targetLanguage">
            <option value="zh-CN">中文</option>
            <option value="en">英文</option>
          </select>
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

  // 添加事件监听
  const closeBtn = content.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
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

  


