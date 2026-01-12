/*
用途：消息文本提取 legacy fallback（从 content.js 迁移出来）。
说明：当 MVP messageTextService.collectTextContent 不可用时，提供一个尽量“接近正文”的纯文本提取与基础清洗。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.messageTextFallback) return;

  function legacyCollectTextContent(element, deps = {}) {
    if (!element) return '';

    try {
      const raw = String(element.textContent || '').replace(/\u200e/g, '').trim();
      if (!raw) return '';

      const cleaned = raw
        .replace(/\bmsg-dblcheck\b/g, '')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return cleaned;
    } catch (e) {
      return '';
    }
  }

  window.WAAP.legacy.messageTextFallback = {
    legacyCollectTextContent
  };
})();
