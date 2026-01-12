(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.translationPresenter) return;

  function safeExtractMetaFromTranslation(translation) {
    try {
      if (!translation) return null;
      if (typeof translation === 'object' && translation.meta && typeof translation.meta === 'object') {
        return translation.meta;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async function safeReadServiceInfo() {
    const info = { service: null, model: null, apiUrl: null };
    try {
      const settingsFn = window.getTranslationSettings;
      if (typeof settingsFn === 'function') {
        const s = await settingsFn();
        if (s && typeof s === 'object' && s.service) info.service = s.service;
      }
    } catch (e) {
      // ignore
    }

    try {
      const serviceFn = window.getTranslationService;
      if (typeof serviceFn === 'function') {
        const s = await serviceFn();
        if (s && typeof s === 'object') {
          if (s.model) info.model = s.model;
          if (s.apiUrl) info.apiUrl = s.apiUrl;
        }
      }
    } catch (e) {
      // ignore
    }
    return info;
  }

  async function translateMessage(messageElement, deps = {}) {
    try {
      if (!messageElement) return false;

      let messageContainer = messageElement.closest?.('.message-container');
      if (!messageContainer) {
        messageContainer = messageElement.parentElement || messageElement;
        try {
          messageContainer.classList.add('message-container');
        } catch (e) {
          // ignore
        }
      }

      const view = window.WAAP?.views?.translationView;
      if (!view) return false;

      if (view.toggleExisting?.(messageContainer)) {
        try {
          deps.maybeScrollChatToBottom?.(messageContainer);
        } catch (e) {
          // ignore
        }
        return true;
      }

      const loadingElement = view.renderLoading?.(messageContainer);

      try {
        const textElement = deps.getMessageTextRoot?.(messageElement);
        if (!textElement) {
          try {
            if (loadingElement && messageContainer.contains(loadingElement)) messageContainer.removeChild(loadingElement);
          } catch (e) {
            // ignore
          }
          return false;
        }

        const text = deps.collectTextContent?.(textElement);
        if (!text) {
          try {
            if (loadingElement && messageContainer.contains(loadingElement)) messageContainer.removeChild(loadingElement);
          } catch (e) {
            // ignore
          }
          return false;
        }

        const translateFn = deps.translateText;
        if (typeof translateFn !== 'function') {
          throw new Error('翻译函数不可用');
        }

        const requestStartAt = Date.now();
        const translation = await translateFn(text);
        const durationMs = Math.max(0, Date.now() - requestStartAt);

        const serviceInfo = await safeReadServiceInfo();
        const metaFromTranslation = safeExtractMetaFromTranslation(translation) || {};
        const meta = {
          ...metaFromTranslation,
          service: metaFromTranslation.service || serviceInfo.service,
          model: metaFromTranslation.model || serviceInfo.model,
          apiUrl: metaFromTranslation.apiUrl || serviceInfo.apiUrl,
          latencyMs: metaFromTranslation.latencyMs ?? durationMs
        };

        try {
          if (loadingElement && messageContainer.contains(loadingElement)) messageContainer.removeChild(loadingElement);
        } catch (e) {
          // ignore
        }

        const darkMode = view.isDarkMode?.() === true;

        const onRetry = async () => {
          try {
            messageContainer
              .querySelectorAll('.translation-content,.thinking-content,.translation-loading,.translation-error')
              .forEach((n) => {
                try {
                  n.remove();
                } catch (e) {
                  // ignore
                }
              });
          } catch (e) {
            // ignore
          }

          try {
            await translateMessage(messageElement, deps);
          } catch (e2) {
            // ignore
          }
        };

        if (translation && typeof translation === 'object' && translation.hasThinking) {
          if (translation.thinking) {
            const thinkingEl = view.renderThinking?.(messageContainer, translation.thinking, darkMode);
            if (thinkingEl && typeof deps.typeWriter === 'function') {
              deps.typeWriter(thinkingEl, translation.thinking, 5, () => {
                view.renderTranslation?.(messageContainer, translation.translation, darkMode, () => {
                  deps.maybeScrollChatToBottom?.(messageContainer);
                }, { meta, onRetry });
              });
            } else {
              view.renderTranslation?.(messageContainer, translation.translation, darkMode, () => {
                deps.maybeScrollChatToBottom?.(messageContainer);
              }, { meta, onRetry });
            }
          } else {
            view.renderTranslation?.(messageContainer, translation.translation, darkMode, () => {
              deps.maybeScrollChatToBottom?.(messageContainer);
            }, { meta, onRetry });
          }
        } else {
          view.renderTranslation?.(messageContainer, translation, darkMode, () => {
            deps.maybeScrollChatToBottom?.(messageContainer);
          }, { meta, onRetry });
        }

        return true;
      } catch (error) {
        try {
          if (loadingElement && messageContainer.contains(loadingElement)) {
            messageContainer.removeChild(loadingElement);
          }
        } catch (e) {
          // ignore
        }

        view.renderError?.(messageContainer, error?.message || '未知错误');
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  function confirmTranslateAll(messageContainer, deps = {}) {
    try {
      const view = window.WAAP?.views?.translationView;
      if (!view?.showTranslateAllConfirm) {
        return false;
      }

      view.showTranslateAllConfirm(async () => {
        try {
          const fn = deps.translateAllMessages || window.translateAllMessages;
          if (typeof fn === 'function') {
            await fn(messageContainer);
          }
        } catch (e) {
          // ignore
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.translationPresenter = {
    confirmTranslateAll,
    translateMessage
  };
})();
