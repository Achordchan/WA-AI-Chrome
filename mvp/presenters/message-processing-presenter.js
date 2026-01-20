(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.messageProcessingPresenter) return;

  function getMessageTextRoot(messageElement) {
    if (!messageElement) return null;

    const isInsideQuotedBlock = (el) => {
      try {
        if (!el) return false;
        const qa = el.closest('[data-testid*="quoted"], [data-testid*="reply"], [aria-label*="引用"], [aria-label*="回复"]');
        return !!(qa && messageElement.contains(qa));
      } catch (e) {
        return false;
      }
    };

    const selectable = messageElement.querySelector('.selectable-text');
    if (selectable && !isInsideQuotedBlock(selectable)) return selectable;

    const candidates = messageElement.querySelectorAll('span[dir], div[dir]');
    let best = null;
    let bestLen = 0;
    let bestQuoted = null;
    let bestQuotedLen = 0;
    candidates.forEach((el) => {
      const inQuoted = isInsideQuotedBlock(el);
      const t = (el.textContent || '').replace(/\u200e/g, '').trim();
      if (!t) return;
      if (/^\d{1,2}:\d{2}$/.test(t)) return;
      if (t === 'msg-dblcheck') return;
      if (inQuoted) {
        if (t.length > bestQuotedLen) {
          bestQuoted = el;
          bestQuotedLen = t.length;
        }
        return;
      }
      if (t.length > bestLen) {
        best = el;
        bestLen = t.length;
      }
    });
    if (best) return best;
    if (bestQuoted) return bestQuoted;

    if (messageElement.classList && messageElement.classList.contains('copyable-text')) {
      return messageElement;
    }

    return messageElement;
  }

  function addTranslateButton(messageElement, deps = {}) {
    try {
      if (!messageElement) return false;

      const hasVoice = (() => {
        try {
          if (messageElement.querySelector('audio')) return true;
        } catch (e) {
          // ignore
        }
        try {
          return !!(
            messageElement.querySelector('[aria-label="语音消息"]') ||
            messageElement.querySelector('[aria-label="Voice message"]') ||
            messageElement.querySelector('button[aria-label*="播放语音"]') ||
            messageElement.querySelector('button[aria-label*="Play voice"]')
          );
        } catch (e2) {
          return false;
        }
      })();
      if (hasVoice) return true;

      const getOrCreateButtonContainer = () => {
        try {
          const existing = messageElement.querySelector('.translate-btn-container');
          if (existing) return existing;

          const buttonContainer = document.createElement('span');
          buttonContainer.className = 'translate-btn-container';

          const getRoot = deps.getMessageTextRoot || getMessageTextRoot;
          const textRoot = getRoot(messageElement);
          if (textRoot && textRoot.firstChild) {
            textRoot.insertBefore(buttonContainer, textRoot.firstChild);
          } else if (textRoot) {
            textRoot.appendChild(buttonContainer);
          } else if (messageElement.firstChild) {
            messageElement.insertBefore(buttonContainer, messageElement.firstChild);
          } else {
            messageElement.appendChild(buttonContainer);
          }
          return buttonContainer;
        } catch (e) {
          return null;
        }
      };

      const container = getOrCreateButtonContainer();
      if (!container) return false;

      if (container.querySelector('.translate-btn[data-waap-kind="translate"]')) {
        return true;
      }

      const translateBtn = document.createElement('button');
      translateBtn.className = 'translate-btn';
      translateBtn.setAttribute('data-waap-kind', 'translate');
      translateBtn.innerHTML = `译`;
      translateBtn.onclick = async (e) => {
        try {
          e.stopPropagation();
          e.preventDefault();
        } catch (e2) {
          // ignore
        }

        try {
          if (window.WAAP?.presenters?.translationPresenter?.translateMessage) {
            const ok = await window.WAAP.presenters.translationPresenter.translateMessage(messageElement, {
              translateText: deps.translateText,
              getMessageTextRoot: deps.getMessageTextRoot,
              collectTextContent: deps.collectTextContent,
              typeWriter: deps.typeWriter,
              maybeScrollChatToBottom: deps.maybeScrollChatToBottom
            });
            if (ok) return;
          }
        } catch (e3) {
          // ignore
        }

        try {
          const fn = deps.translateMessage;
          if (typeof fn === 'function') {
            await fn(messageElement);
          }
        } catch (e4) {
          // ignore
        }
      };

      container.appendChild(translateBtn);
      return true;
    } catch (e) {
      return false;
    }
  }

  function addVoiceTranscribeButton(messageElement, deps = {}) {
    try {
      if (!messageElement) return false;

      try {
        const enabled = typeof deps.isSttEnabled === 'function'
          ? deps.isSttEnabled()
          : window.WAAP?.state?.content?.sttEnabled === true;
        if (!enabled) return true;
      } catch (e) {
        // ignore
      }

      const hasVoice = (() => {
        try {
          if (messageElement.querySelector('audio')) return true;
        } catch (e) {
          // ignore
        }
        try {
          return !!(
            messageElement.querySelector('[aria-label="语音消息"]') ||
            messageElement.querySelector('[aria-label="Voice message"]') ||
            messageElement.querySelector('button[aria-label*="播放语音"]') ||
            messageElement.querySelector('button[aria-label*="Play voice"]')
          );
        } catch (e2) {
          return false;
        }
      })();

      if (!hasVoice) return true;

      const getOrCreateButtonContainer = () => {
        try {
          const existing = messageElement.querySelector('.translate-btn-container');
          if (existing) return existing;

          const buttonContainer = document.createElement('span');
          buttonContainer.className = 'translate-btn-container';

          const getRoot = deps.getMessageTextRoot || getMessageTextRoot;
          const textRoot = getRoot(messageElement);
          if (textRoot && textRoot.firstChild) {
            textRoot.insertBefore(buttonContainer, textRoot.firstChild);
          } else if (textRoot) {
            textRoot.appendChild(buttonContainer);
          } else if (messageElement.firstChild) {
            messageElement.insertBefore(buttonContainer, messageElement.firstChild);
          } else {
            messageElement.appendChild(buttonContainer);
          }
          return buttonContainer;
        } catch (e) {
          return null;
        }
      };

      const container2 = getOrCreateButtonContainer();
      if (!container2) return false;

      if (container2.querySelector('.translate-btn[data-waap-kind="voice"]')) {
        return true;
      }

      const voiceBtn = document.createElement('button');
      voiceBtn.className = 'translate-btn';
      voiceBtn.setAttribute('data-waap-kind', 'voice');
      voiceBtn.innerHTML = '听';
      voiceBtn.onclick = async (e) => {
        try {
          e.stopPropagation();
          e.preventDefault();
        } catch (e2) {
          // ignore
        }

        try {
          const p = window.WAAP?.presenters?.voiceTranscribePresenter;
          if (p?.transcribeMessage) {
            let targetMessage = messageElement;
            try {
              const btnEl = e?.currentTarget || voiceBtn;
              const owner = btnEl?.closest?.('div[tabindex="-1"], div[data-pre-plain-text]') || null;
              if (owner) targetMessage = owner;
            } catch (e0) {
              // ignore
            }

            await p.transcribeMessage(targetMessage, {
              chrome: deps.chrome || window.chrome,
              showToast: deps.showToast || window.showToast
            });
            return;
          }
        } catch (e3) {
          // ignore
        }
      };

      container2.appendChild(voiceBtn);
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeVoiceTranscribeButtons(root) {
    try {
      const scope = root || document;
      const buttons = scope.querySelectorAll('.translate-btn[data-waap-kind="voice"]');
      buttons.forEach((btn) => {
        try {
          btn.remove();
        } catch (e) {
          // ignore
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function processMessage(message, deps = {}) {
    try {
      if (!message) return false;

      try {
        const okRoot = (() => {
          try {
            if (!message.matches) return false;
            if (message.matches('div[data-pre-plain-text]')) return true;
            if (message.matches('div[tabindex="-1"]')) {
              return !!(
                message.querySelector?.('audio') ||
                message.querySelector?.('[aria-label="语音消息"]') ||
                message.querySelector?.('[aria-label="Voice message"]') ||
                message.querySelector?.('button[aria-label*="播放语音"]') ||
                message.querySelector?.('button[aria-label*="Play voice"]') ||
                message.querySelector?.('span[data-icon="audio-play"]') ||
                message.querySelector?.('span[data-icon="ptt-status"]')
              );
            }
            return false;
          } catch (e) {
            return false;
          }
        })();
        if (!okRoot) return false;
      } catch (e) {
        return false;
      }

      try {
        addTranslateButton(message, deps);
      } catch (e0) {
        // ignore
      }

      try {
        addVoiceTranscribeButton(message, deps);
      } catch (e1) {
        // ignore
      }

      if (!message.dataset.processed) {
        try {
          message.classList.add('message-wrapper');
          message.classList.add('waai-message');
          message.style.position = 'relative';
        } catch (e) {
          // ignore
        }

        message.dataset.processed = 'true';
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.messageProcessingPresenter = {
    getMessageTextRoot,
    addTranslateButton,
    addVoiceTranscribeButton,
    removeVoiceTranscribeButtons,
    processMessage
  };
})();
