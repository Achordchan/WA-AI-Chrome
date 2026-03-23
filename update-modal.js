// 创建并显示更新日志模态框
function showUpdateModal() {
  const modalHtml = `
    <div class="update-modal">
      <div class="update-modal-content">
        <div class="update-modal-header">
                <h3>WhatsApp Assistant Pro+ 更新说明</h3>
      <span class="version">V3.2.4</span>
          <button class="modal-close">×</button>
        </div>
        <div class="update-modal-body">
          
          <div class="update-section">
           
            <h4>本次更新</h4>
            <ul>
              <li><strong>语音消息转写</strong> - 设置中开启并填写API信息后在语音气泡上新增“听”按钮，一键转写语音内容</li>
              <li><strong>转写结果内一键翻译</strong> - 转写结果区域新增“译”按钮，可直接继续翻译</li>
              <li><strong>媒体预览说明翻译</strong> - 图片/视频发送前的说明输入框支持翻译按钮与回车快捷翻译</li>
              <li><strong>快速对话免费开放</strong> - 快速对话功能正式开放，默认启用</li>
              <li><strong>STT 获取方式</strong> - 需自行获取语音转写服务，建议使用智谱 AI</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>翻译与分析</h4>
            <ul>
              <li>修复输入框翻译按钮、回车快捷翻译在 WhatsApp 最新 DOM 下的挂载与触发问题</li>
              <li>修复媒体预览说明输入框中翻译弹窗与按钮定位异常的问题</li>
              <li>修复顶部工具栏、消息“译 / 听”按钮错位的问题</li>
              <li>修复部分场景下信息提示不消失导致布局异常的问题</li>
              <li>修复语音翻译 Token 数显示为 N/A 的问题</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>天气与号码识别（重要）</h4>
            <ul>
              <li><strong>天气/时间显示可自定义</strong> - 可单独开启/关闭天气与当地时间显示</li>
              <li><strong>号码获取更稳定</strong> - 已适配 WhatsApp 最新 DOM，修复“未检测到联系人号码”</li>
              <li><strong>顶部显示更稳</strong> - 修复国家/天气/时间显示错位，并避免污染联系人标题文本</li>
              <li><strong>SVG 国旗兼容</strong> - 顶部国家显示与国家选择器改为本地 SVG，兼容 Windows emoji 显示问题</li>
              <li><strong>防误判 + 缓存</strong> - 避免把 WhatsApp 内部 ID 误当手机号；成功获取后会缓存，减少重复弹出与干扰</li>
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
        return chrome && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest().version || '3.2.4') : '3.2.4';
      } catch (e) {
        return '3.2.4';
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
