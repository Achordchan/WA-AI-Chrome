/*
用途：输入框翻译（input-translate.js）模态框/弹窗 UI 的 legacy 组件。
说明：把 createTranslateModal / createTranslatePopup 的 DOM 构建与样式注入从 input-translate.js 中抽离，便于主文件瘦身；保持可回滚。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.inputTranslateModalFallback) return;

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

  // 创建翻译选项弹窗
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
        <button class="translate-btn">翻译</button>
        <button class="verify-btn" style="display: none">验证翻译</button>
        <button class="apply-btn" style="display: none">应用</button>
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
      const translateBtn = popup.querySelector('.translate-btn');
      const verifyBtn = popup.querySelector('.verify-btn');
      const applyBtn = popup.querySelector('.apply-btn');
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

  // 修改创建模态框的函数
  function createTranslateModal(text, inputBox, options = {}, deps = {}) {
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

      const toastFallback = window.WAAP?.legacy?.inputTranslateToastFallback;
      const toast = (message, type = 'info', durationMs = 1200) => {
        try {
          if (type === 'success' && typeof window.showToast === 'function') {
            window.showToast(message, 'success', durationMs);
            return;
          }
        } catch (e) {
          // ignore
        }

        try {
          if (toastFallback?.showToast) {
            toastFallback.showToast(message, type, durationMs, {
              document: doc,
              setTimeout: setTimeoutFn
            });
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
        try {
          if (toastFallback?.showTranslationError) {
            toastFallback.showTranslationError(message, code, {
              document: doc,
              setTimeout: setTimeoutFn
            });
            return;
          }
        } catch (e) {
          // ignore
        }
        toast(code ? `${message} (${code})` : message, 'error', 3000);
      };

      // 获取当前聊天窗口
      const chatWindow = doc.getElementById('main') || inputBox.closest('.app-wrapper-web');
      // 获取记忆的语言选择
      const rememberedLang = typeof getRememberedLanguage === 'function' ? getRememberedLanguage(chatWindow) : 'en';

      const hasSourceText = (text || '').trim().length > 0;
      const hideSource = options && options.hideSource === true;
      const showSource = hasSourceText && !hideSource;
      const showVerify = showSource;
      const languageOnlyMode = !hasSourceText;

      const sourceSectionHtml = showSource
        ? `
        <div class="source-text">
          <div class="text-label">原文</div>
          <div class="text-content">${text}</div>
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

      const verifyButtonHtml = showVerify ? `<button class="verify-btn" style="display: none">验证</button>` : '';

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
          <div class="lang-combobox" role="combobox" aria-expanded="false">
            <input class="lang-combobox-input" type="text" autocomplete="off" spellcheck="false" placeholder="选择目标语言（支持中文 / English / 代码 / 拼音缩写）" />
            <div class="lang-combobox-dropdown" style="display:none"></div>
          </div>
        </div>
        ${
          languageOnlyMode
            ? ''
            : `
        <div class="translation-result">
          <div class="text-label">翻译结果</div>
          <div class="result-content"></div>
        </div>
        ${verifySectionHtml}
        `
        }
      </div>
      <div class="translate-modal-footer">
        ${languageOnlyMode ? `<button class="save-lang-btn">保存</button>` : `<button class="translate-btn">翻译</button>`}
        ${languageOnlyMode ? '' : verifyButtonHtml}
        ${languageOnlyMode ? '' : `<button class="apply-btn" disabled>应用</button>`}
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

    .lang-combobox {
      position: relative;
    }

    .lang-combobox-input {
      width: 100%;
      padding: 8px 34px 8px 10px;
      border: 1px solid #e9edef;
      border-radius: 8px;
      color: #41525d;
      font-size: 13px;
      background: white;
      box-sizing: border-box;
      transition: box-shadow 0.2s, border-color 0.2s;
    }

    .lang-combobox-input:hover {
      border-color: rgba(0, 168, 132, 0.65);
    }

    .lang-combobox-input:focus {
      outline: none;
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.12);
    }

    .lang-combobox::after {
      content: '';
      position: absolute;
      right: 10px;
      top: 50%;
      width: 12px;
      height: 12px;
      transform: translateY(-50%);
      opacity: 0.7;
      background: no-repeat center / contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23667781' d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    .lang-combobox-dropdown {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 6px);
      background: white;
      border: 1px solid #e9edef;
      border-radius: 10px;
      box-shadow: 0 12px 28px rgba(11, 20, 26, 0.18);
      overflow: hidden;
      z-index: 1000000;
      max-height: 240px;
      overflow-y: auto;
    }

    .lang-combobox-item {
      padding: 10px 10px;
      font-size: 13px;
      color: #41525d;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .lang-combobox-item .muted {
      color: #8696a0;
      font-size: 12px;
    }

    .lang-combobox-item:hover {
      background: rgba(0, 168, 132, 0.08);
    }

    .lang-combobox-item.active {
      background: rgba(0, 168, 132, 0.14);
    }

    .lang-combobox-empty {
      padding: 10px 10px;
      font-size: 12px;
      color: #8696a0;
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

    .translate-btn {
      background: #00a884;
      color: white;
    }

    .apply-btn {
      background: #8696a0;
      color: white;
    }

    .apply-btn:disabled {
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

    .verify-btn {
      background: #f0f2f5;
      color: #41525d;
      border: 1px solid #e9edef;
    }

    .verify-btn:hover {
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
      const translateBtn = modal.querySelector('.translate-btn');
      const verifyBtn = modal.querySelector('.verify-btn');
      const applyBtn = modal.querySelector('.apply-btn');
      const saveLangBtn = modal.querySelector('.save-lang-btn');
      const resultContent = modal.querySelector('.result-content');
      const langCombo = modal.querySelector('.lang-combobox');
      const langInput = modal.querySelector('.lang-combobox-input');
      const langDropdown = modal.querySelector('.lang-combobox-dropdown');
      const verifyResult = modal.querySelector('.verify-result');
      const verifyContent = modal.querySelector('.verify-content');

      let selectedLang = rememberedLang || 'en';
      let filteredList = [];
      let activeIndex = -1;

      const getLangLabel = (code) => {
        const item = Array.isArray(LANGUAGE_OPTIONS) ? LANGUAGE_OPTIONS.find((l) => l.code === code) : null;
        if (!item) return code;
        return `${item.zh}${item.en ? ` (${item.en})` : ''}`;
      };

      const setSelectedLang = (code) => {
        selectedLang = code;
        if (langInput) langInput.value = getLangLabel(code);
        if (!languageOnlyMode && typeof rememberLanguageChoice === 'function') {
          rememberLanguageChoice(chatWindow, code);
        }
      };

      const openDropdown = () => {
        if (!langDropdown || !langCombo) return;
        langDropdown.style.display = 'block';
        langCombo.setAttribute('aria-expanded', 'true');
      };

      const closeDropdown = () => {
        if (!langDropdown || !langCombo) return;
        langDropdown.style.display = 'none';
        langCombo.setAttribute('aria-expanded', 'false');
      };

      const renderDropdown = (filterText = '') => {
        if (!langDropdown) return;
        const list = Array.isArray(LANGUAGE_OPTIONS)
          ? LANGUAGE_OPTIONS.filter((l) => (typeof langMatchesQuery === 'function' ? langMatchesQuery(l, filterText) : true))
          : [];
        filteredList = list;

        if (!list.length) {
          activeIndex = -1;
          langDropdown.innerHTML = '<div class="lang-combobox-empty">无匹配语言</div>';
          return;
        }

        const selectedIdx = list.findIndex((l) => l.code === selectedLang);
        activeIndex = selectedIdx >= 0 ? selectedIdx : 0;

        langDropdown.innerHTML = list
          .map((l, idx) => {
            const active = idx === activeIndex ? ' active' : '';
            return `<div class="lang-combobox-item${active}" data-code="${l.code}"><span>${l.zh}${l.en ? ` (${l.en})` : ''}</span><span class="muted">${l.code}</span></div>`;
          })
          .join('');
      };

      const ensureActiveVisible = () => {
        if (!langDropdown) return;
        const activeEl = langDropdown.querySelector('.lang-combobox-item.active');
        if (!activeEl) return;
        const top = activeEl.offsetTop;
        const bottom = top + activeEl.offsetHeight;
        if (top < langDropdown.scrollTop) {
          langDropdown.scrollTop = top;
        } else if (bottom > langDropdown.scrollTop + langDropdown.clientHeight) {
          langDropdown.scrollTop = bottom - langDropdown.clientHeight;
        }
      };

      const highlightActive = () => {
        if (!langDropdown) return;
        const items = Array.from(langDropdown.querySelectorAll('.lang-combobox-item'));
        items.forEach((el, idx) => {
          if (idx === activeIndex) el.classList.add('active');
          else el.classList.remove('active');
        });
        ensureActiveVisible();
      };

      const pickActive = () => {
        if (activeIndex < 0 || activeIndex >= filteredList.length) return;
        setSelectedLang(filteredList[activeIndex].code);
        closeDropdown();
      };

      let blurCloseTimer = null;
      let dropdownPointerDown = false;

      const onDocMouseDown = (e) => {
        if (!modal.contains(e.target)) {
          closeDropdown();
          if (langInput) langInput.value = getLangLabel(selectedLang);
        }
      };

      doc.addEventListener('mousedown', onDocMouseDown, true);

      closeBtn.onclick = () => {
        doc.removeEventListener('mousedown', onDocMouseDown, true);
        modal.remove();
      };

      setSelectedLang(selectedLang);
      renderDropdown('');

      if (langInput) {
        try {
          langInput.setAttribute('name', 'waai_target_language');
          langInput.setAttribute('autocomplete', 'off');
          langInput.setAttribute('autocapitalize', 'off');
          langInput.setAttribute('autocorrect', 'off');
          langInput.setAttribute('spellcheck', 'false');
          langInput.setAttribute('data-lpignore', 'true');
          langInput.setAttribute('data-1p-ignore', 'true');
          langInput.setAttribute('data-bwignore', 'true');
          langInput.setAttribute('data-form-type', 'other');
        } catch (e) {
          // ignore
        }

        langInput.addEventListener('focus', () => {
          if (blurCloseTimer) {
            clearTimeout(blurCloseTimer);
            blurCloseTimer = null;
          }
          openDropdown();
          const q = langInput.value === getLangLabel(selectedLang) ? '' : langInput.value;
          renderDropdown(q);
          langInput.select();
        });

        langInput.addEventListener('input', (e) => {
          openDropdown();
          renderDropdown(e.target.value);
        });

        langInput.addEventListener('blur', () => {
          if (blurCloseTimer) clearTimeout(blurCloseTimer);
          blurCloseTimer = setTimeoutFn(() => {
            if (dropdownPointerDown) return;
            closeDropdown();
            langInput.value = getLangLabel(selectedLang);
          }, 140);
        });

        langInput.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openDropdown();
            if (!filteredList.length) return;
            if (e.key === 'ArrowDown') activeIndex = Math.min(filteredList.length - 1, activeIndex + 1);
            if (e.key === 'ArrowUp') activeIndex = Math.max(0, activeIndex - 1);
            highlightActive();
            return;
          }
          if (e.key === 'Enter') {
            if (langDropdown && langDropdown.style.display !== 'none') {
              e.preventDefault();
              pickActive();
            }
            return;
          }
          if (e.key === 'Escape') {
            closeDropdown();
            langInput.value = getLangLabel(selectedLang);
            return;
          }
          if (e.key === 'Tab') {
            closeDropdown();
            langInput.value = getLangLabel(selectedLang);
            return;
          }
        });
      }

      if (langDropdown) {
        langDropdown.addEventListener(
          'mousedown',
          () => {
            dropdownPointerDown = true;
            setTimeoutFn(() => {
              dropdownPointerDown = false;
            }, 0);
          },
          true
        );
        langDropdown.addEventListener('mousedown', (e) => {
          const item = e.target.closest('.lang-combobox-item');
          if (!item) return;
          e.preventDefault();
          setSelectedLang(item.getAttribute('data-code'));
          closeDropdown();
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
            const sourceText = liveText || (text || '').trim();
            if (!sourceText) {
              toast('请输入要翻译的内容', 'info', 1200);
              return;
            }

            if (typeof modalTranslation !== 'function') throw new Error('翻译函数不可用');
            const translation = await modalTranslation(sourceText, targetLang, 'normal');

            if (translation && typeof translation === 'object') {
              if (translation.hasThinking) {
                resultContent.textContent = translation.translation;
              } else {
                // 兼容：api-services.js 的 siliconflow 可能返回 boxed String（new String(content) 并挂 meta）
                // 若直接 JSON.stringify，会显示成 "xxx"（带双引号）
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

            if (verifyBtn) verifyBtn.style.display = 'inline-block';
            applyBtn.disabled = false;
            if (verifyResult) verifyResult.style.display = 'none';

            if (typeof rememberLanguageChoice === 'function') {
              rememberLanguageChoice(chatWindow, targetLang);
            }
          } catch (error) {
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

  window.WAAP.legacy.inputTranslateModalFallback = {
    createTranslatePopup,
    createTranslateModal
  };
})();
