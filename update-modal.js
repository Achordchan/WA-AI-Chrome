// 创建并显示更新日志模态框
function showUpdateModal() {
  const modalHtml = `
    <div class="update-modal">
      <div class="update-modal-content">
        <div class="update-modal-header">
                <h3>🚀 WhatsApp Assistant Pro+ 重大更新!</h3>
      <span class="version">V2.5</span>
          <button class="modal-close">×</button>
        </div>
        <div class="update-modal-body">
          <div class="update-section">
            <h4>🆕 全新功能</h4>
            <ul>
              <li>🌍 <strong>智能号码识别</strong> - 自动识别对方手机号码归属地</li>
              <li>🌤️ <strong>实时天气信息</strong> - 显示对方所在地区的当前天气状况</li>
              <li>⏰ <strong>当地时间显示</strong> - 实时显示对方时区的本地时间</li>
              <li>📍 <strong>地理位置信息</strong> - 基于号码前缀智能识别国家和地区</li>
              <li>🔄 <strong>自动刷新机制</strong> - 天气和时间信息自动更新</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>🛠️ AI翻译 + AI分析 升级</h4>
            <ul>
              <li>🔄 全面重构代码架构，提升整体性能和稳定性</li>
              <li>🚀 优化翻译引擎，提供更快速、更准确的翻译结果</li>
              <li>🤖 AI对话分析功能更加智能和精准</li>
              <li>💻 改进用户界面，提供更流畅的用户体验</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>✨ 系统优化</h4>
            <ul>
              <li>🛡️ 完善错误处理机制，增强系统稳定性</li>
              <li>📚 更新依赖库和API调用方式，确保与最新Web API兼容</li>
              <li>⚡ 提升整体运行速度，减少资源占用</li>
              <li>🌐 优化国际化支持，更好的多语言体验</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>🔨 功能改进</h4>
            <ul>
              <li>🌐 翻译服务响应速度显著提升</li>
              <li>🔍 优化语言检测准确度</li>
              <li>📱 提升在各种设备上的兼容性</li>
              <li>🎨 界面美化，更符合现代设计规范</li>
              <li>📊 增强数据处理能力和准确性</li>
            </ul>
          </div>
        </div>
        <div class="update-modal-footer">
          <button class="confirm-btn" disabled>开始使用 (6)</button>
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
    confirmBtn.textContent = `开始使用 (${countdown})`;
    
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
    const currentVersion = '2.5.0'; // 当前版本号
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