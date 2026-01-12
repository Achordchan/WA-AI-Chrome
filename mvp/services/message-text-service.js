(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.messageTextService) return;

  function collectTextContent(element) {
    if (!element) return '';

    const elementClone = element.cloneNode(true);

    elementClone
      .querySelectorAll('.translate-btn-container,.translation-content,.thinking-content,.translation-loading,.translation-error')
      .forEach((n) => n.remove());

    elementClone
      .querySelectorAll('[data-icon="msg-dblcheck"],[aria-label="msg-dblcheck"],.msg-dblcheck')
      .forEach((n) => n.remove());

    let text = '';
    let lastPiece = '';

    const walker = document.createTreeWalker(
      elementClone,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const raw = (node.textContent || '').replace(/\u200e/g, '');
          const value = raw.trim();
          if (!value) return NodeFilter.FILTER_REJECT;
          if (value === 'msg-dblcheck') return NodeFilter.FILTER_REJECT;
          if (/^\d{1,2}:\d{2}$/.test(value)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const value = walker.currentNode.textContent.replace(/\u200e/g, '').trim();
      if (!value) continue;

      if (value === lastPiece) {
        continue;
      }

      const lastChar = text.length ? text[text.length - 1] : '';
      const firstChar = value[0];
      const needSpace = lastChar && !/\s/.test(lastChar) && !/\s/.test(firstChar);
      text += (needSpace ? ' ' : '') + value;
      lastPiece = value;
    }

    text = text.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
    text = text.replace(/\n\s*\n/g, '\n');
    text = text.trim();

    const dedupeRepeatedBlock = (s) => {
      const normalized = s.replace(/\s+/g, ' ').trim();
      if (!normalized) return s;

      for (let times = 5; times >= 2; times--) {
        if (normalized.length % times !== 0) continue;
        const partLen = normalized.length / times;
        const part = normalized.slice(0, partLen);
        if (part.repeat(times) === normalized) {
          return part;
        }
      }
      return s;
    };

    text = dedupeRepeatedBlock(text);

    return text;
  }

  window.WAAP.services.messageTextService = {
    collectTextContent
  };
})();
