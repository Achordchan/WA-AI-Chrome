/*
用途：消息观察器 legacy fallback（从 content.js 迁移出来）。当 MVP messageObserverPresenter 不可用时，负责监听 WhatsApp DOM 新消息/聊天切换，并触发消息处理、自动翻译、天气刷新、按钮组注入。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.observeMessagesFallback) return;

  function legacyObserveMessages(deps = {}) {
    try {
      const p = window.WAAP?.presenters?.messageObserverPresenter;
      if (p?.observeMessages) {
        return p.observeMessages(deps);
      }
    } catch (e) {
      // ignore
    }

    const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
    const documentRef = deps.document || window.document;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    const integrateWeatherInfo = deps.integrateWeatherInfo;
    const addAnalysisButton = deps.addAnalysisButton;
    const processMessage = deps.processMessage;

    const getMessageTextRoot = deps.getMessageTextRoot;
    const collectTextContent = deps.collectTextContent;

    const maybeAutoTranslateNewMessage = deps.maybeAutoTranslateNewMessage;
    const isAutoTranslateEnabled = deps.isAutoTranslateEnabled;
    const scheduleAutoTranslateOnChatEnter = deps.scheduleAutoTranslateOnChatEnter;

    try {
      console.log('初始化消息观察器...');
    } catch (e) {
      // ignore
    }

    if (!MutationObserverRef || !documentRef?.body) return () => {};

    const observer = new MutationObserverRef((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
          // 聊天窗口切换时（header变化/主区域重绘），尝试刷新天气信息（由 chatKey 去重）
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

          // 检测到新的聊天窗口时的处理
          try {
            const main = window.WAAP?.services?.whatsappDomService?.getMain
              ? window.WAAP.services.whatsappDomService.getMain()
              : documentRef.querySelector('#main');
            if (main && !main.querySelector('.analysis-btn-container')) {
              try {
                console.log('检测到新的聊天窗口，尝试添加按钮组...');
              } catch (e) {
                // ignore
              }

              try {
                if (typeof addAnalysisButton === 'function') addAnalysisButton(main);
              } catch (e) {
                // ignore
              }

              // 同时检查是否需要显示天气信息
              setTimeoutRef(() => {
                try {
                  if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
                } catch (e) {
                  // ignore
                }
              }, 1500); // 给页面一些时间完全加载
            }
          } catch (e) {
            // ignore
          }

          // 处理新增的消息
          mutation.addedNodes.forEach((node) => {
            if (node && node.nodeType === 1) {
              // 查找消息元素（node 本身也可能就是 message）
              const collected = [];
              if (node.matches && node.matches('div[data-pre-plain-text]')) {
                collected.push(node);
              }
              const nested = node.querySelectorAll ? node.querySelectorAll('div[data-pre-plain-text]') : [];
              nested.forEach((m) => collected.push(m));

              collected.forEach((message) => {
                try {
                  if (message && !message.dataset.processed) {
                    if (typeof processMessage === 'function') processMessage(message);
                  }
                } catch (e) {
                  // ignore
                }

                // 自动翻译：即使消息已被处理过（比如开关是后开、或 WhatsApp 先渲染后标记），
                // 也允许尝试一次；内部会做开关/去重/已翻译判断。
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
            }
          });
        }
      }
    });

    // 配置观察选项
    const config = {
      childList: true,
      subtree: true
    };

    // 开始观察整个文档
    observer.observe(documentRef.body, config);

    // 初始处理已有消息
    try {
      const messages = documentRef.querySelectorAll('div[data-pre-plain-text]');
      messages.forEach((message) => {
        try {
          if (message && !message.dataset.processed) {
            if (typeof processMessage === 'function') processMessage(message);
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    // 如果已开启自动翻译，进入聊天后也触发一次“底部消息扫描”（覆盖某些情况下 addedNodes 不稳定的问题）
    try {
      const enabled = typeof isAutoTranslateEnabled === 'function' ? isAutoTranslateEnabled() : false;
      if (enabled) {
        try {
          if (window.WAAP?.presenters?.autoTranslatePresenter?.scheduleOnChatEnter) {
            window.WAAP.presenters.autoTranslatePresenter.scheduleOnChatEnter();
          } else if (typeof scheduleAutoTranslateOnChatEnter === 'function') {
            scheduleAutoTranslateOnChatEnter();
          }
        } catch (e) {
          if (typeof scheduleAutoTranslateOnChatEnter === 'function') scheduleAutoTranslateOnChatEnter();
        }
      }
    } catch (e) {
      // ignore
    }

    // 初始尝试添加按钮
    try {
      const main = window.WAAP?.services?.whatsappDomService?.getMain
        ? window.WAAP.services.whatsappDomService.getMain()
        : documentRef.querySelector('#main');
      if (main) {
        try {
          if (typeof addAnalysisButton === 'function') addAnalysisButton(main);
        } catch (e) {
          // ignore
        }

        // 同时初始化天气信息功能
        setTimeoutRef(() => {
          try {
            if (typeof integrateWeatherInfo === 'function') integrateWeatherInfo();
          } catch (e) {
            // ignore
          }
        }, 2000); // 延迟执行，确保所有功能都已加载
      }
    } catch (e) {
      // ignore
    }

    // 返回清理函数
    return () => {
      try {
        console.log('清理消息观察器...');
      } catch (e) {
        // ignore
      }
      try {
        observer.disconnect();
      } catch (e) {
        // ignore
      }
    };
  }

  window.WAAP.legacy.observeMessagesFallback = {
    legacyObserveMessages
  };
})();
