/*
用途：翻译渲染相关的 Service（从 content.js 迁移出来）。包含打字机效果 typeWriter 与翻译结果渲染 displayTranslationResult，便于 content.js 变薄。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.translationRenderService) return;

  function typeWriter(element, text, speed = 10, callback, deps = {}) {
    let i = 0;

    if (!element) {
      return {
        stop: () => {},
        finish: () => {}
      };
    }

    try {
      element.classList.add('typing');
    } catch (e) {
      // ignore
    }

    let adjustedSpeed = speed;
    try {
      if ((text || '').length > 1000) {
        adjustedSpeed = 1;
      } else if ((text || '').length > 500) {
        adjustedSpeed = 3;
      }
    } catch (e) {
      // ignore
    }

    const getCharSpeed = (char) => {
      try {
        if (['.', '!', '?', '。', '！', '？', '\n'].includes(char)) {
          return adjustedSpeed * 20;
        }
        if ([',', ';', '，', '；', '、'].includes(char)) {
          return adjustedSpeed * 10;
        }
        return adjustedSpeed;
      } catch (e) {
        return adjustedSpeed;
      }
    };

    const safeSetTimeout = deps.setTimeout || window.setTimeout;

    const typeNextChar = () => {
      try {
        if (i < (text || '').length) {
          const char = String(text || '').charAt(i);
          try {
            element.textContent += char;
          } catch (e) {
            // ignore
          }
          i++;

          try {
            element.scrollTop = element.scrollHeight;
          } catch (e) {
            // ignore
          }

          const nextDelay = getCharSpeed(char);
          safeSetTimeout(typeNextChar, nextDelay);
        } else {
          try {
            element.classList.remove('typing');
          } catch (e) {
            // ignore
          }
          if (typeof callback === 'function') {
            safeSetTimeout(callback, 500);
          }
        }
      } catch (e) {
        try {
          element.classList.remove('typing');
        } catch (e2) {
          // ignore
        }
      }
    };

    typeNextChar();

    return {
      stop: () => {
        i = (text || '').length;
        try {
          element.classList.remove('typing');
        } catch (e) {
          // ignore
        }
      },
      finish: () => {
        try {
          element.textContent = text;
        } catch (e) {
          // ignore
        }
        try {
          element.classList.remove('typing');
        } catch (e) {
          // ignore
        }
        if (typeof callback === 'function') {
          try {
            callback();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }

  function displayTranslationResult(container, translationText, isDarkMode, deps = {}) {
    try {
      if (!container) return false;

      const doc = deps.document || window.document;
      const translationElement = doc.createElement('div');
      translationElement.className = 'translation-content';
      try {
        translationElement.style.position = 'relative';
      } catch (e) {
        // ignore
      }

      if (isDarkMode) {
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

      const infoBtn = doc.createElement('button');
      infoBtn.className = 'translation-toolbar-btn translation-info-btn';
      infoBtn.type = 'button';
      infoBtn.textContent = 'i';
      infoBtn.setAttribute('aria-label', '翻译信息');

      const buildMetaPopover = (meta) => {
        try {
          const safeMeta = meta && typeof meta === 'object' ? meta : null;
          const usage = safeMeta?.usage && typeof safeMeta.usage === 'object' ? safeMeta.usage : null;
          const totalTokens = usage && usage.total_tokens != null ? usage.total_tokens : null;
          const latencyMsRaw = safeMeta?.latencyMs ?? safeMeta?.durationMs;
          const latencyMs = Number.isFinite(Number(latencyMsRaw)) ? Math.round(Number(latencyMsRaw)) : null;

          const model = safeMeta?.model ? String(safeMeta.model) : 'N/A';
          const latencyText = latencyMs != null ? `${latencyMs} ms` : 'N/A';
          const tokenText = totalTokens != null ? String(totalTokens) : 'N/A';

          const pop = doc.createElement('div');
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
      };

      const positionPopover = (popover, anchorEl) => {
        try {
          if (!popover || !anchorEl) return;

          const rect = anchorEl.getBoundingClientRect();
          const anchorX = rect.left + rect.width / 2;
          const anchorTop = rect.top;
          const anchorBottom = rect.bottom;

          const padding = 10;

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
      };

      const textEl = doc.createElement('div');
      textEl.className = 'translation-text';
      textEl.textContent = String(translationText ?? '');

      const headerRow = doc.createElement('div');
      headerRow.className = 'translation-header';
      headerRow.appendChild(textEl);
      headerRow.appendChild(infoBtn);

      translationElement.appendChild(headerRow);
      container.appendChild(translationElement);

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
            const metaText = deps.meta && typeof deps.meta === 'object' ? 'ok' : '';
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
                  doc.removeEventListener('click', outsideHandler, true);
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

            popover = buildMetaPopover(deps.meta);
            if (!popover) return;
            try {
              popover.style.position = 'fixed';
            } catch (e) {
              // ignore
            }
            doc.body.appendChild(popover);
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
                  const fn = deps.onRetry;
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
                    doc.removeEventListener('click', outsideHandler, true);
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
              doc.addEventListener('click', outsideHandler, true);
            } catch (e) {
              // ignore
            }

            repositionHandler = () => {
              try {
                if (!popover) return;
                if (!doc.contains(infoBtn)) {
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
        const fn = deps.maybeScrollChatToBottom;
        if (typeof fn === 'function') fn(container);
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.translationRenderService = {
    typeWriter,
    displayTranslationResult
  };
})();
