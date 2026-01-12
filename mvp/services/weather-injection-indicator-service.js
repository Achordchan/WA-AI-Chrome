/*
用途：WhatsApp 标志旁“AI助手注入提示”管理 Service（MVP）。
说明：
- 从 legacy-weather-info.js 迁移 createInjectionIndicator/removeInjectionIndicator/initInjectionIndicator 的核心逻辑。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherInjectionIndicatorService) return;

  function createInjectionIndicator(owner, deps = {}) {
    try {
      if (!owner) return false;
      const documentRef = deps.document || window.document;
      const XPathResultRef = deps.XPathResult || window.XPathResult;

      if (!documentRef) return false;

      // WhatsApp 标志注入提示功能
      if (owner.injectionIndicator) {
        return true; // 已存在，避免重复创建
      }

      // 查找 WhatsApp 标志 SVG 元素 (多种方式尝试)
      let logoContainer = null;

      // 方法1: 通过 title 元素查找
      try {
        const titleElement = documentRef.querySelector('title');
        if (titleElement && titleElement.textContent === 'wa-wordmark-refreshed') {
          logoContainer = titleElement.closest('h1') || titleElement.closest('div');
        }
      } catch (e) {
        // ignore
      }

      // 方法2: 通过 SVG 属性查找
      try {
        if (!logoContainer) {
          const svgElement = documentRef.querySelector('svg[viewBox="0 0 104 28"]');
          if (svgElement) {
            logoContainer = svgElement.closest('h1') || svgElement.closest('div');
          }
        }
      } catch (e) {
        // ignore
      }

      // 方法3: 通过 XPath 查找 (用户提供的路径)
      try {
        if (!logoContainer && documentRef.evaluate && XPathResultRef) {
          const xpathResult = documentRef.evaluate(
            '//*[@id="app"]/div[1]/div[3]/div/div[3]/header/header/div/div/h1/span/svg',
            documentRef,
            null,
            XPathResultRef.FIRST_ORDERED_NODE_TYPE,
            null
          );
          if (xpathResult.singleNodeValue) {
            logoContainer = xpathResult.singleNodeValue.closest('h1') || xpathResult.singleNodeValue.closest('div');
          }
        }
      } catch (e) {
        try {
          console.log('WeatherInfo: XPath 查找失败:', e.message);
        } catch (e2) {
          // ignore
        }
      }

      if (!logoContainer) {
        try {
          console.log('WeatherInfo: 未找到合适的标志容器');
        } catch (e) {
          // ignore
        }
        return false;
      }

      // 创建注入提示容器
      const indicator = documentRef.createElement('div');
      indicator.className = 'wa-ai-injection-indicator';

      // 创建主标题
      const mainTitle = documentRef.createElement('div');
      mainTitle.textContent = `AI全能助手 ${owner.version} by Achord Tel: 13160235855`;
      mainTitle.style.cssText = `
        font-size: 12px;
        font-weight: 500;
        color: #00a884;
        line-height: 1.2;
      `;

      // 创建小字提示
      const subTitle = documentRef.createElement('div');
      subTitle.textContent = '尊重开源项目，如有二开请保留作者信息';
      subTitle.style.cssText = `
        font-size: 8px;
        font-weight: 400;
        color: #667781;
        margin-top: 2px;
        line-height: 1.2;
      `;

      // 组装容器
      indicator.appendChild(mainTitle);
      indicator.appendChild(subTitle);

      // 设置容器样式
      indicator.style.cssText = `
        margin-left: 12px;
        background: rgba(0, 168, 132, 0.1);
        padding: 4px 8px;
        border-radius: 12px;
        display: inline-block;
        vertical-align: middle;
        white-space: nowrap;
        opacity: 0.8;
        transition: opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      `;

      // 添加悬停效果
      try {
        indicator.addEventListener('mouseenter', () => {
          indicator.style.opacity = '1';
          indicator.style.background = 'rgba(0, 168, 132, 0.15)';
        });

        indicator.addEventListener('mouseleave', () => {
          indicator.style.opacity = '0.8';
          indicator.style.background = 'rgba(0, 168, 132, 0.1)';
        });
      } catch (e) {
        // ignore
      }

      // 插入到标志容器中
      try {
        logoContainer.appendChild(indicator);
      } catch (e) {
        return false;
      }

      owner.injectionIndicator = indicator;

      try {
        console.log('WeatherInfo: ✅ AI助手注入提示已添加');
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function removeInjectionIndicator(owner) {
    try {
      if (!owner) return false;
      if (owner.injectionIndicator) {
        try {
          owner.injectionIndicator.remove();
        } catch (e) {
          // ignore
        }
        owner.injectionIndicator = null;
        try {
          console.log('WeatherInfo: 注入提示已移除');
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function initInjectionIndicator(owner, deps = {}) {
    try {
      if (!owner) return false;

      const documentRef = deps.document || window.document;
      const MutationObserverRef = deps.MutationObserver || window.MutationObserver;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      if (!documentRef || typeof MutationObserverRef !== 'function' || typeof setTimeoutRef !== 'function') {
        return false;
      }

      // 初始化注入提示（带重试机制）
      let attempts = 0;
      const maxAttempts = 10;

      const throttleCreate = () => {
        try {
          const now = Date.now();
          const last = owner._injectionIndicatorLastTryAt || 0;
          if (now - last < 180) return;
          owner._injectionIndicatorLastTryAt = now;
        } catch (e) {
          // ignore
        }

        try {
          createInjectionIndicator(owner, deps);
        } catch (e) {
          // ignore
        }
      };

      const tryCreateIndicator = () => {
        attempts++;
        throttleCreate();

        if (!owner.injectionIndicator && attempts < maxAttempts) {
          setTimeoutRef(tryCreateIndicator, 1000); // 1秒后重试
        } else if (attempts >= maxAttempts) {
          try {
            console.log('WeatherInfo: 达到最大重试次数，停止尝试添加注入提示');
          } catch (e) {
            // ignore
          }
        }
      };

      // 立即尝试一次
      tryCreateIndicator();

      // 监听页面变化，如果注入提示被移除则重新创建
      const observer = new MutationObserverRef(() => {
        try {
          // 1) 已存在但被移除：重建
          if (owner.injectionIndicator && !documentRef.contains(owner.injectionIndicator)) {
            try {
              console.log('WeatherInfo: 检测到注入提示被移除，准备重新创建...');
            } catch (e) {
              // ignore
            }
            owner.injectionIndicator = null;
            setTimeoutRef(() => throttleCreate(), 150);
            return;
          }

          // 2) 还没创建：一旦 logo 容器出现，尽快创建（带节流）
          if (!owner.injectionIndicator) {
            throttleCreate();
          }
        } catch (e) {
          // ignore
        }
      });

      try {
        observer.observe(documentRef.body, {
          childList: true,
          subtree: true
        });
      } catch (e) {
        // ignore
      }

      // 保存 observer 引用（便于后续需要时断开）
      try {
        owner._injectionIndicatorObserver = observer;
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function disconnect(owner) {
    try {
      if (!owner) return false;
      const obs = owner._injectionIndicatorObserver;
      if (obs && typeof obs.disconnect === 'function') {
        obs.disconnect();
      }
      owner._injectionIndicatorObserver = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.weatherInjectionIndicatorService = {
    createInjectionIndicator,
    removeInjectionIndicator,
    initInjectionIndicator,
    disconnect
  };
})();
