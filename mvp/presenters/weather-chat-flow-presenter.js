/*
用途：天气模块“聊天切换检查 + 号码提取”的流程 Presenter（MVP）。
说明：
- 从 legacy-weather-info.js 迁移 checkForNewChatWindow / extractPhoneNumber 的编排逻辑，减少 legacy 体积。
- presenter 只编排流程：节流、状态提示、触发号码提取；具体提取逻辑仍由 owner.tryGetWhatsAppNumber / owner.processPhoneNumber 负责。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.weatherChatFlowPresenter) return;

  const DEBUG = false;

  function debugLog(...args) {
    if (!DEBUG) return;
    try {
      console.log(...args);
    } catch (e) {
      // ignore
    }
  }

  function getNow() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

  // 从当前聊天窗口提取电话号码
  function extractPhoneNumber(owner, deps = {}) {
    try {
      if (!owner) return false;

      const nowMs = getNow();
      if (nowMs - (owner.lastExtractAt || 0) < 800) {
        return true;
      }
      owner.lastExtractAt = nowMs;

      if (typeof owner.isChatWindowActive === 'function') {
        if (!owner.isChatWindowActive()) {
          const now = getNow();
          if (now - (owner.lastNoContactShownAt || 0) > 5000) {
            owner.showStatus?.('no-contact');
            owner.lastNoContactShownAt = now;
          }
          return true;
        }
      }

      debugLog('📞 开始提取电话号码...');

      // 使用我们成功测试的方法
      const phoneNumber = typeof owner.tryGetWhatsAppNumber === 'function' ? owner.tryGetWhatsAppNumber() : null;

      if (phoneNumber) {
        owner.consecutiveNoNumber = 0;

        // 只在号码变化时输出成功信息
        if (owner.lastDebugNumber !== phoneNumber) {
          debugLog('✅ 成功提取到号码:', phoneNumber);
          owner.lastDebugNumber = phoneNumber;
        }

        // processPhoneNumber 已经在 tryGetWhatsAppNumber 中调用了
        return true;
      }

      try {
        // 侧栏兜底流程是异步的：当它正在进行时，不要立刻判定 no-number，避免 UI 闪动
        if (owner._waapPhoneSidebarFallbackRunning === true) {
          return true;
        }
      } catch (e) {
        // ignore
      }

      owner.consecutiveNoNumber = (owner.consecutiveNoNumber || 0) + 1;

      // WhatsApp DOM 可能短暂抖动：连续多次都拿不到号码才切到 no-number
      if (owner.consecutiveNoNumber < 3 && owner.currentPhoneNumber) {
        return true;
      }

      owner.showStatus?.('no-number');

      // 只在之前有号码现在没有号码时输出
      if (owner.lastDebugNumber !== null) {
        debugLog('❌ 未能提取到号码');
        owner.lastDebugNumber = null;
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // 检查新的聊天窗口
  function checkForNewChatWindow(owner, deps = {}) {
    try {
      if (!owner) return false;

      const nowMs = getNow();
      if (nowMs - (owner.lastChatCheckAt || 0) < 800) {
        return true;
      }
      owner.lastChatCheckAt = nowMs;

      const documentRef = deps.document || window.document;
      const setTimeoutRef = deps.setTimeout || window.setTimeout;

      const chatKey = typeof owner.getActiveChatKey === 'function' ? owner.getActiveChatKey() : '';
      const hasWeatherShown = !!(owner.currentWeatherElement && documentRef?.contains?.(owner.currentWeatherElement));
      const hasStableNumber = !!owner.currentPhoneNumber;

      const gateKey = chatKey || '__no_chat__';
      if (gateKey === owner._waapWeatherLastGateKey && nowMs - (owner._waapWeatherLastGateAt || 0) < 1200) {
        return true;
      }
      owner._waapWeatherLastGateKey = gateKey;
      owner._waapWeatherLastGateAt = nowMs;

      if (chatKey) {
        if (chatKey === owner.lastChatKey) {
          if (hasWeatherShown && hasStableNumber && (owner.currentStatus === 'success' || owner.currentStatus === 'loading')) {
            return true;
          }
          if (nowMs - (owner.lastChatKeyAt || 0) < 1200) {
            return true;
          }
        }
        owner.lastChatKey = chatKey;
        owner.lastChatKeyAt = nowMs;
      } else {
        if (hasWeatherShown && hasStableNumber && (owner.currentStatus === 'success' || owner.currentStatus === 'loading')) {
          return true;
        }
      }

      if (owner.displaySettings && owner.displaySettings.enabled !== true) {
        owner.hideWeatherInfo?.();
        return true;
      }

      if (typeof owner.isChatWindowActive === 'function') {
        if (!owner.isChatWindowActive()) {
          const now = getNow();
          if (now - (owner.lastNoContactShownAt || 0) > 5000) {
            owner.showStatus?.('no-contact');
            owner.lastNoContactShownAt = now;
          }
          return true;
        }
      }

      debugLog('🔍 检查新聊天窗口...');

      // 立即显示加载状态
      try {
        setTimeoutRef(() => {
          try {
            const needLoading =
              !hasWeatherShown ||
              !hasStableNumber ||
              owner.currentStatus === 'error' ||
              owner.currentStatus === 'no-number' ||
              owner.currentStatus === 'no-contact';
            if (needLoading) {
              owner.insertStatus?.();
            }
          } catch (e) {
            // ignore
          }

          setTimeoutRef(() => {
            extractPhoneNumber(owner, deps);
          }, 200);
        }, 100);
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.presenters.weatherChatFlowPresenter = {
    checkForNewChatWindow,
    extractPhoneNumber
  };
})();
