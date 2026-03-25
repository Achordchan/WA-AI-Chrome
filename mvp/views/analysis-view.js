(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.analysisView) return;

  function getPanel(container) {
    try {
      return container?.querySelector?.('.analysis-panel') || null;
    } catch (e) {
      return null;
    }
  }

  function ensurePanel(container) {
    try {
      const existing = container?.querySelector?.('.analysis-panel');
      if (existing) return existing;
      if (!container || !(container instanceof Element)) return null;
      const panel = document.createElement('div');
      panel.className = 'analysis-panel';
      container.appendChild(panel);
      return panel;
    } catch (e) {
      return null;
    }
  }

  function clearChildren(element) {
    try {
      if (!element) return;
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    } catch (e) {
      // ignore
    }
  }

  function createTextElement(tagName, className, text) {
    const el = document.createElement(tagName);
    if (className) el.className = className;
    el.textContent = String(text ?? '');
    return el;
  }

  function createMessageItem(message) {
    try {
      if (!message || !message.text) return null;

      const item = document.createElement('div');
      const isMe = message.isMe === true;
      const senderRaw = message.sender || (isMe ? '我方' : '对方');
      const timeRaw = message.time || '';
      const textRaw = message.text || '';

      item.className = `chat-message ${isMe ? 'me' : 'other'}`;

      const label = document.createElement('label');
      label.className = 'message-select';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.sender = String(senderRaw);
      checkbox.dataset.text = String(textRaw);
      checkbox.dataset.time = String(timeRaw);
      label.appendChild(checkbox);

      const content = document.createElement('div');
      content.className = 'message-content';

      const header = document.createElement('div');
      header.className = 'message-header';
      header.appendChild(createTextElement('span', `message-sender ${isMe ? 'sender-me' : 'sender-other'}`, senderRaw));
      header.appendChild(createTextElement('span', 'message-time', timeRaw));

      const text = createTextElement('div', 'message-text', textRaw);

      content.appendChild(header);
      content.appendChild(text);
      item.appendChild(label);
      item.appendChild(content);
      return item;
    } catch (e) {
      return null;
    }
  }

  function createAnalysisSection(title) {
    const section = document.createElement('div');
    section.className = 'analysis-section';
    section.appendChild(createTextElement('h4', '', title));
    return section;
  }

  function renderPicker(container, messages, handlers = {}) {
    const panel = ensurePanel(container);
    if (!panel) return;

    const safeMessages = Array.isArray(messages) ? messages : [];

    panel.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-header">
          <h3>选择要分析的聊天记录</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="chat-list">
          <div class="chat-list-header">
            <label>
              <input type="checkbox" class="select-all">
              全选
            </label>
            <span class="selected-count"></span>
          </div>
          <div class="chat-messages"></div>
        </div>
        <div class="analysis-actions">
          <button class="export-chat" style="background: #f5f5f5; border: 1px solid #ddd; color: #666; padding: 8px 16px; border-radius: 4px; margin-right: 12px; cursor: pointer;">导出聊天</button>
          <button class="start-analysis">开始分析</button>
        </div>
      </div>
    `;

    const closeBtn = panel.querySelector('.close-btn');
    const startBtn = panel.querySelector('.start-analysis');
    const exportBtn = panel.querySelector('.export-chat');
    const list = panel.querySelector('.chat-messages');
    const selectedCountEl = panel.querySelector('.selected-count');
    const selectAllEl = panel.querySelector('.select-all');

    if (list) {
      safeMessages.forEach((m) => {
        const item = createMessageItem(m);
        if (item) list.appendChild(item);
      });
    }

    const updateSelectionStatus = () => {
      try {
        const selected = panel.querySelectorAll('.chat-message input[type="checkbox"]:checked').length;
        const total = panel.querySelectorAll('.chat-message input[type="checkbox"]').length;
        if (selectedCountEl) selectedCountEl.textContent = `已选择 ${selected}/${total} 条消息`;
        if (startBtn) startBtn.disabled = selected === 0;
        if (exportBtn) exportBtn.disabled = selected === 0;
      } catch (e) {
        // ignore
      }
    };

    updateSelectionStatus();

    try {
      panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', updateSelectionStatus);
      });
    } catch (e) {
      // ignore
    }

    try {
      if (selectAllEl) {
        selectAllEl.checked = true;
        selectAllEl.addEventListener('change', (e) => {
          const isChecked = !!e?.target?.checked;
          panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach((cb) => {
            cb.checked = isChecked;
          });
          updateSelectionStatus();
        });
      }
    } catch (e) {
      // ignore
    }

    try {
      closeBtn?.addEventListener('click', () => {
        try {
          handlers?.onClose?.();
        } catch (e) {
          // ignore
        }
        try {
          panel.remove();
        } catch (e2) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      exportBtn?.addEventListener('click', () => {
        try {
          handlers?.onExport?.();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      startBtn?.addEventListener('click', () => {
        try {
          const selectedMessages = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked')).map((cb) => ({
            sender: cb.dataset.sender,
            text: cb.dataset.text,
            time: cb.dataset.time
          }));
          handlers?.onStart?.(selectedMessages);
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  }

  function renderLoading(container) {
    const panel = ensurePanel(container);
    if (!panel) return;

    panel.innerHTML = `
      <div class="analysis-loading">
        <span>AI 正在分析对话内容...</span>
        <div class="loading-dots"></div>
      </div>
    `;
  }

  function renderResult(container, parsedAnalysis) {
    const panel = getPanel(container);
    if (!panel) return;

    try {
      panel.style.maxHeight = '80vh';
      panel.style.overflowY = 'auto';
    } catch (e) {
      // ignore
    }

    panel.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-header">
          <h3>AI 对话分析</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="analysis-body"></div>
      </div>
    `;

    const body = panel.querySelector('.analysis-body');
    if (body) {
      clearChildren(body);

      const moodSection = createAnalysisSection('对话氛围');
      moodSection.appendChild(createTextElement('div', 'analysis-mood', parsedAnalysis?.mood || '未能识别'));
      body.appendChild(moodSection);

      const topicsSection = createAnalysisSection('主要话题');
      const topicsWrap = document.createElement('div');
      topicsWrap.className = 'analysis-topics';
      const topics = Array.isArray(parsedAnalysis?.topics) ? parsedAnalysis.topics : [];
      if (topics.length > 0) {
        topics.forEach((topic) => {
          topicsWrap.appendChild(createTextElement('div', 'topic-item', topic));
        });
      } else {
        topicsWrap.appendChild(createTextElement('div', 'topic-item', '未能识别'));
      }
      topicsSection.appendChild(topicsWrap);
      body.appendChild(topicsSection);

      const attitudesSection = createAnalysisSection('双方态度');
      const attitudesWrap = document.createElement('div');
      attitudesWrap.className = 'analysis-attitudes';

      const meItem = document.createElement('div');
      meItem.className = 'attitude-item';
      meItem.appendChild(createTextElement('span', 'attitude-label', '我方态度：'));
      meItem.appendChild(createTextElement('span', 'attitude-value', parsedAnalysis?.attitudes?.me || '未能识别'));

      const otherItem = document.createElement('div');
      otherItem.className = 'attitude-item';
      otherItem.appendChild(createTextElement('span', 'attitude-label', '对方态度：'));
      otherItem.appendChild(createTextElement('span', 'attitude-value', parsedAnalysis?.attitudes?.other || '未能识别'));

      attitudesWrap.appendChild(meItem);
      attitudesWrap.appendChild(otherItem);
      attitudesSection.appendChild(attitudesWrap);
      body.appendChild(attitudesSection);

      const suggestionsSection = createAnalysisSection('建议回复方式');
      const suggestionsWrap = document.createElement('div');
      suggestionsWrap.className = 'analysis-suggestions';
      const suggestions = Array.isArray(parsedAnalysis?.suggestions) ? parsedAnalysis.suggestions : [];
      if (suggestions.length > 0) {
        suggestions.forEach((suggestion) => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.appendChild(createTextElement('div', 'suggestion-text', suggestion));
          suggestionsWrap.appendChild(item);
        });
      } else {
        suggestionsWrap.appendChild(createTextElement('div', 'suggestion-item', '未提供建议'));
      }
      suggestionsSection.appendChild(suggestionsWrap);
      body.appendChild(suggestionsSection);

      if (parsedAnalysis?.suggestedReply) {
        const replySection = document.createElement('div');
        replySection.className = 'suggested-reply';
        replySection.appendChild(createTextElement('h4', '', '建议回复示例'));
        replySection.appendChild(createTextElement('div', 'reply-text', `"${parsedAnalysis.suggestedReply}"`));
        body.appendChild(replySection);
      }
    }

    try {
      panel.querySelector('.close-btn')?.addEventListener('click', () => {
        panel.remove();
      });
    } catch (e) {
      // ignore
    }
  }

  function renderError(container, message) {
    const panel = getPanel(container);
    if (!panel) return;

    panel.innerHTML = `
      <div class="analysis-error">
        <span class="analysis-error-text"></span>
        <button class="close-btn">×</button>
      </div>
    `;

    const errorText = panel.querySelector('.analysis-error-text');
    if (errorText) {
      errorText.textContent = `分析失败: ${message || '未知错误'}`;
    }

    try {
      panel.querySelector('.close-btn')?.addEventListener('click', () => {
        panel.remove();
      });
    } catch (e) {
      // ignore
    }
  }

  window.WAAP.views.analysisView = {
    renderResult,
    renderError,
    renderPicker,
    renderLoading,
    ensurePanel
  };
})();
