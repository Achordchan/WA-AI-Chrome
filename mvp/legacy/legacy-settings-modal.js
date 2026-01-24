/*
用途：旧版设置弹窗 fallback（从 content.js 迁移出来，用于 MVP 异常时的保守回退）。
作者：Achord
*/

function legacyShowSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'settings-modal';
  modal.id = 'settings-modal';
  let settingsDirty = false;
  let settingsLoading = true;
  
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

        <div class="settings-tab-panel" data-tab-panel="privacy" role="tabpanel" style="display: none;">
          <div class="settings-section">
            <h4>隐私保护</h4>

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
        </div>

      </div>
    </div>

    <div class="settings-footer">
      <button class="save-btn">保存设置</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  try {
    const tabButtons = content.querySelectorAll('.settings-tab');
    const panels = content.querySelectorAll('.settings-tab-panel');
    const setActiveTab = (tabName) => {
      try {
        tabButtons.forEach((btn) => {
          const isActive = btn.getAttribute('data-tab') === tabName;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach((panel) => {
          const isActive = panel.getAttribute('data-tab-panel') === tabName;
          panel.classList.toggle('is-active', isActive);
          panel.style.display = isActive ? 'block' : 'none';
        });
      } catch (e) {
        // ignore
      }
    };
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        if (!tabName) return;
        setActiveTab(tabName);
      });
    });
    setActiveTab('translation');
  } catch (e) {
    // ignore
  }

  // 隐私保护：读取并展示本地持久化记录
  const privacyBody = content.querySelector('#privacyRecordsBody');
  const privacyRefreshBtn = content.querySelector('#privacyRefreshBtn');
  const privacyExportBtn = content.querySelector('#privacyExportBtn');
  const privacyImportBtn = content.querySelector('#privacyImportBtn');
  const privacyClearAllBtn = content.querySelector('#privacyClearAllBtn');
  const privacyImportFile = content.querySelector('#privacyImportFile');

  const safeJsonParse = (raw, fallback) => {
    try {
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  const normalizePhoneKey = (k) => {
    const raw = String(k || '');
    if (raw.startsWith('phone:')) return raw.replace(/^phone:/, '').replace(/[^\d]/g, '');
    return raw.replace(/[^\d]/g, '');
  };

  const langLabel = (code) => {
    const raw = String(code || '').trim();
    if (!raw) return '暂无数据';
    const c0 = raw.toLowerCase();
    const c = (c0.includes('-') ? c0.split('-')[0] : c0) || c0;
    const map = {
      zh: '中文',
      en: '英文',
      ja: '日文',
      ko: '韩文',
      fr: '法语',
      de: '德语',
      es: '西班牙语',
      it: '意大利语',
      pt: '葡萄牙语',
      ru: '俄语',
      ar: '阿拉伯语',
      tr: '土耳其语',
      vi: '越南语',
      th: '泰语',
      id: '印尼语',
      ms: '马来语',
      nl: '荷兰语',
      sv: '瑞典语',
      no: '挪威语',
      da: '丹麦语',
      fi: '芬兰语',
      pl: '波兰语',
      cs: '捷克语',
      hu: '匈牙利语',
      ro: '罗马尼亚语',
      el: '希腊语',
      uk: '乌克兰语',
      fa: '波斯语',
      ur: '乌尔都语',
      hi: '印地语',
      bn: '孟加拉语',
      ta: '泰米尔语',
      te: '泰卢固语',
      ml: '马拉雅拉姆语',
      mr: '马拉地语',
      gu: '古吉拉特语',
      pa: '旁遮普语',
      sw: '斯瓦希里语',
      he: '希伯来语',
      iw: '希伯来语'
    };
    if (map[c]) return map[c];
    if (c0 === 'zh-cn' || c0 === 'zh-hans') return '中文';
    if (c0 === 'zh-tw' || c0 === 'zh-hant') return '中文（繁体）';
    return raw;
  };

  const buildCountryLabel = (item) => {
    try {
      if (!item) return '暂无数据';
      const flag = item.flag ? String(item.flag) : '';
      const name = item.name ? String(item.name) : '';
      const code = item.country ? String(item.country) : '';
      const parts = [];
      if (flag) parts.push(flag);
      if (name) parts.push(name);
      if (code) parts.push(code);
      return parts.join(' ');
    } catch (e) {
      return '暂无数据';
    }
  };

  const renderPrivacyRows = (records) => {
    try {
      if (!privacyBody) return;
      const list = Array.isArray(records) ? records : [];
      if (list.length === 0) {
        privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">暂无记录</td></tr>';
        return;
      }

      privacyBody.innerHTML = '';
      const frag = document.createDocumentFragment();
      list.forEach((r) => {
        const tr = document.createElement('tr');
        const phoneTd = document.createElement('td');
        const countryTd = document.createElement('td');
        const langTd = document.createElement('td');
        const actionTd = document.createElement('td');
        phoneTd.textContent = r.phone || '';
        countryTd.textContent = r.countryLabel || '暂无数据';
        langTd.textContent = r.langLabel || '暂无数据';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'privacy-row-btn';
        btn.textContent = '重置';
        btn.setAttribute('data-phone', r.phone || '');
        actionTd.appendChild(btn);
        tr.appendChild(phoneTd);
        tr.appendChild(countryTd);
        tr.appendChild(langTd);
        tr.appendChild(actionTd);
        frag.appendChild(tr);
      });
      privacyBody.appendChild(frag);
    } catch (e) {
      // ignore
    }
  };

  const loadPrivacyRecords = async () => {
    try {
      if (!privacyBody) return;
      privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载中...</td></tr>';

      let weatherCorrections = {};
      let weatherResolved = {};
      try {
        if (chrome?.storage?.local) {
          const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
          weatherCorrections = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
          weatherResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
        }
      } catch (e) {
        weatherCorrections = {};
        weatherResolved = {};
      }

      const langPrefsRaw = (() => {
        try { return localStorage.getItem('chatLanguagePreferences'); } catch (e) { return null; }
      })();
      const langPrefs = safeJsonParse(langPrefsRaw, {});

      const numbers = new Set();
      Object.keys(weatherCorrections || {}).forEach((k) => {
        const n = normalizePhoneKey(k);
        if (n) numbers.add(n);
      });
      Object.keys(weatherResolved || {}).forEach((k) => {
        const n = normalizePhoneKey(k);
        if (n) numbers.add(n);
      });
      Object.keys(langPrefs || {}).forEach((k) => {
        const n = normalizePhoneKey(k);
        if (n) numbers.add(n);
      });

      const list = Array.from(numbers)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)));

      // 自动回填：如果某号码存在（比如有语言偏好），但没有任何国家记录，则用区号规则即时推断并写入
      try {
        const w = window.WeatherInfo;
        if (w && typeof w.identifyCountry === 'function' && chrome?.storage?.local) {
          const updates = {};
          let count = 0;
          for (const phone of list) {
            if (count >= 200) break; // 防止一次性回填太多导致卡顿
            const hasManual = !!(weatherCorrections && (weatherCorrections[phone] || weatherCorrections[String(phone)]));
            const hasResolved = !!(weatherResolved && (weatherResolved[phone] || weatherResolved[String(phone)]));
            if (hasManual || hasResolved) continue;

            const info = w.identifyCountry(String(phone));
            if (!info || !info.country || !info.timezone) continue;
            updates[String(phone)] = {
              country: info.country,
              name: info.name,
              timezone: info.timezone,
              flag: info.flag,
              prefix: info.prefix,
              needsConfirmation: info.needsConfirmation === true,
              isAutoDetected: info.isAutoDetected === true,
              detectionMethod: info.detectionMethod,
              resolvedAt: Date.now()
            };
            count += 1;
          }

          if (Object.keys(updates).length > 0) {
            const mergedResolved = { ...(weatherResolved || {}), ...updates };
            await chrome.storage.local.set({ weatherCountryResolved: mergedResolved });
            weatherResolved = mergedResolved;

            // 同步写入内存缓存，避免本次打开设置仍显示空
            try {
              if (w.resolvedCountries && typeof w.resolvedCountries.set === 'function') {
                Object.keys(updates).forEach((k) => {
                  w.resolvedCountries.set(k, updates[k]);
                });
              }
            } catch (e2) {
              // ignore
            }
          }
        }
      } catch (e) {
        // ignore
      }

      const rows = list.map((phone) => {
        const correction = weatherCorrections && (weatherCorrections[phone] || weatherCorrections[String(phone)]);
        const resolved = weatherResolved && (weatherResolved[phone] || weatherResolved[String(phone)]);

        let lang = null;
        if (langPrefs) {
          lang = langPrefs[`phone:${phone}`] || null;
        }
        return {
          phone,
          countryLabel: buildCountryLabel(correction || resolved),
          langLabel: lang ? langLabel(lang) : '暂无数据'
        };
      });

      renderPrivacyRows(rows);
    } catch (e) {
      try {
        if (privacyBody) privacyBody.innerHTML = '<tr><td colspan="4" class="privacy-empty">加载失败</td></tr>';
      } catch (e2) {
        // ignore
      }
    }
  };

  const exportPrivacyConfig = async () => {
    try {
      let weatherCorrections = {};
      let weatherResolved = {};
      try {
        if (chrome?.storage?.local) {
          const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
          weatherCorrections = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
          weatherResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
        }
      } catch (e) {
        weatherCorrections = {};
        weatherResolved = {};
      }

      const langPrefsRaw = (() => {
        try { return localStorage.getItem('chatLanguagePreferences'); } catch (e) { return null; }
      })();
      const langPrefs = safeJsonParse(langPrefsRaw, {});

      const payload = {
        version: '3.2.1',
        exportedAt: new Date().toISOString(),
        weatherCountryCorrections: weatherCorrections || {},
        weatherCountryResolved: weatherResolved || {},
        chatLanguagePreferences: langPrefs || {}
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wa-ai-privacy-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('已导出配置', 'success');
    } catch (e) {
      console.error('导出配置失败:', e);
      showToast('导出配置失败', 'error');
    }
  };

  const importPrivacyConfigText = async (text) => {
    try {
      const data = safeJsonParse(text, null);
      if (!data || typeof data !== 'object') {
        showToast('导入失败：文件不是合法 JSON', 'error');
        return;
      }

      const incomingWeather = data.weatherCountryCorrections && typeof data.weatherCountryCorrections === 'object' ? data.weatherCountryCorrections : {};
      const incomingResolved = data.weatherCountryResolved && typeof data.weatherCountryResolved === 'object' ? data.weatherCountryResolved : {};
      const incomingLang = data.chatLanguagePreferences && typeof data.chatLanguagePreferences === 'object' ? data.chatLanguagePreferences : {};

      // 合并并覆盖同号条目
      try {
        if (chrome?.storage?.local) {
          const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
          const current = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
          const currentResolved = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
          const merged = { ...current, ...incomingWeather };
          const mergedResolved = { ...currentResolved, ...incomingResolved };
          await chrome.storage.local.set({ weatherCountryCorrections: merged, weatherCountryResolved: mergedResolved });
        }
      } catch (e) {
        // ignore
      }

      try {
        const currentRaw = (() => {
          try { return localStorage.getItem('chatLanguagePreferences'); } catch (e) { return null; }
        })();
        const current = safeJsonParse(currentRaw, {});
        const merged = { ...current, ...incomingLang };
        localStorage.setItem('chatLanguagePreferences', JSON.stringify(merged));
      } catch (e) {
        // ignore
      }

      showToast('导入成功', 'success');
      await loadPrivacyRecords();
    } catch (e) {
      console.error('导入配置失败:', e);
      showToast('导入配置失败', 'error');
    }
  };

  const removeKeysByPhone = (obj, phoneDigits) => {
    try {
      if (!obj || typeof obj !== 'object') return obj;
      const out = { ...obj };
      Object.keys(out).forEach((k) => {
        const n = normalizePhoneKey(k);
        if (n && n === phoneDigits) {
          delete out[k];
        }
      });
      return out;
    } catch (e) {
      return obj;
    }
  };

  const resetOnePhone = async (phoneDigits) => {
    try {
      const phone = String(phoneDigits || '').replace(/[^\d]/g, '');
      if (!phone) return;

      // chrome.storage.local: 删除该号码的国家记录（手动覆盖 + 自动推断）
      try {
        if (chrome?.storage?.local) {
          const res = await chrome.storage.local.get(['weatherCountryCorrections', 'weatherCountryResolved']);
          const currentC = res && res.weatherCountryCorrections ? res.weatherCountryCorrections : {};
          const currentR = res && res.weatherCountryResolved ? res.weatherCountryResolved : {};
          const nextC = removeKeysByPhone(currentC, phone);
          const nextR = removeKeysByPhone(currentR, phone);
          await chrome.storage.local.set({ weatherCountryCorrections: nextC, weatherCountryResolved: nextR });
        }
      } catch (e) {
        // ignore
      }

      // localStorage: 删除语言偏好
      try {
        const raw = (() => {
          try { return localStorage.getItem('chatLanguagePreferences'); } catch (e) { return null; }
        })();
        const prefs = safeJsonParse(raw, {});
        const next = removeKeysByPhone(prefs, phone);
        localStorage.setItem('chatLanguagePreferences', JSON.stringify(next));
      } catch (e) {
        // ignore
      }

      // 同步清理内存缓存（避免 UI 仍显示旧值）
      try {
        const w = window.WeatherInfo;
        if (w && w.userCorrections && typeof w.userCorrections.delete === 'function') {
          w.userCorrections.delete(phone);
        }
        if (w && w.resolvedCountries && typeof w.resolvedCountries.delete === 'function') {
          w.resolvedCountries.delete(phone);
        }
      } catch (e) {
        // ignore
      }

      await loadPrivacyRecords();
      showToast('已重置该号码记录', 'success');
    } catch (e) {
      showToast('重置失败', 'error');
    }
  };

  const clearAllPrivacyData = async () => {
    const ok1 = window.confirm('这将清空所有长期保存记录（国家映射、输入框语言）。此操作不可恢复，确定继续吗？');
    if (!ok1) return;
    const ok2 = window.confirm('再次确认：真的要全部清空吗？');
    if (!ok2) return;
    const phrase = window.prompt('为防止误操作，请输入：我确定全部清空');
    if (phrase !== '我确定全部清空') {
      showToast('已取消：口令不匹配', 'error');
      return;
    }

    try {
      try {
        if (chrome?.storage?.local) {
          await chrome.storage.local.remove(['weatherCountryCorrections', 'weatherCountryResolved']);
        }
      } catch (e) {
        // ignore
      }

      try {
        localStorage.removeItem('chatLanguagePreferences');
      } catch (e) {
        // ignore
      }

      try {
        const w = window.WeatherInfo;
        if (w && w.userCorrections && typeof w.userCorrections.clear === 'function') w.userCorrections.clear();
        if (w && w.resolvedCountries && typeof w.resolvedCountries.clear === 'function') w.resolvedCountries.clear();
      } catch (e) {
        // ignore
      }

      await loadPrivacyRecords();
      showToast('已全部清空', 'success');
    } catch (e) {
      showToast('全部清空失败', 'error');
    }
  };

  if (privacyRefreshBtn) {
    privacyRefreshBtn.addEventListener('click', () => {
      loadPrivacyRecords();
    });
  }
  if (privacyExportBtn) {
    privacyExportBtn.addEventListener('click', () => {
      exportPrivacyConfig();
    });
  }
  if (privacyImportBtn && privacyImportFile) {
    privacyImportBtn.addEventListener('click', () => {
      try { privacyImportFile.value = ''; } catch (e) {}
      privacyImportFile.click();
    });
    privacyImportFile.addEventListener('change', async () => {
      try {
        const file = privacyImportFile.files && privacyImportFile.files[0];
        if (!file) return;
        const text = await file.text();
        const ok = window.confirm('导入会合并并覆盖同号码的记录，确定继续吗？');
        if (!ok) return;
        await importPrivacyConfigText(text);
      } catch (e) {
        showToast('导入配置失败', 'error');
      }
    });
  }

  if (privacyClearAllBtn) {
    privacyClearAllBtn.addEventListener('click', () => {
      clearAllPrivacyData();
    });
  }

  if (privacyBody) {
    privacyBody.addEventListener('click', (e) => {
      try {
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        if (!t.classList.contains('privacy-row-btn')) return;
        const phone = t.getAttribute('data-phone') || '';
        const p = String(phone).replace(/[^\d]/g, '');
        if (!p) return;
        const ok = window.confirm(`确定要重置号码 ${p} 的记录吗？`);
        if (!ok) return;
        resetOnePhone(p);
      } catch (e2) {
        // ignore
      }
    });
  }

  // 初始加载一次
  loadPrivacyRecords();

  const attemptCloseSettingsModal = () => {
    try {
      if (settingsDirty) {
        const ok = window.confirm('设置尚未保存，确定要关闭吗？');
        if (!ok) return;
      }
      modal.remove();
    } catch (e) {
      try { modal.remove(); } catch (e2) {}
    }
  };

  content.addEventListener(
    'input',
    (e) => {
      try {
        if (settingsLoading) return;
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        const tag = (t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          settingsDirty = true;
        }
      } catch (e2) {
        // ignore
      }
    },
    true
  );
  content.addEventListener(
    'change',
    (e) => {
      try {
        if (settingsLoading) return;
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        const tag = (t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          settingsDirty = true;
        }
      } catch (e2) {
        // ignore
      }
    },
    true
  );

  // 添加事件监听
  const closeBtn = content.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    attemptCloseSettingsModal();
  });
  
  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) return;
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

  // 管理员预设
  const adminPresetBtn = content.querySelector('#adminPresetBtn');
  if (adminPresetBtn) {
    const openAdminPresetDialog = () => {
      try {
        const existing = document.querySelector('.admin-preset-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'admin-preset-overlay';
        overlay.innerHTML = `
          <div class="admin-preset-card" role="dialog" aria-modal="true">
            <div class="admin-preset-header">
              <div class="admin-preset-title">管理员预设</div>
              <button type="button" class="admin-preset-close" aria-label="关闭">×</button>
            </div>
            <div class="admin-preset-body">
              <div class="admin-preset-row">
                <label class="admin-preset-label">管理员口令</label>
                <input class="admin-preset-input" type="password" id="adminPresetPass" placeholder="请输入口令">
              </div>
              <div class="admin-preset-hint">将自动把“翻译服务”和“AI分析服务”切换到 OpenAI 通用接口，并填充 API Key / URL / 模型。</div>
            </div>
            <div class="admin-preset-footer">
              <button type="button" class="admin-preset-secondary" id="adminPresetCancel">取消</button>
              <button type="button" class="admin-preset-primary" id="adminPresetApply">应用预设</button>
            </div>
          </div>
        `;

        modal.appendChild(overlay);

        const close = () => {
          try { overlay.remove(); } catch (e) {}
        };

        const passEl = overlay.querySelector('#adminPresetPass');

        const closeBtn = overlay.querySelector('.admin-preset-close');
        const cancelBtn = overlay.querySelector('#adminPresetCancel');
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });

        const applyBtn = overlay.querySelector('#adminPresetApply');
        if (applyBtn) {
          applyBtn.addEventListener('click', () => {
            try {
              const pass = (passEl?.value || '').trim();
              if (pass !== 'Achord666') {
                showToast('口令错误', 'error');
                if (passEl) passEl.focus();
                return;
              }

              const presetApiKey = '6c9033c7e08b403abd6f66f09f146f60.hvyHTj91HZQOzT7E';
              const presetApiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
              const presetModel = 'glm-4-flash-250414';

              const translationApiSelect = document.getElementById('translationApi');
              if (translationApiSelect) {
                translationApiSelect.value = 'siliconflow';
                translationApiSelect.dispatchEvent(new Event('change'));
              }

              const apiUrlEl = document.getElementById('siliconflowApiUrl');
              if (apiUrlEl) apiUrlEl.value = presetApiUrl;

              const modelEl = document.getElementById('siliconflowModel');
              if (modelEl) modelEl.value = presetModel;

              const keyEl = document.getElementById('siliconflowApiKey');
              if (keyEl) keyEl.value = presetApiKey;

              const aiEnabledToggle = document.getElementById('aiEnabled');
              if (aiEnabledToggle) {
                aiEnabledToggle.checked = true;
                aiEnabledToggle.dispatchEvent(new Event('change'));
              }

              const aiApiSelect = document.getElementById('aiApi');
              if (aiApiSelect) {
                aiApiSelect.value = 'siliconflow';
                aiApiSelect.dispatchEvent(new Event('change'));
              }

              const apiUrlElAi = document.getElementById('siliconflowApiUrl_ai');
              if (apiUrlElAi) apiUrlElAi.value = presetApiUrl;

              const modelElAi = document.getElementById('siliconflowModel_ai');
              if (modelElAi) modelElAi.value = presetModel;

              const keyElAi = document.getElementById('siliconflowApiKey_ai');
              if (keyElAi) keyElAi.value = presetApiKey;

              showToast('已应用管理员预设', 'success');
              try {
                chrome.storage.sync.set({ quickChatUnlocked: true }, () => {
                  const quickChatToggle = document.getElementById('quickChatEnabled');
                  if (quickChatToggle) {
                    quickChatToggle.disabled = false;
                  }
                });
              } catch (e) {
                // ignore
              }
              close();
            } catch (e) {
              console.error('应用管理员预设失败:', e);
              showToast('应用管理员预设失败', 'error');
            }
          });
        }

        if (passEl) {
          passEl.focus();
          passEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const btn = overlay.querySelector('#adminPresetApply');
              if (btn) btn.click();
            }
          });
        }
      } catch (e) {
        console.error('打开管理员预设弹窗失败:', e);
        showToast('打开管理员预设弹窗失败', 'error');
      }
    };

    adminPresetBtn.addEventListener('click', openAdminPresetDialog);
  }
  
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
    settingsDirty = false;
    modal.remove();
  });

   const weatherEnabledToggle = content.querySelector('#weatherEnabled');
   const weatherOptions = content.querySelector('#weather-options');
   const weatherShowWeatherToggle = content.querySelector('#weatherShowWeather');
   const weatherShowTimeToggle = content.querySelector('#weatherShowTime');
   const weatherAllowCountryOverrideToggle = content.querySelector('#weatherAllowCountryOverride');

   const updateWeatherOptionsUI = () => {
     try {
       const enabled = weatherEnabledToggle?.checked === true;
       if (weatherOptions) weatherOptions.style.display = enabled ? 'block' : 'none';
       if (weatherShowWeatherToggle) weatherShowWeatherToggle.disabled = !enabled;
       if (weatherShowTimeToggle) weatherShowTimeToggle.disabled = !enabled;
       if (weatherAllowCountryOverrideToggle) weatherAllowCountryOverrideToggle.disabled = !enabled;
     } catch (e) {
       // ignore
     }
   };

   if (weatherEnabledToggle) {
     weatherEnabledToggle.addEventListener('change', updateWeatherOptionsUI);
   }

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
        autoTranslateNewMessages: document.getElementById('autoTranslateNewMessages').checked,
        inputQuickTranslateSend: document.getElementById('inputQuickTranslateSend')?.checked === true,
        aiEnabled: document.getElementById('aiEnabled').checked,
        quickChatEnabled: document.getElementById('quickChatEnabled')?.checked === true,
        weatherEnabled: document.getElementById('weatherEnabled')?.checked !== false,
        weatherShowWeather: document.getElementById('weatherShowWeather')?.checked !== false,
        weatherShowTime: document.getElementById('weatherShowTime')?.checked !== false,
        weatherAllowCountryOverride: document.getElementById('weatherAllowCountryOverride')?.checked === true
      };

      // 根据所选服务获取API Keys
      if (formData.translationApi === 'siliconflow') {
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
        formData.aiApi = 'siliconflow';
        formData.aiTargetLanguage = document.getElementById('aiTargetLanguage').value;
        
        // 根据所选AI服务获取API Keys
        formData.siliconflowApiKey_ai = document.getElementById('siliconflowApiKey_ai').value;
        formData.siliconflowApiUrl_ai = document.getElementById('siliconflowApiUrl_ai').value;
        formData.siliconflowModel_ai = document.getElementById('siliconflowModel_ai').value;
        
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

        // 立即同步到当前页面的运行时变量（不依赖 onChanged 事件）
        autoTranslateNewMessagesEnabled = formData.autoTranslateNewMessages === true;
        if (autoTranslateNewMessagesEnabled) {
          try {
            if (window.WAAP?.presenters?.autoTranslatePresenter?.setEnabled) {
              window.WAAP.presenters.autoTranslatePresenter.setEnabled(true);
            }
          } catch (e) {
            // ignore
          }
          try {
            if (window.WAAP?.presenters?.autoTranslatePresenter?.scheduleOnChatEnter) {
              window.WAAP.presenters.autoTranslatePresenter.scheduleOnChatEnter();
            } else {
              scheduleAutoTranslateOnChatEnter();
            }
          } catch (e) {
            scheduleAutoTranslateOnChatEnter();
          }
        } else {
          try {
            if (window.WAAP?.presenters?.autoTranslatePresenter?.setEnabled) {
              window.WAAP.presenters.autoTranslatePresenter.setEnabled(false);
            }
          } catch (e) {
            // ignore
          }
        }

         weatherInfoEnabled = formData.weatherEnabled !== false;
         if (!weatherInfoEnabled) {
           try {
             if (typeof window.WeatherInfo !== 'undefined' && typeof window.WeatherInfo.hideWeatherInfo === 'function') {
               window.WeatherInfo.hideWeatherInfo();
             }
           } catch (e) {
             // ignore
           }
         } else {
           try {
             integrateWeatherInfo({ force: true });
           } catch (e) {
             // ignore
           }
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
        'autoTranslateNewMessages',
        'inputQuickTranslateSend',
        'aiEnabled',
        'aiApi',
        'aiTargetLanguage',
        'siliconflowApiKey',
        'siliconflowApiUrl',
        'siliconflowModel',
        // OpenAI高级设置
        'openaiTemperature',
        'openaiReasoningEnabled',
        // AI服务API Keys
        'siliconflowApiKey_ai',
        'siliconflowApiUrl_ai',
        'siliconflowModel_ai',
        // 系统角色
        'systemRole',
        'quickChatEnabled',
        'quickChatUnlocked',
        'weatherEnabled',
        'weatherShowWeather',
        'weatherShowTime',
        'weatherAllowCountryOverride'
      ], (data) => {
        // 检查chrome API是否可用
        if (chrome.runtime.lastError) {
          console.error('获取设置时出错:', chrome.runtime.lastError);
          showExtensionInvalidatedError();
          settingsLoading = false;
          settingsDirty = false;
          return;
        }
        
        // 设置翻译服务选项
        if (data.translationApi) {
          const allowedTranslationApi = data.translationApi === 'siliconflow' ? 'siliconflow' : 'google';
          document.getElementById('translationApi').value = allowedTranslationApi;
          
          // 根据选择的翻译服务显示对应的设置项
          document.querySelectorAll('#translation-settings .api-setting-group').forEach(el => {
            el.style.display = 'none';
          });
          
          const settingsEl = document.getElementById(`${allowedTranslationApi}-settings`);
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

        const autoTranslateToggle = document.getElementById('autoTranslateNewMessages');
        if (autoTranslateToggle) {
          autoTranslateToggle.checked = data.autoTranslateNewMessages === true;
        }

        const quickSendToggle = document.getElementById('inputQuickTranslateSend');
        if (quickSendToggle) {
          quickSendToggle.checked = data.inputQuickTranslateSend === true;
        }

        try {
          const quickChatToggle = document.getElementById('quickChatEnabled');
          if (quickChatToggle) {
            const unlocked = data.quickChatUnlocked === true;
            quickChatToggle.checked = unlocked && (data.quickChatEnabled === true);
            quickChatToggle.disabled = !unlocked;
          }
        } catch (e) {
          // ignore
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
            aiApiSelect.value = 'siliconflow';
            
            // 隐藏所有AI服务设置
            document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
              el.style.display = 'none';
            });
            
            // 显示当前选中的服务设置
            const aiSettingsEl = document.getElementById('ai-siliconflow-settings');
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

         try {
           const enabled = data.weatherEnabled !== false;
           const showWeather = data.weatherShowWeather !== false;
           const showTime = data.weatherShowTime !== false;
           const allowOverride = data.weatherAllowCountryOverride === true;

           const weatherEnabledEl = document.getElementById('weatherEnabled');
           if (weatherEnabledEl) weatherEnabledEl.checked = enabled;

           const weatherShowWeatherEl = document.getElementById('weatherShowWeather');
           if (weatherShowWeatherEl) weatherShowWeatherEl.checked = showWeather;

           const weatherShowTimeEl = document.getElementById('weatherShowTime');
           if (weatherShowTimeEl) weatherShowTimeEl.checked = showTime;

           const weatherAllowOverrideEl = document.getElementById('weatherAllowCountryOverride');
           if (weatherAllowOverrideEl) weatherAllowOverrideEl.checked = allowOverride;

           updateWeatherOptionsUI();
         } catch (e) {
           // ignore
         }
        
        // 如果AI功能启用，手动触发一次AI服务选择的change事件
        if (data.aiEnabled === true) {
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            const changeEvent = new Event('change');
            aiApiSelect.dispatchEvent(changeEvent);
          }
        }

        settingsDirty = false;
        setTimeout(() => {
          settingsLoading = false;
        }, 0);
      });
    } catch (error) {
      console.error('加载设置时发生异常:', error);
      showExtensionInvalidatedError();
      settingsLoading = false;
      settingsDirty = false;
    }
  }

  // 加载已保存的设置
  loadSettings();
}
