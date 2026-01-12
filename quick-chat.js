const QUICK_CHAT_ENABLED = true;

window.initializeQuickChat = function initializeQuickChat() {
  if (!QUICK_CHAT_ENABLED) return;

  let usedMvp = false;

  try {
    if (window.WAAP?.presenters?.quickChatPresenter?.init) {
      window.WAAP.presenters.quickChatPresenter.init();
      usedMvp = true;
    }
  } catch (e) {
    // ignore
  }

  if (!usedMvp) {
    try {
      const fallback = window.WAAP?.legacy?.quickChatFallback;
      if (fallback?.initializeQuickChat) {
        fallback.initializeQuickChat({
          chrome: window.chrome,
          document: window.document
        });
      }
    } catch (e) {
      // ignore
    }
  }
};

try {
  const hasOrchestrator = !!window.WAAP?.presenters?.contentOrchestratorPresenter;
  if (!hasOrchestrator) {
    window.initializeQuickChat();
  }
} catch (e) {
  // ignore
}