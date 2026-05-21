// 创建并显示更新日志模态框
function showUpdateModal() {
  const modalHtml = `
    <div class="update-modal">
      <div class="update-modal-content">
        <div class="update-modal-header">
          <h3>WhatsApp Assistant Pro+ 更新说明</h3>
          <span class="version">V3.2.8</span>
          <button class="modal-close">×</button>
        </div>
        <div class="update-modal-body">
          <div class="update-section update-notice-section">
            <h4>开源说明与永久免费承诺</h4>
            <p>最近有人 clone 了仓库，改掉版权信息后拿去出售，所以后续我可能会考虑闭源。届时大家仍然可以通过谷歌插件商店安装使用。</p>
            <p>我可以明确承诺：这个插件永远不会有任何付费计划。插件本身只是外壳，翻译引擎你们既可以继续使用免费的 Google 翻译，也可以切换到 AI 模型。</p>
            <p>3.2.8 聚焦 WhatsApp Web DOM 适配、群聊边界收敛、输入框快捷翻译权限模型和隐私数据可视化。</p>
          </div>
          <div class="update-section">
            <h4>本次更新重点</h4>
            <ul>
              <li><strong>快捷翻译权限模型重构</strong> - 设置页改为全局总开关，每个对话默认关闭，需要在输入框翻译面板单独开启</li>
              <li><strong>联系人级持久化</strong> - 快捷翻译偏好按聊天对象保存，刷新页面、重开弹窗和重开设置页后保持一致</li>
              <li><strong>隐私保护表升级</strong> - 新增快捷翻译列，导入、导出、单条重置和全部清空同步覆盖语言与快捷翻译偏好</li>
              <li><strong>群聊边界优化</strong> - 群聊不再加载顶部个性化信息和输入框翻译按钮，单条消息翻译保持可用</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>稳定性修复</h4>
            <ul>
              <li>适配 WhatsApp Web DOM 更新，修复有备注联系人号码识别失败的问题</li>
              <li>翻译信息 Tooltip 改为单例状态，重复点击不会叠加遮罩，点击外部可稳定关闭</li>
              <li>个性化显示拆分国家、天气、时间能力，天气和时间可后台依赖国家识别但不强制展示国家标签</li>
              <li>回车快捷翻译触发条件优化为：总开关开启、当前对话开启、非群聊</li>
              <li>输入框语言记忆不再读取滞后的 currentPhoneNumber，也不再写入 name:default 共享记录</li>
            </ul>
          </div>
          <div class="update-section">
            <h4>开发不易，请动动小手在 Google 插件商店给个五星好评。有任何问题联系开发者 <a href="mailto:achordchan@gmail.com">achordchan@gmail.com</a>。</h4>
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
        return chrome && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest().version || '3.2.8') : '3.2.8';
      } catch (e) {
        return '3.2.8';
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
