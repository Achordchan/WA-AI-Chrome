// 检查插件状态的函数
async function checkPluginStatus(retryCount = 0, maxRetries = 3) {
  const statusArea = document.getElementById('statusArea');
  const reloadBtn = document.getElementById('reloadBtn');

  if (!statusArea || !reloadBtn) {
    console.error('Required DOM elements not found');
    return;
  }

  try {
    // 检查 WhatsApp 标签页
    const tabs = await chrome.tabs.query({url: "*://web.whatsapp.com/*"});
    
    if (tabs.length === 0) {
      throw new Error('请先打开 WhatsApp Web 页面');
    }

    try {
      // 检查是否已进入聊天窗口
      const chatWindowExists = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'CHECK_CHAT_WINDOW'
      });

      if (!chatWindowExists || !chatWindowExists.exists) {
        // 如果未进入聊天窗口，显示等待提示
        statusArea.className = 'status-area status-waiting';
        statusArea.innerHTML = `
          <div class="status-icon">💬</div>
          <div class="status-text">
            <div>请先进入任意聊天窗口</div>
            <div class="status-detail">插件将在聊天窗口中启用</div>
          </div>
        `;
        reloadBtn.classList.add('hidden');
        return;
      }

      // 检查按钮是否已加载
      const buttonsLoaded = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'CHECK_BUTTONS'
      });

      if (buttonsLoaded && buttonsLoaded.success) {
        // 按钮加载成功，显示成功状态
        statusArea.className = 'status-area status-success';
        statusArea.innerHTML = `
          <div class="status-icon">✓</div>
          <div class="status-text">
            <div>插件已成功加载</div>
            <div class="status-detail">功能已就绪</div>
          </div>
        `;
        reloadBtn.classList.add('hidden');
      } else {
        throw new Error('功能按钮未完全加载');
      }

    } catch (error) {
      // 如果还有重试次数，则等待后重试
      if (retryCount < maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        statusArea.innerHTML = `
          <div class="status-icon">⟳</div>
          <div class="status-text">
            <div>正在重试连接...</div>
            <div class="status-detail">第 ${retryCount + 1} 次尝试</div>
          </div>
        `;
        
        // 等待 1 秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkPluginStatus(retryCount + 1, maxRetries);
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Plugin status check failed:', error);
    
    if (statusArea) {
      statusArea.className = 'status-area status-error';
      statusArea.innerHTML = `
        <div class="status-icon">!</div>
        <div class="status-text">
          <div>${error.message}</div>
          <div class="status-detail">请尝试重新加载插件</div>
        </div>
      `;
    }
    
    if (reloadBtn) {
      reloadBtn.classList.remove('hidden');
    }
  }
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', async () => {
  // 首先检查插件状态
  await checkPluginStatus();

  // 加载保存的 API Key
  chrome.storage.sync.get(['apiKey'], (data) => {
    const apiKeyInput = document.getElementById('apiKey');
    if(apiKeyInput) {
      apiKeyInput.value = data.apiKey || '';
    }
  });

  // 保存 API Key 设置
  const apiKeyInput = document.getElementById('apiKey');
  if(apiKeyInput) {
    apiKeyInput.addEventListener('change', (e) => {
      chrome.storage.sync.set({ apiKey: e.target.value });
    });
  }

  // 重新加载按钮点击事件
  const reloadBtn = document.getElementById('reloadBtn');
  if(reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      // 禁用按钮,显示加载状态
      reloadBtn.disabled = true;
      reloadBtn.textContent = '正在重新加载...';
      
      try {
        // 重新加载当前 WhatsApp 标签页
        const tabs = await chrome.tabs.query({url: "*://web.whatsapp.com/*"});
        if(tabs.length > 0) {
          await chrome.tabs.reload(tabs[0].id);
          // 等待页面加载完成
          setTimeout(async () => {
            await checkPluginStatus();
            reloadBtn.disabled = false;
            reloadBtn.textContent = '重新加载插件';
          }, 2000);
        } else {
          throw new Error('未找到 WhatsApp 页面');
        }
      } catch(error) {
        const statusArea = document.getElementById('statusArea');
        if(statusArea) {
          statusArea.className = 'status-area status-error';
          statusArea.textContent = '重新加载失败: ' + error.message;
        }
        reloadBtn.disabled = false;
        reloadBtn.textContent = '重新加载插件';
      }
    });
  }
});