(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.messageObserverPresenter) return;

  const VOICE_MARKER_SELECTOR =
    'span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]';

  function getMain() {
    try {
      const svc = window.WAAP?.services?.whatsappDomService;
      if (svc?.getMain) return svc.getMain();
    } catch (e) {
      // ignore
    }
    try {
      return document.querySelector('#main');
    } catch (e) {
      return null;
    }
  }

  function getMessageProcessing() {
    try {
      return window.WAAP?.presenters?.messageProcessingPresenter || null;
    } catch (e) {
      return null;
    }
  }

  function collectAddedMessageElements(node) {
    const collected = [];
    try {
      if (!node || node.nodeType !== 1) return collected;
      const processing = getMessageProcessing();
      const resolveOwner = processing?.resolveMessageOwnerElement;
      const isVoiceMessage = processing?.isVoiceMessage;
      const textSelector = processing?.TEXT_MESSAGE_ROOT_SELECTOR || 'div[data-pre-plain-text]';
      const pushUnique = (el) => {
        try {
          if (!el) return;
          if (typeof resolveOwner === 'function') {
            el = resolveOwner(el) || el;
          }
          try {
            const main = getMain();
            if (!main) return;
            if (el === main) return;
            if (!main.contains(el)) return;
          } catch (e0) {
            return;
          }

          try {
            if (!el.matches) return;
            if (el.matches(textSelector)) {
              // ok
            } else if (typeof isVoiceMessage === 'function') {
              if (!isVoiceMessage(el)) return;
            } else {
              return;
            }
          } catch (e1) {
            return;
          }

          if (collected.includes(el)) return;
          collected.push(el);
        } catch (e) {
          // ignore
        }
      };

      const resolveVoiceRoot = (markerEl) => {
        try {
          if (!markerEl) return null;
          if (typeof resolveOwner === 'function') {
            return resolveOwner(markerEl);
          }
          return markerEl.closest?.('div[tabindex="-1"]') || markerEl.closest?.(textSelector) || null;
        } catch (e) {
          return null;
        }
      };

      const collectVoiceMarkersFrom = (root) => {
        try {
          if (!root || !root.querySelectorAll) return;
          const markers = root.querySelectorAll(
            VOICE_MARKER_SELECTOR
          );
          markers.forEach((m) => pushUnique(resolveVoiceRoot(m)));
        } catch (e) {
          // ignore
        }
      };

      if (node.matches && node.matches(textSelector)) {
        pushUnique(node);
      }
      try {
        const closest = node.closest?.(textSelector);
        if (closest) pushUnique(closest);
      } catch (e) {
        // ignore
      }

      try {
        if (node.matches) {
          if (
            node.matches(VOICE_MARKER_SELECTOR)
          ) {
            pushUnique(resolveVoiceRoot(node));
          }
        }
      } catch (e) {
        // ignore
      }

      collectVoiceMarkersFrom(node);

      const nested = node.querySelectorAll ? node.querySelectorAll(textSelector) : [];
      try {
        nested.forEach((m) => pushUnique(m));
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    }
    return collected;
  }

  function observeMessages(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      const integrateWeatherInfo = deps.integrateWeatherInfo;
      const addAnalysisButton = deps.addAnalysisButton;
      const processMessage = deps.processMessage;
      const isAutoTranslateEnabled = deps.isAutoTranslateEnabled;

      const getMessageTextRoot = deps.getMessageTextRoot;
      const collectTextContent = deps.collectTextContent;
      const maybeAutoTranslateNewMessage = deps.maybeAutoTranslateNewMessage;
      const processing = getMessageProcessing();
      const resolveOwner = deps.resolveMessageOwnerElement || processing?.resolveMessageOwnerElement;
      const hasVoiceMarker = deps.hasVoiceMarker || processing?.hasVoiceMarker;
      const isVoiceMessage = deps.isVoiceMessage || processing?.isVoiceMessage;
      const textSelector = processing?.TEXT_MESSAGE_ROOT_SELECTOR || 'div[data-pre-plain-text]';

      if (!documentRef?.body || typeof MutationObserverRef !== 'function') {
        return () => {};
      }

      const isValidMessageRoot = (el, mainEl) => {
        try {
          if (!el) return false;
          if (typeof resolveOwner === 'function') {
            const resolved = resolveOwner(el);
            if (!resolved) return false;
            el = resolved;
          }
          const main = mainEl || getMain();
          if (!main) return false;
          if (el === main) return false;
          if (!main.contains(el)) return false;
          if (el.matches?.(textSelector)) return true;
          if (typeof isVoiceMessage === 'function') return isVoiceMessage(el);
          return !!hasVoiceMarker?.(el);
        } catch (e) {
          return false;
        }
      };

      const cleanupOrphanButtons = (mainEl) => {
        try {
          const main = mainEl || getMain();
          if (!main) return;
          const containers = main.querySelectorAll?.('.translate-btn-container') || [];
          containers.forEach((c) => {
            try {
              const owner = typeof resolveOwner === 'function'
                ? resolveOwner(c)
                : c.closest?.(`${textSelector}, div[tabindex="-1"]`);
              if (!owner || !isValidMessageRoot(owner, main)) {
                c.remove();
              }
            } catch (e) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }
      };

      const observer = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
            try {
              cleanupOrphanButtons(getMain());
            } catch (e) {
              // ignore
            }
            try {
              if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
            } catch (e) {
              // ignore
            }

            try {
              if (window.WAAP?.presenters?.autoTranslatePresenter?.onChatMaybeSwitched) {
                window.WAAP.presenters.autoTranslatePresenter.onChatMaybeSwitched();
              } else if (window.WAAP?.legacy?.autoTranslateQueue?.onChatMaybeSwitched) {
                window.WAAP.legacy.autoTranslateQueue.onChatMaybeSwitched();
              }
            } catch (e) {
              // ignore
            }

            try {
              const main = getMain();
              const header =
                window.WAAP?.services?.whatsappDomService?.getMainHeader?.(main) ||
                main?.querySelector?.('header') ||
                null;
              if (main && header && !header.querySelector('.analysis-btn-container.waap-toolbar, .analysis-btn-container')) {
                if (typeof addAnalysisButton === 'function') {
                  addAnalysisButton(main);
                }
                setTimeoutRef(() => {
                  try {
                    if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
                  } catch (e) {
                    // ignore
                  }
                }, 1500);
              }
            } catch (e) {
              // ignore
            }

            try {
              mutation.addedNodes.forEach((node) => {
                const messages = collectAddedMessageElements(node);
                messages.forEach((message) => {
                  try {
                    if (message && message.dataset) {
                      if (typeof processMessage === 'function') processMessage(message);
                    }
                  } catch (e) {
                    // ignore
                  }

                  try {
                    if (window.WAAP?.presenters?.autoTranslatePresenter?.maybeAutoTranslateNewMessage) {
                      window.WAAP.presenters.autoTranslatePresenter.maybeAutoTranslateNewMessage(message, {
                        getMessageTextRoot,
                        collectTextContent
                      });
                    } else if (typeof maybeAutoTranslateNewMessage === 'function') {
                      maybeAutoTranslateNewMessage(message, {
                        getMessageTextRoot,
                        collectTextContent
                      });
                    }
                  } catch (e) {
                    // ignore
                  }
                });
              });
            } catch (e) {
              // ignore
            }
          }
        }
      });

      observer.observe(documentRef.body, { childList: true, subtree: true });

      try {
        const existing = documentRef.querySelectorAll(textSelector);
        existing.forEach((message) => {
          try {
            if (message && message.dataset && !message.dataset.processed) {
              if (typeof processMessage === 'function') processMessage(message);
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      try {
        const voiceMarkers = documentRef.querySelectorAll(
          VOICE_MARKER_SELECTOR
        );
        const main = getMain();
        try {
          cleanupOrphanButtons(main);
        } catch (e0) {
          // ignore
        }
        voiceMarkers.forEach((m) => {
          try {
            const root =
              (typeof resolveOwner === 'function' ? resolveOwner(m) : null) ||
              m.closest?.('div[tabindex="-1"]') ||
              m.closest?.(textSelector) ||
              null;
            if (root && root.dataset && isValidMessageRoot(root, main)) {
              if (typeof processMessage === 'function') processMessage(root);
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }

      try {
        const enabled = typeof isAutoTranslateEnabled === 'function' ? isAutoTranslateEnabled() : !!isAutoTranslateEnabled;
        if (enabled) {
          if (window.WAAP?.presenters?.autoTranslatePresenter?.scheduleOnChatEnter) {
            window.WAAP.presenters.autoTranslatePresenter.scheduleOnChatEnter();
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const main = getMain();
        if (main) {
          if (typeof addAnalysisButton === 'function') addAnalysisButton(main);
          setTimeoutRef(() => {
            try {
              if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
            } catch (e) {
              // ignore
            }
          }, 2000);
        }
      } catch (e) {
        // ignore
      }

      return () => {
        try {
          observer.disconnect();
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.messageObserverPresenter = {
    observeMessages
  };
})();
