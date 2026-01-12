/*
用途：DOM 工具函数与状态的 legacy fallback（从 content.js 迁移出来）。提供 processedMessages（Set）、isInViewport、throttle。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.domUtils) return;

  const processedMessages = new Set();

  function isInViewport(element, deps = {}) {
    const windowRef = deps.window || window;

    const rect = element.getBoundingClientRect();
    const buffer = 100; // 添加冲区，提前加载即将进入的元素

    return (
      rect.top >= -buffer &&
      rect.left >= -buffer &&
      rect.bottom <= (windowRef.innerHeight + buffer) &&
      rect.right <= (windowRef.innerWidth + buffer)
    );
  }

  function throttle(func, limit, deps = {}) {
    const setTimeoutRef = deps.setTimeout || window.setTimeout;
    const clearTimeoutRef = deps.clearTimeout || window.clearTimeout;

    let inThrottle;
    let lastFunc;
    let lastRan;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        clearTimeoutRef(lastFunc);
        lastFunc = setTimeoutRef(() => {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  window.WAAP.legacy.domUtils = {
    processedMessages,
    isInViewport,
    throttle
  };
})();
