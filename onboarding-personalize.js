(function () {
  if (window.__waapOnboardingPersonalizeInitialized) return;
  window.__waapOnboardingPersonalizeInitialized = true;

  let observer = null;
  let lastRunAt = 0;

  window.__waapOnboardingPersonalizeState = window.__waapOnboardingPersonalizeState || {
    lastReason: 'init',
    lastError: null,
    mainFound: false,
    lockFound: false,
    hostFound: false,
    chatActive: false,
    injected: false,
    lastInjectAt: 0
  };

  function setDiag(reason, extra) {
    try {
      const el = document.documentElement;
      if (!el || !el.dataset) return;
      el.dataset.waapOnboardingLastReason = reason || '';
      if (extra && typeof extra === 'object') {
        if (typeof extra.error === 'string') el.dataset.waapOnboardingLastError = extra.error;
        if (typeof extra.mainFound !== 'undefined') el.dataset.waapOnboardingMainFound = String(!!extra.mainFound);
        if (typeof extra.lockFound !== 'undefined') el.dataset.waapOnboardingLockFound = String(!!extra.lockFound);
        if (typeof extra.hostFound !== 'undefined') el.dataset.waapOnboardingHostFound = String(!!extra.hostFound);
        if (typeof extra.chatActive !== 'undefined') el.dataset.waapOnboardingChatActive = String(!!extra.chatActive);
        if (typeof extra.injected !== 'undefined') el.dataset.waapOnboardingInjected = String(!!extra.injected);
      }
    } catch (e) {
      // ignore
    }
  }

  function isChatActive() {
    try {
      const main = document.getElementById('main');
      if (!main) return false;

      // 只检查 main 内部，避免误命中其它区域的 footer
      const footer = main.querySelector('footer._ak1i') || main.querySelector('footer');
      if (footer) {
        const editable = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') || footer.querySelector('div[contenteditable="true"]');
        if (editable) return true;
      }

      // 有消息/会话相关 data-id（减少误判）
      if (main.querySelector('[data-id*="@c.us"], [data-id*="@g.us"]')) return true;

      // 有会话 header（不同版本 WhatsApp 可能不同）
      if (main.querySelector('header[data-testid="conversation-info-header"], header [data-testid="conversation-info-header"]')) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  function ensureStyles() {
    try {
      if (document.getElementById('waap-onboarding-style')) return;
      const style = document.createElement('style');
      style.id = 'waap-onboarding-style';
      style.textContent = `
        #waap-onboarding-card {
          width: 100%;
          margin: 26px 0 18px;
          padding: 0 12px;
          display: flex;
          justify-content: center;
        }
        .waap-onboarding-card-inner {
          width: min(1040px, 100%);
          border-radius: 22px;
          padding: 26px 24px 18px;
          background:
            radial-gradient(900px 420px at 18% -10%, rgba(52, 211, 153, 0.20), rgba(52, 211, 153, 0) 60%),
            radial-gradient(760px 360px at 92% 0%, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0) 55%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.78));
          border: 1px solid rgba(17, 24, 39, 0.10);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.16);
          -webkit-backdrop-filter: blur(18px);
          backdrop-filter: blur(18px);
          position: relative;
          overflow: hidden;
        }
        .waap-onboarding-card-inner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.60), rgba(255, 255, 255, 0) 40%);
          opacity: 0.55;
          pointer-events: none;
        }
        html[data-theme='dark'] .waap-onboarding-card-inner,
        .dark .waap-onboarding-card-inner,
        [data-theme="dark"] .waap-onboarding-card-inner {
          background:
            radial-gradient(900px 420px at 18% -10%, rgba(52, 211, 153, 0.22), rgba(52, 211, 153, 0) 60%),
            radial-gradient(760px 360px at 92% 0%, rgba(56, 189, 248, 0.16), rgba(56, 189, 248, 0) 55%),
            linear-gradient(180deg, rgba(17, 24, 39, 0.78), rgba(17, 24, 39, 0.62));
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 34px 86px rgba(0, 0, 0, 0.46);
        }
        .waap-onboarding-top {
          display: grid;
          grid-template-columns: 52px 1fr 52px;
          align-items: start;
          gap: 10px;
        }
        .waap-onboarding-mark {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0f766e;
          background: rgba(15, 118, 110, 0.10);
          border: 1px solid rgba(15, 118, 110, 0.22);
          flex-shrink: 0;
        }
        html[data-theme='dark'] .waap-onboarding-mark,
        .dark .waap-onboarding-mark,
        [data-theme="dark"] .waap-onboarding-mark {
          color: #34d399;
          background: rgba(52, 211, 153, 0.10);
          border: 1px solid rgba(52, 211, 153, 0.18);
        }
        .waap-onboarding-headings { text-align: center; }

        .waap-onboarding-title {
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.7px;
          color: rgba(17, 24, 39, 0.92);
          line-height: 1.05;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .waap-onboarding-subtitle { margin-top: 10px; font-size: 14px; color: rgba(17, 24, 39, 0.62); line-height: 1.45; }
        html[data-theme='dark'] .waap-onboarding-title,
        .dark .waap-onboarding-title,
        [data-theme="dark"] .waap-onboarding-title { color: rgba(255, 255, 255, 0.92); }
        html[data-theme='dark'] .waap-onboarding-subtitle,
        .dark .waap-onboarding-subtitle,
        [data-theme="dark"] .waap-onboarding-subtitle { color: rgba(255, 255, 255, 0.62); }
        .waap-onboarding-actions {
          display: flex;
          flex-wrap: nowrap;
          gap: 10px;
          margin-top: 18px;
          justify-content: center;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .waap-onboarding-btn {
          height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(15, 118, 110, 0.22);
          background: linear-gradient(180deg, rgba(15, 118, 110, 0.14), rgba(15, 118, 110, 0.10));
          color: rgba(15, 118, 110, 0.98);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
        }
        .waap-onboarding-btn:hover { transform: translateY(-1px); background: rgba(15, 118, 110, 0.14); border-color: rgba(15, 118, 110, 0.28); }
        .waap-onboarding-btn:active { transform: translateY(0); }
        .waap-onboarding-btn-secondary { border: 1px solid rgba(17, 24, 39, 0.10); background: rgba(17, 24, 39, 0.06); color: rgba(17, 24, 39, 0.70); }
        html[data-theme='dark'] .waap-onboarding-btn-secondary,
        .dark .waap-onboarding-btn-secondary,
        [data-theme="dark"] .waap-onboarding-btn-secondary { border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.78); }

        .waap-divider {
          height: 1px;
          margin: 18px 0 14px;
          background: rgba(17, 24, 39, 0.10);
        }
        html[data-theme='dark'] .waap-divider,
        .dark .waap-divider,
        [data-theme="dark"] .waap-divider {
          background: rgba(255, 255, 255, 0.12);
        }

        .waap-author {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 14px;
          flex-wrap: wrap;
          text-align: center;
        }
        .waap-author-left { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .waap-author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(17, 24, 39, 0.10);
          flex-shrink: 0;
        }
        html[data-theme='dark'] .waap-author-avatar,
        .dark .waap-author-avatar,
        [data-theme="dark"] .waap-author-avatar {
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .waap-author-name { font-size: 13px; font-weight: 750; color: rgba(17, 24, 39, 0.86); line-height: 1.2; }
        .waap-author-sub { margin-top: 4px; font-size: 12px; color: rgba(17, 24, 39, 0.58); }
        html[data-theme='dark'] .waap-author-name,
        .dark .waap-author-name,
        [data-theme="dark"] .waap-author-name { color: rgba(255, 255, 255, 0.90); }
        html[data-theme='dark'] .waap-author-sub,
        .dark .waap-author-sub,
        [data-theme="dark"] .waap-author-sub { color: rgba(255, 255, 255, 0.60); }

        .waap-links { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .waap-link {
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          border: 1px solid rgba(17, 24, 39, 0.10);
          color: rgba(17, 24, 39, 0.78);
          background: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          font-weight: 650;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .waap-link:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.72); }
        html[data-theme='dark'] .waap-link,
        .dark .waap-link,
        [data-theme="dark"] .waap-link {
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.80);
          background: rgba(255, 255, 255, 0.06);
        }
        html[data-theme='dark'] .waap-link:hover,
        .dark .waap-link:hover,
        [data-theme="dark"] .waap-link:hover {
          background: rgba(255, 255, 255, 0.10);
        }
        .waap-link svg { width: 16px; height: 16px; }
      `;
      document.head.appendChild(style);
    } catch (e) {
      try {
        const state = window.__waapOnboardingPersonalizeState;
        state.lastError = String(e && e.message ? e.message : e);
        state.lastReason = 'error';
        setDiag('error', { error: state.lastError, injected: false });
      } catch (e2) {
        // ignore
      }
      // ignore
    }
  }

  function getHost() {
    // 注意：引导页可能没有 #main，因此这里必须全局查找锚点
    const main = document.getElementById('main');
    const startIcon = (main || document).querySelector('[data-icon="wds-smb-ill-start-a-chat"]');
    const lockIcon = (main || document).querySelector('[data-icon="lock-outline"]');

    const lockRow = lockIcon ? lockIcon.closest('div') : null;

    if (lockRow && lockRow.parentElement) {
      return { panel: lockRow.parentElement, lockRow };
    }

    let panel = null;
    if (startIcon) {
      panel = startIcon.closest('div');
      let p = panel;
      while (p && p !== main) {
        if (lockIcon && p.contains(lockIcon)) {
          panel = p;
          break;
        }
        p = p.parentElement;
      }
    }

    if (!panel) {
      const title = Array.from(main.querySelectorAll('h1')).find((el) => {
        const txt = (el && el.textContent) ? el.textContent.trim() : '';
        return /WhatsApp/i.test(txt);
      });
      panel = title ? (title.closest('div') || title.parentElement) : null;
    }

    if (!panel) return null;

    return { panel, lockRow };
  }

  function removeIfAny() {
    const existing = document.getElementById('waap-onboarding-card');
    if (existing) existing.remove();
  }

  function buildSupportPrefillText() {
    try {
      const version = (() => {
        try {
          return chrome && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest().version || '') : '';
        } catch (e) {
          return '';
        }
      })();

      const el = document.documentElement;
      const diag = el && el.dataset ? {
        lastReason: el.dataset.waapOnboardingLastReason || '',
        mainFound: el.dataset.waapOnboardingMainFound || '',
        lockFound: el.dataset.waapOnboardingLockFound || '',
        hostFound: el.dataset.waapOnboardingHostFound || '',
        chatActive: el.dataset.waapOnboardingChatActive || '',
        injected: el.dataset.waapOnboardingInjected || ''
      } : null;

      const tz = (() => {
        try {
          return (Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : '';
        } catch (e) {
          return '';
        }
      })();

      const lines = [
        '【WhatsApp Assistant Pro+ Support】',
        `Version: ${version || 'unknown'}`,
        `URL: ${String(window.location && window.location.href ? window.location.href : '')}`,
        `Time: ${new Date().toISOString()}`,
        `Timezone: ${tz || 'unknown'}`,
        `Lang: ${String(navigator && navigator.language ? navigator.language : '')}`,
        `Platform: ${String(navigator && navigator.platform ? navigator.platform : '')}`,
        `UserAgent: ${String(navigator && navigator.userAgent ? navigator.userAgent : '')}`,
        diag ? `OnboardingDiag: reason=${diag.lastReason}, mainFound=${diag.mainFound}, lockFound=${diag.lockFound}, hostFound=${diag.hostFound}, chatActive=${diag.chatActive}, injected=${diag.injected}` : 'OnboardingDiag: unavailable'
      ];

      return lines.join('\n');
    } catch (e) {
      return '【WhatsApp Assistant Pro+ Support】\n(prefill unavailable)';
    }
  }

  function openWhatsAppWebChat(phoneDigits, prefillText) {
    const phone = String(phoneDigits || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(String(prefillText || ''));
    const url = `${window.location.origin}/send?phone=${phone}&text=${text}&type=phone_number&app_absent=0`;

    try {
      const next = new URL(url);
      const sameOrigin = next.origin === window.location.origin;
      if (sameOrigin && window.history && typeof window.history.pushState === 'function') {
        window.history.pushState({}, '', next.pathname + next.search + next.hash);
        window.dispatchEvent(new PopStateEvent('popstate'));

        const a = document.createElement('a');
        a.href = next.toString();
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 0);
        return;
      }
    } catch (e) {
      // ignore
    }

    try {
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 0);
      return;
    } catch (e) {
      // ignore
    }

    try {
      window.location.href = url;
    } catch (e) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e2) {
        // ignore
      }
    }
  }

  function inject() {
    try {
      ensureStyles();

      const state = window.__waapOnboardingPersonalizeState;
      state.injected = false;
      state.lastError = null;
      state.mainFound = !!document.getElementById('main');

      const now = Date.now();
      if (now - lastRunAt < 120) return;
      lastRunAt = now;

      state.chatActive = isChatActive();
      state.lockFound = !!document.querySelector('[data-icon="lock-outline"]');
      setDiag('running', {
        mainFound: state.mainFound,
        lockFound: state.lockFound,
        chatActive: state.chatActive,
        injected: false
      });
      if (state.chatActive) {
        state.lastReason = 'chat-active';
        setDiag('chat-active', { mainFound: state.mainFound, lockFound: state.lockFound, chatActive: true, injected: false });
        removeIfAny();
        return;
      }

      const host = getHost();
      state.hostFound = !!host;
      if (!host) {
        state.lastReason = 'host-not-found';
        setDiag('host-not-found', { mainFound: state.mainFound, lockFound: state.lockFound, hostFound: false, chatActive: false, injected: false });
        return;
      }

      if (document.getElementById('waap-onboarding-card')) return;

      const card = document.createElement('div');
      card.id = 'waap-onboarding-card';

      const privacyUrl = (() => {
        try {
          return chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('PrivacyPolicy.html') : 'PrivacyPolicy.html';
        } catch (e) {
          return 'PrivacyPolicy.html';
        }
      })();
      const licenseUrl = (() => {
        try {
          return chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('LICENSE') : 'LICENSE';
        } catch (e) {
          return 'LICENSE';
        }
      })();

      card.innerHTML = `
        <div class="waap-onboarding-card-inner">
          <div class="waap-onboarding-top">
            <div class="waap-onboarding-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path d="M12 2.2c5.41 0 9.8 4.39 9.8 9.8S17.41 21.8 12 21.8 2.2 17.41 2.2 12 6.59 2.2 12 2.2Z" stroke="currentColor" stroke-width="1.6" />
                <path d="M8.1 12.2l2.4 2.4 5.4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="waap-onboarding-headings">
              <div class="waap-onboarding-title">WhatsApp Assistant Pro+ 已注入</div>
              <div class="waap-onboarding-subtitle"> AI 翻译、快捷翻译、时间天气等高级辅助能力，让你的工作流更快更稳。</div>
            </div>
            <div aria-hidden="true"></div>
          </div>
          <div class="waap-onboarding-actions">
            <button type="button" class="waap-onboarding-btn waap-onboarding-btn-secondary" data-action="open-guide">使用说明</button>
            <button type="button" class="waap-onboarding-btn" data-action="open-settings">打开设置</button>
            <button type="button" class="waap-onboarding-btn" data-action="open-privacy">查看本地记录的隐私内容</button>
            <button type="button" class="waap-onboarding-btn waap-onboarding-btn-secondary" data-action="open-update">更新说明</button>
          </div>

          <div class="waap-divider"></div>

          <div class="waap-author">
            <div class="waap-author-left">
              <img class="waap-author-avatar" src="https://avatars.githubusercontent.com/u/179492542?v=4" alt="Achord" />
              <div>
                <div class="waap-author-name">Achord</div>
                <div class="waap-author-sub">Email: <a href="mailto:achordchan@gmail.com" style="color: inherit; text-decoration: none;">achordchan@gmail.com</a></div>
              </div>
            </div>

            <div class="waap-links">
              <a class="waap-link" href="https://www.github.com/Achordchan/WA-AI-chrome" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                <span>项目仓库</span>
              </a>
              <a class="waap-link" href="${privacyUrl}" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Z"/></svg>
                <span>隐私条款</span>
              </a>
              <a class="waap-link" href="${licenseUrl}" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z"/></svg>
                <span>开源协议</span>
              </a>
              <a class="waap-link" href="https://ifdian.net/a/achord" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.35-10-9.5C-.37 6.9 3.04 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 20.96 2 24.37 6.9 22 11.5 19 16.65 12 21 12 21z"/></svg>
                <span>赞助我</span>
              </a>
              <a class="waap-link" href="#" data-action="contact-achord">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-2 11H6v-2h12v2Zm0-3H6V8h12v2Zm0-3H6V5h12v2Z"/></svg>
                <span>联系 Achord</span>
              </a>
              <a class="waap-link" href="https://chrome.google.com/webstore/detail/whatsapp-assistant-pro%20/ijdbbpgihmfldjbanfkpbhkkciglcenp?hl=zh-CN&utm_source=chrome-ntp-icon" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.5 19h-6c-.52 0-1-.36-1-.87V7.27C7.5 5.84 8.08 5 9 5s1.5.84 1.5 1.27V10.13c0 .51-.37 1.01-1 1.49ZM12 5c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3Z"/></svg>
                <span>Chrome 应用商店</span>
              </a>
            </div>
          </div>
        </div>
      `;

      if (host.lockRow && host.lockRow.parentElement) {
        host.lockRow.parentElement.insertBefore(card, host.lockRow);
      } else {
        host.panel.appendChild(card);
      }

      state.injected = true;
      state.lastInjectAt = Date.now();
      state.lastReason = 'injected';
      setDiag('injected', { mainFound: state.mainFound, lockFound: state.lockFound, hostFound: true, chatActive: false, injected: true });

      card.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
        if (!btn) return;

        try {
          if (btn.tagName === 'A') e.preventDefault();
        } catch (e2) {
          // ignore
        }

        const action = btn.getAttribute('data-action');
        if (action === 'open-settings') {
          if (typeof showSettingsModal === 'function') {
            showSettingsModal();
          } else {
            const settingsBtn = document.querySelector('.settings-btn');
            if (settingsBtn) settingsBtn.click();
          }
          return;
        }

        if (action === 'open-privacy') {
          if (typeof showSettingsModal === 'function') {
            showSettingsModal();
            setTimeout(() => {
              try {
                const modal = document.getElementById('settings-modal');
                const tab = modal ? modal.querySelector('.settings-tab[data-tab="privacy"]') : null;
                if (tab) tab.click();
              } catch (e2) {
                // ignore
              }
            }, 60);
          } else {
            const settingsBtn = document.querySelector('.settings-btn');
            if (settingsBtn) settingsBtn.click();
          }
          return;
        }

        if (action === 'open-update') {
          try {
            if (typeof window.showUpdateLogManually === 'function') {
              window.showUpdateLogManually();
            } else if (typeof window.checkAndShowUpdateLog === 'function') {
              window.checkAndShowUpdateLog();
            }
          } catch (e2) {
            // ignore
          }
          return;
        }

        if (action === 'contact-achord') {
          try {
            const prefill = buildSupportPrefillText();
            openWhatsAppWebChat('8615805200535', prefill);
          } catch (e2) {
            // ignore
          }
        }
      });
    } catch (e) {
      // ignore
    }
  }

  function setup() {
    try {
      if (observer) return;

      const schedule = () => {
        setTimeout(() => {
          inject();
        }, 0);
      };

      schedule();

      const connectObserver = () => {
        try {
          if (!observer) return;
          observer.disconnect();
          // 可靠优先：先全局监听，等注入成功后可以不再频繁触发（由节流控制）
          observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) {
          // ignore
        }
      };

      observer = new MutationObserver(() => {
        connectObserver();
        schedule();
      });

      connectObserver();

      setTimeout(() => {
        inject();
      }, 800);
    } catch (e) {
      // ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setup();
    });
  } else {
    setup();
  }
})();
