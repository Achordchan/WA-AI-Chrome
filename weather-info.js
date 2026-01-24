// AI全能助手 - WhatsApp增强功能模块
// 作者: Achord (Tel: 13160235855, Email: achordchan@gmail.com)
// 功能: 根据对方号码显示国家天气和当地时间
// 版本: V3.2.1
// 
// 请尊重开源项目，二开保留作者信息

(function () {
  if (typeof window === 'undefined') return;

  try {
    // legacy-weather-info.js 会负责创建并挂载 window.WeatherInfo
    // 这里仅做兼容层与初始化编排（尽量保持本文件很薄）
    if (!window.WeatherInfo) {
      try {
        console.warn('⚠️ WeatherInfo 模块未找到，天气功能将不可用');
      } catch (e) {
        // ignore
      }
      return;
    }

    // 极端兜底：如果 orchestrator 不存在，再允许脚本自行启动
    try {
      const hasOrchestrator = !!window.WAAP?.presenters?.contentOrchestratorPresenter;
      if (!hasOrchestrator) {
        const init = () => {
          try {
            if (typeof window.WeatherInfo?.init === 'function') {
              window.WeatherInfo.init();
            }
          } catch (e) {
            // ignore
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 1000);
          });
        } else {
          setTimeout(init, 1000);
        }
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
})();
