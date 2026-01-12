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

  function escapeHtml(text) {
    const s = String(text ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function encodeDataAttr(value) {
    try {
      return encodeURIComponent(String(value ?? ''));
    } catch (e) {
      return '';
    }
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
        if (!m || !m.text) return;
        const item = document.createElement('div');
        const isMe = m.isMe === true;
        item.className = `chat-message ${isMe ? 'me' : 'other'}`;
        const senderRaw = m.sender || (isMe ? '我方' : '对方');
        const timeRaw = m.time || '';
        const textRaw = m.text;
        const sender = escapeHtml(senderRaw);
        const time = escapeHtml(timeRaw);
        const text = escapeHtml(textRaw);
        const senderEncoded = encodeDataAttr(senderRaw);
        const timeEncoded = encodeDataAttr(timeRaw);
        const textEncoded = encodeDataAttr(textRaw);

        item.innerHTML = `
          <label class="message-select">
            <input type="checkbox" data-sender="${senderEncoded}" data-text="${textEncoded}" data-time="${timeEncoded}" checked>
          </label>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender ${isMe ? 'sender-me' : 'sender-other'}">${sender}</span>
              <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${text}</div>
          </div>
        `;
        list.appendChild(item);
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
        <div class="analysis-body">
          <div class="analysis-section">
            <h4>对话氛围</h4>
            <div class="analysis-mood">${parsedAnalysis?.mood || '未能识别'}</div>
          </div>

          <div class="analysis-section">
            <h4>主要话题</h4>
            <div class="analysis-topics">
              ${(parsedAnalysis?.topics?.length || 0) > 0
                ? parsedAnalysis.topics
                    .map(
                      (topic) => `
                        <div class="topic-item">${topic}</div>
                      `
                    )
                    .join('')
                : '<div class="topic-item">未能识别</div>'}
            </div>
          </div>

          <div class="analysis-section">
            <h4>双方态度</h4>
            <div class="analysis-attitudes">
              <div class="attitude-item">
                <span class="attitude-label">我方态度：</span>
                <span class="attitude-value">${parsedAnalysis?.attitudes?.me || '未能识别'}</span>
              </div>
              <div class="attitude-item">
                <span class="attitude-label">对方态度：</span>
                <span class="attitude-value">${parsedAnalysis?.attitudes?.other || '未能识别'}</span>
              </div>
            </div>
          </div>

          <div class="analysis-section">
            <h4>建议回复方式</h4>
            <div class="analysis-suggestions">
              ${(parsedAnalysis?.suggestions?.length || 0) > 0
                ? parsedAnalysis.suggestions
                    .map(
                      (suggestion) => `
                        <div class="suggestion-item">
                          <div class="suggestion-text">${suggestion}</div>
                        </div>
                      `
                    )
                    .join('')
                : '<div class="suggestion-item">未提供建议</div>'}
            </div>
          </div>

          ${parsedAnalysis?.suggestedReply
            ? `
              <div class="suggested-reply">
                <h4>建议回复示例</h4>
                <div class="reply-text">"${parsedAnalysis.suggestedReply}"</div>
              </div>
            `
            : ''}
        </div>
      </div>
    `;

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
        <span>分析失败: ${message}</span>
        <button class="close-btn">×</button>
      </div>
    `;

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
