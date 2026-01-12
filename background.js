// 简化 Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 初始化扩展配置
      new Promise((resolve) => {
        chrome.storage.sync.get(['translationApi', 'targetLang'], (data) => {
          const updates = {};
          if (!data.translationApi) {
            updates.translationApi = 'google';
          }
          if (!data.targetLang) {
            updates.targetLang = 'zh-CN';
          }
          if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates);
          }
          resolve();
        });
      }),
      // 声明控制权
      clients.claim()
    ])
  );
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate' || request.type === 'TRANSLATE') {
    handleTranslation(request, sendResponse);
    return true;
  } else if (request.type === 'TRANSCRIBE_AUDIO') {
    handleAudioTranscription(request, sendResponse);
    return true;
  } else if (request.action === 'showTranslationServiceSwitch') {
    try {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'notifyServiceSwitch',
            from: request.from,
            to: request.to,
            reason: request.reason
          }, function(response) {
            // 检查发送是否成功
            if (chrome.runtime.lastError) {
              console.error('发送通知消息失败:', chrome.runtime.lastError);
            } else {
              console.log('通知消息已发送');
            }
          });
        } else {
          console.error('没有找到活动标签页');
        }
      });
    } catch (error) {
      console.error('处理翻译服务切换通知失败:', error);
    }
    // 不管成功与否都返回响应以避免消息端口关闭错误
    if (sendResponse) {
      sendResponse({status: 'notification_processed'});
    }
    return true;
  }
});

// 处理翻译请求
async function handleTranslation(request, sendResponse) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${request.from}&tl=${request.to}&dt=t&q=${encodeURIComponent(request.text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      const translation = data[0]
        .filter(item => item && item[0])
        .map(item => item[0])
        .join('\n');
      
      sendResponse({ translation });
    } else {
      sendResponse({ error: '翻译结果格式错误' });
    }
  } catch (error) {
    console.error('Translation error:', error);
    sendResponse({ error: '翻译服务暂时不可用，请稍后再试' });
  }
}

// 处理音频转写请求
async function handleAudioTranscription(request, sendResponse) {
  // 音频转写逻辑...
  sendResponse({ status: 'success' });
}

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// 未处理的Promise rejection处理
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
