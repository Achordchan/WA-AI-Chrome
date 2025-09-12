// 在文件开头添加
window.initializeInputTranslate = initializeInputTranslate;

// 翻译文本函数
async function translateText(text, targetLang = 'zh') {
  console.log('准备翻译文本:', { text, targetLang });
  
  try {
    // 获取翻译服务设置
    const { service, apiKey, secretKey, apiUrl, model } = await window.getTranslationService();
    console.log('获取到翻译服务:', service);

    // 调用翻译服务
    let translation;
    if (service === 'baidu') {
      // 百度翻译需要额外的secretKey参数
      translation = await window.ApiServices.translation[service](text, apiKey, secretKey, 'auto', targetLang);
    } else if (service === 'google') {
      // 谷歌翻译不需要 apiKey
      translation = await window.ApiServices.translation[service](text, 'auto', targetLang);
    } else if (service === 'siliconflow') {
      // OpenAI翻译需要额外的apiUrl和model参数
      translation = await window.ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
    } else {
      // 其他翻译服务
      translation = await window.ApiServices.translation[service](text, apiKey);
    }
    console.log('翻译完成:', translation);
    
    // 检查是否有思考过程，如果有则只返回翻译部分
    if (translation && typeof translation === 'object' && translation.hasThinking) {
      return translation.translation;
    }
    
    return translation;
  } catch (error) {
    console.error('翻译出错:', error);
    throw new Error(error.message || '翻译失败');
  }
}

// 添加统一的翻译方法
async function performTranslation(text, targetLang, type = 'normal') {
  console.log(`执行${type === 'ai' ? 'AI' : '普通'}翻译:`, { text, targetLang });
  
  try {
    if (type === 'ai') {
      const { service, apiKey } = await window.getAiService();
      console.log('使用 AI 服务:', service);
      return await window.ApiServices.analysis[service]([{ sender: '我方', text }], apiKey);
    } else {
      const { service, apiKey, secretKey, apiUrl, model } = await window.getTranslationService();
      console.log('使用翻译服务:', service);
      
      if (service === 'baidu') {
        return await window.ApiServices.translation[service](text, apiKey, secretKey, 'auto', targetLang);
      } else if (service === 'google') {
        return await window.ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        return await window.ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
      } else {
        return await window.ApiServices.translation[service](text, apiKey);
      }
    }
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

// 创建翻译按钮
function createTranslateButton() {
  const button = document.createElement('button');
  button.className = 'xjb2p0i xk390pu x1ypdohk xjbqb8w x972fbf xcfux6l x1qhh985 xm0m39n x1okw0bk x5yr21d x14yjl9h xudhj91 x18nykt9 xww2gxu';
  button.setAttribute('title', '翻译');
  button.innerHTML = `
    <span aria-hidden="true" class="translate-icon">
      <svg viewBox="0 0 1024 1024" height="20" width="20" fill="currentColor">
        <path d="M608 416h288c35.36 0 64 28.48 64 64v416c0 35.36-28.48 64-64 64H480c-35.36 0-64-28.48-64-64v-288H128c-35.36 0-64-28.48-64-64V128c0-35.36 28.48-64 64-64h416c35.36 0 64 28.48 64 64v288z m0 64v64c0 35.36-28.48 64-64 64h-64v256.032c0 17.664 14.304 31.968 31.968 31.968H864a31.968 31.968 0 0 0 31.968-31.968V512a31.968 31.968 0 0 0-31.968-31.968H608zM128 159.968V512c0 17.664 14.304 31.968 31.968 31.968H512a31.968 31.968 0 0 0 31.968-31.968V160A31.968 31.968 0 0 0 512.032 128H160A31.968 31.968 0 0 0 128 159.968z m64 244.288V243.36h112.736V176h46.752c6.4 0.928 9.632 1.824 9.632 2.752a10.56 10.56 0 0 1-1.376 4.128c-2.752 7.328-4.128 16.032-4.128 26.112v34.368h119.648v156.768h-50.88v-20.64h-68.768v118.272H306.112v-118.272H238.752v24.768H192z m46.72-122.368v60.48h67.392V281.92H238.752z m185.664 60.48V281.92h-68.768v60.48h68.768z m203.84 488H576L668.128 576h64.64l89.344 254.4h-54.976l-19.264-53.664h-100.384l-19.232 53.632z m33.024-96.256h72.864l-34.368-108.608h-1.376l-37.12 108.608zM896 320h-64a128 128 0 0 0-128-128V128a192 192 0 0 1 192 192zM128 704h64a128 128 0 0 0 128 128v64a192 192 0 0 1-192-192z"/>
      </svg>
    </span>
  `;

  button.style.cssText = `
    color: #8696a0;
    transition: all 0.15s ease;
    padding: 4px;
    margin: 0 2px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.color = '#00a884';
  });

  button.addEventListener('mouseleave', () => {
    button.style.color = '#8696a0';
  });

  button.onclick = async (e) => {
    console.log('翻译按钮被点击');
    e.stopPropagation(); // 阻止事件冒泡
    
    // 从 footer 开始查找输入框
    const footer = document.querySelector('footer._ak1i');
    console.log('找到 footer:', footer);
    
    if (!footer) {
      console.warn('未找到 footer');
      return;
    }

    // 在 footer 内查找输入框
    const inputBox = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
    console.log('找到输入框:', inputBox);
    
    if (!inputBox) {
      console.warn('未找到输入框');
      return;
    }

    const text = inputBox.textContent.trim();
    console.log('获取到输入文本:', text);
    
    if (!text) {
      alert('你不写内容打算让我猜啊？？');
      return;
    }

    // 显示翻译模态框
    const modal = createTranslateModal(text, inputBox);
    button.parentElement.appendChild(modal);
  };

  return button;
}

// 修改添加输入框翻译按钮的函数
function addInputTranslateButton(retryCount = 0, maxRetries = 5) {
  console.log('尝试添加输入框翻译按钮...');
  
  // 防止重复添加
  if (document.querySelector('.input-translate-btn')) {
    console.log('翻译按钮已存在，跳过添加');
    return true;
  }

  // 查找必要的DOM元素
  const footer = document.querySelector('footer._ak1i');
  if (!footer) {
    console.log('未找到footer元素');
    return handleRetry('footer', retryCount, maxRetries);
  }

  // 查找输入框
  const inputBox = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
  if (!inputBox) {
    console.log('未找到输入框元素');
    return handleRetry('input box', retryCount, maxRetries);
  }

  try {
    // 添加翻译按钮
    const translateBtn = createTranslateButton();
    translateBtn.classList.add('input-translate-btn');
    
    // 确保父容器存在且稳定
    const container = inputBox.closest('.lexical-rich-text-input');
    if (!container) {
      console.log('未找到稳定的父容器');
      return handleRetry('container', retryCount, maxRetries);
    }

    // 将按钮添加到输入框容器后面
    container.parentNode.insertBefore(translateBtn, container.nextSibling);
    console.log('成功添加输入框翻译按钮');
    return true;
  } catch (error) {
    console.error('添加翻译按钮时发生错误:', error);
    return handleRetry('error', retryCount, maxRetries);
  }
}

// 添加重试处理函数
function handleRetry(reason, retryCount, maxRetries) {
  if (retryCount < maxRetries) {
    console.log(`${reason} 未就绪，${retryCount + 1}/${maxRetries} 次重试...`);
    setTimeout(() => {
      addInputTranslateButton(retryCount + 1, maxRetries);
    }, 1000 * (retryCount + 1)); // 递增延迟
    return false;
  }
  console.warn(`超过最大重试次数(${maxRetries})，放弃添加输入框翻译按钮`);
  return false;
}

// 修改初始化函数
function initializeInputTranslate() {
  console.log('初始化输入框翻译功能...');
  
  // 创建 MutationObserver 实例
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 检查是否有新的聊天窗口加载
      if (mutation.type === 'childList' && 
          mutation.addedNodes.length > 0 &&
          !document.querySelector('.input-translate-btn')) {
        console.log('检测到DOM变更，尝试添加翻译按钮...');
        if (addInputTranslateButton()) {
          console.log('翻译按钮添加成功');
          break;
        }
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
  
  // 初始尝试添加按钮
  addInputTranslateButton();

  // 导出清理函数
  return () => {
    console.log('清理输入框翻译功能...');
    observer.disconnect();
  };
}

// 添加轻提示样式
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .translate-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    animation: toastFade 0.3s ease;
  }

  .translate-toast-error {
    background: rgba(220, 38, 38, 0.9);
  }

  @keyframes toastFade {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;
document.head.appendChild(toastStyles);

// 创建翻译选项弹窗
function createTranslatePopup(button, inputText) {
  const popup = document.createElement('div');
  popup.className = 'translate-popup';
  popup.innerHTML = `
    <div class="translate-popup-content">
      <div class="translate-popup-header">
        <span>选择目标语言</span>
        <button class="translate-popup-close">×</button>
      </div>
      <div class="translate-popup-body">
        <div class="translate-source">
          <div class="translate-label">原文</div>
          <div class="translate-text">${inputText}</div>
        </div>
        <div class="translate-target">
          <div class="translate-label">
            <select class="translate-lang-select">
              <option value="zh">中文</option>
              <option value="en">英文</option>
              <option value="ja">日文</option>
              <option value="ko">韩文</option>
            </select>
          </div>
          <div class="translate-result"></div>
        </div>
        <div class="translate-verify" style="display: none">
          <div class="translate-label">验证翻译</div>
          <div class="translate-verify-text"></div>
        </div>
      </div>
      <div class="translate-popup-footer">
        <button class="translate-btn">翻译</button>
        <button class="verify-btn" style="display: none">验证翻译</button>
        <button class="apply-btn" style="display: none">应用</button>
      </div>
    </div>
  `;

  // 添加样式
  const styles = `
    .translate-popup {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      width: 300px;
      z-index: 999999;
    }

    .translate-popup-content {
      padding: 12px;
    }

    .translate-popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      color: #41525d;
      font-size: 14px;
    }

    .translate-popup-close {
      background: none;
      border: none;
      color: #8696a0;
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
    }

    .translate-source, .translate-target, .translate-verify {
      margin-bottom: 12px;
    }

    .translate-label {
      color: #8696a0;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .translate-text, .translate-result, .translate-verify-text {
      background: #f0f2f5;
      padding: 8px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.4;
      color: #41525d;
      min-height: 20px;
    }

    .translate-lang-select {
      background: none;
      border: none;
      color: #00a884;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }

    .translate-popup-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .translate-popup-footer button {
      background: #00a884;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .translate-popup-footer button:hover {
      background: #008f72;
    }

    .translate-popup-footer button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // 处理关闭
  popup.querySelector('.translate-popup-close').onclick = () => {
    popup.remove();
  };

  // 处理翻译
  let currentTranslation = '';
  const translateBtn = popup.querySelector('.translate-btn');
  const verifyBtn = popup.querySelector('.verify-btn');
  const applyBtn = popup.querySelector('.apply-btn');
  const resultDiv = popup.querySelector('.translate-result');
  const verifyDiv = popup.querySelector('.translate-verify');
  const verifyText = popup.querySelector('.translate-verify-text');

  translateBtn.onclick = async () => {
    const targetLang = popup.querySelector('.translate-lang-select').value;
    translateBtn.disabled = true;
    translateBtn.textContent = '翻译中...';

    try {
      const translation = await translateText(inputText, targetLang);
      currentTranslation = translation;
      resultDiv.textContent = translation;
      translateBtn.style.display = 'none';
      verifyBtn.style.display = 'inline-block';
      applyBtn.style.display = 'inline-block';
    } catch (error) {
      resultDiv.textContent = '翻译失败: ' + error.message;
    } finally {
      translateBtn.disabled = false;
      translateBtn.textContent = '翻译';
    }
  };

  // 处理验证翻译
  verifyBtn.onclick = async () => {
    verifyBtn.disabled = true;
    verifyBtn.textContent = '验证中...';
    verifyDiv.style.display = 'block';

    try {
      // 反向翻译回原语言
      const verification = await translateText(currentTranslation, 'auto');
      verifyText.textContent = verification;
    } catch (error) {
      verifyText.textContent = '验证失败: ' + error.message;
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = '验证翻译';
    }
  };

  // 处理应用翻译
  applyBtn.onclick = () => {
    const inputBox = document.querySelector('div[contenteditable="true"]');
    if (inputBox && currentTranslation) {
      inputBox.textContent = currentTranslation;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    }
    popup.remove();
  };

  return popup;
}

// 新增 Google 翻译方法
async function googleTranslate(text, targetLang) {
  console.log('开始 Google 翻译:', {
    text,
    targetLang,
    timestamp: new Date().toISOString()
  });

  try {
    // 构建 Google 翻译 URL
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    console.log('Google 翻译请求 URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Google 翻译原始响应:', data);
    
    // 提取翻译结果
    const translation = data[0]
      .map(item => item[0])
      .filter(Boolean)
      .join('');
    
    console.log('Google 翻译结果:', {
      originalText: text,
      translation,
      targetLang,
      timestamp: new Date().toISOString()
    });
    
    return translation;
  } catch (error) {
    console.error('Google 翻译失败:', {
      error,
      text,
      targetLang,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// 修改 AI 翻译方法
async function aiTranslate(text, targetLang) {
  console.log('开始 AI 翻译:', {
    text,
    targetLang,
    timestamp: new Date().toISOString()
  });

  try {
    const { service, apiKey } = await window.getAiService();
    console.log('AI 翻译服务配置:', {
      service,
      hasApiKey: !!apiKey,
      timestamp: new Date().toISOString()
    });

    // 使用统一的语言映射
    const langName = LANGUAGES[targetLang] || '中文';
    
    // 直接调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是一位专业翻译，请直接返回翻译结果，不要加任何额外的解释、标点或格式。"
          },
          {
            role: "user",
            content: `请将以下文本翻译成${langName}。只需要返回翻译结果，不要解释，不要加引号：\n\n${text}`
          }
        ],
        temperature: 1.3
      })
    });

    const data = await response.json();
    console.log('AI 翻译原始响应:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('无效的 AI 响应');
    }

    // 清理翻译结果
    const translation = data.choices[0].message.content
      .replace(/^["""「」『』]/g, '') // 移除开头的引号
      .replace(/["""「」』]$/g, '') // 移除结尾的引号
      .replace(/^翻译[：:]\s*/i, '') // 移除"翻译："前缀
      .replace(/^译文[：:]\s*/i, '') // 移除"译文："前缀
      .trim();

    console.log('AI 翻译结果:', {
      originalText: text,
      translation,
      targetLang,
      timestamp: new Date().toISOString()
    });

    return translation;
  } catch (error) {
    console.error('AI 翻译失败:', {
      error,
      text,
      targetLang,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// 修改 modalTranslation 方法
async function modalTranslation(text, targetLang, type = 'normal') {
  console.log(`开始模态框翻译:`, {
    type: type === 'ai' ? 'AI翻译' : '普通翻译',
    text,
    targetLang
  });
  
  try {
    let translation;
    if (type === 'ai') {
      const { service, apiKey } = await window.getAiService();
      translation = await window.ApiServices.analysis[service](text, apiKey);
    } else {
      const { service, apiKey, secretKey, apiUrl, model } = await window.getTranslationService();
      console.log('使用翻译服务:', service);
      
      if (service === 'baidu') {
        translation = await window.ApiServices.translation[service](text, apiKey, secretKey, 'auto', targetLang);
      } else if (service === 'google') {
        translation = await window.ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        translation = await window.ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
      } else {
        translation = await window.ApiServices.translation[service](text, apiKey);
      }
      
      // 检查是否有思考过程，获取翻译部分
      if (translation && typeof translation === 'object' && translation.hasThinking) {
        console.log('检测到带思考过程的翻译结果:', { 
          hasThinking: true,
          thinkingLength: translation.thinking?.length || 0,
          translationLength: translation.translation?.length || 0
        });
        translation = translation.translation;
      }
    }
    
    return translation;
  } catch (error) {
    console.error('模态框翻译失败:', error);
    throw error;
  }
}

// 新增验证翻译方法
async function verifyTranslation(translatedText, originalLang, targetLang) {
  console.log('开始验证翻译:', {
    translatedText,
    originalLang,
    targetLang,
    timestamp: new Date().toISOString()
  });

  try {
    // 先将翻译结果翻译回原语言
    const backTranslation = await googleTranslate(translatedText, originalLang);
    console.log('反向翻译结果:', {
      translatedText,
      backTranslation,
      timestamp: new Date().toISOString()
    });

    return backTranslation;
  } catch (error) {
    console.error('验证翻译失败:', error);
    throw error;
  }
}

// 更新语言映射
const LANGUAGES = {
  'zh': '中文',
  'en': '英语',
  'ja': '日语',
  'ko': '韩语',
  'ru': '俄语',
  'es': '西班牙语',
  'fr': '法语',
  'de': '德语',
  'it': '意大利语',
  'pt': '葡萄牙语',
  'vi': '越南语',
  'th': '泰语',
  'ar': '阿拉伯语',
  'hi': '印地语'
};

// 使用聊天对象名字存储语言选择
function rememberLanguageChoice(chatWindow, lang) {
  if (chatWindow) {
    // 获取聊天对象名字 - 更新选择器
    const nameElement = chatWindow.querySelector('header._amid span[class*="_ao3e"]');
    const chatName = nameElement?.textContent?.trim() || 'default';
    
    // 使用 localStorage 存储语言选择
    try {
      const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
      languagePreferences[chatName] = lang;
      localStorage.setItem('chatLanguagePreferences', JSON.stringify(languagePreferences));
      
      console.log('保存语言选择:', {
        chatName,
        lang,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('保存语言选择失败:', error);
    }
  }
}

// 获取记忆的语言选择
function getRememberedLanguage(chatWindow) {
  if (!chatWindow) return 'en';
  
  try {
    // 获取聊天对象名字 - 更新选择器
    const nameElement = chatWindow.querySelector('header._amid span[class*="_ao3e"]');
    const chatName = nameElement?.textContent?.trim() || 'default';
    
    // 从 localStorage 获取语言选择
    const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
    const rememberedLang = languagePreferences[chatName];
    
    console.log('获取记忆的语言选择:', {
      chatName,
      rememberedLang,
      timestamp: new Date().toISOString()
    });
    
    return rememberedLang || 'en';
  } catch (error) {
    console.error('获取语言选择失败:', error);
    return 'en';
  }
}

// 修改创建模态框的函数
function createTranslateModal(text, inputBox) {
  // 获取当前聊天窗口
  const chatWindow = inputBox.closest('.app-wrapper-web');
  // 获取记忆的语言选择
  const rememberedLang = getRememberedLanguage(chatWindow);

  const modal = document.createElement('div');
  modal.className = 'translate-modal';
  modal.innerHTML = `
    <div class="translate-modal-content">
      <div class="translate-modal-header">
        <h3>翻译</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="translate-modal-body">
        <div class="source-text">
          <div class="text-label">原文</div>
          <div class="text-content">${text}</div>
        </div>
        <div class="target-lang">
          <div class="text-label">目标语言</div>
          <select class="lang-select">
            ${Object.entries(LANGUAGES).map(([code, name]) => `
              <option value="${code}"${code === rememberedLang ? ' selected' : ''}>${name}</option>
            `).join('')}
          </select>
        </div>
        <div class="translation-result">
          <div class="text-label">翻译结果</div>
          <div class="result-content"></div>
        </div>
        <div class="verify-result" style="display: none">
          <div class="text-label">验证结果（反向翻译 默认Google）</div>
          <div class="verify-content"></div>
        </div>
      </div>
      <div class="translate-modal-footer">
        <button class="translate-btn">翻译</button>
        <button class="verify-btn" style="display: none">验证</button>
        <button class="apply-btn" disabled>应用</button>
      </div>
    </div>
  `;

  // 添加新的样式
  const styles = `
    .translate-modal {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: transparent;
      z-index: 999999;
      width: 320px;
    }

    .translate-modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: modalSlideUp 0.2s ease-out;
    }

    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .translate-modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e9edef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0f2f5;
    }

    .translate-modal-header h3 {
      margin: 0;
      color: #41525d;
      font-size: 14px;
      font-weight: 500;
    }

    .modal-close {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .translate-modal-body {
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .text-label {
      color: #8696a0;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .text-content, .result-content {
      background: #f0f2f5;
      padding: 8px 12px;
      border-radius: 6px;
      color: #41525d;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .target-lang {
      margin-bottom: 12px;
    }

    .lang-select {
      width: 100%;
      padding: 8px;
      border: 1px solid #e9edef;
      border-radius: 6px;
      color: #41525d;
      font-size: 13px;
      background: white;
      cursor: pointer;
    }

    .lang-select:hover {
      border-color: #00a884;
    }

    .lang-select:focus {
      outline: none;
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .lang-select option {
      padding: 8px;
    }

    .translate-modal-footer {
      padding: 8px 12px;
      border-top: 1px solid #e9edef;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      background: #f8f9fa;
    }

    .translate-modal-footer button {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .translate-btn {
      background: #00a884;
      color: white;
    }

    .apply-btn {
      background: #8696a0;
      color: white;
    }

    .apply-btn:disabled {
      background: #e9edef;
      color: #8696a0;
      cursor: not-allowed;
    }

    button:hover:not(:disabled) {
      opacity: 0.9;
    }

    /* 添加小三角形指示器 */
    .translate-modal-content::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 12px;
      width: 12px;
      height: 12px;
      background: white;
      transform: rotate(45deg);
      box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.05);
      border-right: 1px solid #e9edef;
      border-bottom: 1px solid #e9edef;
    }

    .verify-result {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e9edef;
    }

    .verify-content {
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 6px;
      color: #667781;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #e9edef;
    }

    .verify-btn {
      background: #f0f2f5;
      color: #41525d;
      border: 1px solid #e9edef;
    }

    .verify-btn:hover {
      background: #e9edef;
    }

    /* 添加翻译中的加载动画 */
    .btn-loading {
      position: relative;
      color: transparent !important;
    }

    .btn-loading::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: btn-spin 0.8s linear infinite;
    }

    @keyframes btn-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // 事件处理
  const closeBtn = modal.querySelector('.modal-close');
  const translateBtn = modal.querySelector('.translate-btn');
  const verifyBtn = modal.querySelector('.verify-btn');
  const applyBtn = modal.querySelector('.apply-btn');
  const resultContent = modal.querySelector('.result-content');
  const langSelect = modal.querySelector('.lang-select');
  const verifyResult = modal.querySelector('.verify-result');
  const verifyContent = modal.querySelector('.verify-content');

  closeBtn.onclick = () => modal.remove();

  // 添加语言选择变化事件监听
  langSelect.addEventListener('change', (e) => {
    rememberLanguageChoice(chatWindow, e.target.value);
    console.log('语言选择已更改:', {
      newLang: e.target.value,
      timestamp: new Date().toISOString()
    });
  });

  // 翻译按钮事件处理
  translateBtn.onclick = async () => {
    console.log('点击翻译按钮');
    try {
      translateBtn.classList.add('btn-loading');
      const targetLang = langSelect.value;
      console.log('开始翻译:', {
        text,
        targetLang,
        timestamp: new Date().toISOString()
      });

      const translation = await modalTranslation(text, targetLang, 'normal');
      console.log('翻译完成:', {
        originalText: text,
        translation,
        timestamp: new Date().toISOString()
      });

      // 检查翻译结果是否为对象
      if (translation && typeof translation === 'object') {
        // 如果是对象，检查是否有hasThinking标志
        if (translation.hasThinking) {
          // 只显示翻译部分，不显示思考过程
          resultContent.textContent = translation.translation;
        } else {
          // 显示整个对象的字符串表示（这种情况应该不常见）
          resultContent.textContent = JSON.stringify(translation);
        }
      } else {
        // 常规字符串结果
        resultContent.textContent = translation;
      }

      verifyBtn.style.display = 'inline-block';
      applyBtn.disabled = false;
      verifyResult.style.display = 'none';
      
      // 保存语言选择
      rememberLanguageChoice(chatWindow, targetLang);
    } catch (error) {
      console.error('翻译出错:', {
        message: error.message,
        stack: error.stack,
        details: error.toString()
      });
      
      // 直接在结果区域显示错误信息
      resultContent.textContent = '翻译失败: ' + (error.message || '未知错误');
      
      // 显示一个简单的toast通知
      const toast = document.createElement('div');
      toast.className = 'translate-toast translate-toast-error';
      toast.textContent = '翻译失败: ' + (error.message || '未知错误');
      document.body.appendChild(toast);
      
      // 3秒后自动移除通知
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } finally {
      translateBtn.classList.remove('btn-loading');
    }
  };

  // 验证翻译
  verifyBtn.onclick = async () => {
    console.log('点击验证按钮');
    try {
      verifyBtn.classList.add('btn-loading');
      const translatedText = resultContent.textContent;
      const currentLang = langSelect.value; // 当前选择的目标语言
      
      // 确定原语言和目标语言
      const originalLang = currentLang === 'en' ? 'zh' : 'en';
      
      console.log('开始验证翻译:', {
        translatedText,
        originalLang,
        currentLang,
        timestamp: new Date().toISOString()
      });

      // 使用验证翻译方法
      const verification = await verifyTranslation(translatedText, originalLang, currentLang);
      console.log('验证翻译完成:', {
        translatedText,
        verification,
        originalLang,
        currentLang,
        timestamp: new Date().toISOString()
      });

      verifyContent.textContent = verification;
      verifyResult.style.display = 'block';
    } catch (error) {
      console.error('验证翻译出错:', {
        error,
        translatedText: resultContent.textContent,
        timestamp: new Date().toISOString()
      });
      verifyContent.textContent = '验证失败: ' + error.message;
      verifyResult.style.display = 'block';
    } finally {
      verifyBtn.classList.remove('btn-loading');
    }
  };

  // 应用翻译结果
  applyBtn.onclick = async () => {
    // 获取翻译结果文本
    const translation = resultContent.textContent;
    
    if (!translation) {
      console.error('没有可应用的翻译结果');
      return;
    }
    
    console.log('应用翻译结果:', {
      translationText: translation,
      timestamp: new Date().toISOString()
    });
    
    try {
      // 从 footer 开始查找输入框
      const footer = document.querySelector('footer._ak1i');
      console.log('找到 footer:', {
        found: !!footer,
        footerHtml: footer?.outerHTML
      });

      if (!footer) {
        throw new Error('未找到输入框容器');
      }

      // 查找富文本输入框
      const richTextInput = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
      console.log('找到富文本输入框:', {
        found: !!richTextInput,
        html: richTextInput?.outerHTML,
        currentContent: richTextInput?.textContent
      });

      if (!richTextInput) {
        throw new Error('未找到输入框');
      }

      try {
        // 1. 检测操作系统
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        console.log('操作系统检测:', {
          platform: navigator.platform,
          isMac
        });

        // 2. 聚焦输入框
        richTextInput.focus();
        console.log('输入框已聚焦');

        // 3. 模拟 Ctrl+A/Command+A
        const selectAll = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true
        });
        richTextInput.dispatchEvent(selectAll);

        // 4. 模拟退格键
        const backspace = new KeyboardEvent('keydown', {
          key: 'Backspace',
          code: 'Backspace',
          bubbles: true
        });
        richTextInput.dispatchEvent(backspace);

        // 5. 使用现代剪贴板 API
        await navigator.clipboard.writeText(translation);
        console.log('内容已复制到剪贴板');

        // 6. 模拟 Ctrl+V/Command+V
        const paste = new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true
        });
        richTextInput.dispatchEvent(paste);

        // 7. 触发输入事件
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertFromPaste',
          data: translation
        });
        richTextInput.dispatchEvent(inputEvent);

        // 8. 检查最终状态
        console.log('最终状态:', {
          expectedContent: translation,
          actualContent: richTextInput.textContent,
          html: richTextInput.innerHTML,
          success: richTextInput.textContent === translation
        });

        // 关闭模态框
        modal.remove();
      } catch (inputError) {
        console.error('输入操作失败:', inputError);
        throw inputError;
      }
    } catch (error) {
      console.error('应用翻译结果失败:', {
        error,
        translation,
        timestamp: new Date().toISOString()
      });
      alert('应用翻译结果失败: ' + error.message);
    }
  };

  // 改点击事件，阻止冒泡
  modal.onclick = (e) => {
    e.stopPropagation();
  };

  return modal;
}

// 添加错误显示函数
function showTranslationError(message, code) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'translation-error';
  errorDiv.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-message">${message}</div>
    ${code ? `<div class="error-code">${code}</div>` : ''}
  `;
  
  // 添加错误提示样式
  const style = document.createElement('style');
  style.textContent = `
    .translation-error {
      color: #e74c3c;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 4px;
      background: #fdeaea;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .error-icon {
      font-size: 16px;
    }
    .error-code {
      color: #95a5a6;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
  
  // 创建一个toast通知而不是依赖verifyResult元素
  const toast = document.createElement('div');
  toast.className = 'translate-toast translate-toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 3秒后自动隐藏
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 修改模态框翻译的错误处理
async function handleModalTranslation(error) {
  if (error) {
    console.error('模态框翻译失败:', {
      message: error.message,
      stack: error.stack,
      details: error.toString()
    });
    
    // 显示错误提示
    showTranslationError(
      '模态框翻译失败: ' + (error.message || '未知错误'),
      'MODAL_TRANSLATION_ERROR'
    );
  }
}

// 启动输入框翻译功能
initializeInputTranslate(); 