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

  function loadInputQuickTranslateSendSetting(deps = {}) {
    try {
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

          const target = e.target;
          if (!target || !(target instanceof HTMLElement)) return;
          const inputEl = target.closest('div[contenteditable="true"]');
          if (!inputEl) return;
          if (!inputEl.closest('footer._ak1i')) return;
          if (!inputEl.closest('.lexical-rich-text-input')) return;

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
          const targetLang = typeof getRememberedLanguage === 'function' ? getRememberedLanguage(chatWindow) : 'en';

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
          const ok = await applyTextToInputBox(deps, inputEl, applied, { allowClipboard: false });
          if (ok) {
            try {
              const glowTarget = inputEl.closest('.lexical-rich-text-input') || inputEl;
              glowTarget.classList.add('waai-quick-send-glow');
              const setTimeoutFn = deps.setTimeout || window.setTimeout;
              setTimeoutFn(() => glowTarget.classList.remove('waai-quick-send-glow'), 980);
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
            const target = e.target;
            if (target && target instanceof HTMLElement) {
              const inputEl = target.closest && target.closest('div[contenteditable="true"]');
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
            }
          } catch (e2) {
            // ignore
          }
          showQuickSendToast(deps, '翻译失败: ' + (err?.message || '未知错误'), true, 1800);
        } finally {
          try {
            const target = e.target;
            if (target && target instanceof HTMLElement) {
              const inputEl = target.closest && target.closest('div[contenteditable="true"]');
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
