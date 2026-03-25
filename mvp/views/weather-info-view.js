/*
用途：天气信息 UI View（MVP）。
说明：集中管理天气条的 DOM 渲染与样式注入（含国旗显示兼容处理），让 legacy-weather-info.js 变薄。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.weatherInfoView) return;

  let flagEmojiSupported = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clearChildren(element) {
    try {
      if (!element) return;
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    } catch (e) {
      // ignore
    }
  }

  function createTextElement(documentRef, tagName, className, text) {
    const el = documentRef.createElement(tagName);
    if (className) el.className = className;
    el.textContent = String(text ?? '');
    return el;
  }

  function createCountryFlagNode(countryInfo, deps = {}, options = {}) {
    const documentRef = deps.document || window.document;
    const flagService = window.WAAP?.services?.countryFlagService;

    try {
      flagService?.ensureStyles?.({ document: documentRef });
    } catch (e) {
      // ignore
    }

    const shell = documentRef.createElement('span');
    shell.className = options.shellClassName || 'wa-country-flag-shell';

    try {
      const rawCode = flagService?.normalizeCountryCode
        ? flagService.normalizeCountryCode(countryInfo)
        : String(countryInfo?.country || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      const code = rawCode || '';
      const flagUrl = flagService?.getFlagUrl ? flagService.getFlagUrl(code, deps) : '';

      if (flagUrl) {
        const img = documentRef.createElement('img');
        img.className = options.imageClassName || 'wa-country-flag-img';
        img.src = flagUrl;
        img.alt = `${countryInfo?.name || countryInfo?.country || '国家'}图标`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        shell.appendChild(img);
        return shell;
      }

      const badge = documentRef.createElement('span');
      badge.className = options.badgeClassName || 'wa-country-flag-code-badge';
      badge.textContent = code || '--';
      shell.appendChild(badge);
      return shell;
    } catch (e) {
      const badge = documentRef.createElement('span');
      badge.className = options.badgeClassName || 'wa-country-flag-code-badge';
      badge.textContent = '--';
      shell.appendChild(badge);
      return shell;
    }
  }

  function appendWeatherLoading(container, deps = {}) {
    try {
      if (!container) return false;
      const documentRef = deps.document || window.document;
      clearChildren(container);
      const spinner = documentRef.createElement('span');
      spinner.className = 'wa-weather-inline-spinner';
      spinner.setAttribute('aria-label', 'loading');
      const text = createTextElement(documentRef, 'span', 'weather-desc', '刷新中...');
      text.style.marginLeft = '6px';
      container.appendChild(spinner);
      container.appendChild(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isFlagEmojiSupported(deps = {}) {
    try {
      if (flagEmojiSupported === true) return true;
      if (flagEmojiSupported === false) return false;

      const documentRef = deps.document || window.document;
      const canvas = documentRef.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        flagEmojiSupported = true;
        return true;
      }
      ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      const flagW = ctx.measureText('🇺🇸').width;
      const codeW = ctx.measureText('US').width;

      const supported = Math.abs(flagW - codeW) > 2;
      flagEmojiSupported = supported;
      return supported;
    } catch (e) {
      flagEmojiSupported = true;
      return true;
    }
  }

  function ensureFlagRenderMode(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const root = documentRef.documentElement;
      if (!root) return false;

      const supported = isFlagEmojiSupported({ document: documentRef });
      if (supported) {
        root.classList.remove('waap-flag-emoji-unsupported');
        root.classList.add('waap-flag-emoji-supported');
      } else {
        root.classList.remove('waap-flag-emoji-supported');
        root.classList.add('waap-flag-emoji-unsupported');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderCountryFlag(countryInfo, deps = {}) {
    try {
      return createCountryFlagNode(
        countryInfo,
        deps,
        {
          shellClassName: 'wa-country-flag-shell',
          imageClassName: 'wa-country-flag-img',
          badgeClassName: 'country-flag-badge'
        }
      ).outerHTML;
    } catch (e) {
      return `<span class="country-flag-badge">${escapeHtml('--')}</span>`;
    }
  }

  function ensureStyles(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const existingStyle = documentRef.querySelector('#wa-weather-styles');
      if (existingStyle) {
        try {
          const appendIfMissing = (marker, css) => {
            try {
              const t = String(existingStyle.textContent || '');
              if (t.includes(marker)) return;
              existingStyle.textContent = `${t}\n${css}`;
            } catch (e) {
              // ignore
            }
          };

          appendIfMissing('.wa-weather-inline-spinner', `
            .wa-weather-inline-spinner{width:12px;height:12px;border-radius:999px;border:2px solid rgba(0,168,132,0.18);border-top-color:rgba(0,168,132,0.85);animation:wa-weather-spin 0.8s linear infinite;display:inline-block;vertical-align:-2px;}
            @keyframes wa-weather-spin{to{transform:rotate(360deg);}}
          `);

          appendIfMissing('.wa-weather-confirm-bubble', `
            .wa-weather-confirm-bubble{position:fixed;z-index:999999;min-width:240px;max-width:min(340px, calc(100vw - 32px));background:rgba(255,255,255,0.94);border:1px solid rgba(0,0,0,0.10);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,0.18);padding:10px 12px;color:#111827;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
            .wa-weather-confirm-bubble-title{font-size:12px;font-weight:600;color:rgba(17,24,39,0.88);margin-bottom:6px;}
            .wa-weather-confirm-bubble-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;}
            .wa-weather-confirm-btn{border:1px solid rgba(0,0,0,0.10);background:rgba(255,255,255,0.9);color:#111827;padding:6px 10px;border-radius:10px;font-size:12px;cursor:pointer;line-height:16px;}
            .wa-weather-confirm-btn-primary{background:rgba(0,168,132,0.92);border-color:rgba(0,168,132,0.92);color:white;}
            .wa-weather-confirm-btn:hover{filter:brightness(0.98);}
            .wa-weather-confirm-bubble-dark{background:rgba(17,24,39,0.92);border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.92);}
            .wa-weather-confirm-bubble-dark .wa-weather-confirm-bubble-title{color:rgba(255,255,255,0.88);}
            .wa-weather-confirm-bubble-dark .wa-weather-confirm-btn{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.14);color:rgba(255,255,255,0.9);}
            .wa-weather-confirm-bubble-dark .wa-weather-confirm-btn-primary{background:rgba(0,168,132,0.92);border-color:rgba(0,168,132,0.92);color:white;}
          `);

          appendIfMissing('.wa-country-picker-overlay', `
            .wa-country-picker-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
            .wa-country-picker-panel{width:min(520px, calc(100vw - 24px));max-height:min(76vh, 640px);background:rgba(255,255,255,0.96);border:1px solid rgba(0,0,0,0.10);border-radius:16px;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,0.22);display:flex;flex-direction:column;}
            .wa-country-picker-header{display:flex;align-items:center;justify-content:space-between;padding:12px 12px;border-bottom:1px solid rgba(0,0,0,0.08);}
            .wa-country-picker-title{font-size:13px;font-weight:700;color:rgba(17,24,39,0.92);}
            .wa-country-picker-close{width:30px;height:30px;border-radius:999px;border:1px solid rgba(0,0,0,0.10);background:rgba(255,255,255,0.9);cursor:pointer;font-size:18px;line-height:26px;color:rgba(17,24,39,0.70);}
            .wa-country-picker-search-wrap{padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.08);}
            .wa-country-picker-search{width:100%;border:1px solid rgba(0,0,0,0.10);background:rgba(255,255,255,0.9);border-radius:12px;padding:10px 12px;font-size:13px;outline:none;}
            .wa-country-picker-list{padding:8px;overflow:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:6px;}
            .wa-country-picker-group-label{font-size:11px;color:rgba(17,24,39,0.55);padding:8px 8px 2px;}
            .wa-country-picker-item{width:100%;border:1px solid rgba(0,0,0,0.08);background:rgba(255,255,255,0.9);border-radius:12px;padding:10px 10px;display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:center;cursor:pointer;text-align:left;}
            .wa-country-picker-item:hover{border-color:rgba(0,168,132,0.40);box-shadow:0 0 0 3px rgba(0,168,132,0.12);}
            .wa-country-picker-flag{display:inline-flex;align-items:center;justify-content:center;line-height:1;}
            .wa-country-picker-name{font-size:13px;color:rgba(17,24,39,0.88);}
            .wa-country-picker-code{font-size:12px;font-weight:700;color:rgba(0,0,0,0.42);}
            .wa-country-picker-more-hint,.wa-country-picker-empty{padding:10px;font-size:12px;color:rgba(17,24,39,0.60);}
            .wa-country-picker-dark .wa-country-picker-panel{background:rgba(17,24,39,0.92);border-color:rgba(255,255,255,0.10);}
            .wa-country-picker-dark .wa-country-picker-title{color:rgba(255,255,255,0.92);}
            .wa-country-picker-dark .wa-country-picker-header,.wa-country-picker-dark .wa-country-picker-search-wrap{border-bottom-color:rgba(255,255,255,0.10);}
            .wa-country-picker-dark .wa-country-picker-search{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.92);}
            .wa-country-picker-dark .wa-country-picker-item{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.10);}
            .wa-country-picker-dark .wa-country-picker-name{color:rgba(255,255,255,0.90);}
            .wa-country-picker-dark .wa-country-picker-code,.wa-country-picker-dark .wa-country-picker-group-label,.wa-country-picker-dark .wa-country-picker-more-hint,.wa-country-picker-dark .wa-country-picker-empty{color:rgba(255,255,255,0.62);}
          `);

          appendIfMissing('.wa-country-picker-override-v2', `
            .wa-country-picker-override-v2{display:none;}
            .wa-country-picker-overlay,.wa-country-picker-overlay *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
            .wa-country-picker-overlay .wa-country-picker-panel{width:min(480px, calc(100vw - 24px));border-radius:14px;}
            .wa-country-picker-overlay .wa-country-picker-list{gap:8px;padding:10px;}
            .wa-country-picker-overlay .wa-country-picker-item{border-radius:12px;padding:10px 12px;grid-template-columns:22px 1fr auto;}
            .wa-country-picker-overlay .wa-country-picker-code{opacity:0.8;}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-panel{background:#111b21;border-color:rgba(255,255,255,0.12);}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-header{border-bottom-color:rgba(255,255,255,0.10);}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-search-wrap{border-bottom-color:rgba(255,255,255,0.10);}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-search{background:#202c33;border-color:rgba(255,255,255,0.12);color:#e9edef;}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-item{background:#202c33;border-color:rgba(255,255,255,0.08);}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-item:hover{border-color:rgba(0,168,132,0.55);box-shadow:0 0 0 3px rgba(0,168,132,0.14);}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-name{color:#e9edef;}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-code{color:#8696a0;}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-group-label{color:#8696a0;}
            .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-close{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.14);color:#e9edef;}
          `);

          appendIfMissing('.wa-weather-info{', `
            .wa-weather-info{pointer-events:auto !important;position:relative;z-index:2;}
            .wa-weather-info *{pointer-events:auto !important;}
            .country-info{cursor:pointer !important;}
            .weather-info{cursor:pointer !important;}
          `);
        } catch (e2) {
          // ignore
        }
        return true;
      }

      const style = documentRef.createElement('style');
      style.id = 'wa-weather-styles';
      style.textContent = `
      .wa-weather-info {
        display: inline-flex;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #8696a0;
        margin: 0 0 0 6px;
        padding: 1px 4px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 6px;
        cursor: default;
        vertical-align: middle;
        line-height: 1.2;
        flex-shrink: 0;
        pointer-events: auto !important;
        position: relative;
        z-index: 2;
      }

      .wa-weather-info * {
        pointer-events: auto !important;
      }
      
       .weather-inline {
         display: flex;
         align-items: center;
         gap: 8px;
         flex-wrap: wrap;
       }
       
       .country-info {
         display: flex;
         align-items: center;
         gap: 4px;
         cursor: pointer !important;
       }
       
       .country-flag {
         display: inline-flex;
         align-items: center;
         justify-content: center;
         line-height: 1;
       }

       .country-flag-badge {
         display: inline-flex;
         align-items: center;
         justify-content: center;
         height: 16px;
         padding: 0 6px;
         border-radius: 6px;
         background: rgba(0, 0, 0, 0.08);
         color: #3b4a54;
         font-size: 10px;
         font-weight: 700;
         letter-spacing: 0.4px;
         line-height: 16px;
         text-transform: uppercase;
       }

       .country-name {
         font-size: 13px;
         color: #8696a0;
       }
       
       .weather-info {
         display: flex;
         align-items: center;
         gap: 4px;
         color: #00a884;
         cursor: pointer !important;
       }
       
       .weather-loading {
         font-size: 12px;
         color: #8696a0;
         opacity: 0.8;
         animation: pulse 1.5s infinite;
       }
       
       .weather-icon {
         font-size: 14px;
         margin-right: 2px;
       }
       
       .temperature {
         font-weight: 500;
         font-size: 13px;
       }
       
       .weather-desc {
         font-size: 12px;
         opacity: 0.8;
       }
       
       .humidity, .wind {
         font-size: 11px;
         opacity: 0.7;
         color: #667781;
         display: flex;
         align-items: center;
         gap: 1px;
       }
       
       .default-indicator {
         font-size: 10px;
         opacity: 0.6;
         cursor: help;
       }
       
       .time-info {
         display: flex;
         align-items: center;
         gap: 2px;
         color: #667781;
       }
       
       .time-label {
         font-size: 11px;
         color: #8696a0;
         opacity: 0.8;
       }
       
       .local-time {
         font-size: 12px;
         font-family: monospace;
         font-weight: 500;
         color: #00a884;
       }
       
       .status-indicator {
         font-size: 10px;
         opacity: 0.6;
         margin-left: 4px;
       }
       
       .status-indicator.needs-confirmation {
         color: #ff6b6b;
         animation: pulse 1.5s infinite;
       }
       
       .status-indicator.auto-detected {
         color: #4ecdc4;
       }
       
       .status-indicator.user-corrected {
         color: #00a884;
       }

       @keyframes pulse {
         0% { opacity: 1; }
         50% { opacity: 0.5; }
         100% { opacity: 1; }
       }
       
       .country-selector {
         background: #f0f2f5;
         padding: 8px;
         border-radius: 8px;
         margin-top: 4px;
         border: 1px solid #e9edef;
       }
       
       .selector-hint {
         font-size: 12px;
         margin-bottom: 6px;
         color: #667781;
       }
       
       .country-options {
         display: flex;
         flex-wrap: wrap;
         gap: 6px;
       }
       
       .country-option {
         background: white;
         border: 1px solid #d1d7db;
         color: #3b4a54;
         padding: 6px 12px;
         border-radius: 18px;
         font-size: 13px;
         cursor: pointer;
         transition: all 0.2s ease;
         font-family: inherit;
       }
       
       .country-option:hover {
         background: #00a884;
         color: white;
         border-color: #00a884;
       }
       
       .country-option.selected {
         background: #00a884;
         color: white;
         border-color: #00a884;
       }

       .wa-weather-inline-spinner {
         width: 12px;
         height: 12px;
         border-radius: 999px;
         border: 2px solid rgba(0, 168, 132, 0.18);
         border-top-color: rgba(0, 168, 132, 0.85);
         animation: wa-weather-spin 0.8s linear infinite;
         display: inline-block;
         vertical-align: -2px;
       }

       @keyframes wa-weather-spin {
         to { transform: rotate(360deg); }
       }

       .wa-weather-confirm-bubble {
         position: fixed;
         z-index: 999999;
         min-width: 240px;
         max-width: min(340px, calc(100vw - 32px));
         background: rgba(255, 255, 255, 0.94);
         border: 1px solid rgba(0, 0, 0, 0.10);
         border-radius: 14px;
         box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
         padding: 10px 12px;
         color: #111827;
         backdrop-filter: blur(10px);
         -webkit-backdrop-filter: blur(10px);
       }

       .wa-weather-confirm-bubble-title {
         font-size: 12px;
         font-weight: 600;
         color: rgba(17, 24, 39, 0.88);
         margin-bottom: 6px;
       }

       .wa-weather-confirm-bubble-actions {
         display: flex;
         justify-content: flex-end;
         gap: 8px;
         margin-top: 10px;
       }

       .wa-weather-confirm-btn {
         border: 1px solid rgba(0, 0, 0, 0.10);
         background: rgba(255, 255, 255, 0.9);
         color: #111827;
         padding: 6px 10px;
         border-radius: 10px;
         font-size: 12px;
         cursor: pointer;
         line-height: 16px;
       }

       .wa-weather-confirm-btn-primary {
         background: rgba(0, 168, 132, 0.92);
         border-color: rgba(0, 168, 132, 0.92);
         color: white;
       }

       .wa-weather-confirm-btn:hover {
         filter: brightness(0.98);
       }

       .wa-weather-confirm-bubble-dark {
         background: rgba(17, 24, 39, 0.92);
         border-color: rgba(255, 255, 255, 0.12);
         color: rgba(255, 255, 255, 0.92);
       }

       .wa-weather-confirm-bubble-dark .wa-weather-confirm-bubble-title {
         color: rgba(255, 255, 255, 0.88);
       }

       .wa-weather-confirm-bubble-dark .wa-weather-confirm-btn {
         background: rgba(255, 255, 255, 0.08);
         border-color: rgba(255, 255, 255, 0.14);
         color: rgba(255, 255, 255, 0.9);
       }

       .wa-weather-confirm-bubble-dark .wa-weather-confirm-btn-primary {
         background: rgba(0, 168, 132, 0.92);
         border-color: rgba(0, 168, 132, 0.92);
         color: white;
       }

       .wa-country-picker-overlay {
         position: fixed;
         inset: 0;
         z-index: 999999;
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 16px;
         background: rgba(0, 0, 0, 0.35);
         backdrop-filter: blur(6px);
         -webkit-backdrop-filter: blur(6px);
       }

       .wa-country-picker-panel {
         width: min(520px, calc(100vw - 24px));
         max-height: min(76vh, 640px);
         background: rgba(255, 255, 255, 0.96);
         border: 1px solid rgba(0, 0, 0, 0.10);
         border-radius: 16px;
         overflow: hidden;
         box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
         display: flex;
         flex-direction: column;
       }

       .wa-country-picker-header {
         display: flex;
         align-items: center;
         justify-content: space-between;
         padding: 12px 12px;
         border-bottom: 1px solid rgba(0, 0, 0, 0.08);
       }

       .wa-country-picker-title {
         font-size: 13px;
         font-weight: 700;
         color: rgba(17, 24, 39, 0.92);
       }

       .wa-country-picker-close {
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

       .wa-country-picker-search-wrap {
         padding: 10px 12px;
         border-bottom: 1px solid rgba(0, 0, 0, 0.08);
       }

       .wa-country-picker-search {
         width: 100%;
         border: 1px solid rgba(0, 0, 0, 0.10);
         background: rgba(255, 255, 255, 0.9);
         border-radius: 12px;
         padding: 10px 12px;
         font-size: 13px;
         outline: none;
       }

       .wa-country-picker-list {
         padding: 8px;
         overflow: auto;
         -webkit-overflow-scrolling: touch;
         display: flex;
         flex-direction: column;
         gap: 6px;
       }

       .wa-country-picker-group-label {
         font-size: 11px;
         color: rgba(17, 24, 39, 0.55);
         padding: 8px 8px 2px;
       }

       .wa-country-picker-item {
         width: 100%;
         border: 1px solid rgba(0, 0, 0, 0.08);
         background: rgba(255, 255, 255, 0.9);
         border-radius: 12px;
         padding: 10px 10px;
         display: grid;
         grid-template-columns: 26px 1fr auto;
         gap: 10px;
         align-items: center;
         cursor: pointer;
         text-align: left;
       }

       .wa-country-picker-item:hover {
         border-color: rgba(0, 168, 132, 0.40);
         box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.12);
       }

       .wa-country-picker-flag {
         display: inline-flex;
         align-items: center;
         justify-content: center;
         line-height: 1;
       }

       .wa-country-picker-name {
         font-size: 13px;
         color: rgba(17, 24, 39, 0.88);
       }

       .wa-country-picker-code {
         font-size: 12px;
         font-weight: 700;
         color: rgba(0, 0, 0, 0.42);
       }

       .wa-country-picker-more-hint,
       .wa-country-picker-empty {
         padding: 10px;
         font-size: 12px;
         color: rgba(17, 24, 39, 0.60);
       }

       .wa-country-picker-dark .wa-country-picker-panel {
         background: rgba(17, 24, 39, 0.92);
         border-color: rgba(255, 255, 255, 0.10);
       }

       .wa-country-picker-dark .wa-country-picker-title {
         color: rgba(255, 255, 255, 0.92);
       }

       .wa-country-picker-dark .wa-country-picker-header,
       .wa-country-picker-dark .wa-country-picker-search-wrap {
         border-bottom-color: rgba(255, 255, 255, 0.10);
       }

       .wa-country-picker-dark .wa-country-picker-search {
         background: rgba(255, 255, 255, 0.08);
         border-color: rgba(255, 255, 255, 0.12);
         color: rgba(255, 255, 255, 0.92);
       }

       .wa-country-picker-dark .wa-country-picker-item {
         background: rgba(255, 255, 255, 0.08);
         border-color: rgba(255, 255, 255, 0.10);
       }

       .wa-country-picker-dark .wa-country-picker-name {
         color: rgba(255, 255, 255, 0.90);
       }

       .wa-country-picker-dark .wa-country-picker-code,
       .wa-country-picker-dark .wa-country-picker-group-label,
       .wa-country-picker-dark .wa-country-picker-more-hint,
       .wa-country-picker-dark .wa-country-picker-empty {
         color: rgba(255, 255, 255, 0.62);
       }

       .wa-country-picker-override-v2 { display: none; }
       .wa-country-picker-overlay, .wa-country-picker-overlay * {
         box-sizing: border-box;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
       }
       .wa-country-picker-overlay .wa-country-picker-panel {
         width: min(480px, calc(100vw - 24px));
         border-radius: 14px;
       }
       .wa-country-picker-overlay .wa-country-picker-list {
         gap: 8px;
         padding: 10px;
       }
       .wa-country-picker-overlay .wa-country-picker-item {
         border-radius: 12px;
         padding: 10px 12px;
         grid-template-columns: 22px 1fr auto;
       }
       .wa-country-picker-overlay .wa-country-picker-code {
         opacity: 0.8;
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-panel {
         background: #111b21;
         border-color: rgba(255, 255, 255, 0.12);
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-header,
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-search-wrap {
         border-bottom-color: rgba(255, 255, 255, 0.10);
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-search {
         background: #202c33;
         border-color: rgba(255, 255, 255, 0.12);
         color: #e9edef;
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-item {
         background: #202c33;
         border-color: rgba(255, 255, 255, 0.08);
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-item:hover {
         border-color: rgba(0, 168, 132, 0.55);
         box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.14);
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-name {
         color: #e9edef;
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-code,
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-group-label {
         color: #8696a0;
       }
       .wa-country-picker-overlay.wa-country-picker-dark .wa-country-picker-close {
         background: rgba(255, 255, 255, 0.08);
         border-color: rgba(255, 255, 255, 0.14);
         color: #e9edef;
       }
      `;

      (documentRef.head || documentRef.documentElement).appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  function setWeatherLoading(container, deps = {}) {
    try {
      if (!container) return false;
      const documentRef = deps.document || window.document;
      const el = container.querySelector('#weather-data-container');
      if (!el) return false;
      ensureStyles({ document: documentRef });
      return appendWeatherLoading(el, { document: documentRef });
    } catch (e) {
      return false;
    }
  }

  function showConfirmBubble(anchorEl, title, okText, deps = {}) {
    return new Promise((resolve) => {
      try {
        const documentRef = deps.document || window.document;
        ensureStyles({ document: documentRef });

        const existing = documentRef.querySelector('.wa-weather-confirm-bubble');
        if (existing) {
          try {
            existing.remove();
          } catch (e) {}
        }

        const isDarkMode = (() => {
          try {
            if (documentRef.body?.classList?.contains('dark')) return true;
            if (documentRef.documentElement?.getAttribute('data-theme') === 'dark') return true;
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
          } catch (e) {
            // ignore
          }
          return false;
        })();

        const bubble = documentRef.createElement('div');
        bubble.className = isDarkMode
          ? 'wa-weather-confirm-bubble wa-weather-confirm-bubble-dark'
          : 'wa-weather-confirm-bubble';

        const titleEl = createTextElement(documentRef, 'div', 'wa-weather-confirm-bubble-title', title);
        const actions = documentRef.createElement('div');
        actions.className = 'wa-weather-confirm-bubble-actions';

        const cancelBtn = createTextElement(documentRef, 'button', 'wa-weather-confirm-btn', '取消');
        cancelBtn.type = 'button';
        cancelBtn.setAttribute('data-act', 'cancel');

        const okBtn = createTextElement(
          documentRef,
          'button',
          'wa-weather-confirm-btn wa-weather-confirm-btn-primary',
          okText
        );
        okBtn.type = 'button';
        okBtn.setAttribute('data-act', 'ok');

        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        bubble.appendChild(titleEl);
        bubble.appendChild(actions);

        const cleanup = (val) => {
          try {
            bubble.remove();
          } catch (e) {}
          try {
            documentRef.removeEventListener('keydown', onKeyDown, true);
          } catch (e2) {}
          resolve(val);
        };

        const onKeyDown = (e) => {
          try {
            if (e.key === 'Escape') cleanup(false);
          } catch (e2) {
            // ignore
          }
        };

        bubble.addEventListener('click', (e) => {
          try {
            const t = e.target;
            const act = t && t.getAttribute ? t.getAttribute('data-act') : '';
            if (act === 'ok') cleanup(true);
            if (act === 'cancel') cleanup(false);
          } catch (e2) {
            cleanup(false);
          }
        });

        documentRef.addEventListener('keydown', onKeyDown, true);
        (documentRef.body || documentRef.documentElement).appendChild(bubble);

        const r = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : null;
        const vw = window.innerWidth || 1200;
        const vh = window.innerHeight || 800;
        const bw = bubble.offsetWidth || 280;
        const bh = bubble.offsetHeight || 70;

        let left = r ? (r.left + r.width / 2 - bw / 2) : (vw / 2 - bw / 2);
        let top = r ? (r.bottom + 10) : 80;
        left = Math.max(12, Math.min(left, vw - bw - 12));
        if (top + bh > vh - 12) {
          top = r ? (r.top - bh - 10) : (vh - bh - 12);
        }
        top = Math.max(12, Math.min(top, vh - bh - 12));

        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;

        setTimeout(() => {
          try {
            const onDocClick = (ev) => {
              try {
                if (!bubble.contains(ev.target)) {
                  documentRef.removeEventListener('mousedown', onDocClick, true);
                  cleanup(false);
                }
              } catch (e3) {
                documentRef.removeEventListener('mousedown', onDocClick, true);
                cleanup(false);
              }
            };
            documentRef.addEventListener('mousedown', onDocClick, true);
          } catch (e4) {
            // ignore
          }
        }, 0);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function confirmForceRefresh(anchorEl, deps = {}) {
    return showConfirmBubble(anchorEl, '你已开启自动续期缓存，是否强制刷新？', '强制刷新', deps);
  }

  function confirmCountryOverride(anchorEl, deps = {}) {
    return showConfirmBubble(anchorEl, '是否修改国家？', '修改国家', deps);
  }

  function renderWeather(container, countryInfo, weatherData, timeData, options = {}, deps = {}) {
    try {
      if (!container) return false;

      const documentRef = deps.document || window.document;
      const renderWeatherContent = typeof deps.renderWeatherContent === 'function' ? deps.renderWeatherContent : null;

      const showWeather = options.showWeather !== false;
      const showTime = options.showTime !== false;
      const needsConfirmation = options.needsConfirmation === true;
      const isAutoDetected = options.isAutoDetected === true;
      const isUserCorrected = options.isUserCorrected === true;

      ensureStyles(deps);
      ensureFlagRenderMode(deps);

      clearChildren(container);

      const inline = documentRef.createElement('div');
      inline.className = 'weather-inline';

      const countryInfoEl = documentRef.createElement('span');
      countryInfoEl.className = 'country-info';

      const flagWrap = documentRef.createElement('span');
      flagWrap.className = 'country-flag';
      flagWrap.appendChild(createCountryFlagNode(countryInfo, deps, {
        shellClassName: 'wa-country-flag-shell',
        imageClassName: 'wa-country-flag-img',
        badgeClassName: 'country-flag-badge'
      }));
      countryInfoEl.appendChild(flagWrap);
      countryInfoEl.appendChild(createTextElement(documentRef, 'span', 'country-name', countryInfo?.name || ''));
      inline.appendChild(countryInfoEl);

      if (showWeather) {
        const weatherInfoEl = documentRef.createElement('span');
        weatherInfoEl.className = 'weather-info';
        weatherInfoEl.id = 'weather-data-container';
        if (weatherData && renderWeatherContent) {
          renderWeatherContent(weatherInfoEl, weatherData);
        } else {
          weatherInfoEl.appendChild(createTextElement(documentRef, 'span', 'weather-loading', '🌤️ 加载中...'));
        }
        inline.appendChild(weatherInfoEl);
      }

      if (showTime && timeData) {
        const timeInfoEl = documentRef.createElement('span');
        timeInfoEl.className = 'time-info';
        timeInfoEl.appendChild(createTextElement(documentRef, 'span', 'time-label', '当地时间：'));
        const localTimeEl = createTextElement(documentRef, 'span', 'local-time', timeData.time || '');
        localTimeEl.setAttribute('data-timezone', String(timeData.timezone || ''));
        timeInfoEl.appendChild(localTimeEl);
        inline.appendChild(timeInfoEl);
      }

      if (needsConfirmation) {
        const indicator = createTextElement(documentRef, 'span', 'status-indicator needs-confirmation', '?');
        indicator.title = '需要确认';
        inline.appendChild(indicator);
      }

      if (isAutoDetected) {
        const indicator = createTextElement(documentRef, 'span', 'status-indicator auto-detected', '🤖');
        indicator.title = '智能识别';
        inline.appendChild(indicator);
      }

      if (isUserCorrected) {
        const indicator = createTextElement(documentRef, 'span', 'status-indicator user-corrected', '✓');
        indicator.title = '用户修正';
        inline.appendChild(indicator);
      }

      container.appendChild(inline);

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.views.weatherInfoView = {
    ensureStyles,
    ensureFlagRenderMode,
    isFlagEmojiSupported,
    renderCountryFlag,
    createCountryFlagNode,
    renderWeather,
    setWeatherLoading,
    confirmForceRefresh,
    confirmCountryOverride
  };
})();
