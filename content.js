let pluginStatus = {
  translation: false,
  observer: false,
  apiService: false
};

// 添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_STATUS') {
    // 检查各个功能的状态
    const status = {
      isLoaded: false,
      details: { ...pluginStatus }
    };

    try {
      // 检查翻译功能
      status.details.translation = typeof translateText === 'function';
      
      // 检查观察器
      status.details.observer = document.querySelector('#main') !== null;
      
      // 检查 API 服务
      status.details.apiService = typeof window.ApiServices !== 'undefined';
      
      // 如果所有功能都正常，则设置 isLoaded 为 true
      status.isLoaded = Object.values(status.details).every(v => v === true);
      
      sendResponse(status);
    } catch (error) {
      console.error('Status check error:', error);
      sendResponse({ isLoaded: false, error: error.message });
    }
    
    return true; // 保持消息通道开启
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
});

// 在各个功能初始化成功时更新状态
function updatePluginStatus(feature, status) {
  pluginStatus[feature] = status;
  console.log(`Plugin status updated - ${feature}:`, status);
}

// 修改初始化函数
function initialize() {
  console.log('Initializing message translation...');
  try {
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

async function translateText(text) {
  try {
    const { service, apiKey } = await window.getTranslationService();
    
    // 调用对应的翻译服务
    const translation = await window.ApiServices.translation[service](text, apiKey);
    return translation;
  } catch (error) {
    console.error('Translation failed:', error);
    return '翻译失败，请检查设置和网络连接';
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
    await translateMessage(textElement.closest('div[data-pre-plain-text]'));
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
  console.log('Translating message:', messageElement);
  
  const textElement = messageElement.querySelector('span.selectable-text');
  if (!textElement) {
    console.error('Text element not found');
    return;
  }

  const existingTranslation = messageElement.querySelector('.translation');
  if (existingTranslation) {
    existingTranslation.style.display = existingTranslation.style.display === 'none' ? 'block' : 'none';
    return;
  }

  // 获取原始文本内容（克隆节点以避免包含翻译按钮）
  const textClone = textElement.cloneNode(true);
  const translateBtn = textClone.querySelector('.translate-btn-container');
  if (translateBtn) {
    translateBtn.remove();
  }
  const text = textClone.textContent.trim();

  if (!text) {
    console.error('No text to translate');
    return;
  }

  console.log('Message content to translate:', text);

  try {
    // 添加加载状态
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'translation-loading';
    loadingDiv.innerHTML = 'A老师正在查阅词典中~<span class="loading-dots"></span>';
    messageElement.appendChild(loadingDiv);

    // 获取翻译服务设置，包括目标语言
    const { service, targetLang, apiKey } = await window.getTranslationService();
    console.log('Translation settings:', { service, targetLang });

    // 使用新的翻译服务，传入目标语言
    const translation = await window.ApiServices.translation[service](text, targetLang, apiKey);
    console.log('Translation result:', translation);
    
    // 移除加载状态
    loadingDiv.remove();

    // 修改添加翻译结果的部分
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation';
    // 使用更安全的文本处理方式，确保长文本可以正确换行
    translationDiv.innerHTML = translation.split('\n').map(line => 
      line.trim() ? `<p class="translation-line">${line}</p>` : '<br>'
    ).join('');
    messageElement.appendChild(translationDiv);

    // 添加新的样式
    if (!document.querySelector('#translation-styles')) {
      const translationStyles = document.createElement('style');
      translationStyles.id = 'translation-styles';
      translationStyles.textContent = `
        .translation {
          margin-top: 4px;
          padding: 8px;
          background-color: rgba(0, 168, 132, 0.05);
          border-radius: 7.5px;
          max-width: 100%;
          box-sizing: border-box;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }

        .translation-line {
          margin: 0;
          padding: 2px 0;
          line-height: 1.4;
          white-space: pre-wrap;       /* 保留空格和换行 */
          overflow-wrap: break-word;   /* 允许在任意字符间换行 */
          word-wrap: break-word;       /* 兼容性写法 */
          word-break: break-word;      /* 允许在单词内换行 */
          color: #667781;              /* 翻译文本颜色 */
          font-size: 14.2px;           /* 稍微调整字体大小 */
        }

        /* 确保在深色模式下也能正常显示 */
        [data-theme='dark'] .translation {
          background-color: rgba(0, 168, 132, 0.1);
        }
        
        [data-theme='dark'] .translation-line {
          color: #8696a0;
        }

        /* 移动设备适配 */
        @media screen and (max-width: 768px) {
          .translation {
            padding: 6px;
          }
          
          .translation-line {
            font-size: 13.5px;
          }
        }
      `;
      document.head.appendChild(translationStyles);
    }
  } catch (error) {
    console.error('Translation error:', error);
    // 显示错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'translation';
    errorDiv.innerHTML = `<span style="color: #e74c3c;">❌ ${error.message}</span>`;
    messageElement.appendChild(errorDiv);
    
    // 3秒后自动关闭错误提示
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
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

// 修改添加分析按钮的函数
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
      display: block;
    }

    .loading-dots {
      display: inline-flex;
      margin-left: 4px;
    }

    .loading-dots::after {
      content: '...';
      animation: loading 1.5s steps(4, end) infinite;
      width: 20px;
    }

    @keyframes loading {
      0%, 100% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
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

    .analysis-header h3 {
      margin: 0;
      color: #41525d;
      font-size: 18px;
      font-weight: 600;
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

    .close-btn:hover {
      background-color: #f0f2f5;
      color: #41525d;
    }

    .analysis-section {
      margin-bottom: 24px;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
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
        <p>该操作将翻译当前聊天记录中显示的所有消息，这可能会消耗较多资源和 API 配额。</p>
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
  const messages = messageContainer.querySelectorAll('div[data-pre-plain-text]');
  for (const message of messages) {
    if (!message.querySelector('.translation')) {
      await translateMessage(message);
    }
  }
}

// 分析对话内容
async function analyzeConversation(messageContainer) {
  try {
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
      // 获取对方名字
      const headerName = document.querySelector('._amig .x1iyjqo2').textContent;
      // 获取我方名字 - 从消息列表中找到第一条我方消息
      const myMessageElement = document.querySelector('.message-out .copyable-text');
      let myName = 'Unknown';
      if (myMessageElement && myMessageElement.getAttribute('data-pre-plain-text')) {
        const match = myMessageElement.getAttribute('data-pre-plain-text').match(/\] (.*?):/);
        if (match) {
          myName = match[1];
        }
      }
      const chatTitle = `${myName}与${headerName}的聊天记录`;

      const selectedMessages = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked'))
        .map(cb => ({
          time: cb.dataset.time,
          sender: cb.dataset.sender,
          text: cb.dataset.text
        }));

      // 格式化聊天记录
      const formattedChat = chatTitle + '\n\n' + selectedMessages.map(msg => 
        `[${msg.time}] ${msg.sender}：${msg.text}`
      ).join('\n\n') + `

${myName}与${headerName}的聊天记录

由 WhatsApp AI Assistant 导出

作者信息
--------
作者：Achord
电话：13160235855 
邮箱：achordchan@gmail.com

本项目遵循 MIT 开源协议`;

      // 复制到剪贴板
      navigator.clipboard.writeText(formattedChat).then(() => {
        const toast = document.createElement('div');
        toast.className = 'settings-toast';
        toast.textContent = '聊天记录已复制到剪贴板，请粘贴到Excel或txt中进行分析';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      });
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
        const { service, apiKey } = await window.getAiService();
        console.log('使用的 AI 服务:', service);
        console.log('API Key 长度:', apiKey ? apiKey.length : 0);
        
        // 调用 AI 分析前的日志
        console.log('准备发送分析请求，参数:', {
          service,
          messageCount: selectedMessages.length,
          messages: selectedMessages
        });
        
        // 调用 AI 分析
        const analysis = await window.ApiServices.analysis[service](selectedMessages, apiKey);
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

      // 先尝试提取建议回复示例
      const replyMatch = text.match(/建议回复示例[：:]\s*[""]([^""]+)[""]/);
      if (replyMatch) {
        const reply = replyMatch[1].trim();
        // 如果回复内容被方括号包裹，去掉方括号
        result.suggestedReply = reply.replace(/^\[(.*)\]$/, '$1').trim();
        console.log('找到建议回复示例:', result.suggestedReply);
      }

      // 如果没有找到建议回复示例，尝试在整个文本中查找
      if (!result.suggestedReply) {
        // 尝试匹配更多可能的格式
        const patterns = [
          /建议回复[：:]\s*[""]([^""]+)[""]/,
          /示例[：:]\s*[""]([^""]+)[""]/,
          /回复示例[：:]\s*[""]([^""]+)[""]/
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const reply = match[1].trim();
            result.suggestedReply = reply.replace(/^\[(.*)\]$/, '$1').trim();
            console.log('通过备选模式找到建议回复示例:', result.suggestedReply);
            break;
          }
        }
      }

      // 分别处理每个部分
      const sections = text.split('\n\n');
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();

        // 处理对话氛围
        if (title === '对话氛围') {
          result.mood = lines[1]
            .replace(/[\[\]]/g, '')
            .trim();
        }
        // 处理主要话题
        else if (title === '主要话题') {
          result.topics = lines.slice(1)  // 获取除标题外的所有行
            .join(' ')  // 合并所有行
            .replace(/[\[\]]/g, '')  // 移除方括号
            .split('。')  // 按句号分割
            .map(topic => topic.trim())  // 去除空格
            .filter(topic => topic);  // 过滤空值
        }
        
        // 处理双方态度
        else if (title === '双方态度') {
          lines.slice(1).forEach(line => {
            if (line.startsWith('我方态度：')) {
              result.attitudes.me = line
                .replace('我方态度：', '')
                .replace(/[\[\]]/g, '')
                .trim();
            } else if (line.startsWith('对方态度：')) {
              result.attitudes.other = line
                .replace('对方态度：', '')
                .replace(/[\[\]]/g, '')
                .trim();
            }
          });
        }
        
        // 处理建议回复方式
        else if (title === '建议回复方式') {
          const suggestions = [];
          lines.slice(1).forEach(line => {
            const cleanLine = line.replace(/[\[\]]/g, '').trim();
            // 只添加不是建议回复示例的行
            if (cleanLine && !cleanLine.includes('建议回复示例') && !cleanLine.startsWith('"')) {
              suggestions.push(cleanLine);
            }
          });
          
          if (suggestions.length > 0) {
            result.suggestions = suggestions;
          }
        }
      });

      console.log('最终解析结果:', result);
      return result;

    } catch (error) {
      console.error('解析分析结果时出错:', error);
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
        <select id="translationApi">
          <option value="google">Google 翻译</option>
          <option value="deepseek">DeepSeek 翻译</option>
          <option value="dashscope">通义千问翻译</option>
          <option value="volcengine">火山翻译</option>
        </select>
        
        <!-- 添加目标语言选择 -->
        <div class="target-language" style="margin-top: 12px;">
          <label for="targetLanguage">目标语言</label>
          <select id="targetLanguage">
            <option value="zh-CN">中文</option>
            <option value="en">英文</option>
          </select>
        </div>
      </div>

      <!-- API Keys 设置 -->
      <div class="settings-section">
        <h4>API Keys</h4>
        <div class="api-key-input">
          <label>DeepSeek API Key</label>
          <div class="api-key-wrapper">
            <input type="password" id="deepseekApiKey">
            <button class="toggle-visibility" data-for="deepseekApiKey">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </button>
          </div>
        </div>
        <!-- 其他 API Key 输入框 -->
        <div class="api-key-input">
          <label>通义千问 API Key</label>
          <div class="api-key-wrapper">
            <input type="password" id="dashscopeApiKey">
            <button class="toggle-visibility" data-for="dashscopeApiKey">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="api-key-input">
          <label>火山 API Key</label>
          <div class="api-key-wrapper">
            <input type="password" id="volcengineApiKey">
            <button class="toggle-visibility" data-for="volcengineApiKey">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>AI 系统角色设定</h4>
        <div class="prompt-input">
          <textarea id="systemRole" rows="3" placeholder="设置 AI 分析师的角色特点和专业背景">你是一位专业的对话分析专家和二十年经验的外贸业务员。请分析以下对话内容，结合对方和我方的实际情况，并严格按照固定格式输出分析结果，但是不要输出Markdown格式。</textarea>
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

  // 保存设置
  const saveBtn = content.querySelector('.save-btn');
  saveBtn.addEventListener('click', () => {
    saveSettings();
    modal.remove();
  });

  // 修改保存设置函数
  function saveSettings() {
    const settings = {
      translationApi: document.getElementById('translationApi').value,
      targetLanguage: document.getElementById('targetLanguage').value, // 添加目标语言设置
      deepseekApiKey: document.getElementById('deepseekApiKey').value,
      dashscopeApiKey: document.getElementById('dashscopeApiKey').value,
      volcengineApiKey: document.getElementById('volcengineApiKey').value,
      systemRole: document.getElementById('systemRole').value
    };

    chrome.storage.sync.set(settings, () => {
      const toast = document.createElement('div');
      toast.className = 'settings-toast';
      toast.textContent = '设置已保存';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    });
  }

  // 修改加载设置函数
  function loadSettings() {
    chrome.storage.sync.get([
      'translationApi',
      'targetLanguage', // 添加目标语言设置
      'deepseekApiKey',
      'dashscopeApiKey',
      'volcengineApiKey',
      'systemRole'
    ], (data) => {
      if (data.translationApi) {
        document.getElementById('translationApi').value = data.translationApi;
      }
      if (data.targetLanguage) {
        document.getElementById('targetLanguage').value = data.targetLanguage;
      }
      if (data.deepseekApiKey) {
        document.getElementById('deepseekApiKey').value = data.deepseekApiKey;
      }
      if (data.dashscopeApiKey) {
        document.getElementById('dashscopeApiKey').value = data.dashscopeApiKey;
      }
      if (data.volcengineApiKey) {
        document.getElementById('volcengineApiKey').value = data.volcengineApiKey;
      }
      if (data.systemRole) {
        document.getElementById('systemRole').value = data.systemRole;
      }
    });
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
    }

    .settings-section h4 {
      margin: 0 0 16px;
      font-size: 16px;
      color: #111b21;
      font-weight: 600;
    }

    .settings-section select {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      color: #111b21;
      background-color: white;
      transition: all 0.2s;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }

    .settings-section select:hover {
      border-color: #00a884;
    }

    .settings-section select:focus {
      border-color: #00a884;
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .target-language {
      margin-top: 16px;
    }

    .target-language label {
      display: block;
      margin-bottom: 8px;
      color: #111b21;
      font-size: 14px;
      font-weight: 500;
    }

    .api-key-input {
      margin-bottom: 20px;
    }

    .api-key-input label {
      display: block;
      margin-bottom: 8px;
      color: #111b21;
      font-size: 14px;
      font-weight: 500;
    }

    .api-key-wrapper {
      display: flex;
      gap: 8px;
    }

    .api-key-wrapper input {
      flex: 1;
      padding: 10px 12px;
      border: 1.5px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .api-key-wrapper input:focus {
      border-color: #00a884;
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .toggle-visibility {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .toggle-visibility:hover {
      background-color: #f0f2f5;
      color: #111b21;
    }

    textarea {
      width: 100%;
      padding: 12px;
      border: 1.5px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      min-height: 100px;
      transition: all 0.2s;
    }

    textarea:focus {
      border-color: #00a884;
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .settings-footer {
      padding: 16px 24px;
      border-top: 1px solid #e9edef;
      text-align: right;
      position: sticky;
      bottom: 0;
      background: white;
      border-radius: 0 0 12px 12px;
    }

    .save-btn {
      background: #00a884;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .save-btn:hover {
      background: #008f72;
    }

    .close-btn {
      background: none;
      border: none;
      width: 32px;
      height: 32px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 24px;
    }

    .close-btn:hover {
      background-color: #f0f2f5;
      color: #111b21;
    }

    .settings-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #111b21;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      animation: toastIn 0.3s ease-out;
    }

    @keyframes toastIn {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    /* 自定义滚动条样式 */
    .settings-content::-webkit-scrollbar {
      width: 6px;
    }

    .settings-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .settings-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .settings-content::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = settingsStyles;
  document.head.appendChild(styleSheet);

// 添加在 content.js 中的合适位置
function addQuickChatButton() {
  // 查找目标位置
  const targetContainer = document.querySelector('.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd');
  if (!targetContainer || targetContainer.querySelector('.quick-chat-btn')) {
    return;
  }
  // 创建新按钮
  const quickChatBtn = document.createElement('div');
  quickChatBtn.className = 'quick-chat-btn x78zum5 x6s0dn4 x1y1aw1k x1sxyh0 xwib8y2 xurb0ha';
  quickChatBtn.setAttribute('role', 'button');
  quickChatBtn.setAttribute('tabindex', '0');
  quickChatBtn.setAttribute('title', '快速对话');
  quickChatBtn.innerHTML = `
    <span aria-hidden="true" data-icon="quick-chat" class="">
      <svg t="1734071546020" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M314.8288 518.9376c-10.3424 0-17.2288-3.456-24.1408-10.3424-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c3.456-3.456 6.8864-6.8864 10.3424-6.8864 6.8864-3.456 17.2288-3.456 27.5712 0 3.456 0 6.8864 3.456 10.3424 6.8864 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-6.8864 6.8864-17.2032 10.3424-24.1152 10.3424z m144.7936 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3424 3.456-13.7728 3.456z m144.768 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3168 3.456-13.7728 3.456z m0 0" fill="#1296db"/>
        <path d="M883.6096 753.3312c27.5712-44.8 41.3696-93.0816 41.3696-144.7936 0-93.0816-48.256-179.2512-127.5392-234.4192h-3.456C742.272 250.0096 611.2768 163.84 456.1664 163.84c-196.48-3.456-358.5024 141.3376-358.5024 320.5888 0 58.5984 13.7984 110.3104 48.256 158.5664l-44.8 117.1968c-3.456 10.3424-3.456 24.1408 6.8864 34.4832 3.456 10.3424 13.7984 13.7984 24.1408 13.7984h6.8864l158.5664-31.0272c13.7984 6.8864 27.5712 10.3424 41.3696 13.7984 62.0544 68.9408 155.136 110.3104 255.104 110.3104 51.712 0 99.968-10.3424 144.7936-27.5712l144.7936 27.5712h6.8864c10.3424 0 20.6848-3.456 27.5712-13.7984 6.8864-10.3424 10.3424-24.1408 6.8864-34.4832l-41.3952-99.9424z m-582.5536-44.8h-6.8864l-110.3104 20.6848 27.5712-75.8272c3.456-10.3424 3.456-24.1408-3.456-31.0272-27.5712-44.8-41.3696-89.6256-41.3696-137.8816 0-141.3376 130.9952-255.104 293.0176-255.104 162.0224 0 293.0176 113.7664 293.0176 255.104s-134.4512 255.104-293.0176 255.104c-51.712 0-99.968-10.3424-141.3376-31.0272h-17.2288z m513.6128 51.712l24.1408 62.0544-93.0816-17.2288c-6.8864 0-13.7984 0-20.6848 3.456-37.9136 17.2288-82.7392 27.5712-127.5392 27.5712-41.3696 0-82.7392-10.3424-120.6528-27.5712 189.5936-6.8864 341.2736-148.224 341.2736-320.5888 24.1408 34.4832 37.9136 75.8272 37.9136 120.6528 0 41.3696-13.7984 82.7392-41.3696 120.6528-3.4304 10.3168-3.4304 20.6592 0 31.0016z m0 0" fill="#1296db"/>
      </svg>
    </span>
  `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .quick-chat-btn {
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.3s;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
    }
    .quick-chat-btn:hover {
      background-color: rgba(134, 150, 160, 0.15);
    }
  `;
  document.head.appendChild(style);

  // 添加点击事件
  quickChatBtn.addEventListener('click', () => {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'quick-chat-modal';
    modal.innerHTML = `
      <div class="quick-chat-content">
        <h3>发起临时对话</h3>
        <div class="input-group">
          <div class="phone-input-container" style="display: flex; gap: 12px;">
            <div class="input-field area-code" style="width: 30%;">
              <label for="areaCode">国际区号</label>
              <input type="text" id="areaCode" placeholder="请输入" value="86">
            </div>
            <div class="input-field phone-number" style="flex: 1;">
              <label for="phoneNumber">手机号码</label>
              <input type="text" id="phoneNumber" placeholder="请输入">
            </div>
          </div>
        </div>
        <div class="button-group">
          <button id="cancelBtn">取消</button>
          <button id="confirmBtn">确定</button>
        </div>
        <div class="copyright-info">
          
          本插件由WhatsApp AI Assistant（by Achord）驱动
        </div>
      </div>
      </div>
    `;

    // 添加模态框样式
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
      .quick-chat-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .quick-chat-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        width: 360px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .quick-chat-content h3 {
        margin: 0 0 24px;
        text-align: center;
        color: #075e54;
        font-size: 20px;
      }
      .input-group {
        margin-bottom: 24px;
      }
      .input-field {
        margin-bottom: 16px;
      }
      .input-field label {
        display: block;
        margin-bottom: 8px;
        color: #128c7e;
        font-weight: 500;
      }
      .input-field input {
        width: 100%;
        padding: 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 16px;
        box-sizing: border-box;
      }
      .button-group {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-bottom: 20px;
      }
      .button-group button {
        padding: 10px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s;
      }
      #cancelBtn {
        background: #f5f5f5;
        border: 1px solid #ddd;
        color: #666;
      }
      #cancelBtn:hover {
        background: #e9e9e9;
      }
      #confirmBtn {
        background: #00a884;
        border: none;
        color: white;
      }
      #confirmBtn:hover {
        background: #008f6f;
      }
      .copyright-info {
        text-align: center;
        color: #666;
        font-size: 12px;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(modalStyle);

    // 添加到页面
    document.body.appendChild(modal);

    // 绑定事件
    const cancelBtn = modal.querySelector('#cancelBtn');
    const confirmBtn = modal.querySelector('#confirmBtn');
    const areaCodeInput = modal.querySelector('#areaCode');
    const phoneNumberInput = modal.querySelector('#phoneNumber');

    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });

    confirmBtn.addEventListener('click', () => {
      const areaCode = areaCodeInput.value.trim();
      const phoneNumber = phoneNumberInput.value.trim();
      
      if(!areaCode || !phoneNumber) {
        alert('区号和手机号都为必填项');
        return;
      }

      // 移除所有非数字字符
      const fullNumber = areaCode.replace(/\D/g, '') + phoneNumber.replace(/\D/g, '');
      
      try {
        // 构建WhatsApp链接并打开
        const link = document.createElement('a');
        link.href = `whatsapp://send?phone=${fullNumber}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
      } catch (error) {
        alert('无法打开 WhatsApp，请确保已安装 WhatsApp 客户端，请联系管理员修复');
      }
      
      modal.remove();
    });
  });

  // 找到"对话"标题后的位置并插入按钮
  const titleElement = targetContainer.querySelector('div[title="对话"]');
  if (titleElement && titleElement.nextSibling) {
    titleElement.parentNode.insertBefore(quickChatBtn, titleElement.nextSibling);
  }
}

// 在观察器中调用添加按钮的函数
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      addQuickChatButton();
    }
  }
});

// 开始观察
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初始检查
addQuickChatButton();

// 启动初始化
initialize();