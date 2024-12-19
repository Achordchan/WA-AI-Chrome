// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslation(request, sendResponse);
    return true; // 保持消息通道打开，等待异步响应
  }
});

// 添加安装事件监听
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// 添加激活事件监听
chrome.runtime.onActivated.addListener(() => {
  console.log('Extension activated');
});

// 处理翻译请求
async function handleTranslation(request, sendResponse) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${request.from}&tl=${request.to}&dt=t&q=${encodeURIComponent(request.text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      // 合并所有翻译段落
      const translation = data[0]
        .filter(item => item && item[0])  // 过滤掉空值
        .map(item => item[0])             // 提取翻译文本
        .join('\n');                      // 用换行符连接
      
      sendResponse({
        translation: translation
      });
    } else {
      sendResponse({
        error: '翻译结果格式错误'
      });
    }
  } catch (error) {
    console.error('Translation error:', error);
    sendResponse({
      error: '翻译服务暂时不可用，请稍后再试'
    });
  }
} 