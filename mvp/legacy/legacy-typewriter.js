/*
用途：打字机效果 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP translationRenderService.typeWriter 不可用时，仍可用旧逻辑逐字渲染，并保持完成回调。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.typeWriterFallback) return;

  function legacyTypeWriter(element, text, speed = 10, callback, deps = {}) {
    let i = 0;

    if (!element) {
      return {
        stop: () => {},
        finish: () => {}
      };
    }

    // 添加打字中的光标类
    try {
      element.classList.add('typing');
    } catch (e) {
      // ignore
    }

    // 分析文本长度，调整打字速度
    // 如果文本较长(>500字符)，增加打字速度
    let adjustedSpeed = speed;
    try {
      if ((text || '').length > 1000) {
        adjustedSpeed = 1;
      } else if ((text || '').length > 500) {
        adjustedSpeed = 3;
      }
    } catch (e) {
      // ignore
    }

    // 模拟更真实的打字，根据字符类型变化速度
    const getCharSpeed = (char) => {
      try {
        // 标点符号和段落结束处短暂停顿
        if (['.', '!', '?', '。', '！', '？', '\n'].includes(char)) {
          return adjustedSpeed * 20;
        }
        // 逗号、分号短暂停顿
        if ([',', ';', '，', '；', '、'].includes(char)) {
          return adjustedSpeed * 10;
        }
        // 普通字符
        return adjustedSpeed;
      } catch (e) {
        return adjustedSpeed;
      }
    };

    const setTimeoutRef = deps.setTimeout || window.setTimeout;

    const typeNextChar = () => {
      try {
        if (i < (text || '').length) {
          // 当前字符
          const char = String(text || '').charAt(i);
          try {
            element.textContent += char;
          } catch (e) {
            // ignore
          }
          i++;

          // 自动滚动到底部
          try {
            element.scrollTop = element.scrollHeight;
          } catch (e) {
            // ignore
          }

          // 获取下一个字符的延迟时间
          const nextDelay = getCharSpeed(char);

          // 递归调用下一个字符
          setTimeoutRef(typeNextChar, nextDelay);
        } else {
          // 完成后移除打字光标
          try {
            element.classList.remove('typing');
          } catch (e) {
            // ignore
          }

          if (typeof callback === 'function') {
            // 短暂延迟后执行回调，给用户一些阅读思考过程的时间
            setTimeoutRef(callback, 500);
          }
        }
      } catch (e) {
        try {
          element.classList.remove('typing');
        } catch (e2) {
          // ignore
        }
      }
    };

    // 开始打字
    typeNextChar();

    // 返回控制方法，允许在需要时停止
    return {
      stop: () => {
        i = (text || '').length;
        try {
          element.classList.remove('typing');
        } catch (e) {
          // ignore
        }
      },
      finish: () => {
        try {
          element.textContent = text;
        } catch (e) {
          // ignore
        }

        try {
          element.classList.remove('typing');
        } catch (e) {
          // ignore
        }

        if (typeof callback === 'function') {
          try {
            callback();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }

  function directAssignFallback(element, text, callback) {
    try {
      if (element) element.textContent = String(text ?? '');
    } catch (e) {
      // ignore
    }

    try {
      if (typeof callback === 'function') callback();
    } catch (e2) {
      // ignore
    }

    return {
      stop: () => {},
      finish: () => {}
    };
  }

  window.WAAP.legacy.typeWriterFallback = {
    legacyTypeWriter,
    directAssignFallback
  };
})();
