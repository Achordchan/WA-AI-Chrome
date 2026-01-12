(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.translationView) return;

  function isDarkMode() {
    try {
      return (
        document.body.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
        document.documentElement.getAttribute('data-theme') === 'dark'
      );
    } catch (e) {
      return false;
    }
  }

  function toggleExisting(messageContainer) {
    try {
      if (!messageContainer) return false;
      const existingTranslation = messageContainer.querySelector('.translation-content');
      if (!existingTranslation) return false;

      if (existingTranslation.style.display === 'none') {
        existingTranslation.style.display = 'block';
        const thinkingContent = messageContainer.querySelector('.thinking-content');
        if (thinkingContent) {
          thinkingContent.style.display = 'block';
        }
      } else {
        existingTranslation.style.display = 'none';
        const thinkingContent = messageContainer.querySelector('.thinking-content');
        if (thinkingContent) {
          thinkingContent.style.display = 'none';
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function renderLoading(messageContainer) {
    try {
      const el = document.createElement('div');
      el.className = 'translation-loading';
      el.innerHTML = '翻译中<span class="loading-dots"></span>';
      messageContainer.appendChild(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  function renderError(messageContainer, message, autoRemoveMs = 3000) {
    try {
      const el = document.createElement('div');
      el.className = 'translation-error';
      el.textContent = `翻译失败: ${message || '未知错误'}`;
      messageContainer.appendChild(el);
      if (autoRemoveMs > 0) {
        setTimeout(() => {
          try {
            if (messageContainer.contains(el)) {
              messageContainer.removeChild(el);
            }
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

  function renderThinking(messageContainer, thinkingText, darkMode) {
    try {
      const el = document.createElement('div');
      el.className = 'thinking-content';

      if (darkMode) {
        el.style.cssText = `
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
        el.style.cssText = `
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

      el.textContent = '';
      messageContainer.appendChild(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  function formatMeta(meta) {
    try {
      if (!meta || typeof meta !== 'object') return '';
      const displayServiceName = (raw) => {
        try {
          const s = String(raw || '').trim();
          if (!s) return 'N/A';
          if (s === 'siliconflow') return 'OpenAI(兼容)';
          if (s === 'google') return 'Google';
          return s;
        } catch (e) {
          return 'N/A';
        }
      };

      const service = displayServiceName(meta.service);
      const model = meta.model ? String(meta.model) : 'N/A';
      const latencyMsRaw = meta.latencyMs ?? meta.durationMs;
      const latencyMs = Number.isFinite(Number(latencyMsRaw)) ? Math.round(Number(latencyMsRaw)) : null;

      const usage = meta.usage && typeof meta.usage === 'object' ? meta.usage : null;
      const totalTokens = usage && usage.total_tokens != null ? usage.total_tokens : null;

      const latencyText = latencyMs != null ? `${latencyMs}ms` : 'N/A';
      const tokenText = totalTokens != null ? String(totalTokens) : 'N/A';
      return `服务：${service}  模型：${model}  响应：${latencyText}  Token：${tokenText}`;
    } catch (e) {
      return '';
    }
  }

  function buildMetaPopover(meta) {
    try {
      const safeMeta = meta && typeof meta === 'object' ? meta : null;
      const usage = safeMeta?.usage && typeof safeMeta.usage === 'object' ? safeMeta.usage : null;
      const totalTokens = usage && usage.total_tokens != null ? usage.total_tokens : null;
      const latencyMsRaw = safeMeta?.latencyMs ?? safeMeta?.durationMs;
      const latencyMs = Number.isFinite(Number(latencyMsRaw)) ? Math.round(Number(latencyMsRaw)) : null;

      const model = safeMeta?.model ? String(safeMeta.model) : 'N/A';
      const latencyText = latencyMs != null ? `${latencyMs} ms` : 'N/A';
      const tokenText = totalTokens != null ? String(totalTokens) : 'N/A';

      const pop = document.createElement('div');
      pop.className = 'translation-meta-popover';
      pop.setAttribute('role', 'dialog');

      pop.innerHTML = `
        <div class="translation-meta-popover-card">
          <div class="translation-meta-popover-title">
            <span class="translation-meta-popover-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.1 13.4-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z"/></svg>
            </span>
            <span>AI 请求已完成</span>
          </div>
          <div class="translation-meta-popover-body">
            <div class="translation-meta-row"><div class="translation-meta-label">模型</div><div class="translation-meta-value">${model}</div></div>
            <div class="translation-meta-row"><div class="translation-meta-label">运行时间</div><div class="translation-meta-value">${latencyText}</div></div>
            <div class="translation-meta-row"><div class="translation-meta-label">预计消耗</div><div class="translation-meta-value">Token 数：${tokenText}</div></div>
          </div>
          <div class="translation-meta-popover-actions">
            <button type="button" class="translation-meta-retry" aria-label="重新翻译">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 6h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L14 10h6V4l-2.35 2.35Z"/></svg>
              <span>重新翻译</span>
            </button>
          </div>
        </div>
      `;

      return pop;
    } catch (e) {
      return null;
    }
  }

  function positionPopover(popover, anchorEl) {
    try {
      if (!popover || !anchorEl) return;

      const rect = anchorEl.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      const anchorTop = rect.top;
      const anchorBottom = rect.bottom;

      const padding = 10;

      // 先隐藏测量尺寸
      popover.style.visibility = 'hidden';
      popover.style.left = '0px';
      popover.style.top = '0px';

      const popRect = popover.getBoundingClientRect();
      const popW = popRect.width || 280;
      const popH = popRect.height || 160;

      const spaceAbove = anchorTop;
      const spaceBelow = window.innerHeight - anchorBottom;
      const preferAbove = spaceAbove >= popH + 14 || spaceAbove >= spaceBelow;

      let top;
      if (preferAbove) {
        top = Math.max(padding, anchorTop - popH - 10);
        popover.classList.add('is-above');
        popover.classList.remove('is-below');
      } else {
        top = Math.min(window.innerHeight - popH - padding, anchorBottom + 10);
        popover.classList.add('is-below');
        popover.classList.remove('is-above');
      }

      let left = anchorX - popW / 2;
      left = Math.max(padding, Math.min(left, window.innerWidth - popW - padding));

      const arrowX = Math.max(14, Math.min(anchorX - left, popW - 14));
      popover.style.setProperty('--waap-arrow-x', `${Math.round(arrowX)}px`);

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
      popover.style.visibility = 'visible';
    } catch (e) {
      try {
        popover.style.visibility = 'visible';
      } catch (e2) {
        // ignore
      }
    }
  }

  function renderTranslation(messageContainer, translationText, darkMode, onAfterAppend, options = {}) {
    try {
      const translationElement = document.createElement('div');
      translationElement.className = 'translation-content';
      translationElement.style.position = 'relative';

      if (darkMode) {
        translationElement.style.cssText = `
          background-color: rgba(60, 150, 80, 0.2);
          border-left: 3px solid #4ade80;
          padding: 10px;
          margin-top: 5px;
          font-size: 0.95em;
          white-space: pre-wrap;
          border-radius: 0 5px 5px 0;
          color: #e0e0e0;
        `;
      } else {
        translationElement.style.cssText = `
          background-color: rgba(232, 245, 233, 0.8);
          border-left: 3px solid #4CAF50;
          padding: 10px;
          margin-top: 5px;
          font-size: 0.95em;
          white-space: pre-wrap;
          border-radius: 0 5px 5px 0;
          color: #333;
        `;
      }

      const infoBtn = document.createElement('button');
      infoBtn.className = 'translation-toolbar-btn translation-info-btn';
      infoBtn.type = 'button';
      infoBtn.textContent = 'i';
      infoBtn.setAttribute('aria-label', '翻译信息');

      const textEl = document.createElement('div');
      textEl.className = 'translation-text';
      textEl.textContent = translationText || '';

      const headerRow = document.createElement('div');
      headerRow.className = 'translation-header';
      headerRow.appendChild(textEl);
      headerRow.appendChild(infoBtn);

      translationElement.appendChild(headerRow);
      messageContainer.appendChild(translationElement);

      let popover = null;
      let outsideHandler = null;
      let repositionHandler = null;

      try {
        infoBtn.addEventListener('click', (evt) => {
          try {
            evt?.stopPropagation?.();
          } catch (e) {
            // ignore
          }

          try {
            const metaText = formatMeta(options?.meta);
            if (!metaText) return;

            if (popover && translationElement.contains(popover)) {
              try {
                popover.remove();
              } catch (e) {
                // ignore
              }
              popover = null;
              if (outsideHandler) {
                try {
                  document.removeEventListener('click', outsideHandler, true);
                } catch (e2) {
                  // ignore
                }
              }
              outsideHandler = null;
              if (repositionHandler) {
                try {
                  window.removeEventListener('resize', repositionHandler);
                  window.removeEventListener('scroll', repositionHandler, true);
                } catch (e3) {
                  // ignore
                }
              }
              repositionHandler = null;
              return;
            }

            popover = buildMetaPopover(options?.meta);
            if (!popover) return;
            try {
              popover.style.position = 'fixed';
            } catch (e) {
              // ignore
            }
            document.body.appendChild(popover);
            positionPopover(popover, infoBtn);

            try {
              popover.addEventListener('click', (e) => e.stopPropagation());
            } catch (e) {
              // ignore
            }

            try {
              const retryEl = popover.querySelector('.translation-meta-retry');
              retryEl?.addEventListener('click', async () => {
                try {
                  const fn = options?.onRetry;
                  if (typeof fn !== 'function') return;
                  retryEl.disabled = true;
                  translationElement.classList.add('is-retranslating');
                  await fn();
                } catch (e) {
                  // ignore
                } finally {
                  try {
                    retryEl.disabled = false;
                    translationElement.classList.remove('is-retranslating');
                  } catch (e2) {
                    // ignore
                  }
                }
              });
            } catch (e) {
              // ignore
            }

            outsideHandler = (e) => {
              try {
                if (!popover) return;
                if (e?.target === infoBtn) return;
                if (popover.contains(e?.target)) return;
                try {
                  popover.remove();
                } catch (e2) {
                  // ignore
                }
                popover = null;
                if (outsideHandler) {
                  try {
                    document.removeEventListener('click', outsideHandler, true);
                  } catch (e3) {
                    // ignore
                  }
                }
                outsideHandler = null;
                if (repositionHandler) {
                  try {
                    window.removeEventListener('resize', repositionHandler);
                    window.removeEventListener('scroll', repositionHandler, true);
                  } catch (e4) {
                    // ignore
                  }
                }
                repositionHandler = null;
              } catch (e4) {
                // ignore
              }
            };

            try {
              document.addEventListener('click', outsideHandler, true);
            } catch (e) {
              // ignore
            }

            repositionHandler = () => {
              try {
                if (!popover) return;
                if (!document.contains(infoBtn)) {
                  try {
                    popover.remove();
                  } catch (e) {
                    // ignore
                  }
                  popover = null;
                  return;
                }
                positionPopover(popover, infoBtn);
              } catch (e) {
                // ignore
              }
            };

            try {
              window.addEventListener('resize', repositionHandler);
              window.addEventListener('scroll', repositionHandler, true);
            } catch (e) {
              // ignore
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      try {
        onAfterAppend?.(translationElement);
      } catch (e) {
        // ignore
      }
      return translationElement;
    } catch (e) {
      return null;
    }
  }

  function ensureConfirmStyles() {
    try {
      if (document.querySelector('#waap-translate-confirm-style')) return;
      const styleElement = document.createElement('style');
      styleElement.id = 'waap-translate-confirm-style';
      styleElement.textContent = `
        .confirm-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .confirm-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 400px;
        }

        .confirm-content h3 {
          margin: 0 0 12px;
          color: #41525d;
          font-size: 16px;
        }

        .confirm-content p {
          margin: 0 0 20px;
          color: #667781;
          font-size: 14px;
          line-height: 1.5;
        }

        .confirm-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .confirm-buttons button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #f0f2f5;
          color: #667781;
        }

        .cancel-btn:hover {
          background: #e9edef;
        }

        .confirm-btn {
          background: #00a884;
          color: white;
        }

        .confirm-btn:hover {
          background: #008f72;
        }
      `;
      document.head.appendChild(styleElement);
    } catch (e) {
      // ignore
    }
  }

  function showTranslateAllConfirm(onConfirm) {
    ensureConfirmStyles();

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
      <div class="confirm-content">
        <h3>批量翻译确认</h3>
        <p>该操作将使用Google翻译来翻译当前聊天记录中显示的所有消息。</p>
        <p style="color: #00a884; margin-top: 8px;">注：此功能将直接调用Google翻译，不支持其他模型，无思考过程。</p>
        <div class="confirm-buttons">
          <button class="cancel-btn" type="button">取消</button>
          <button class="confirm-btn" type="button">确认翻译</button>
        </div>
      </div>
    `;

    document.body.appendChild(confirmDialog);

    const cleanup = () => {
      try {
        confirmDialog.remove();
      } catch (e) {
        // ignore
      }
    };

    try {
      confirmDialog.querySelector('.cancel-btn').onclick = () => {
        cleanup();
      };

      confirmDialog.querySelector('.confirm-btn').onclick = () => {
        cleanup();
        try {
          onConfirm?.();
        } catch (e) {
          // ignore
        }
      };

      confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) cleanup();
      });
    } catch (e) {
      // ignore
    }

    return cleanup;
  }

  window.WAAP.views.translationView = {
    showTranslateAllConfirm,
    isDarkMode,
    toggleExisting,
    renderLoading,
    renderError,
    renderThinking,
    renderTranslation
  };
})();
