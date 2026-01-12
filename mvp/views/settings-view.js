/*
用途：设置弹窗 View（负责渲染设置模态框的 DOM 结构与样式注入），供 settingsPresenter 调用。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.settingsView) return;

  let stylesInjected = false;

  function ensureStyles() {
    try {
      if (stylesInjected) return true;

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
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid rgba(17, 27, 33, 0.08);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 1px 0 rgba(0,0,0,0.03), 0 10px 28px rgba(0,0,0,0.06);
    }

    .settings-section:last-child {
      margin-bottom: 0;
    }

    .settings-section .settings-section {
      margin-top: 16px;
      margin-bottom: 0;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
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

    .target-language {
      margin-top: 18px !important;
    }

    .target-language label {
      display: block;
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333 !important;
      font-weight: 500;
    }

    .advanced-settings-toggle {
      color: #111b21 !important;
      font-weight: 600;
      font-size: 14px;
      margin-top: 14px;
    }

    .advanced-settings-toggle * {
      color: #111b21 !important;
    }

    .advanced-settings {
      color: #111b21 !important;
    }

    .advanced-settings label {
      color: #111b21 !important;
    }

    .advanced-settings p {
      color: #667781 !important;
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

    .privacy-subtabs {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 8px 0 12px;
      padding: 6px;
      border-radius: 12px;
      background: #f0f2f5;
      border: 1px solid rgba(17, 27, 33, 0.08);
    }

    .privacy-subtab {
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

    .privacy-subtab.is-active {
      background: #ffffff;
      color: #111b21;
      box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06);
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
      stylesInjected = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.id = 'settings-modal';

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

      <div class="settings-tabs" role="tablist" aria-label="设置分类">
        <button type="button" class="settings-tab is-active" data-tab="translation" role="tab" aria-selected="true">翻译设置</button>
        <button type="button" class="settings-tab" data-tab="personalize" role="tab" aria-selected="false">个性化设置</button>
        <button type="button" class="settings-tab" data-tab="privacy" role="tab" aria-selected="false">隐私保护</button>
      </div>

      <div class="settings-tab-panels">
        <div class="settings-tab-panel is-active" data-tab-panel="translation" role="tabpanel">

      <!-- 翻译服务设置 -->
      <div class="settings-section">
        <h4>翻译服务</h4>
        <div class="service-selection">
          <label for="translationApi">选择翻译服务</label>
          <select id="translationApi">
            <option value="google">Google 翻译</option>
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
            
            <div class="advanced-settings-toggle" style="margin-top: 12px; cursor: pointer;">
              <span style="display: flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 5px;" class="advanced-settings-icon">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
                高级选项
              </span>
            </div>
            
            <div class="advanced-settings" style="display: none; margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
              <div class="setting-item">
                <label for="openaiTemperature">温度设置 (0.1-2.0)</label>
                <div style="display: flex; align-items: center;">
                  <input type="range" id="openaiTemperature" min="0.1" max="2.0" step="0.1" value="0.7" style="flex: 1;">
                  <span id="openaiTemperatureValue" style="margin-left: 8px; min-width: 30px;">0.7</span>
                </div>
              </div>
              
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
          
        </div>
      </div>

        </div>

        <div class="settings-tab-panel" data-tab-panel="personalize" role="tabpanel" style="display: none;">

      <div class="settings-section">
        <h4>天气与时间</h4>

        <div class="toggle-switch-container">
          <label for="weatherEnabled" class="toggle-label">启用天气信息</label>
          <span class="wa-info" data-tip="保存设置后，需要切换一次聊天窗口才会生效">i</span>
          <label class="toggle-switch">
            <input type="checkbox" id="weatherEnabled" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div id="weather-options" style="display: none; margin-top: 10px;">
          <div class="toggle-switch-container">
            <label for="weatherShowWeather" class="toggle-label">显示天气</label>
            <span class="wa-info" data-tip="保存设置后，需要切换一次聊天窗口才会生效">i</span>
            <label class="toggle-switch">
              <input type="checkbox" id="weatherShowWeather" class="toggle-input">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">关闭后将只显示国家信息（可选：当地时间）。</p>

          <div class="service-selection" style="margin-top: 14px;">
            <label for="weatherCachePreset">天气缓存周期</label>
            <select id="weatherCachePreset">
              <option value="5">5 分钟</option>
              <option value="15">15 分钟</option>
              <option value="30">30 分钟</option>
              <option value="60">60 分钟（默认）</option>
              <option value="180">3 小时</option>
              <option value="1440">1 天</option>
              <option value="custom">自定义…</option>
            </select>
          </div>

          <div id="weatherCacheCustomWrap" class="api-key-input" style="margin-top: 10px; display: none;">
            <label for="weatherCacheMinutes">自定义缓存周期（分钟）</label>
            <div class="api-key-wrapper">
              <input type="number" id="weatherCacheMinutes" min="1" max="10080" step="1" placeholder="60">
            </div>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">缓存越久越省请求，缓存越短越及时更新。</p>

          <div class="toggle-switch-container" style="margin-top: 12px;">
            <label for="weatherCacheAutoRenew" class="toggle-label">缓存自动续期</label>
            <span class="wa-info" data-tip="开启后：天气缓存到期会在后台自动刷新，下次打开聊天无需等待请求。可能会增加网络请求。">i</span>
            <label class="toggle-switch">
              <input type="checkbox" id="weatherCacheAutoRenew" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="api-key-input" style="margin-top: 10px;">
            <label for="weatherAutoRenewEvictDays">自动续期淘汰阈值（天）</label>
            <div class="api-key-wrapper">
              <input type="number" id="weatherAutoRenewEvictDays" min="0" max="365" step="1" placeholder="10">
            </div>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">N 天内未再次出现的国家/地区将停止续期并清理缓存（0 表示不淘汰）。</p>

          <div class="toggle-switch-container" style="margin-top: 12px;">
            <label for="weatherShowTime" class="toggle-label">显示当地时间</label>
            <span class="wa-info" data-tip="保存设置后，需要切换一次聊天窗口才会生效">i</span>
            <label class="toggle-switch">
              <input type="checkbox" id="weatherShowTime" class="toggle-input">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-switch-container" style="margin-top: 12px;">
            <label for="weatherAllowCountryOverride" class="toggle-label">允许手动选择对方国家</label>
            <span class="wa-info" data-tip="手动选国家：保存设置 → 切换一次聊天窗口 → 点击国家名旁的“选择国家”即可修改">i</span>
            <label class="toggle-switch">
              <input type="checkbox" id="weatherAllowCountryOverride" class="toggle-input">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p style="margin-top: 6px; font-size: 12px; color: #666;">开启后，点击国家名称即可手动修改国家（按手机号保存到本地）。</p>

          
        </div>
      </div>

      <div class="settings-section">
        <h4>快速对话（内测）</h4>

        <div class="toggle-switch-container">
          <label for="quickChatEnabled" class="toggle-label">启用快速对话</label>
          <span class="wa-info" data-tip="该功能仍在内测中，默认不开放；需要管理员口令解锁后才能启用">i</span>
          <label class="toggle-switch">
            <input type="checkbox" id="quickChatEnabled" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p style="margin-top: 6px; font-size: 12px; color: #666;">未解锁时无法开启；解锁后启用会在左侧聊天列表顶部显示“快速对话”按钮。</p>
      </div>

      <!-- AI服务设置 -->
      <div class="settings-section">
        <h4>AI分析服务</h4>
        
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
              <option value="siliconflow">OpenAI通用接口</option>
            </select>
          </div>
          
          <div class="target-language" style="margin-top: 12px;">
            <label for="aiTargetLanguage">分析结果语言</label>
            <select id="aiTargetLanguage">
              <option value="zh-CN">中文</option>
              <option value="en">英文</option>
            </select>
          </div>
          
          <div class="api-settings" id="ai-settings" style="margin-top: 16px;">
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

        <div class="settings-section" id="ai-system-role" style="margin-top: 16px; border-bottom: none; padding-bottom: 0; display: none;">
          <h4>AI 系统角色设定</h4>
          <div class="prompt-input">
            <textarea id="systemRole" rows="3" placeholder="设置 AI 分析师的角色特点和专业背景">你是一位专业的对话分析专家和二十年经验的外贸业务员。请分析以下对话内容，结合对方和我方的实际情况，并严格按照固定格式输出分析结果，但是不要输出Markdown格式。</textarea>
          </div>
        </div>
      </div>

        </div>

        <div class="settings-tab-panel" data-tab-panel="privacy" role="tabpanel" style="display: none;">
          <div class="settings-section">
            <h4>隐私保护</h4>

            <div class="privacy-subtabs" role="tablist" aria-label="隐私保护分类">
              <button type="button" class="privacy-subtab is-active" data-privacy-tab="records" role="tab" aria-selected="true">记录</button>
              <button type="button" class="privacy-subtab" data-privacy-tab="weather" role="tab" aria-selected="false">天气</button>
            </div>

            <div class="privacy-subpanels">
              <div class="privacy-subpanel is-active" data-privacy-panel="records" role="tabpanel">

            <div class="privacy-actions">
              <button type="button" class="privacy-btn" id="privacyRefreshBtn">刷新</button>
              <button type="button" class="privacy-btn" id="privacyExportBtn">导出配置</button>
              <button type="button" class="privacy-btn" id="privacyImportBtn">导入配置</button>
              <button type="button" class="privacy-btn privacy-danger" id="privacyClearAllBtn">全部清空</button>
              <input type="file" id="privacyImportFile" accept="application/json" style="display:none" />
            </div>

            <div class="privacy-hint">这里会展示本插件在本机长期保存的记录（不会上传云端）。</div>

            <div class="privacy-table-wrap">
              <table class="privacy-table">
                <thead>
                  <tr>
                    <th>号码</th>
                    <th>国家</th>
                    <th>输入框翻译语言</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="privacyRecordsBody">
                  <tr><td colspan="4" class="privacy-empty">加载中...</td></tr>
                </tbody>
              </table>
            </div>

              </div>

              <div class="privacy-subpanel" data-privacy-panel="weather" role="tabpanel" style="display: none;">
                <div class="privacy-actions">
                  <button type="button" class="privacy-btn" id="weatherCacheRefreshBtn">刷新</button>
                  <button type="button" class="privacy-btn" id="weatherCacheRenewNowBtn">一键续期</button>
                  <button type="button" class="privacy-btn privacy-danger" id="weatherCacheResetBtn">重置天气数据</button>
                </div>

                <div class="privacy-hint">这里展示天气模块本机缓存（不会上传云端）。当前缓存周期：<span id="weatherCacheTtlLabel">-</span>；自动续期：<span id="weatherAutoRenewStatusLabel">-</span>；淘汰阈值：<span id="weatherAutoRenewEvictDaysLabel">-</span>（按“天”淘汰，不是数量上限）；缓存条目：<span id="weatherCacheCountLabel">-</span>；下次续期：<span id="weatherAutoRenewNextAtLabel">-</span></div>

                <div class="privacy-table-wrap">
                  <table class="privacy-table">
                    <thead>
                      <tr>
                        <th>国家</th>
                        <th>缓存到期时间</th>
                        <th>续期状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody id="weatherCacheBody">
                      <tr><td colspan="4" class="privacy-empty">加载中...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="settings-footer">
      <button class="save-btn">保存设置</button>
    </div>
  `;

    modal.appendChild(content);

    return { modal, content };
  }

  window.WAAP.views.settingsView = {
    ensureStyles,
    createModal
  };
})();
