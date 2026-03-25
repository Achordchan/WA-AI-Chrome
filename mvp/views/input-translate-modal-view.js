/*
用途：输入框翻译（input-translate.js）模态框/弹窗 UI 的 MVP View。
说明：把 createTranslateModal / createTranslatePopup 的 DOM 构建与样式注入收敛到 WAAP.views，
      让 input-translate.js 更接近 orchestrator；legacy 仅作为兜底。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.inputTranslateModalView) return;

  function ensureStyleInjected(doc, styleId, cssText) {
    try {
      if (!doc || !doc.head) return;
      if (styleId && doc.getElementById(styleId)) return;
      const style = doc.createElement('style');
      if (styleId) style.id = styleId;
      style.textContent = cssText;
      doc.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  }

  function createTranslatePopup(button, inputText, deps = {}) {
    try {
      const doc = deps.document || window.document;
      const translateText = deps.translateText;
      const getQuickSendState = deps.getQuickSendState;

      const popup = doc.createElement('div');
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
        <button class="translate-popup-translate-btn">翻译</button>
        <button class="translate-popup-verify-btn" style="display: none">验证翻译</button>
        <button class="translate-popup-apply-btn" style="display: none">应用</button>
      </div>
    </div>
  `;

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

      ensureStyleInjected(doc, 'waap-input-translate-popup-style', styles);

      popup.querySelector('.translate-popup-close').onclick = () => {
        popup.remove();
      };

      let currentTranslation = '';
      const translateBtn = popup.querySelector('.translate-popup-translate-btn');
      const verifyBtn = popup.querySelector('.translate-popup-verify-btn');
      const applyBtn = popup.querySelector('.translate-popup-apply-btn');
      const resultDiv = popup.querySelector('.translate-result');
      const verifyDiv = popup.querySelector('.translate-verify');
      const verifyText = popup.querySelector('.translate-verify-text');

      translateBtn.onclick = async () => {
        const targetLang = popup.querySelector('.translate-lang-select').value;
        translateBtn.disabled = true;
        translateBtn.textContent = '翻译中...';

        try {
          if (typeof translateText !== 'function') throw new Error('翻译函数不可用');
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

      verifyBtn.onclick = async () => {
        verifyBtn.disabled = true;
        verifyBtn.textContent = '验证中...';
        verifyDiv.style.display = 'block';

        try {
          if (typeof translateText !== 'function') throw new Error('翻译函数不可用');
          const verification = await translateText(currentTranslation, 'auto');
          verifyText.textContent = verification;
        } catch (error) {
          verifyText.textContent = '验证失败: ' + error.message;
        } finally {
          verifyBtn.disabled = false;
          verifyBtn.textContent = '验证翻译';
        }
      };

      applyBtn.onclick = () => {
        const inputBox = doc.querySelector('div[contenteditable="true"]');
        if (inputBox && currentTranslation) {
          inputBox.textContent = currentTranslation;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));

          try {
            if (typeof getQuickSendState === 'function') {
              const state = getQuickSendState(inputBox);
              state.stage = 'translated_ready';
              state.sourceTextAtTranslate = '';
              state.appliedText = (inputBox.textContent || '').trim() || String(currentTranslation || '').trim();
            }
          } catch (e) {
            // ignore
          }
        }
        popup.remove();
      };

      return popup;
    } catch (e) {
      return null;
    }
  }

  async function createTranslateModal(text, inputBox, options = {}, deps = {}) {
    try {
      const doc = deps.document || window.document;
      const setTimeoutFn = deps.setTimeout || window.setTimeout;
      const modalTranslation = deps.modalTranslation;
      const verifyTranslation = deps.verifyTranslation;
      const getRememberedLanguage = deps.getRememberedLanguage;
      const rememberLanguageChoice = deps.rememberLanguageChoice;
      const getChatLanguagePreferenceKey = deps.getChatLanguagePreferenceKey;
      const LANGUAGE_OPTIONS = deps.LANGUAGE_OPTIONS;
      const langMatchesQuery = deps.langMatchesQuery;
      const getQuickSendState = deps.getQuickSendState;

      const toast = (message, type = 'info', durationMs = 1200) => {
        try {
          if (typeof window.showToast === 'function') {
            window.showToast(message, type, durationMs);
            return;
          }
        } catch (e) {
          // ignore
        }

        try {
          const t = doc.createElement('div');
          t.className = `translate-toast${type === 'error' ? ' translate-toast-error' : ''}`;
          t.textContent = String(message || '');
          doc.body.appendChild(t);
          setTimeoutFn(() => t.remove(), durationMs);
        } catch (e) {
          // ignore
        }
      };

      const toastError = (message, code) => {
        toast(code ? `${message} (${code})` : message, 'error', 3000);
      };

      const chatWindow = doc.getElementById('main') || inputBox.closest('.app-wrapper-web');
      const rememberedLang = typeof getRememberedLanguage === 'function' ? await getRememberedLanguage(chatWindow) : 'en';

      const normalizeTextForCompare = (value) =>
        String(value || '')
          .replace(/\u00A0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const currentInputText = String(inputBox?.textContent || '').trim();
      let modalSourceText = String(text || '').trim();
      let currentTranslationText = '';

      try {
        if (typeof getQuickSendState === 'function') {
          const quickSendState = getQuickSendState(inputBox);
          const currentNorm = normalizeTextForCompare(currentInputText);
          const appliedNorm = normalizeTextForCompare(quickSendState?.appliedText);
          if (
            quickSendState?.stage === 'translated_ready' &&
            quickSendState?.sourceTextAtTranslate &&
            currentNorm &&
            appliedNorm &&
            currentNorm === appliedNorm
          ) {
            modalSourceText = String(quickSendState.sourceTextAtTranslate || '').trim() || modalSourceText;
            currentTranslationText = currentInputText;
          }
        }
      } catch (e) {
        // ignore
      }

      const hasSourceText = modalSourceText.length > 0;
      const hideSource = options && options.hideSource === true;
      const showSource = hasSourceText && !hideSource;
      const showVerify = showSource;
      const languageOnlyMode = !hasSourceText;
      const hasCurrentTranslation = currentTranslationText.length > 0;

      const sourceSectionHtml = showSource
        ? `
        <div class="source-text">
          <div class="text-label">原文</div>
          <div class="text-content">${modalSourceText}</div>
        </div>
      `
        : '';

      const verifySectionHtml = showVerify
        ? `
        <div class="verify-result" style="display: none">
          <div class="text-label">验证结果（反向翻译 默认Google）</div>
          <div class="verify-content"></div>
        </div>
      `
        : '';

      const verifyButtonHtml = showVerify ? `<button class="modal-verify-btn" style="display: none">验证</button>` : '';

      const contactKey = typeof getChatLanguagePreferenceKey === 'function' ? getChatLanguagePreferenceKey(chatWindow) : '';
      const contactNumber = contactKey && contactKey.startsWith('phone:') ? contactKey.replace(/^phone:/, '') : '';
      const contactDisplay = contactNumber || contactKey || '未知';

      const identitySectionHtml = languageOnlyMode
        ? `
        <div class="source-text">
          <div class="text-label">当前对方号码</div>
          <div class="text-content">${contactDisplay}</div>
        </div>
      `
        : '';

      const modal = doc.createElement('div');
      modal.className = 'translate-modal';
      modal.innerHTML = `
    <div class="translate-modal-content">
      <div class="translate-modal-header">
        <h3>翻译</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="translate-modal-body">
        ${identitySectionHtml}
        ${sourceSectionHtml}
        <div class="target-lang">
          <div class="text-label">目标语言</div>
          <button class="lang-picker-trigger" type="button">选择目标语言</button>
        </div>
        <div class="quick-send-setting">
          <div class="quick-send-label">快捷翻译</div>
          <label class="quick-send-switch">
            <input type="checkbox" class="quick-send-toggle">
            <span class="quick-send-slider"></span>
          </label>
        </div>
        <div class="wa-lang-picker-overlay" style="display:none;">
          <div class="wa-lang-picker-panel" role="dialog" aria-modal="true">
            <div class="wa-lang-picker-header">
              <div class="wa-lang-picker-title">选择目标语言</div>
              <button class="wa-lang-picker-close" type="button" aria-label="关闭">×</button>
            </div>
            <div class="wa-lang-picker-search-wrap">
              <input class="wa-lang-picker-search" type="text" placeholder="搜索：中文 / English / 语言代码 / 拼音首字母" />
            </div>
            <div class="wa-lang-picker-list" role="listbox"></div>
          </div>
        </div>
        ${
          languageOnlyMode
            ? ''
            : `
        <div class="translation-result" style="${hasCurrentTranslation ? '' : 'display:none'}">
          <div class="text-label">翻译结果</div>
          <div class="result-content">${currentTranslationText}</div>
        </div>
        ${verifySectionHtml}
        `
        }
      </div>
      <div class="translate-modal-footer">
        ${languageOnlyMode ? `<button class="save-lang-btn">保存</button>` : `<button class="modal-translate-btn">翻译</button>`}
        ${languageOnlyMode ? '' : verifyButtonHtml}
        ${languageOnlyMode ? '' : `<button class="modal-apply-btn" disabled>应用</button>`}
      </div>
    </div>
  `;

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

    .quick-send-setting {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid #e9edef;
      border-radius: 8px;
      background: #f8f9fa;
    }

    .quick-send-label {
      color: #41525d;
      font-size: 13px;
      font-weight: 500;
    }

    .quick-send-switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }

    .quick-send-toggle {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .quick-send-slider {
      position: absolute;
      inset: 0;
      cursor: pointer;
      background: #ccd0d5;
      border-radius: 999px;
      transition: 0.2s;
    }

    .quick-send-slider:before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: #fff;
      border-radius: 50%;
      transition: 0.2s;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .quick-send-toggle:checked + .quick-send-slider {
      background: #00a884;
    }

    .quick-send-toggle:checked + .quick-send-slider:before {
      transform: translateX(16px);
    }

    .lang-picker-trigger {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e9edef;
      border-radius: 12px;
      color: #41525d;
      font-size: 13px;
      background: white;
      box-sizing: border-box;
      transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
      text-align: left;
      cursor: pointer;
    }

    .lang-picker-trigger:hover {
      border-color: rgba(0, 168, 132, 0.65);
      background: rgba(0, 168, 132, 0.03);
    }

    .lang-picker-trigger:focus {
      outline: none;
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.12);
    }

    .wa-lang-picker-overlay {
      position: absolute;
      inset: 0;
      z-index: 1000001;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(11, 20, 26, 0.18);
      backdrop-filter: blur(2px);
      border-radius: 8px;
    }

    .wa-lang-picker-overlay, .wa-lang-picker-overlay * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .wa-lang-picker-panel {
      width: min(480px, calc(100% - 24px));
      max-height: min(560px, calc(100% - 24px));
      background: white;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(11, 20, 26, 0.18);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .wa-lang-picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .wa-lang-picker-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(17, 24, 39, 0.92);
    }

    .wa-lang-picker-close {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.10);
      background: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      font-size: 18px;
      line-height: 26px;
      color: rgba(17, 24, 39, 0.70);
    }

    .wa-lang-picker-search-wrap {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .wa-lang-picker-search {
      width: 100%;
      border: 1px solid rgba(0, 0, 0, 0.10);
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 13px;
      outline: none;
    }

    .wa-lang-picker-list {
      padding: 10px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .wa-lang-picker-item {
      width: 100%;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 10px 12px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      cursor: pointer;
      text-align: left;
    }

    .wa-lang-picker-item:hover {
      border-color: rgba(0, 168, 132, 0.40);
      box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.12);
    }

    .wa-lang-picker-name {
      font-size: 13px;
      color: rgba(17, 24, 39, 0.88);
    }

    .wa-lang-picker-code {
      font-size: 12px;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.42);
    }

    .wa-lang-picker-empty {
      padding: 10px;
      font-size: 12px;
      color: rgba(17, 24, 39, 0.60);
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

    .modal-translate-btn {
      background: #00a884;
      color: white;
    }

    .modal-apply-btn {
      background: #8696a0;
      color: white;
    }

    .modal-apply-btn:disabled {
      background: #e9edef;
      color: #8696a0;
      cursor: not-allowed;
    }

    button:hover:not(:disabled) {
      opacity: 0.9;
    }

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

    .modal-verify-btn {
      background: #f0f2f5;
      color: #41525d;
      border: 1px solid #e9edef;
    }

    .modal-verify-btn:hover {
      background: #e9edef;
    }

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

      ensureStyleInjected(doc, 'waap-input-translate-modal-style', styles);

      const closeBtn = modal.querySelector('.modal-close');
      const translateBtn = modal.querySelector('.modal-translate-btn');
      const verifyBtn = modal.querySelector('.modal-verify-btn');
      const applyBtn = modal.querySelector('.modal-apply-btn');
      const saveLangBtn = modal.querySelector('.save-lang-btn');
      const translationResult = modal.querySelector('.translation-result');
      const resultContent = modal.querySelector('.result-content');
      const langTrigger = modal.querySelector('.lang-picker-trigger');
      const langPickerOverlay = modal.querySelector('.wa-lang-picker-overlay');
      const langPickerClose = modal.querySelector('.wa-lang-picker-close');
      const langPickerSearch = modal.querySelector('.wa-lang-picker-search');
      const langPickerList = modal.querySelector('.wa-lang-picker-list');
      const quickSendToggle = modal.querySelector('.quick-send-toggle');
      const verifyResult = modal.querySelector('.verify-result');
      const verifyContent = modal.querySelector('.verify-content');

      let selectedLang = rememberedLang || 'en';
      let quickSendStorageListener = null;

      const getLangLabel = (code) => {
        const item = Array.isArray(LANGUAGE_OPTIONS) ? LANGUAGE_OPTIONS.find((l) => l.code === code) : null;
        if (!item) return code;
        return `${item.zh}${item.en ? ` (${item.en})` : ''}`;
      };

      const setSelectedLang = (code) => {
        selectedLang = code;
        if (langTrigger) langTrigger.textContent = getLangLabel(code);
        if (!languageOnlyMode && typeof rememberLanguageChoice === 'function') {
          rememberLanguageChoice(chatWindow, code);
        }
      };

      const openPicker = () => {
        if (!langPickerOverlay) return;
        langPickerOverlay.style.display = 'flex';
        if (langPickerSearch) {
          langPickerSearch.value = '';
          renderPicker('');
          try {
            langPickerSearch.focus();
          } catch (e) {
            // ignore
          }
        }
      };

      const closePicker = () => {
        if (!langPickerOverlay) return;
        langPickerOverlay.style.display = 'none';
      };

      const renderPicker = (filterText = '') => {
        if (!langPickerList) return;
        const list = Array.isArray(LANGUAGE_OPTIONS)
          ? LANGUAGE_OPTIONS.filter((l) => (typeof langMatchesQuery === 'function' ? langMatchesQuery(l, filterText) : true))
          : [];

        if (!list.length) {
          langPickerList.innerHTML = '<div class="wa-lang-picker-empty">无匹配语言</div>';
          return;
        }

        langPickerList.innerHTML = list
          .map((l) => {
            return `<button type="button" class="wa-lang-picker-item" data-code="${l.code}">
              <span class="wa-lang-picker-name">${l.zh}${l.en ? ` (${l.en})` : ''}</span>
              <span class="wa-lang-picker-code">${l.code}</span>
            </button>`;
          })
          .join('');
      };

      const onDocMouseDown = (e) => {
        if (!modal.contains(e.target)) {
          closePicker();
        }
      };

      doc.addEventListener('mousedown', onDocMouseDown, true);

      try {
        const chromeRef = window.chrome;
        if (chromeRef?.storage?.sync && quickSendToggle) {
          chromeRef.storage.sync.get(['inputQuickTranslateSend'], (data) => {
            quickSendToggle.checked = data.inputQuickTranslateSend === true;
          });

          quickSendToggle.addEventListener('change', () => {
            try {
              chromeRef.storage.sync.set({
                inputQuickTranslateSend: quickSendToggle.checked === true
              });
            } catch (e) {
              // ignore
            }
          });

          if (chromeRef.storage?.onChanged) {
            quickSendStorageListener = (changes, areaName) => {
              if (areaName !== 'sync' || !changes.inputQuickTranslateSend) return;
              quickSendToggle.checked = changes.inputQuickTranslateSend.newValue === true;
            };
            chromeRef.storage.onChanged.addListener(quickSendStorageListener);
          }
        }
      } catch (e) {
        // ignore
      }

      closeBtn.onclick = () => {
        doc.removeEventListener('mousedown', onDocMouseDown, true);
        try {
          if (quickSendStorageListener && window.chrome?.storage?.onChanged?.removeListener) {
            window.chrome.storage.onChanged.removeListener(quickSendStorageListener);
          }
        } catch (e) {
          // ignore
        }
        modal.remove();
      };

      setSelectedLang(selectedLang);
      renderPicker('');

      if (langTrigger) {
        langTrigger.addEventListener('click', () => {
          renderPicker('');
          openPicker();
        });
      }

      if (langPickerClose) {
        langPickerClose.addEventListener('click', closePicker);
      }

      if (langPickerOverlay) {
        langPickerOverlay.addEventListener('click', (e) => {
          if (e.target === langPickerOverlay) closePicker();
        });
      }

      if (langPickerSearch) {
        langPickerSearch.addEventListener('input', (e) => {
          renderPicker(e.target.value);
        });
        langPickerSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            closePicker();
          }
        });
      }

      if (langPickerList) {
        langPickerList.addEventListener('click', (e) => {
          const item = e.target.closest('.wa-lang-picker-item');
          if (!item) return;
          setSelectedLang(item.getAttribute('data-code'));
          closePicker();
        });
      }

      if (saveLangBtn) {
        saveLangBtn.onclick = () => {
          try {
            if (typeof rememberLanguageChoice === 'function') {
              rememberLanguageChoice(chatWindow, selectedLang);
            }
            toast('已保存', 'success', 900);
            doc.removeEventListener('mousedown', onDocMouseDown, true);
            try {
              if (quickSendStorageListener && window.chrome?.storage?.onChanged?.removeListener) {
                window.chrome.storage.onChanged.removeListener(quickSendStorageListener);
              }
            } catch (e) {
              // ignore
            }
            modal.remove();
          } catch (e) {
            toastError('保存失败');
          }
        };
      }

      if (translateBtn)
        translateBtn.onclick = async () => {
          try {
            translateBtn.classList.add('btn-loading');
            const targetLang = selectedLang;

            const liveText = (inputBox?.textContent || '').trim();
            const requestSourceText = currentTranslationText ? modalSourceText : liveText || modalSourceText;
            if (!requestSourceText) {
              toast('请输入要翻译的内容', 'info', 1200);
              return;
            }

            if (typeof modalTranslation !== 'function') throw new Error('翻译函数不可用');
            const translation = await modalTranslation(requestSourceText, targetLang, 'normal');

            if (translation && typeof translation === 'object') {
              if (translation.hasThinking) {
                resultContent.textContent = translation.translation;
              } else {
                try {
                  const v = typeof translation.valueOf === 'function' ? translation.valueOf() : null;
                  if (typeof v === 'string') {
                    resultContent.textContent = v;
                  } else {
                    resultContent.textContent = String(translation);
                  }
                } catch (e) {
                  resultContent.textContent = String(translation);
                }
              }
            } else {
              resultContent.textContent = translation;
            }

            if (translationResult) translationResult.style.display = 'block';
            if (verifyBtn) verifyBtn.style.display = 'inline-block';
            applyBtn.disabled = false;
            if (verifyResult) verifyResult.style.display = 'none';

            if (typeof rememberLanguageChoice === 'function') {
              rememberLanguageChoice(chatWindow, targetLang);
            }
          } catch (error) {
            if (translationResult) translationResult.style.display = 'block';
            resultContent.textContent = '翻译失败: ' + (error.message || '未知错误');
            toastError('翻译失败: ' + (error.message || '未知错误'), 'MODAL_TRANSLATION_ERROR');
          } finally {
            translateBtn.classList.remove('btn-loading');
          }
        };

      if (verifyBtn)
        verifyBtn.onclick = async () => {
          try {
            verifyBtn.classList.add('btn-loading');
            const translatedText = resultContent.textContent;
            const currentLang = selectedLang;
            const originalLang = currentLang === 'en' ? 'zh' : 'en';

            if (typeof verifyTranslation !== 'function') throw new Error('验证函数不可用');
            const verification = await verifyTranslation(translatedText, originalLang, currentLang);
            if (verifyContent) verifyContent.textContent = verification;
            if (verifyResult) verifyResult.style.display = 'block';
          } catch (error) {
            if (verifyContent) verifyContent.textContent = '验证失败: ' + error.message;
            if (verifyResult) verifyResult.style.display = 'block';
          } finally {
            verifyBtn.classList.remove('btn-loading');
          }
        };

      if (applyBtn)
        applyBtn.onclick = async () => {
          const translation = resultContent.textContent;
          if (!translation) return;

          try {
            const footer = doc.querySelector('footer._ak1i');
            if (!footer) throw new Error('未找到输入框容器');

            const richTextInput = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
            if (!richTextInput) throw new Error('未找到输入框');

            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

            richTextInput.focus();

            const selectAll = new KeyboardEvent('keydown', {
              key: 'a',
              code: 'KeyA',
              ctrlKey: !isMac,
              metaKey: isMac,
              bubbles: true
            });
            richTextInput.dispatchEvent(selectAll);

            const backspace = new KeyboardEvent('keydown', {
              key: 'Backspace',
              code: 'Backspace',
              bubbles: true
            });
            richTextInput.dispatchEvent(backspace);

            await navigator.clipboard.writeText(translation);

            const paste = new KeyboardEvent('keydown', {
              key: 'v',
              code: 'KeyV',
              ctrlKey: !isMac,
              metaKey: isMac,
              bubbles: true
            });
            richTextInput.dispatchEvent(paste);

            const inputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertFromPaste',
              data: translation
            });
            richTextInput.dispatchEvent(inputEvent);

            try {
              if (typeof getQuickSendState === 'function') {
                const state = getQuickSendState(richTextInput);
                state.stage = 'translated_ready';
                state.sourceTextAtTranslate = '';
                state.appliedText = (richTextInput.textContent || '').trim() || String(translation || '').trim();
              }
            } catch (e) {
              // ignore
            }

            try {
              if (quickSendStorageListener && window.chrome?.storage?.onChanged?.removeListener) {
                window.chrome.storage.onChanged.removeListener(quickSendStorageListener);
              }
            } catch (e) {
              // ignore
            }
            modal.remove();
          } catch (error) {
            alert('应用翻译结果失败: ' + error.message);
          }
        };

      modal.onclick = (e) => {
        e.stopPropagation();
      };

      return modal;
    } catch (e) {
      return null;
    }
  }

  window.WAAP.views.inputTranslateModalView = {
    createTranslatePopup,
    createTranslateModal
  };
})();
