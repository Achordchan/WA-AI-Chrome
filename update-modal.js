// 创建并显示更新日志模态框
function showUpdateModal() {
  const modalHtml = `
    <div class="update-modal">
      <div class="update-modal-content">
        <div class="update-modal-header">
                <h3>WhatsApp Assistant Pro+ 更新说明</h3>
      <span class="version">V3.2.5</span>
          <button class="modal-close">×</button>
        </div>
        <div class="update-modal-body">
          
          <div class="update-section">
           
            <h4>本次更新</h4>
            <ul>
              <li><strong>主链收口</strong> - MVP 成为唯一正式主链，运行路径更清晰</li>
              <li><strong>媒体预览说明翻译恢复</strong> - 图片/视频发送前的说明输入框重新支持翻译按钮与回车快捷翻译</li>
              <li><strong>同文直发恢复</strong> - 翻译结果与原文一致时，回车会直接发送，不再多按一次</li>
              <li><strong>翻译反馈体验恢复</strong> - 回车快捷翻译重新显示“正在翻译中”提示与绿色包裹动效</li>
              <li><strong>设置模块拆分</strong> - 设置表单与管理员预设逻辑拆到独立 service，便于后续维护</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>稳定性与安全</h4>
            <ul>
              <li>分析面板、天气展示、错误提示中的动态内容改为安全渲染，降低注入风险</li>
              <li>语音 blob 捕获桥接增加类型白名单、字段校验、尺寸限制与缓存清理</li>
              <li>语音转写等待、自动初始化、号码提取与输入框安装改为事件驱动，不再依赖关键轮询</li>
              <li>适配 WhatsApp 最新 DOM，修复顶部工具栏、消息按钮、输入框按钮挂载错位问题</li>
              <li>修复天气/国家/时间显示错位，避免污染联系人标题文本</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>功能细节修复</h4>
            <ul>
              <li>普通聊天输入框与媒体说明输入框都支持翻译按钮与回车快捷翻译</li>
              <li>翻译按钮重新与表情区对齐，避免跑到顶部工具栏或出现高低不齐</li>
              <li>天气/号码识别链路在新 DOM 下更稳定，减少“未检测到联系人号码”的误报</li>
              <li>顶部天气条、国家显示、时间显示在切换聊天与刷新后更稳定</li>
              <li>保留管理员预设与内置 Key 的现有策略，不影响原有使用习惯</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>开源不易，请动动小手给项目一个Star，Google商店再给个五星好评就更好了。有任何问题联系开发者<a href="mailto:achordchan@gmail.com">achordchan@gmail.com</a>。</h4>
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
        return chrome && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest().version || '3.2.5') : '3.2.5';
      } catch (e) {
        return '3.2.5';
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
