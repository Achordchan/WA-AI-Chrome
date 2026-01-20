/*
用途：语音转写结果的渲染 View（loading / error / content），风格尽量贴近单条翻译输出。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.voiceTranscribeView) return;

  function toggleExisting(messageContainer) {
    try {
      if (!messageContainer) return false;
      const el = messageContainer.querySelector('.transcription-content');
      if (!el) return false;
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearTransient(messageContainer) {
    try {
      if (!messageContainer) return false;
      const loading = messageContainer.querySelector('.transcription-loading');
      if (loading) loading.remove();
      const err = messageContainer.querySelector('.transcription-error');
      if (err) err.remove();
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderLoading(messageContainer) {
    try {
      if (!messageContainer) return null;
      const existing = messageContainer.querySelector('.transcription-loading');
      if (existing) return existing;
      const el = document.createElement('div');
      el.className = 'transcription-loading';
      el.innerHTML = '转写中<span class="loading-dots"></span>';
      messageContainer.appendChild(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  function renderError(messageContainer, message, autoRemoveMs = 3000) {
    try {
      clearTransient(messageContainer);
      const el = document.createElement('div');
      el.className = 'transcription-error';
      el.textContent = `转写失败: ${message || '未知错误'}`;
      messageContainer.appendChild(el);
      if (autoRemoveMs > 0) {
        setTimeout(() => {
          try {
            if (messageContainer.contains(el)) messageContainer.removeChild(el);
          } catch (e) {
            // ignore
          }
        }, autoRemoveMs);
      }
      return el;
    } catch (e) {
      return null;
    }
  }

  function renderTranscription(messageContainer, transcript, translated) {
    try {
      const el = document.createElement('div');
      el.className = 'transcription-content';
      const t = (transcript || '').trim();

      const isDark = (() => {
        try {
          return (
            document.body.classList.contains('dark') ||
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
            document.documentElement.getAttribute('data-theme') === 'dark'
          );
        } catch (e) {
          return false;
        }
      })();

      const header = document.createElement('div');
      header.className = 'transcription-header';
      try {
        header.style.display = 'flex';
        header.style.alignItems = 'flex-start';
        header.style.gap = '8px';
      } catch (e) {
        // ignore
      }

      const translateBtn = document.createElement('button');
      translateBtn.className = 'translate-btn';
      translateBtn.type = 'button';
      translateBtn.textContent = '译';

      const textEl = document.createElement('div');
      textEl.className = 'transcription-text';
      textEl.textContent = t;

      const trWrap = document.createElement('div');
      trWrap.className = 'transcription-translation';

      header.appendChild(translateBtn);
      header.appendChild(textEl);
      el.appendChild(header);
      el.appendChild(trWrap);

      translateBtn.addEventListener('click', async (evt) => {
        try {
          evt?.stopPropagation?.();
          evt?.preventDefault?.();
        } catch (e) {
          // ignore
        }

        try {
          const tv = window.WAAP?.views?.translationView;
          if (tv?.toggleExisting && tv.toggleExisting(trWrap)) {
            return;
          }

          const orch = window.WAAP?.services?.translationOrchestratorService;
          if (!orch || typeof orch.translateText !== 'function') {
            tv?.renderError?.(trWrap, '翻译服务不可用');
            return;
          }

          const loading = tv?.renderLoading?.(trWrap);
          const requestStartAt = Date.now();
          const result = await orch.translateText(t);
          const durationMs = Math.max(0, Date.now() - requestStartAt);

          try {
            if (loading && trWrap.contains(loading)) trWrap.removeChild(loading);
          } catch (e3) {
            // ignore
          }

          const out = String(result || '').trim();
          if (!out) {
            tv?.renderError?.(trWrap, '未返回结果');
            return;
          }

          let metaFromTranslation = null;
          try {
            if (result && typeof result === 'object' && result.meta && typeof result.meta === 'object') {
              metaFromTranslation = result.meta;
            } else if (typeof result === 'string' || result instanceof String) {
              const metaMaybe = result.meta;
              if (metaMaybe && typeof metaMaybe === 'object') metaFromTranslation = metaMaybe;
            }
          } catch (e4) {
            // ignore
          }

          const meta = {
            ...(metaFromTranslation || {}),
            latencyMs: metaFromTranslation?.latencyMs ?? durationMs
          };
          try {
            const settingsFn = window.getTranslationSettings;
            if (typeof settingsFn === 'function') {
              const s = await settingsFn();
              if (s && typeof s === 'object' && s.service) meta.service = meta.service || s.service;
            }
          } catch (e4) {
            // ignore
          }
          try {
            const serviceFn = window.getTranslationService;
            if (typeof serviceFn === 'function') {
              const s = await serviceFn();
              if (s && typeof s === 'object') {
                if (s.model) meta.model = meta.model || s.model;
                if (s.apiUrl) meta.apiUrl = meta.apiUrl || s.apiUrl;
              }
            }
          } catch (e5) {
            // ignore
          }

          tv?.renderTranslation?.(trWrap, out, tv?.isDarkMode ? tv.isDarkMode() : isDark, null, { meta });
        } catch (e2) {
          try {
            const tv = window.WAAP?.views?.translationView;
            tv?.renderError?.(trWrap, e2?.message || '未知错误');
          } catch (e3) {
            // ignore
          }
        }
      });

      messageContainer.appendChild(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  window.WAAP.views.voiceTranscribeView = {
    toggleExisting,
    clearTransient,
    renderLoading,
    renderError,
    renderTranscription
  };
})();
