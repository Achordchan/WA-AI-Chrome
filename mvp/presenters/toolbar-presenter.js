(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.toolbarPresenter) return;

  function getHeader(container) {
    try {
      const dom = window.WAAP?.services?.whatsappDomService;
      const getMainHeader = dom?.getMainHeader;
      if (typeof getMainHeader === 'function') {
        return getMainHeader(container) || container?.querySelector?.('header') || null;
      }
    } catch (e) {
      // ignore
    }

    try {
      return container?.querySelector?.('header') || null;
    } catch (e) {
      return null;
    }
  }

  function ensureToolbar(container, deps = {}) {
    try {
      if (!container || !(container instanceof Element)) return false;

      if (container.querySelector('.analysis-btn-container.waap-toolbar')) return true;

      const header = getHeader(container);
      if (!header) return false;

      const view = window.WAAP?.views?.toolbarView;
      if (!view?.createToolbar || !view?.attachToHeader) return false;

      const onSettings = () => {
        try {
          const fn = deps.showSettingsModal || window.showSettingsModal;
          if (typeof fn === 'function') fn();
        } catch (e) {
          // ignore
        }
      };

      const onTranslateAll = () => {
        try {
          const dialog = deps.showTranslateConfirmDialog || window.showTranslateConfirmDialog;
          if (typeof dialog === 'function') {
            dialog(container);
            return;
          }
        } catch (e) {
          // ignore
        }

        try {
          const presenter = window.WAAP?.presenters?.translationPresenter;
          if (presenter?.confirmTranslateAll) {
            presenter.confirmTranslateAll(container, {
              translateAllMessages: deps.translateAllMessages || window.translateAllMessages
            });
          }
        } catch (e2) {
          // ignore
        }
      };

      const onAnalyze = async () => {
        try {
          const fn = deps.analyzeConversation || window.analyzeConversation;
          if (typeof fn === 'function') {
            await fn(container);
            return;
          }
        } catch (e) {
          // ignore
        }

        try {
          const analysis = window.WAAP?.presenters?.analysisPresenter;
          if (analysis?.open) {
            await analysis.open(container, {
              checkAiEnabled: deps.checkAiEnabled || window.checkAiEnabled,
              showSettingsModal: deps.showSettingsModal || window.showSettingsModal,
              getAiService: deps.getAiService || window.getAiService,
              ApiServices: deps.ApiServices || window.ApiServices,
              getMessageTextRoot: deps.getMessageTextRoot || window.getMessageTextRoot,
              collectTextContent: deps.collectTextContent || window.collectTextContent
            });
          }
        } catch (e2) {
          // ignore
        }
      };

      const toolbar = view.createToolbar({
        onSettings,
        onTranslateAll,
        onAnalyze
      });

      return view.attachToHeader(header, toolbar);
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.toolbarPresenter = {
    ensureToolbar
  };
})();
