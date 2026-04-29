// 创建并显示更新日志模态框
function showUpdateModal() {
  const modalHtml = `
    <div class="update-modal">
      <div class="update-modal-content">
        <div class="update-modal-header">
                <h3>WhatsApp Assistant Pro+ 更新说明</h3>
      <span class="version">V3.2.6</span>
          <button class="modal-close">×</button>
        </div>
        <div class="update-modal-body">
          
          <div class="update-section update-notice-section">
            <h4>开源说明与永久免费承诺</h4>
            <p>最近有人 clone 了仓库，改掉版权信息后拿去出售，所以后续我可能会考虑闭源。届时大家仍然可以通过谷歌插件商店安装使用。</p>
            <p>我可以明确承诺：这个插件永远不会有任何付费计划。插件本身只是外壳，翻译引擎你们既可以继续使用免费的 Google 翻译，也可以切换到 AI 模型。</p>
            <p>本版已接入 DeepL，先免费开放给大家使用，可以联系我的邮箱获取apikey；如果后续确实好用，你们也可以自行购买它们的官方 API。</p>
          </div>
          <div class="update-section">
            <h4>本次更新重点</h4>
            <ul>
              <li><strong>DeepL 翻译接入</strong> - 文本翻译服务新增 DeepL，支持 Free / Pro Key 自动选择接口</li>
              <li><strong>测试接口是否可用</strong> - OpenAI 与 DeepL 必须先完成真实测试翻译，当前配置验证通过后才允许保存</li>
              <li><strong>OpenAI 接口教程</strong> - 设置页新增手绘教程（在这里墙裂推荐gpt-image2）</li>
              <li><strong>设置页优化</strong> - API Key、教程、测试翻译集中展示</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>体验与转写修复</h4>
            <ul>
              <li>消息翻译信息框会区分普通请求和 AI 请求，Google / DeepL</li>
              <li>语音转文字移除 30 秒时长硬限制，只保留服务商上传文件大小限制</li>
              <li>OpenAI 高级选项收纳提示词设置</li>
              <li>设置页深色 WhatsApp 环境下的下拉框可读性更稳定</li>

            </ul>
          </div>
          <div class="update-section">
            <h4>开发不易，请动动小手在Google插件商店给个五星好评吧。有任何问题联系开发者<a href="mailto:achordchan@gmail.com">achordchan@gmail.com</a>。</h4>
          </div>
        </div>
        <div class="update-modal-footer">
          <button class="confirm-btn" disabled>开始使用 6</button>
        </div>
      </div>
    </div>
  `;

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    .update-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }
    
    .update-modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .update-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: white;
      z-index: 1;
    }
    
    .update-modal-header h3 {
      margin: 0;
      color: #075e54;
      font-size: 18px;
      flex: 1;
    }
    
    .version {
      font-size: 12px;
      color: #667781;
      padding: 2px 6px;
      background: #f0f2f5;
      border-radius: 4px;
      margin: 0 10px;
    }
    
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0 4px;
    }
    
    .update-modal-body {
      padding: 20px;
    }
    
    .update-section {
      margin-bottom: 20px;
    }
    
    .update-section h4 {
      margin: 0 0 10px 0;
      color: #075e54;
    }
    
    .update-section ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .update-section li {
      margin: 8px 0;
      color: #333;
    }

    .update-notice-section {
      padding: 14px 16px;
      border: 1px solid #ffb4ab;
      border-left: 5px solid #d93025;
      border-radius: 10px;
      background: #fff1f0;
    }

    .update-notice-section h4 {
      color: #b42318;
    }

    .update-notice-section p {
      margin: 8px 0;
      color: #8a1c13;
      line-height: 1.55;
      font-weight: 600;
    }
    
    .update-modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      text-align: right;
      position: sticky;
      bottom: 0;
      background: white;
    }
    
    .confirm-btn {
      background: #25D366;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .confirm-btn:hover {
      background: #1ea952;
    }
    
    .confirm-btn:disabled {
      background: #cccccc;
      cursor: not-allowed;
      opacity: 0.7;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  // 添加样式到页面
  document.head.appendChild(style);

  // 创建模态框元素
  const modalElement = document.createElement('div');
  modalElement.innerHTML = modalHtml;
  document.body.appendChild(modalElement);

  // 倒计时逻辑
  const confirmBtn = modalElement.querySelector('.confirm-btn');
  let countdown = 6;
  
  const timer = setInterval(() => {
    countdown--;
    confirmBtn.textContent = `开始使用 ${countdown}`;
    
    if (countdown <= 0) {
      clearInterval(timer);
      confirmBtn.textContent = '开始使用';
      confirmBtn.disabled = false;
    }
  }, 1000);

  // 绑定关闭事件
  const closeModal = () => {
    clearInterval(timer);
    modalElement.remove();
    style.remove();
  };

  modalElement.querySelector('.modal-close').onclick = closeModal;
  confirmBtn.onclick = closeModal;
}

// 检查是否需要显示更新日志
async function checkAndShowUpdateLog() {
  try {
    const currentVersion = (() => {
      try {
        return chrome && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest().version || '3.2.6') : '3.2.6';
      } catch (e) {
        return '3.2.6';
      }
    })(); // 当前版本号
    const data = await chrome.storage.local.get(['lastShownVersion']);
    
    // 如果没有显示过，或者版本号不一致，就显示更新日志
    if (!data.lastShownVersion || data.lastShownVersion !== currentVersion) {
      // 显示更新日志
      showUpdateModal();
      // 保存当前版本号
      await chrome.storage.local.set({ lastShownVersion: currentVersion });
    }
  } catch (error) {
    console.error('检查更新日志状态失败:', error);
  }
}

// 手动显示更新日志的函数不需要检查版本
window.showUpdateLogManually = () => {
  showUpdateModal();
};

// 导出函数
window.checkAndShowUpdateLog = checkAndShowUpdateLog; 
