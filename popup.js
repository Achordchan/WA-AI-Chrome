const WHATSAPP_TAB_QUERY = { url: '*://web.whatsapp.com/*' };
const STATUS_REFRESH_DEBOUNCE_MS = 120;

let statusRefreshTimer = null;
let statusListenersInstalled = false;
let latestStatusRequestId = 0;

function getStatusElements() {
  return {
    statusArea: document.getElementById('statusArea'),
    reloadBtn: document.getElementById('reloadBtn')
  };
}

function renderStatus({ className, icon, title, detail, showReload }) {
  const { statusArea, reloadBtn } = getStatusElements();
  if (!statusArea || !reloadBtn) return;

  statusArea.className = `status-area ${className}`;
  statusArea.textContent = '';

  const iconEl = document.createElement('div');
  iconEl.className = 'status-icon';
  iconEl.textContent = String(icon || '');

  const textWrap = document.createElement('div');
  textWrap.className = 'status-text';

  const titleEl = document.createElement('div');
  titleEl.textContent = String(title || '');

  const detailEl = document.createElement('div');
  detailEl.className = 'status-detail';
  detailEl.textContent = String(detail || '');

  textWrap.appendChild(titleEl);
  textWrap.appendChild(detailEl);
  statusArea.appendChild(iconEl);
  statusArea.appendChild(textWrap);

  if (showReload) {
    reloadBtn.classList.remove('hidden');
  } else {
    reloadBtn.classList.add('hidden');
  }
}

async function queryWhatsappTab() {
  const tabs = await chrome.tabs.query(WHATSAPP_TAB_QUERY);
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || '页面通信失败'));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function isTransientPageConnectionError(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes('Receiving end does not exist') ||
    message.includes('Could not establish connection') ||
    message.includes('The message port closed before a response was received')
  );
}

async function collectPluginStatus(tab) {
  if (!tab) {
    return {
      className: 'status-error',
      icon: '!',
      title: '请先打开 WhatsApp Web 页面',
      detail: '未检测到可用标签页',
      showReload: false
    };
  }

  let chatWindowExists = false;
  try {
    const chatWindowResponse = await sendMessageToTab(tab.id, {
      type: 'CHECK_CHAT_WINDOW'
    });
    chatWindowExists = !!chatWindowResponse?.exists;
  } catch (error) {
    if (String(tab.status || '') !== 'complete' || isTransientPageConnectionError(error)) {
      return {
        className: 'status-waiting',
        icon: '⟳',
        title: '正在连接 WhatsApp 页面...',
        detail: '页面加载完成后会自动恢复',
        showReload: false
      };
    }
    throw error;
  }

  if (!chatWindowExists) {
    return {
      className: 'status-waiting',
      icon: '💬',
      title: '请先进入任意聊天窗口',
      detail: '插件将在聊天窗口中启用',
      showReload: false
    };
  }

  try {
    const buttonsLoaded = await sendMessageToTab(tab.id, {
      type: 'CHECK_BUTTONS'
    });

    if (buttonsLoaded && buttonsLoaded.success) {
      return {
        className: 'status-success',
        icon: '✓',
        title: '插件已成功加载',
        detail: '功能已就绪',
        showReload: false
      };
    }

    return {
      className: 'status-waiting',
      icon: '⟳',
      title: '正在恢复插件功能...',
      detail: '检测到聊天窗口，功能加载后会自动恢复',
      showReload: false
    };
  } catch (error) {
    if (isTransientPageConnectionError(error)) {
      return {
        className: 'status-waiting',
        icon: '⟳',
        title: '正在恢复插件功能...',
        detail: '页面脚本连通后会自动恢复',
        showReload: false
      };
    }
    throw error;
  }
}

async function checkPluginStatus() {
  const requestId = ++latestStatusRequestId;

  try {
    const tab = await queryWhatsappTab();
    const snapshot = await collectPluginStatus(tab);
    if (requestId !== latestStatusRequestId) return snapshot;
    renderStatus(snapshot);
    return snapshot;
  } catch (error) {
    if (requestId !== latestStatusRequestId) return null;
    renderStatus({
      className: 'status-error',
      icon: '!',
      title: error?.message || '插件状态检测失败',
      detail: '请尝试重新加载插件',
      showReload: true
    });
    return null;
  }
}

function scheduleStatusRefresh(delayMs = STATUS_REFRESH_DEBOUNCE_MS) {
  try {
    if (statusRefreshTimer) clearTimeout(statusRefreshTimer);
  } catch (e) {
    // ignore
  }

  statusRefreshTimer = setTimeout(() => {
    statusRefreshTimer = null;
    void checkPluginStatus();
  }, delayMs);
}

function syncApiKeyInput(value) {
  const apiKeyInput = document.getElementById('apiKey');
  if (!apiKeyInput) return;
  apiKeyInput.value = value || '';
}

function isWhatsappTabInfo(tab, changeInfo) {
  const tabUrl = String(tab?.url || '');
  const changedUrl = String(changeInfo?.url || '');
  return tabUrl.includes('web.whatsapp.com') || changedUrl.includes('web.whatsapp.com');
}

function installPopupStatusListeners() {
  if (statusListenersInstalled) return;
  statusListenersInstalled = true;

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isWhatsappTabInfo(tab, changeInfo)) return;

    if (changeInfo.status === 'loading') {
      renderStatus({
        className: 'status-waiting',
        icon: '⟳',
        title: '正在刷新 WhatsApp 页面...',
        detail: '页面恢复后会自动检测插件状态',
        showReload: false
      });
    }

    scheduleStatusRefresh(changeInfo.status === 'complete' ? 80 : STATUS_REFRESH_DEBOUNCE_MS);
  });

  chrome.tabs.onActivated.addListener(() => {
    scheduleStatusRefresh(80);
  });

  chrome.tabs.onRemoved.addListener(() => {
    scheduleStatusRefresh(0);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (Object.prototype.hasOwnProperty.call(changes, 'apiKey')) {
      syncApiKeyInput(changes.apiKey?.newValue || '');
    }
  });
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const currentTab = await chrome.tabs.get(tabId);
  if (String(currentTab?.status || '') === 'complete') return true;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      try {
        chrome.tabs.onUpdated.removeListener(handleUpdated);
      } catch (e) {
        // ignore
      }
      try {
        if (timeoutId) clearTimeout(timeoutId);
      } catch (e) {
        // ignore
      }
      timeoutId = null;
    };

    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(value);
    };

    const handleUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === 'complete') {
        finish(resolve, true);
      }
    };

    chrome.tabs.onUpdated.addListener(handleUpdated);
    timeoutId = setTimeout(() => {
      finish(reject, new Error('页面加载超时'));
    }, timeoutMs);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  installPopupStatusListeners();
  scheduleStatusRefresh(0);

  chrome.storage.sync.get(['apiKey'], (data) => {
    syncApiKeyInput(data.apiKey || '');
  });

  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('change', (e) => {
      chrome.storage.sync.set({ apiKey: e.target.value });
    });
  }

  const reloadBtn = document.getElementById('reloadBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      await reloadPlugin();
    });
  }

  document.getElementById('viewUpdateLog')?.addEventListener('click', async () => {
    const tab = await queryWhatsappTab();
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_UPDATE_LOG'
      });
    } else {
      alert('请先打开 WhatsApp Web 页面');
    }
  });
});

async function reloadPlugin() {
  const reloadBtn = document.getElementById('reloadBtn');
  if (!reloadBtn) return;

  try {
    reloadBtn.disabled = true;
    reloadBtn.textContent = '正在重新加载...';

    const tab = await queryWhatsappTab();
    if (!tab) {
      throw new Error('未找到 WhatsApp 页面');
    }

    renderStatus({
      className: 'status-waiting',
      icon: '⟳',
      title: '正在重新加载 WhatsApp 页面...',
      detail: '加载完成后会自动检测插件状态',
      showReload: false
    });

    await chrome.tabs.reload(tab.id);
    scheduleStatusRefresh(0);
    await waitForTabComplete(tab.id);
    await checkPluginStatus();
  } catch (error) {
    renderStatus({
      className: 'status-error',
      icon: '!',
      title: `重新加载失败: ${error?.message || '未知错误'}`,
      detail: '请刷新 WhatsApp 页面后重试',
      showReload: true
    });
  } finally {
    reloadBtn.disabled = false;
    reloadBtn.textContent = '重新加载插件';
  }
}
