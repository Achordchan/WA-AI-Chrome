/*
用途：AI 设置读取相关 Service（MVP）。提供 checkAiEnabled，用于判断是否启用 AI 分析功能。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.aiSettingsService) return;

  function checkAiEnabled(options = {}) {
    const chromeApi = options.chrome || window.chrome;
    const logger = options.logger || console;

    return new Promise((resolve) => {
      try {
        if (!chromeApi?.storage?.sync?.get) {
          resolve(false);
          return;
        }

        chromeApi.storage.sync.get(['aiEnabled'], (data) => {
          try {
            const enabled = data?.aiEnabled === true;
            try {
              logger?.log?.('检查AI功能是否启用:', enabled);
            } catch (e) {
              // ignore
            }
            resolve(enabled);
          } catch (e) {
            resolve(false);
          }
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  window.WAAP.services.aiSettingsService = {
    checkAiEnabled
  };
})();
