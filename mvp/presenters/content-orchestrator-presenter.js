(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.contentOrchestratorPresenter) return;

  async function initialize(deps = {}) {
    try {
      const isInitialized = typeof deps.isInitialized === 'function' ? deps.isInitialized : () => false;
      const isInitStarted = typeof deps.isInitStarted === 'function' ? deps.isInitStarted : () => false;
      const markInitStarted = typeof deps.markInitStarted === 'function' ? deps.markInitStarted : () => {};
      const markInitialized = typeof deps.markInitialized === 'function' ? deps.markInitialized : () => {};
      const markInitFailed = typeof deps.markInitFailed === 'function' ? deps.markInitFailed : () => {};

      const updatePluginStatus = typeof deps.updatePluginStatus === 'function' ? deps.updatePluginStatus : () => {};

      if (isInitialized() || isInitStarted()) {
        return { ok: true, skipped: true };
      }

      markInitStarted();

      try {
        if (typeof deps.checkAndShowUpdateLog === 'function') {
          await deps.checkAndShowUpdateLog();
        }
      } catch (e) {
        // ignore
      }

      try {
        if (typeof deps.injectStyles === 'function') {
          deps.injectStyles();
          updatePluginStatus('translation', true);
        }
      } catch (e) {
        updatePluginStatus('translation', false);
      }

      try {
        if (typeof deps.observeMessages === 'function') {
          deps.observeMessages();
          updatePluginStatus('observer', true);
        }
      } catch (e) {
        updatePluginStatus('observer', false);
      }

      try {
        const inputTranslatePresenter = deps.inputTranslatePresenter || window.WAAP?.presenters?.inputTranslatePresenter;

        if (inputTranslatePresenter?.setup) {
          inputTranslatePresenter.setup({
            initializeInputTranslate: deps.initializeInputTranslate
          });
          updatePluginStatus('apiService', true);
        } else if (typeof deps.initializeInputTranslate === 'function') {
          deps.initializeInputTranslate();
          updatePluginStatus('apiService', true);
        } else {
          updatePluginStatus('apiService', false);
        }
      } catch (e) {
        updatePluginStatus('apiService', false);
      }

      try {
        const WeatherInfo = deps.WeatherInfo;
        if (typeof WeatherInfo !== 'undefined' && WeatherInfo) {
          try {
            if (typeof WeatherInfo.init === 'function') {
              WeatherInfo.init();
              updatePluginStatus('weatherInfo', true);
            } else if (typeof WeatherInfo.setupChatWindowObserver === 'function') {
              WeatherInfo.setupChatWindowObserver();
              updatePluginStatus('weatherInfo', true);
            } else {
              updatePluginStatus('weatherInfo', false);
            }

            try {
              const setTimeoutRef = deps.setTimeout || window.setTimeout;
              if (typeof setTimeoutRef === 'function') {
                setTimeoutRef(() => {
                  try {
                    if (typeof WeatherInfo.scheduleWeatherAutoRenew === 'function') {
                      WeatherInfo.scheduleWeatherAutoRenew('init');
                    } else if (typeof WeatherInfo.runWeatherAutoRenewOnce === 'function') {
                      WeatherInfo.runWeatherAutoRenewOnce();
                    }
                  } catch (e) {
                    // ignore
                  }
                }, 1500);
              }
            } catch (e3) {
              // ignore
            }
          } catch (e2) {
            updatePluginStatus('weatherInfo', false);
          }
        } else {
          updatePluginStatus('weatherInfo', false);
        }
      } catch (e) {
        updatePluginStatus('weatherInfo', false);
      }

      try {
        const quickChatPresenter = deps.quickChatPresenter || window.WAAP?.presenters?.quickChatPresenter;
        if (quickChatPresenter?.init) {
          quickChatPresenter.init();
          updatePluginStatus('quickChat', true);
        }
      } catch (e) {
        updatePluginStatus('quickChat', false);
      }

      try {
        const weatherIntegrationPresenter =
          deps.weatherIntegrationPresenter || window.WAAP?.presenters?.weatherIntegrationPresenter;
        if (weatherIntegrationPresenter?.setupAutoIntegrate && typeof deps.integrateWeatherInfo === 'function') {
          weatherIntegrationPresenter.setupAutoIntegrate({
            document: deps.document || window.document,
            setTimeout: deps.setTimeout || window.setTimeout,
            integrateWeatherInfo: deps.integrateWeatherInfo
          });
        }
      } catch (e) {
        // ignore
      }

      markInitialized();
      return { ok: true };
    } catch (error) {
      try {
        deps.updatePluginStatus?.('translation', false);
        deps.updatePluginStatus?.('observer', false);
        deps.updatePluginStatus?.('apiService', false);
        deps.updatePluginStatus?.('weatherInfo', false);
      } catch (e) {
        // ignore
      }
      try {
        if (typeof deps.markInitFailed === 'function') {
          deps.markInitFailed();
        }
      } catch (e) {
        // ignore
      }
      return { ok: false, error };
    }
  }

  window.WAAP.presenters.contentOrchestratorPresenter = {
    initialize
  };
})();
