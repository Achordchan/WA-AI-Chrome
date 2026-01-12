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
      if (node.matches && node.matches('div[data-pre-plain-text]')) {
        collected.push(node);
      }
      const nested = node.querySelectorAll ? node.querySelectorAll('div[data-pre-plain-text]') : [];
      try {
        nested.forEach((m) => collected.push(m));
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

      const observer = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
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
                    if (message && message.dataset && !message.dataset.processed) {
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
