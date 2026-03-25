/*
用途：封装 input-translate.js 的“回车快捷翻译发送”状态机。
说明：把开关读取、事件监听、节流、等待 toast、写入输入框、glow 动效、取消替换等逻辑集中到 service，
      让 input-translate.js 更接近 orchestrator（薄 glue）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.inputQuickSendService) return;

  let inputQuickTranslateSendEnabled = false;

  let inputQuickSendListenerInstalled = false;
  let inputQuickSendLastAt = 0;
  const INPUT_QUICK_SEND_THROTTLE_MS = 900;
  const QUICK_SEND_GLOW_STYLE_ID = 'waai-input-quick-send-glow-style';
  const QUICK_SEND_TOAST_STYLE_ID = 'waap-input-translate-styles';

  const inputQuickSendStateByInput = new WeakMap();

  function getQuickSendState(el) {
    const s = inputQuickSendStateByInput.get(el);
    if (s) return s;
    const init = {
      stage: 'idle',
      sourceTextAtTranslate: '',
      appliedText: '',
      requestId: 0,
      waitToastEl: null,
      waitToastRequestId: 0
    };
    inputQuickSendStateByInput.set(el, init);
    return init;
  }

  function ensureQuickSendGlowStyle(deps = {}) {
    try {
      const doc = deps.document || window.document;
      if (!doc?.head) return false;
      if (doc.getElementById(QUICK_SEND_GLOW_STYLE_ID)) return true;

      const style = doc.createElement('style');
      style.id = QUICK_SEND_GLOW_STYLE_ID;
      style.textContent = `
        .waai-quick-send-glow {
          animation: waaiQuickSendGlow 0.98s ease-out;
          will-change: box-shadow, background-color, transform;
        }

        @keyframes waaiQuickSendGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
            background-color: rgba(0, 168, 132, 0);
            transform: translateY(0);
          }
          18% {
            box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.22), 0 0 0 8px rgba(0, 168, 132, 0.10);
            background-color: rgba(0, 168, 132, 0.07);
            transform: translateY(-1px);
          }
          65% {
            box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.12), 0 0 0 12px rgba(0, 168, 132, 0.03);
            background-color: rgba(0, 168, 132, 0.03);
            transform: translateY(0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 168, 132, 0);
            background-color: rgba(0, 168, 132, 0);
            transform: translateY(0);
          }
        }
      `;
      doc.head.appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureQuickSendToastStyle(deps = {}) {
    try {
      const doc = deps.document || window.document;
      if (!doc?.head) return false;
      if (doc.getElementById(QUICK_SEND_TOAST_STYLE_ID)) return true;

      const style = doc.createElement('style');
      style.id = QUICK_SEND_TOAST_STYLE_ID;
      style.textContent = `
        .translate-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 999999;
          animation: toastFade 0.3s ease;
        }

        .translate-toast-error {
          background: rgba(220, 38, 38, 0.9);
        }

        @keyframes toastFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `;
      doc.head.appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  function resolveQuickSendGlowTarget(inputEl) {
    try {
      if (!inputEl || !(inputEl instanceof HTMLElement)) return null;

      const candidates = [
        inputEl.closest('.lexical-rich-text-input'),
        inputEl.closest('[data-testid="compose-box"]'),
        inputEl.closest('footer'),
        inputEl.parentElement,
        inputEl
      ].filter(Boolean);

      for (const el of candidates) {
        try {
          if (!(el instanceof HTMLElement)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 40 && rect.height > 20) {
            return el;
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    return inputEl || null;
  }

  function loadInputQuickTranslateSendSetting(deps = {}) {
    try {
      ensureQuickSendGlowStyle(deps);
      const chromeRef = deps.chrome || window.chrome;
      if (!chromeRef?.storage?.sync) return;
      chromeRef.storage.sync.get(['inputQuickTranslateSend'], (data) => {
        inputQuickTranslateSendEnabled = data.inputQuickTranslateSend === true;
      });
    } catch (e) {
      // ignore
    }
  }

  function normalizeTextForCompare(s) {
    return String(s || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sleepMs(deps, ms) {
    const setTimeoutFn = deps?.setTimeout || window.setTimeout;
    return new Promise((r) => setTimeoutFn(r, ms));
  }

  function showQuickSendToast(deps, text, isError = false, duration = 1100) {
    try {
      const doc = deps?.document || window.document;
      const setTimeoutFn = deps?.setTimeout || window.setTimeout;
      ensureQuickSendToastStyle({ document: doc });

      const toast = doc.createElement('div');
      toast.className = isError ? 'translate-toast translate-toast-error' : 'translate-toast';
      toast.textContent = text;
      doc.body.appendChild(toast);
      if (duration > 0) {
        setTimeoutFn(() => toast.remove(), duration);
      }
      return toast;
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getWhatsappDomService() {
    try {
      return window.WAAP?.services?.whatsappDomService || null;
    } catch (e) {
      return null;
    }
  }

  function hasSendAction(scopeEl) {
    const domSvc = getWhatsappDomService();
    if (typeof domSvc?.hasSendAction === 'function') {
      return domSvc.hasSendAction(scopeEl);
    }
    try {
      if (!scopeEl || !scopeEl.querySelector) return false;
      return !!scopeEl.querySelector(
        'button[aria-label="发送"], button[title="发送"], [role="button"][aria-label="发送"], [role="button"][title="发送"], button[aria-label="Send"], button[title="Send"], [role="button"][aria-label="Send"], [role="button"][title="Send"]'
      );
    } catch (e) {
      return false;
    }
  }

  function getSendActionButton(scopeEl) {
    try {
      if (!scopeEl || !scopeEl.querySelectorAll) return null;
      return (
        Array.from(scopeEl.querySelectorAll('button, [role="button"]')).find((el) => {
          try {
            const label = `${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`.trim();
            return /发送|send/i.test(label);
          } catch (e) {
            return false;
          }
        }) || null
      );
    } catch (e) {
      return null;
    }
  }

  function getSendScopeForInput(inputEl) {
    try {
      if (!inputEl || !(inputEl instanceof HTMLElement)) return null;

      const domSvc = getWhatsappDomService();
      const main = typeof domSvc?.getMain === 'function' ? domSvc.getMain() : document.getElementById('main');
      const footer = typeof domSvc?.getMainFooter === 'function' ? domSvc.getMainFooter(main) : null;
      if (footer?.contains?.(inputEl)) {
        return footer;
      }

      return (
        inputEl.closest('.copyable-area') ||
        inputEl.closest('[role="dialog"]') ||
        inputEl.closest('[data-animate-modal-popup="true"]') ||
        inputEl.parentElement ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  function trySendCurrentInput(inputEl) {
    try {
      const scope = getSendScopeForInput(inputEl);
      const sendButton = getSendActionButton(scope);
      if (sendButton instanceof HTMLElement) {
        sendButton.click();
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  function isMediaCaptionInput(inputEl) {
    const domSvc = getWhatsappDomService();
    if (typeof domSvc?.isMediaCaptionInput === 'function') {
      return domSvc.isMediaCaptionInput(inputEl);
    }
    try {
      if (!inputEl || !(inputEl instanceof HTMLElement)) return false;

      const ariaLabel = String(inputEl.getAttribute('aria-label') || '').trim();
      const role = String(inputEl.getAttribute('role') || '').trim();
      if (role !== 'textbox') return false;
      if (!/^(输入消息|add a caption|caption)$/i.test(ariaLabel)) return false;

      const scope =
        inputEl.closest('.copyable-area') ||
        inputEl.parentElement ||
        inputEl.closest('div');
      if (!scope) return false;

      return hasSendAction(scope);
    } catch (e) {
      return false;
    }
  }

  function getChatInputFromTarget(deps, target) {
    try {
      if (!target || !(target instanceof HTMLElement)) return null;

      const inputEl = target.closest('div[contenteditable="true"]');
      if (!inputEl) return null;

      const domSvc = getWhatsappDomService();
      const doc = deps?.document || window.document;
      const main =
        (typeof domSvc?.getMain === 'function' ? domSvc.getMain() : null) ||
        doc.getElementById('main');
      if (!main || !main.contains(inputEl)) {
        return isMediaCaptionInput(inputEl) ? inputEl : null;
      }

      const activeTarget =
        (typeof domSvc?.getActiveInputTarget === 'function' ? domSvc.getActiveInputTarget(main) : null) ||
        null;
      if (activeTarget?.inputBox === inputEl) {
        return inputEl;
      }

      const footer =
        (typeof domSvc?.getMainFooter === 'function' ? domSvc.getMainFooter(main) : null) ||
        main.querySelector('footer') ||
        main.querySelector('[data-testid="compose-box"]');

      if (footer?.contains(inputEl)) {
        return inputEl;
      }

      const activeEditable =
        (typeof domSvc?.getChatEditable === 'function' ? domSvc.getChatEditable(footer) : null) ||
        main.querySelector('.lexical-rich-text-input div[contenteditable="true"]') ||
        main.querySelector('div[contenteditable="true"][role="textbox"]');

      if (activeEditable === inputEl) {
        return inputEl;
      }

      const ariaLabel = String(inputEl.getAttribute('aria-label') || '');
      if (inputEl.getAttribute('role') === 'textbox' && /发送|send/i.test(ariaLabel)) {
        return inputEl;
      }
    } catch (e) {
      // ignore
    }

    return null;
  }

  async function applyTextToInputBox(deps, richTextInput, text, options = {}) {
    if (!richTextInput) return false;

    const desired = normalizeTextForCompare(text);
    const allowClipboard = options.allowClipboard === true;

    try {
      richTextInput.focus();
    } catch (e) {
      // ignore
    }

    try {
      const doc = deps?.document || window.document;

      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

      const clearByKeys = () => {
        try {
          richTextInput.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'a',
              code: 'KeyA',
              ctrlKey: !isMac,
              metaKey: isMac,
              bubbles: true
            })
          );
          richTextInput.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Backspace',
              code: 'Backspace',
              bubbles: true
            })
          );
        } catch (e) {
          // ignore
        }
      };

      const isEmptyNow = () => {
        return normalizeTextForCompare(richTextInput.textContent) === '';
      };

      const forceClear = async () => {
        clearByKeys();
        await sleepMs(deps, 0);
        if (isEmptyNow()) return true;

        try {
          const selection = window.getSelection && window.getSelection();
          if (selection && doc.createRange) {
            const range = doc.createRange();
            range.selectNodeContents(richTextInput);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          if (doc.queryCommandSupported && doc.queryCommandSupported('delete')) {
            doc.execCommand('delete', false, null);
          }
        } catch (e) {
          // ignore
        }

        await sleepMs(deps, 0);
        if (isEmptyNow()) return true;

        try {
          richTextInput.textContent = '';
          richTextInput.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {
          // ignore
        }

        await sleepMs(deps, 0);
        return isEmptyNow();
      };

      const verifyNow = () => {
        const after = normalizeTextForCompare(richTextInput.textContent);
        return after && after === desired;
      };

      await forceClear();

      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);

        try {
          const beforeInputEv = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data: text
          });
          richTextInput.dispatchEvent(beforeInputEv);
        } catch (e) {
          // ignore
        }

        let pasteEvent;
        try {
          pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        } catch (e) {
          pasteEvent = doc.createEvent('Event');
          pasteEvent.initEvent('paste', true, true);
        }

        try {
          Object.defineProperty(pasteEvent, 'clipboardData', { value: dt });
        } catch (e) {
          // ignore
        }

        richTextInput.dispatchEvent(pasteEvent);

        try {
          richTextInput.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertFromPaste',
              data: text
            })
          );
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }

      await sleepMs(deps, 0);
      await sleepMs(deps, 0);
      if (verifyNow()) return true;

      await forceClear();
      try {
        const selection = window.getSelection && window.getSelection();
        if (selection && doc.createRange) {
          const range = doc.createRange();
          range.selectNodeContents(richTextInput);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        if (doc.queryCommandSupported && doc.queryCommandSupported('insertText')) {
          doc.execCommand('insertText', false, text);
          try {
            richTextInput.dispatchEvent(
              new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
              })
            );
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }

      await sleepMs(deps, 0);
      await sleepMs(deps, 0);
      if (verifyNow()) return true;

      if (!allowClipboard) {
        return false;
      }

      await forceClear();

      let clipboardOk = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          clipboardOk = true;
        }
      } catch (e) {
        clipboardOk = false;
      }

      if (!clipboardOk) {
        return false;
      }

      try {
        richTextInput.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            ctrlKey: !isMac,
            metaKey: isMac,
            bubbles: true
          })
        );
      } catch (e) {
        // ignore
      }

      try {
        richTextInput.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data: text
          })
        );
      } catch (e) {
        // ignore
      }

      await sleepMs(deps, 0);
      await sleepMs(deps, 0);
      return verifyNow();
    } catch (e) {
      return false;
    }
  }

  function installInputQuickTranslateSend(deps = {}) {
    if (inputQuickSendListenerInstalled) return;
    inputQuickSendListenerInstalled = true;

    const doc = deps.document || window.document;

    doc.addEventListener(
      'keydown',
      async (e) => {
        let myRequestId = 0;
        try {
          const getRememberedLanguage = deps.getRememberedLanguage;
          const modalTranslation = deps.modalTranslation;

          if (!inputQuickTranslateSendEnabled) return;
          if (e.key !== 'Enter') return;
          if (e.shiftKey) return;
          if (e.repeat) return;
          if (e.isComposing) return;

          const inputEl = getChatInputFromTarget(deps, e.target);
          if (!inputEl) return;

          const state = getQuickSendState(inputEl);

          const ensureWaitToast = () => {
            try {
              const docRef = deps.document || window.document;
              if (state.waitToastEl && docRef.body.contains(state.waitToastEl)) {
                try {
                  state.waitToastEl.textContent = '正在翻译中，请稍等…';
                } catch (e) {
                  // ignore
                }
                return;
              }

              const el = showQuickSendToast(deps, '正在翻译中，请稍等…', false, 0);
              if (el) {
                state.waitToastEl = el;
                state.waitToastRequestId = myRequestId || state.requestId || 0;
              }
            } catch (e) {
              // ignore
            }
          };

          const cleanupWaitToast = () => {
            try {
              if (!state.waitToastEl) return;
              if (state.waitToastRequestId && myRequestId && state.waitToastRequestId !== myRequestId) {
                return;
              }
              try {
                state.waitToastEl.remove();
              } catch (e) {
                // ignore
              }
              state.waitToastEl = null;
              state.waitToastRequestId = 0;
            } catch (e) {
              // ignore
            }
          };

          if (state.stage === 'translated_ready') {
            const nowTextNorm = normalizeTextForCompare(inputEl.textContent);
            const appliedNorm = normalizeTextForCompare(state.appliedText);
            if (nowTextNorm && appliedNorm && nowTextNorm === appliedNorm) {
              state.stage = 'idle';
              state.sourceTextAtTranslate = '';
              state.appliedText = '';
              return;
            }
            state.stage = 'idle';
            state.sourceTextAtTranslate = '';
            state.appliedText = '';
          }

          const now = Date.now();
          if (now - inputQuickSendLastAt < INPUT_QUICK_SEND_THROTTLE_MS) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
          }

          const sourceText = (inputEl.textContent || '').trim();
          if (!sourceText) return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (state.stage === 'translating') {
            ensureWaitToast();
            return;
          }

          state.requestId = (state.requestId || 0) + 1;
          myRequestId = state.requestId;

          state.stage = 'translating';
          state.sourceTextAtTranslate = sourceText;
          state.appliedText = '';
          inputQuickSendLastAt = now;
          ensureWaitToast();

          const chatWindow = doc.getElementById('main') || inputEl.closest('.app-wrapper-web') || doc;
          const targetLang = typeof getRememberedLanguage === 'function' ? await getRememberedLanguage(chatWindow) : 'en';

          if (typeof modalTranslation !== 'function') throw new Error('翻译函数不可用');

          const translation = await modalTranslation(sourceText, targetLang, 'normal');
          const finalText =
            translation && typeof translation === 'object' && translation.hasThinking
              ? translation.translation
              : translation;

          if (state.requestId !== myRequestId) {
            cleanupWaitToast();
            return;
          }

          const currentTextBeforeApplyNorm = normalizeTextForCompare(inputEl.textContent);
          const sourceAtTranslateNorm = normalizeTextForCompare(state.sourceTextAtTranslate);
          if (currentTextBeforeApplyNorm !== sourceAtTranslateNorm) {
            state.stage = 'idle';
            state.sourceTextAtTranslate = '';
            state.appliedText = '';
            cleanupWaitToast();
            showQuickSendToast(deps, '你刚刚修改了内容，已取消自动替换；请再按回车翻译', true, 1600);
            return;
          }

          const applied = String(finalText || '').trim();
          const appliedNorm = normalizeTextForCompare(applied);
          if (appliedNorm && appliedNorm === sourceAtTranslateNorm) {
            state.stage = 'idle';
            state.sourceTextAtTranslate = '';
            state.appliedText = '';
            cleanupWaitToast();

            const sent = trySendCurrentInput(inputEl);
            if (!sent) {
              showQuickSendToast(deps, '内容无需翻译，但自动发送失败，请再按一次回车', true, 1800);
            }
            return;
          }

          const ok = await applyTextToInputBox(deps, inputEl, applied, { allowClipboard: false });
          if (ok) {
            try {
              ensureQuickSendGlowStyle(deps);
              const glowTarget = resolveQuickSendGlowTarget(inputEl);
              if (glowTarget) {
                glowTarget.classList.remove('waai-quick-send-glow');
                try {
                  void glowTarget.offsetWidth;
                } catch (e) {
                  // ignore
                }
                glowTarget.classList.add('waai-quick-send-glow');
              }
              const setTimeoutFn = deps.setTimeout || window.setTimeout;
              setTimeoutFn(() => glowTarget?.classList.remove('waai-quick-send-glow'), 980);
            } catch (e2) {
              // ignore
            }

            state.stage = 'translated_ready';
            state.appliedText = (inputEl.textContent || '').trim() || applied;
            cleanupWaitToast();
          } else {
            state.stage = 'idle';
            state.sourceTextAtTranslate = '';
            state.appliedText = '';
            cleanupWaitToast();
            showQuickSendToast(deps, '翻译已完成，但写入输入框失败', true, 2000);
          }
        } catch (err) {
          try {
            const inputEl = getChatInputFromTarget(deps, e.target);
            if (inputEl) {
              const state = inputQuickSendStateByInput.get(inputEl);
              if (state && state.waitToastEl) {
                try {
                  state.waitToastEl.remove();
                } catch (e2) {
                  // ignore
                }
                state.waitToastEl = null;
                state.waitToastRequestId = 0;
              }
            }
          } catch (e2) {
            // ignore
          }
          showQuickSendToast(deps, '翻译失败: ' + (err?.message || '未知错误'), true, 1800);
        } finally {
          try {
            const inputEl = getChatInputFromTarget(deps, e.target);
            if (inputEl) {
              const state = inputQuickSendStateByInput.get(inputEl);
              if (state && state.stage === 'translating' && myRequestId && state.requestId === myRequestId) {
                state.stage = 'idle';
                state.sourceTextAtTranslate = '';
                state.appliedText = '';
                try {
                  if (state.waitToastEl && (!state.waitToastRequestId || state.waitToastRequestId === myRequestId)) {
                    state.waitToastEl.remove();
                    state.waitToastEl = null;
                    state.waitToastRequestId = 0;
                  }
                } catch (e3) {
                  // ignore
                }
              }
            }
          } catch (e2) {
            // ignore
          }
        }
      },
      true
    );
  }

  function ensureInstalled(deps = {}) {
    try {
      ensureQuickSendGlowStyle(deps);
      ensureQuickSendToastStyle(deps);
      loadInputQuickTranslateSendSetting(deps);

      try {
        const chromeRef = deps.chrome || window.chrome;
        if (chromeRef?.storage?.onChanged) {
          chromeRef.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'sync') return;
            if (!changes.inputQuickTranslateSend) return;
            inputQuickTranslateSendEnabled = changes.inputQuickTranslateSend.newValue === true;
          });
        }
      } catch (e) {
        // ignore
      }

      installInputQuickTranslateSend(deps);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.inputQuickSendService = {
    ensureInstalled,
    getQuickSendState
  };
})();
