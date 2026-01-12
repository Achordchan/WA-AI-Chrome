/*
用途：保留 legacy 的 settingsStyles 样式注入 + 导出聊天（exportChat/addExportButton）逻辑，从 content.js 迁出以瘦身。
作者：Achord
*/

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

    .settings-tabs {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      padding: 6px;
      border-radius: 12px;
      background: #f0f2f5;
      border: 1px solid rgba(17, 27, 33, 0.08);
    }

    .settings-tab {
      appearance: none;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #667781;
      flex: 1;
      transition: all 0.15s ease;
    }

    .settings-tab.is-active {
      background: #ffffff;
      color: #111b21;
      box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06);
    }

    .settings-tab-panels {
      width: 100%;
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
      justify-content: flex-start;
      margin-bottom: 16px;
      padding: 8px 0;
    }

    .toggle-label {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      cursor: pointer;
    }

    .toggle-switch-container .toggle-switch {
      margin-left: auto;
      flex-shrink: 0;
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

    .wa-info {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: rgba(17, 24, 39, 0.55);
      background: rgba(17, 24, 39, 0.06);
      border: 1px solid rgba(17, 24, 39, 0.10);
      cursor: default;
      position: relative;
      user-select: none;
      flex-shrink: 0;
      margin-left: 6px;
      margin-right: 0;
    }

    .wa-info:hover {
      background: rgba(17, 24, 39, 0.10);
    }

    .wa-info::after {
      content: attr(data-tip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.92);
      color: rgba(255, 255, 255, 0.92);
      padding: 8px 10px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.3;
      width: max-content;
      max-width: 280px;
      white-space: normal;
      box-shadow: 0 10px 30px rgba(0,0,0,0.22);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      z-index: 99999;
    }

    .wa-info:hover::after {
      opacity: 1;
    }

    .privacy-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 10px 0 8px;
    }

    .privacy-btn {
      border: 1px solid rgba(0,0,0,0.10);
      background: rgba(255,255,255,0.90);
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      cursor: pointer;
    }

    .privacy-btn:hover {
      background: rgba(243,244,246,0.90);
    }

    .privacy-danger {
      border: 1px solid rgba(220, 38, 38, 0.22);
      color: rgba(185, 28, 28, 0.95);
      background: rgba(254, 242, 242, 0.85);
    }

    .privacy-danger:hover {
      background: rgba(254, 226, 226, 0.95);
    }

    .privacy-hint {
      font-size: 12px;
      color: #667781;
      margin-bottom: 10px;
    }

    .privacy-table-wrap {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.85);
    }

    .privacy-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .privacy-table thead th {
      text-align: left;
      padding: 10px 12px;
      background: rgba(0,0,0,0.04);
      color: #111b21;
      font-weight: 600;
    }

    .privacy-table tbody td {
      padding: 10px 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
      color: #3b4a54;
      vertical-align: top;
    }

    .privacy-row-btn {
      border: 1px solid rgba(0,0,0,0.10);
      background: rgba(255,255,255,0.90);
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .privacy-row-btn:hover {
      background: rgba(243,244,246,0.90);
    }

    .privacy-empty {
      color: #667781;
      font-size: 12px;
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
