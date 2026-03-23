(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.messageProcessingPresenter) return;

  const TEXT_MESSAGE_ROOT_SELECTOR = 'div.copyable-text[data-pre-plain-text], div[data-pre-plain-text]';
  const VOICE_MESSAGE_ROOT_SELECTOR = 'div[tabindex="-1"][data-id], div[tabindex="-1"]';
  const VOICE_MARKER_SELECTOR =
    'span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]';

  function hasVoiceMarker(messageElement) {
    try {
      return !!(
        messageElement?.querySelector?.('audio') ||
        messageElement?.querySelector?.(VOICE_MARKER_SELECTOR)
      );
    } catch (e) {
      return false;
    }
  }

  function isVoiceMessage(messageElement) {
    try {
      return !!messageElement?.matches?.(VOICE_MESSAGE_ROOT_SELECTOR) && hasVoiceMarker(messageElement);
    } catch (e) {
      return false;
    }
  }

  function resolveMessageOwnerElement(target) {
    try {
      if (!target || !(target instanceof Element)) return null;
      if (target.matches(TEXT_MESSAGE_ROOT_SELECTOR)) return target;

      const textRoot = target.closest?.(TEXT_MESSAGE_ROOT_SELECTOR);
      if (textRoot) return textRoot;

      const voiceRoot = target.matches(VOICE_MESSAGE_ROOT_SELECTOR)
        ? target
        : target.closest?.(VOICE_MESSAGE_ROOT_SELECTOR);
      if (voiceRoot && hasVoiceMarker(voiceRoot)) return voiceRoot;
    } catch (e) {
      // ignore
    }
    return null;
  }

  function resolveButtonContainer(messageElement, deps = {}) {
    try {
      const owner = resolveMessageOwnerElement(messageElement) || messageElement;
      const existing = owner?.querySelector?.('.translate-btn-container');
      if (existing) return existing;

      const buttonContainer = document.createElement('span');
      buttonContainer.className = 'translate-btn-container';

      const getRoot = deps.getMessageTextRoot || getMessageTextRoot;
      const resolveVoiceAnchor = () => {
        try {
          const marker = owner.querySelector?.(VOICE_MARKER_SELECTOR);
          let node = marker?.parentElement || null;
          while (node && node !== owner) {
            const style = window.getComputedStyle(node);
            if (/(flex|inline-flex)/.test(style?.display || '') && node.children.length > 1) {
              return node;
            }
            node = node.parentElement;
          }
        } catch (e) {
          // ignore
        }
        return owner;
      };

      const anchorRoot = isVoiceMessage(owner) ? resolveVoiceAnchor() : getRoot(owner);
      if (anchorRoot && anchorRoot.firstChild) {
        anchorRoot.insertBefore(buttonContainer, anchorRoot.firstChild);
      } else if (anchorRoot) {
        anchorRoot.appendChild(buttonContainer);
      } else if (owner?.firstChild) {
        owner.insertBefore(buttonContainer, owner.firstChild);
      } else {
        owner?.appendChild?.(buttonContainer);
      }
      return buttonContainer;
    } catch (e) {
      return null;
    }
  }

  function getMessageTextRoot(messageElement) {
    const owner = resolveMessageOwnerElement(messageElement) || messageElement;
    if (!owner) return null;

    const isInsideQuotedBlock = (el) => {
      try {
        if (!el) return false;
        const qa = el.closest('[data-testid*="quoted"], [data-testid*="reply"], [aria-label*="引用"], [aria-label*="回复"]');
        return !!(qa && owner.contains(qa));
      } catch (e) {
        return false;
      }
    };

    const selectable = owner.querySelector('.selectable-text');
    if (selectable && !isInsideQuotedBlock(selectable)) return selectable;

    const candidates = owner.querySelectorAll('span[dir], div[dir]');
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

    if (owner.classList && owner.classList.contains('copyable-text')) {
      return owner;
    }

    return owner;
  }

  function addTranslateButton(messageElement, deps = {}) {
    try {
      const owner = resolveMessageOwnerElement(messageElement);
      if (!owner) return false;
      if (isVoiceMessage(owner)) return true;

      const container = resolveButtonContainer(owner, deps);
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
              const ok = await window.WAAP.presenters.translationPresenter.translateMessage(owner, {
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
            await fn(owner);
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
      const owner = resolveMessageOwnerElement(messageElement);
      if (!owner) return false;

      try {
        const enabled = typeof deps.isSttEnabled === 'function'
          ? deps.isSttEnabled()
          : window.WAAP?.state?.content?.sttEnabled === true;
        if (!enabled) return true;
      } catch (e) {
        // ignore
      }

      if (!isVoiceMessage(owner)) return true;

      const container2 = resolveButtonContainer(owner, deps);
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
            let targetMessage = owner;
            try {
              const btnEl = e?.currentTarget || voiceBtn;
              const buttonOwner = resolveMessageOwnerElement(btnEl);
              if (buttonOwner) targetMessage = buttonOwner;
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
      const owner = resolveMessageOwnerElement(message);
      if (!owner) return false;

      try {
        if (!resolveMessageOwnerElement(owner)) return false;
      } catch (e) {
        return false;
      }

      try {
        addTranslateButton(owner, deps);
      } catch (e0) {
        // ignore
      }

      try {
        addVoiceTranscribeButton(owner, deps);
      } catch (e1) {
        // ignore
      }

      if (!owner.dataset.processed) {
        try {
          owner.classList.add('message-wrapper');
          owner.classList.add('waai-message');
          owner.style.position = 'relative';
        } catch (e) {
          // ignore
        }

        owner.dataset.processed = 'true';
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.messageProcessingPresenter = {
    TEXT_MESSAGE_ROOT_SELECTOR,
    VOICE_MESSAGE_ROOT_SELECTOR,
    VOICE_MARKER_SELECTOR,
    hasVoiceMarker,
    isVoiceMessage,
    resolveMessageOwnerElement,
    resolveButtonContainer,
    getMessageTextRoot,
    addTranslateButton,
    addVoiceTranscribeButton,
    removeVoiceTranscribeButtons,
    processMessage
  };
})();
