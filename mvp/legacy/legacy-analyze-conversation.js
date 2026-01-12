/*
用途：AI 分析面板 legacy fallback（从 content.js 迁移出来）。当 MVP analysisPresenter 不可用时，提供旧版“选择聊天记录 -> 调用 AI 分析 -> 渲染结果/错误”的完整流程。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.analyzeConversationFallback) return;

  async function analyzeConversation(messageContainer, deps = {}) {
    const checkAiEnabled = deps.checkAiEnabled;
    const showSettingsModal = deps.showSettingsModal;

    const getAiService = deps.getAiService || window.getAiService;
    const ApiServices = deps.ApiServices || window.ApiServices;

    const getMessageTextRoot = deps.getMessageTextRoot || window.getMessageTextRoot;
    const collectTextContent = deps.collectTextContent || window.collectTextContent;

    const showAnalysisResult = deps.showAnalysisResult || window.showAnalysisResult;
    const showAnalysisError = deps.showAnalysisError || window.showAnalysisError;

    const documentRef = deps.document || window.document;
    const setTimeoutRef = deps.setTimeout || window.setTimeout;
    const EventRef = deps.Event || window.Event;

    try {
      // 先检查AI功能是否启用
      const aiEnabled = typeof checkAiEnabled === 'function' ? await checkAiEnabled() : false;
      if (!aiEnabled) {
        // 显示AI功能未启用的提示
        const toast = documentRef.createElement('div');
        toast.className = 'settings-toast error';
        toast.textContent = 'AI分析功能未启用，请在设置中开启并配置API参数';
        documentRef.body.appendChild(toast);
        setTimeoutRef(() => toast.remove(), 3000);

        // 自动打开设置面板并自动勾选AI功能
        setTimeoutRef(() => {
          try {
            if (typeof showSettingsModal === 'function') showSettingsModal();
          } catch (e) {
            // ignore
          }

          // 等待模态框完全加载
          setTimeoutRef(() => {
            try {
              // 自动勾选AI功能开关
              const aiEnabledCheckbox = documentRef.getElementById('aiEnabled');
              if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
                aiEnabledCheckbox.checked = true;
                // 手动触发change事件显示AI服务选项
                const changeEvent = new EventRef('change');
                aiEnabledCheckbox.dispatchEvent(changeEvent);
              }

              // 获取当前选中的AI服务并高亮其API输入框
              const aiApiSelect = documentRef.getElementById('aiApi');
              if (aiApiSelect) {
                const service = aiApiSelect.value; // 使用当前选择的服务
                const aiApiInputId = `${service}ApiKey_ai`;
                const aiApiInput = documentRef.getElementById(aiApiInputId);

                if (aiApiInput) {
                  // 给API KEY输入框添加高亮样式
                  aiApiInput.classList.add('input-required');

                  // 确保输入框可见（滚动到视图）
                  aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                  // 给输入框添加焦点
                  aiApiInput.focus();

                  // 添加input事件监听器，当用户开始输入时移除高亮效果
                  const handleInput = () => {
                    aiApiInput.classList.remove('input-required');
                    // 移除事件监听器，避免重复操作
                    aiApiInput.removeEventListener('input', handleInput);
                  };

                  aiApiInput.addEventListener('input', handleInput);

                  // 无论如何，5秒后自动移除高亮效果
                  setTimeoutRef(() => {
                    aiApiInput.classList.remove('input-required');
                  }, 5000);
                }
              }
            } catch (e) {
              // ignore
            }
          }, 300); // 给一点延迟确保DOM已更新
        }, 500);

        return;
      }

      // 检查是否已配置API
      const aiServiceInfo = typeof getAiService === 'function' ? await getAiService() : {};
      const service = aiServiceInfo?.service;
      const apiKey = aiServiceInfo?.apiKey;
      const apiUrl = aiServiceInfo?.apiUrl;
      const model = aiServiceInfo?.model;

      if (!apiKey) {
        // 显示API未配置的提示
        const toast = documentRef.createElement('div');
        toast.className = 'settings-toast error';
        toast.textContent = '请先在设置中配置 OpenAI AI分析 API Key';
        documentRef.body.appendChild(toast);
        setTimeoutRef(() => toast.remove(), 3000);

        // 自动打开设置面板
        setTimeoutRef(() => {
          try {
            if (typeof showSettingsModal === 'function') showSettingsModal();
          } catch (e) {
            // ignore
          }

          // 等待模态框完全加载
          setTimeoutRef(() => {
            try {
              // 获取AI分析API输入框
              const aiApiInput = documentRef.getElementById('siliconflowApiKey_ai');

              if (aiApiInput) {
                // 确保首先显示AI服务选项
                const aiEnabledCheckbox = documentRef.getElementById('aiEnabled');
                if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
                  aiEnabledCheckbox.checked = true;
                  // 手动触发change事件显示AI服务选项
                  const changeEvent = new EventRef('change');
                  aiEnabledCheckbox.dispatchEvent(changeEvent);
                }

                // 确保当前选择的AI服务与检测到的服务一致
                const aiApiSelect = documentRef.getElementById('aiApi');
                if (aiApiSelect && aiApiSelect.value !== 'siliconflow') {
                  aiApiSelect.value = 'siliconflow';
                  // 手动触发change事件显示对应的API KEY输入框
                  const changeEvent = new EventRef('change');
                  aiApiSelect.dispatchEvent(changeEvent);
                }

                // 给API KEY输入框添加高亮样式
                aiApiInput.classList.add('input-required');

                // 确保输入框可见（滚动到视图）
                aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // 给输入框添加焦点
                aiApiInput.focus();

                // 添加input事件监听器，当用户开始输入时移除高亮效果
                const handleInput = () => {
                  aiApiInput.classList.remove('input-required');
                  // 移除事件监听器，避免重复操作
                  aiApiInput.removeEventListener('input', handleInput);
                };

                aiApiInput.addEventListener('input', handleInput);

                // 无论如何，5秒后自动移除高亮效果
                setTimeoutRef(() => {
                  aiApiInput.classList.remove('input-required');
                }, 5000);
              }
            } catch (e) {
              // ignore
            }
          }, 300); // 给一点延迟确保DOM已更新
        }, 500);

        return;
      }

      // 显示聊天记录选择面板
      const panel = documentRef.createElement('div');
      panel.className = 'analysis-panel';
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

      messageContainer.appendChild(panel);

      // 获取开始分析按钮引用
      const startButton = panel.querySelector('.start-analysis');
      const exportButton = panel.querySelector('.export-chat');

      // 收集对话内容
      const messageElements = messageContainer.querySelectorAll('div[data-pre-plain-text]');
      const chatList = panel.querySelector('.chat-messages');

      messageElements.forEach((element) => {
        const msgWrap = element.closest('.message-in, .message-out');
        const preText = element.getAttribute('data-pre-plain-text');
        let time = '';
        let text = '';

        // 根据消息容器的类名判断是否为自己发送的消息
        const isMe = msgWrap && msgWrap.classList.contains('message-out');
        // 根据是否为自己发送设置显示的发送者名称
        const sender = isMe ? '我方' : '对方';

        // 解析时间
        if (preText) {
          const timeMatch = preText.match(/(\d{1,2}:\d{2}(?:\s*(?:上午|下午|AM|PM)?)?)/);
          if (timeMatch) {
            time = timeMatch[1];
          }
        }

        // 获取消息文本（复用更稳的正文提取逻辑，避免 WhatsApp DOM 变化导致为空）
        try {
          const textRoot = typeof getMessageTextRoot === 'function' ? getMessageTextRoot(element) : null;
          text = typeof collectTextContent === 'function' ? collectTextContent(textRoot) : '';
        } catch (e) {
          text = '';
        }

        // 只有当消息有实际内容时才添加到列表
        if (text) {
          const messageItem = documentRef.createElement('div');
          messageItem.className = `chat-message ${isMe ? 'me' : 'other'}`;
          messageItem.innerHTML = `
            <label class="message-select">
              <input type="checkbox" data-sender="${sender}" data-text="${text.replace(/\"/g, '&quot;')}" data-time="${time}" checked>
            </label>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender ${isMe ? 'sender-me' : 'sender-other'}">${sender}</span>
                <span class="message-time">${time}</span>
              </div>
              <div class="message-text">${text}</div>
            </div>
          `;
          chatList.appendChild(messageItem);
        }
      });

      // 在添加完所有消息后，更新选中计数和按钮状态
      const updateSelectionStatus = () => {
        const selectedCount = panel.querySelectorAll('.chat-message input[type="checkbox"]:checked').length;
        const totalCount = panel.querySelectorAll('.chat-message input[type="checkbox"]').length;
        const selectedCountElement = panel.querySelector('.selected-count');

        if (selectedCountElement) {
          selectedCountElement.textContent = `已选择 ${selectedCount}/${totalCount} 条消息`;
        }
        if (startButton) startButton.disabled = selectedCount === 0;
        if (exportButton) exportButton.disabled = selectedCount === 0;
      };

      // 初始化时调用一次更新状态
      updateSelectionStatus();

      // 添加复选框变化事件监听
      panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', updateSelectionStatus);
      });

      // 全选复选框事件监听
      const selectAllCheckbox = panel.querySelector('.select-all');
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = true; // 默认选中全选
        selectAllCheckbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach((cb) => {
            cb.checked = isChecked;
          });
          updateSelectionStatus();
        });
      }

      // 导出聊天按钮点击事件
      if (exportButton) {
        exportButton.addEventListener('click', () => {
          try {
            // 获取对方名字 - 使用更新后的选择器
            let headerName = '';
            const headerElement = documentRef.querySelector('span.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu._ao3e');
            if (headerElement) {
              headerName = headerElement.textContent.trim() || '未知联系人';
            } else {
              // 备用选择器
              const backupElement = documentRef.querySelector('[data-testid="conversation-info-header-chat-title"], ._amig, .xliyjgo2');
              headerName = backupElement ? backupElement.textContent.trim() : '未知联系人';
              console.log('使用备用选择器获取标题:', headerName);
            }

            // 获取聊天内容
            const messages = documentRef.querySelectorAll('.copyable-text[data-pre-plain-text]');
            let chatContent = `聊天记录导出时间: ${new Date().toLocaleString()}\n`;
            chatContent += `对话者: ${headerName}\n\n`;

            messages.forEach((msg) => {
              try {
                const preText = msg.getAttribute('data-pre-plain-text') || '';
                // 只获取原始消息文本，排除翻译按钮和翻译结果
                const messageText = msg.querySelector('.selectable-text')?.textContent || '';

                // 移除末尾的"译"字（如果存在）
                const cleanedText = messageText.replace(/译$/, '');

                if (cleanedText) {
                  chatContent += `${preText}${cleanedText}\n`;
                }
              } catch (err) {
                console.warn('处理单条消息时出错:', err);
              }
            });

            // 创建并下载文件
            const fileName = `WhatsApp-${headerName}-${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
            const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = documentRef.createElement('a');
            a.href = url;
            a.download = fileName;
            documentRef.body.appendChild(a);
            a.click();
            documentRef.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('聊天记录导出成功，对话者:', headerName);
          } catch (error) {
            console.error('导出聊天记录时发生错误:', error);
          }
        });
      }

      // 开始分析按钮点击事件
      if (startButton) {
        startButton.addEventListener('click', async () => {
          try {
            console.log('开始分析按钮被点击');

            const selectedMessages = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked'))
              .map((cb) => ({
                sender: cb.dataset.sender,
                text: cb.dataset.text
              }));

            console.log('选中的消息内容:', selectedMessages);

            if (selectedMessages.length === 0) {
              console.warn('没有选中任何消息，终止分析');
              return;
            }

            // 显示加载状态
            panel.innerHTML = `
              <div class="analysis-loading">
                <span>AI 正在分析对话内容</span>
                <div class="loading-dots"></div>
              </div>
            `;
            console.log('已显示加载状态');

            const aiServiceInfo2 = typeof getAiService === 'function' ? await getAiService() : {};
            const service2 = aiServiceInfo2?.service;
            const apiKey2 = aiServiceInfo2?.apiKey;
            const apiUrl2 = aiServiceInfo2?.apiUrl;
            const model2 = aiServiceInfo2?.model;

            console.log('使用的 AI 服务:', service2);
            console.log('API Key 长度:', apiKey2 ? apiKey2.length : 0);

            console.log('准备发送分析请求，参数:', {
              service: service2,
              messageCount: selectedMessages.length,
              messages: selectedMessages
            });

            // 调用 AI 分析
            let analysis;
            if (service2 === 'siliconflow') {
              analysis = await ApiServices.analysis[service2](selectedMessages, apiKey2, apiUrl2, model2);
            } else {
              analysis = await ApiServices.analysis[service2](selectedMessages, apiKey2);
            }
            console.log('AI 分析返回结果:', analysis);

            // 显示分析结果
            console.log('准备显示分析结果');
            if (typeof showAnalysisResult === 'function') {
              showAnalysisResult(messageContainer, analysis);
            }
            console.log('分析结果显示完成');

          } catch (error) {
            console.error('分析过程中发生错误:', {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack
            });
            if (typeof showAnalysisError === 'function') {
              showAnalysisError(messageContainer, error.message);
            }
          }
        });
      }

      // 关闭按钮事件
      try {
        panel.querySelector('.close-btn').addEventListener('click', () => {
          panel.remove();
        });
      } catch (e) {
        // ignore
      }

    } catch (error) {
      console.error('Analysis error:', error);
      if (typeof showAnalysisError === 'function') {
        showAnalysisError(messageContainer, error.message);
      }
    }
  }

  window.WAAP.legacy.analyzeConversationFallback = {
    analyzeConversation
  };
})();
