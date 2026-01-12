(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.translateMessagePresenter) return;

  async function translateMessage(messageElement, deps = {}) {
    try {
      if (!messageElement) {
        return false;
      }

      let messageContainer = messageElement.closest?.('.message-container');
      if (!messageContainer) {
        messageContainer = messageElement.parentElement;
        if (!messageContainer) {
          messageContainer = messageElement;
        }
        try {
          messageContainer.classList.add('message-container');
        } catch (e) {
          // ignore
        }
      }

      try {
        const scroller = typeof deps.getChatScrollContainer === 'function' ? deps.getChatScrollContainer() : null;
        const shouldScroll = scroller && typeof deps.isNearBottom === 'function' ? deps.isNearBottom(scroller) : false;
        try {
          messageContainer.dataset.waaiShouldScrollBottom = shouldScroll ? 'true' : 'false';
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }

      const translationPresenter = window.WAAP?.presenters?.translationPresenter;
      try {
        if (translationPresenter?.translateMessage) {
          const ok = await translationPresenter.translateMessage(messageElement, {
            translateText: deps.translateText,
            getMessageTextRoot: deps.getMessageTextRoot,
            collectTextContent: deps.collectTextContent,
            typeWriter: deps.typeWriter,
            maybeScrollChatToBottom: deps.maybeScrollChatToBottom
          });
          if (ok) return true;
        }
      } catch (e) {
        // ignore
      }

      if (!deps.translateText || !deps.getMessageTextRoot || !deps.collectTextContent) {
        return false;
      }

      const existingTranslation = messageContainer.querySelector('.translation-content');
      if (existingTranslation) {
        if (existingTranslation.style.display === 'none') {
          existingTranslation.style.display = 'block';
          const thinkingContent = messageContainer.querySelector('.thinking-content');
          if (thinkingContent) {
            thinkingContent.style.display = 'block';
          }
          try {
            deps.maybeScrollChatToBottom?.(messageContainer);
          } catch (e) {
            // ignore
          }
        } else {
          existingTranslation.style.display = 'none';
          const thinkingContent = messageContainer.querySelector('.thinking-content');
          if (thinkingContent) {
            thinkingContent.style.display = 'none';
          }
        }
        return true;
      }

      const loadingElement = document.createElement('div');
      loadingElement.className = 'translation-loading';
      loadingElement.innerHTML = '翻译中<span class="loading-dots"></span>';
      messageContainer.appendChild(loadingElement);

      try {
        const textElement = deps.getMessageTextRoot(messageElement);

        if (!textElement) {
          try {
            messageContainer.removeChild(loadingElement);
          } catch (e) {
            // ignore
          }
          return true;
        }

        const text = deps.collectTextContent(textElement);
        if (!text) {
          try {
            messageContainer.removeChild(loadingElement);
          } catch (e) {
            // ignore
          }
          return true;
        }

        const requestStartAt = Date.now();
      const translation = await deps.translateText(text);
      const durationMs = Math.max(0, Date.now() - requestStartAt);

      let metaFromTranslation = null;
      try {
        if (translation && typeof translation === 'object' && translation.meta && typeof translation.meta === 'object') {
          metaFromTranslation = translation.meta;
        }
      } catch (e) {
        // ignore
      }

      let serviceInfo = {};
      try {
        const settingsFn = window.getTranslationSettings;
        const serviceFn = window.getTranslationService;
        const settings = typeof settingsFn === 'function' ? await settingsFn() : null;
        const service = settings?.service;
        const serviceCfg = typeof serviceFn === 'function' ? await serviceFn() : null;
        serviceInfo = {
          service,
          model: serviceCfg?.model,
          apiUrl: serviceCfg?.apiUrl
        };
      } catch (e) {
        // ignore
      }

      const meta = {
        ...(metaFromTranslation || {}),
        service: metaFromTranslation?.service || serviceInfo.service,
        model: metaFromTranslation?.model || serviceInfo.model,
        apiUrl: metaFromTranslation?.apiUrl || serviceInfo.apiUrl,
        latencyMs: metaFromTranslation?.latencyMs ?? durationMs
      };

        try {
          messageContainer.removeChild(loadingElement);
        } catch (e) {
          // ignore
        }

        if (!translation) return true;

        const isDarkMode =
          document.body.classList.contains('dark') ||
          (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
          document.documentElement.getAttribute('data-theme') === 'dark';

        if (typeof translation === 'object' && translation.hasThinking) {
          if (translation.thinking) {
            const thinkingElement = document.createElement('div');
            thinkingElement.className = 'thinking-content';

            if (isDarkMode) {
              thinkingElement.style.cssText = `
                background-color: rgba(20, 75, 150, 0.3);
                border-left: 3px solid #3b82f6;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #e0e0e0;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            } else {
              thinkingElement.style.cssText = `
                background-color: rgba(240, 247, 255, 0.8);
                border-left: 3px solid #2196F3;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #333;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            }

            thinkingElement.innerHTML = '';
            messageContainer.appendChild(thinkingElement);

            if (typeof deps.typeWriter === 'function') {
              deps.typeWriter(thinkingElement, translation.thinking, 5, () => {
                try {
                  if (typeof deps.displayTranslationResult === 'function') {
                    deps.displayTranslationResult(messageContainer, translation.translation, isDarkMode);
                  }
                } catch (e) {
                  // ignore
                }
              });
            } else {
              thinkingElement.textContent = String(translation.thinking || '');
              try {
                if (typeof deps.displayTranslationResult === 'function') {
                  deps.displayTranslationResult(messageContainer, translation.translation, isDarkMode, {
                    meta,
                    onRetry: async () => {
                      try {
                        messageContainer
                          .querySelectorAll('.translation-content,.thinking-content,.translation-loading,.translation-error')
                          .forEach((n) => n.remove());
                      } catch (e) {
                        // ignore
                      }
                      try {
                        await translateMessage(messageElement, deps);
                      } catch (e2) {
                        // ignore
                      }
                    }
                  });
                }
              } catch (e) {
                // ignore
              }
            }
          } else {
            try {
              if (typeof deps.displayTranslationResult === 'function') {
                deps.displayTranslationResult(messageContainer, translation.translation, isDarkMode, {
                  meta,
                  onRetry: async () => {
                    try {
                      messageContainer
                        .querySelectorAll('.translation-content,.thinking-content,.translation-loading,.translation-error')
                        .forEach((n) => n.remove());
                    } catch (e) {
                      // ignore
                    }
                    try {
                      await translateMessage(messageElement, deps);
                    } catch (e2) {
                      // ignore
                    }
                  }
                });
              }
            } catch (e) {
              // ignore
            }
          }
        } else {
          try {
            if (typeof deps.displayTranslationResult === 'function') {
              deps.displayTranslationResult(messageContainer, translation, isDarkMode, {
                meta,
                onRetry: async () => {
                  try {
                    messageContainer
                      .querySelectorAll('.translation-content,.thinking-content,.translation-loading,.translation-error')
                      .forEach((n) => n.remove());
                  } catch (e) {
                    // ignore
                  }
                  try {
                    await translateMessage(messageElement, deps);
                  } catch (e2) {
                    // ignore
                  }
                }
              });
            }
          } catch (e) {
            // ignore
          }
        }

        return true;
      } catch (error) {
        try {
          if (messageContainer.contains(loadingElement)) {
            loadingElement.textContent = `翻译失败: ${error?.message || ''}`;
            loadingElement.className = 'translation-error';
            setTimeout(() => {
              try {
                if (messageContainer.contains(loadingElement)) {
                  messageContainer.removeChild(loadingElement);
                }
              } catch (e) {
                // ignore
              }
            }, 3000);
          }
        } catch (e) {
          // ignore
        }
        return true;
      }
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.translateMessagePresenter = {
    translateMessage
  };
})();
