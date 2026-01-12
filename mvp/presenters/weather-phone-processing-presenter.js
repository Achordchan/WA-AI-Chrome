/*
用途：天气模块“号码 -> 国家 -> 显示/隐藏天气”的处理流程 Presenter（MVP）。
说明：
- 将 legacy-weather-info.js 中 processPhoneNumber 的业务流程下沉到 presenter，减少 legacy 体积。
- presenter 只编排流程，不直接依赖具体 UI；通过 owner 的方法（identifyCountry/displayWeatherInfo/hideWeatherInfo/maybeStoreResolvedCountry/showStatus）完成。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.weatherPhoneProcessingPresenter) return;

  function processPhoneNumber(owner, phoneNumber) {
    try {
      if (!owner || !phoneNumber) return false;

      // 保留原始格式用于显示，提取数字用于识别
      const originalNumber = String(phoneNumber).trim();
      const cleanNumber = String(phoneNumber).replace(/[^\d+]/g, ''); // 保留+号
      const numbersOnly = String(phoneNumber).replace(/[^\d]/g, ''); // 仅数字用于比较

      // cleanNumber 当前主要用于兼容旧逻辑（保留但不强依赖）
      void cleanNumber;

      // 如果号码没有变化，不需要重新获取信息
      if (owner.currentPhoneNumber === numbersOnly) {
        try {
          if (owner.currentStatus === 'loading' && owner.currentWeatherElement && document.contains(owner.currentWeatherElement)) {
            owner.showStatus?.('success', '✅ 信息加载完成');
          }
        } catch (e) {
          // ignore
        }
        return true;
      }

      try {
        console.log('WeatherInfo: 处理电话号码:', phoneNumber);
      } catch (e) {
        // ignore
      }

      owner.currentPhoneNumber = numbersOnly;

      // 识别国家（使用仅数字的版本）
      const identify = owner.identifyCountry;
      const countryInfo = typeof identify === 'function' ? identify.call(owner, numbersOnly) : null;

      if (countryInfo) {
        try {
          console.log('WeatherInfo: 识别到国家:', countryInfo);
        } catch (e) {
          // ignore
        }

        // 自动保存推断结果（用于隐私页展示；手动修正仍然优先）
        try {
          owner.maybeStoreResolvedCountry?.(countryInfo);
        } catch (e) {
          // ignore
        }

        // 添加原始号码信息用于显示
        try {
          countryInfo.originalNumber = originalNumber;
        } catch (e) {
          // ignore
        }

        try {
          owner.displayWeatherInfo?.(countryInfo);
        } catch (e) {
          // ignore
        }

        return true;
      }

      try {
        console.log('WeatherInfo: 无法识别国家');
      } catch (e) {
        // ignore
      }

      try {
        owner.hideWeatherInfo?.();
      } catch (e) {
        // ignore
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.weatherPhoneProcessingPresenter = {
    processPhoneNumber
  };
})();
