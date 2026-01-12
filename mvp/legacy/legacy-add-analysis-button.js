/*
用途：分析按钮/工具栏 legacy fallback（从 content.js 迁移出来）。
当 MVP toolbarPresenter / toolbarView 不可用时，使用旧版 DOM 方式在 header 注入按钮组，并绑定设置/批量翻译/AI 分析事件，带重试。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.addAnalysisButtonFallback) return;

  function addAnalysisButton(messageContainer, retryCount = 0, maxRetries = 5, deps = {}) {
    const documentRef = deps.document || window.document;
    const windowRef = deps.window || window;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;
    const chromeRef = deps.chrome || window.chrome;

    const showSettingsModal = deps.showSettingsModal || window.showSettingsModal;
    const showTranslateConfirmDialog = deps.showTranslateConfirmDialog || window.showTranslateConfirmDialog;
    const translateAllMessages = deps.translateAllMessages || window.translateAllMessages;
    const analyzeConversation = deps.analyzeConversation || window.analyzeConversation;

    const checkAiEnabled = deps.checkAiEnabled || window.checkAiEnabled;
    const getAiService = deps.getAiService || window.getAiService;
    const ApiServices = deps.ApiServices || window.ApiServices;
    const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
    const collectTextContent = deps.collectTextContent || window.collectTextContent;

    const handleRetry = (reason) => {
      if (retryCount < maxRetries) {
        setTimeoutRef(() => {
          const main = windowRef.WAAP?.services?.whatsappDomService?.getMain
            ? windowRef.WAAP.services.whatsappDomService.getMain()
            : documentRef.querySelector('#main');
          if (main) {
            addAnalysisButton(main, retryCount + 1, maxRetries, deps);
          }
        }, 1000 * (retryCount + 1));
        return false;
      }
      return false;
    };

    // 类型检查
    if (!messageContainer || !(messageContainer instanceof Element)) {
      return handleRetry('invalid container');
    }

    // 防止重复添加
    if (messageContainer.querySelector('.analysis-btn-container')) {
      return true;
    }

    // 查找必要的DOM元素
    const header = messageContainer.querySelector('header');
    if (!header) {
      return handleRetry('header');
    }

    const addButtonEventListeners = (buttonContainer) => {
      // 设置按钮事件
      const settingsBtn = buttonContainer.querySelector('.settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          try {
            e.stopPropagation();
            const openOptions = e.metaKey || e.ctrlKey || e.altKey;
            if (!openOptions && typeof showSettingsModal === 'function') {
              showSettingsModal();
              return;
            }
            try {
              chromeRef?.runtime?.sendMessage?.({ type: 'OPEN_OPTIONS' });
            } catch (err) {
              // ignore
            }
          } catch (e2) {
            // ignore
          }
        });
      }

      // 批量翻译按钮事件
      const translateAllBtn = buttonContainer.querySelector('.translate-all-btn');
      if (translateAllBtn) {
        translateAllBtn.addEventListener('click', async (e) => {
          try {
            e.stopPropagation();
            try {
              if (windowRef.WAAP?.presenters?.translationPresenter?.confirmTranslateAll) {
                const ok = windowRef.WAAP.presenters.translationPresenter.confirmTranslateAll(messageContainer, {
                  translateAllMessages
                });
                if (ok) return;
              }
            } catch (e2) {
              // ignore
            }

            if (typeof showTranslateConfirmDialog === 'function') {
              showTranslateConfirmDialog(messageContainer);
            }
          } catch (e3) {
            // ignore
          }
        });
      }

      // AI分析按钮事件
      const analysisBtn = buttonContainer.querySelector('.analysis-btn');
      if (analysisBtn) {
        analysisBtn.addEventListener('click', async (e) => {
          try {
            e.stopPropagation();
            try {
              if (windowRef.WAAP?.presenters?.analysisPresenter?.open) {
                await windowRef.WAAP.presenters.analysisPresenter.open(messageContainer, {
                  checkAiEnabled,
                  showSettingsModal,
                  getAiService,
                  ApiServices,
                  getMessageTextRoot,
                  collectTextContent
                });
                return;
              }
            } catch (e2) {
              // ignore
            }

            if (typeof analyzeConversation === 'function') {
              await analyzeConversation(messageContainer);
            }
          } catch (e3) {
            // ignore
          }
        });
      }
    };

    try {
      const buttonContainer = documentRef.createElement('div');
      buttonContainer.className = 'analysis-btn-container';
      buttonContainer.innerHTML = `
        <button class="settings-btn" title="设置">
          <svg viewBox="0 0 24 24" height="20" width="20">
            <path fill="currentColor" d="M12 3.75a8.25 8.25 0 0 0-8.25 8.25c0 4.547 3.703 8.25 8.25 8.25a8.25 8.25 0 0 0 0-16.5zM2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm7.688-2.344a2.344 2.344 0 1 1 4.687 0 2.344 2.344 0 0 1-4.687 0zM12 8.25a1.406 1.406 0 1 0 0 2.812 1.406 1.406 0 0 0 0-2.812zm-3.75 7.5h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5z"/>
          </svg>
        </button>
        <button class="translate-all-btn" title="批量翻译">
          <svg viewBox="0 0 24 24" height="20" width="20">
            <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
          </svg>
        </button>
        <button class="analysis-btn" title="AI分析">
          <svg viewBox="0 0 24 24" height="20" width="20">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
          </svg>
        </button>
      `;

      addButtonEventListeners(buttonContainer);
      header.appendChild(buttonContainer);
      return true;
    } catch (error) {
      return handleRetry('error');
    }
  }

  window.WAAP.legacy.addAnalysisButtonFallback = {
    addAnalysisButton
  };
})();
