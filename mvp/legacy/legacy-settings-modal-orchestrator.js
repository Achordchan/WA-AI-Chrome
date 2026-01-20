/*
用途：设置弹窗打开与保存后状态同步的 legacy orchestrator（从 content.js 迁移出来）。
说明：通过回调把变更传回 content.js，避免跨文件作用域问题；并在 MVP settingsPresenter 不可用/失败时回退到 legacyShowSettingsModal。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.settingsModalOrchestrator) return;

  function applySavedSettings(formData, deps = {}) {
    try {
      const autoTranslateEnabled = formData?.autoTranslateNewMessages === true;
      const weatherEnabled = formData?.weatherEnabled !== false;
      const sttEnabled = formData?.sttEnabled === true;

      try {
        deps.onAutoTranslateChanged?.(autoTranslateEnabled);
      } catch (e) {
        // ignore
      }

      try {
        deps.onWeatherEnabledChanged?.(weatherEnabled);
      } catch (e) {
        // ignore
      }

      try {
        deps.onSttEnabledChanged?.(sttEnabled);
      } catch (e) {
        // ignore
      }

      if (autoTranslateEnabled) {
        try {
          if (deps.autoTranslatePresenter?.setEnabled) {
            deps.autoTranslatePresenter.setEnabled(true);
          }
        } catch (e) {
          // ignore
        }

        try {
          if (deps.autoTranslatePresenter?.scheduleOnChatEnter) {
            deps.autoTranslatePresenter.scheduleOnChatEnter();
          } else {
            deps.scheduleAutoTranslateOnChatEnter?.();
          }
        } catch (e) {
          try {
            deps.scheduleAutoTranslateOnChatEnter?.();
          } catch (e2) {
            // ignore
          }
        }
      } else {
        try {
          if (deps.autoTranslatePresenter?.setEnabled) {
            deps.autoTranslatePresenter.setEnabled(false);
          }
        } catch (e) {
          // ignore
        }
      }

      if (!weatherEnabled) {
        try {
          if (deps.WeatherInfo?.hideWeatherInfo) {
            deps.WeatherInfo.hideWeatherInfo();
          }
        } catch (e) {
          // ignore
        }
      } else {
        try {
          deps.integrateWeatherInfo?.({ force: true });
        } catch (e) {
          // ignore
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function showSettingsModal(deps = {}) {
    try {
      const settingsPresenter = deps.settingsPresenter || window.WAAP?.presenters?.settingsPresenter;
      if (settingsPresenter?.open) {
        const p = settingsPresenter.open({
          showToast: deps.showToast,
          showExtensionInvalidatedError: deps.showExtensionInvalidatedError,
          onSaved: (formData) => {
            try {
              applySavedSettings(formData, deps);
            } catch (e) {
              // ignore
            }
          }
        });

        if (p && typeof p.then === 'function') {
          return p.then((ok) => {
            if (!ok) {
              try {
                deps.legacyShowSettingsModal?.();
              } catch (e) {
                // ignore
              }
            }
            return ok;
          }).catch(() => {
            try {
              deps.legacyShowSettingsModal?.();
            } catch (e) {
              // ignore
            }
            return false;
          });
        }

        if (p) return true;
      }
    } catch (e) {
      // ignore
    }

    try {
      deps.legacyShowSettingsModal?.();
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.settingsModalOrchestrator = {
    showSettingsModal,
    applySavedSettings
  };
})();
