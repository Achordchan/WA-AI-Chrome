(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.messageObserverPresenter) return;

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

  function collectAddedMessageElements(node) {
    const collected = [];
    try {
      if (!node || node.nodeType !== 1) return collected;
      const pushUnique = (el) => {
        try {
          if (!el) return;
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
            if (el.matches('div[data-pre-plain-text]')) {
              // ok
            } else if (el.matches('div[tabindex="-1"]')) {
              const hasVoiceMarker = !!(
                el.querySelector?.('span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]')
              );
              if (!hasVoiceMarker) return;

              // Avoid selecting large containers: a single voice bubble should not contain other message roots.
              const hasNestedMessageRoots = !!el.querySelector?.('div[tabindex="-1"], div[data-pre-plain-text]');
              if (hasNestedMessageRoots) return;
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
          return (
            markerEl.closest?.('div[tabindex="-1"]') ||
            markerEl.closest?.('div[data-pre-plain-text]') ||
            null
          );
        } catch (e) {
          return null;
        }
      };

      const collectVoiceMarkersFrom = (root) => {
        try {
          if (!root || !root.querySelectorAll) return;
          const markers = root.querySelectorAll(
            'span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]'
          );
          markers.forEach((m) => pushUnique(resolveVoiceRoot(m)));
        } catch (e) {
          // ignore
        }
      };

      if (node.matches && node.matches('div[data-pre-plain-text]')) {
        pushUnique(node);
      }
      try {
        const closest = node.closest?.('div[data-pre-plain-text]');
        if (closest) pushUnique(closest);
      } catch (e) {
        // ignore
      }

      try {
        if (node.matches) {
          if (
            node.matches('span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]')
          ) {
            pushUnique(resolveVoiceRoot(node));
          }
        }
      } catch (e) {
        // ignore
      }

      collectVoiceMarkersFrom(node);

      const nested = node.querySelectorAll ? node.querySelectorAll('div[data-pre-plain-text]') : [];
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

      if (!documentRef?.body || typeof MutationObserverRef !== 'function') {
        return () => {};
      }

      const hasVoiceMarker = (el) => {
        try {
          return !!(
            el?.querySelector?.('span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]')
          );
        } catch (e) {
          return false;
        }
      };

      const isValidMessageRoot = (el, mainEl) => {
        try {
          if (!el) return false;
          const main = mainEl || getMain();
          if (!main) return false;
          if (el === main) return false;
          if (!main.contains(el)) return false;
          if (!el.matches) return false;
          if (el.matches('div[data-pre-plain-text]')) return true;
          if (el.matches('div[tabindex="-1"]')) {
            if (!hasVoiceMarker(el)) return false;
            const hasNestedMessageRoots = !!el.querySelector?.('div[tabindex="-1"], div[data-pre-plain-text]');
            if (hasNestedMessageRoots) return false;
            return true;
          }
          return false;
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
              const owner = c.closest?.('div[data-pre-plain-text], div[tabindex="-1"]');
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
              if (main && !main.querySelector('.analysis-btn-container')) {
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
        const existing = documentRef.querySelectorAll('div[data-pre-plain-text]');
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
          'span[aria-label="语音消息"], span[aria-label="Voice message"], button[aria-label*="播放语音"], button[aria-label*="Play voice"], span[data-icon="audio-play"], span[data-icon="ptt-status"]'
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
              m.closest?.('div[tabindex="-1"]') ||
              m.closest?.('div[data-pre-plain-text]') ||
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
