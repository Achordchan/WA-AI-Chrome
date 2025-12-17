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
  } else if (request.type === 'baidu_translate') {
    handleBaiduTranslation(request, sendResponse);
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

// 处理百度翻译请求
async function handleBaiduTranslation(request, sendResponse) {
  try {
    console.log('处理百度翻译请求:', {
      textLength: request.text?.length || 0,
      from: request.from,
      to: request.to,
      appidLength: request.appid?.length || 0,
      saltValue: request.salt,
      signLength: request.sign?.length || 0,
      signSample: request.sign ? (request.sign.substring(0, 8) + '...') : 'none'
    });
    
    // 从请求中获取参数
    const { text, from, to, appid, salt, sign } = request;
    
    // 验证参数
    if (!text || !appid || !salt || !sign) {
      console.error('百度翻译参数不完整:', { 
        hasText: !!text, 
        hasAppid: !!appid, 
        hasSalt: !!salt, 
        hasSign: !!sign 
      });
      sendResponse({ error: '请求参数不完整' });
      return;
    }
    
    // 验证sign参数格式
    if (!/^[0-9a-f]{32}$/.test(sign)) {
      console.error('签名格式不正确:', {
        sign: sign.substring(0, 8) + '...',
        length: sign.length,
        isLowerHex: /^[0-9a-f]+$/.test(sign)
      });
      
      // 尝试修复签名
      let fixedSign = sign;
      // 只保留有效的16进制字符
      fixedSign = sign.replace(/[^0-9a-f]/g, '0').toLowerCase();
      // 确保长度为32
      if (fixedSign.length > 32) {
        fixedSign = fixedSign.substring(0, 32);
      } else while (fixedSign.length < 32) {
        fixedSign = fixedSign + '0';
      }
      
      console.log('修复后的签名:', {
        original: sign.substring(0, 8) + '...',
        fixed: fixedSign.substring(0, 8) + '...',
        length: fixedSign.length
      });
      
      // 使用修复后的签名
      request.sign = fixedSign;
    }
    
    // 严格按照百度翻译API官方示例构建请求
    // 确保在URL编码前保留所有换行符，官方文档建议使用\n来分隔多段文本
    // 输出更详细的文本信息以便调试
    console.log('百度翻译文本详情:', {
      originalText: text.length > 50 ? 
        text.replace(/\n/g, '\\n').substring(0, 50) + '...' : 
        text.replace(/\n/g, '\\n'),
      textLength: text.length,
      hasNewlines: text.includes('\n'),
      newlineCount: (text.match(/\n/g) || []).length,
      newlinePositions: text.split('').map((char, i) => char === '\n' ? i : -1).filter(pos => pos !== -1)
    });
    
    // 保留原始文本中的换行符并进行URL编码
    const encodedText = encodeURIComponent(text);
    
    console.log('百度翻译URL编码后文本详情:', {
      encodedTextSample: encodedText.substring(0, 50) + (encodedText.length > 50 ? '...' : ''),
      encodedTextLength: encodedText.length,
      containsEncodedNewlines: encodedText.includes('%0A')
    });
    
    // 构建URL（可以使用GET或POST方式）
    // 这里使用GET方式，参数拼接到URL中
    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodedText}&from=${from}&to=${to}&appid=${appid}&salt=${salt}&sign=${request.sign}`;
    
    console.log('百度翻译API请求URL长度:', url.length);
    
    // 发送请求前的最后检查
    console.log('请求参数验证:', {
      urlEncoded: encodedText !== text,
      signFormat: /^[0-9a-f]{32}$/.test(request.sign)
    });
    
    // 发送请求
    const response = await fetch(url);
    
    // 检查响应状态
    if (!response.ok) {
      console.error('百度翻译HTTP错误:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 解析响应
    const data = await response.json();
    console.log('百度翻译API响应:', JSON.stringify(data).substring(0, 200));
    
    // 检查百度API返回的错误
    if (data.error_code) {
      console.error('百度API返回错误:', {
        errorCode: data.error_code,
        errorMsg: data.error_msg
      });
      
      // 提供更详细的54001错误信息
      if (data.error_code === '54001') {
        console.error('签名错误详情:', {
          appid: appid,
          salt: salt,
          sign: request.sign.substring(0, 8) + '...',
          textEncoded: encodedText.substring(0, 50) + (encodedText.length > 50 ? '...' : ''),
          text: text.replace(/\n/g, '\\n').substring(0, 50) + (text.length > 50 ? '...' : ''),
          textLength: text.length,
          signInputLength: (appid + text + salt).length + '+ secretKey.length'
        });
      }
      
      sendResponse({ 
        error: `百度翻译错误: ${data.error_code} - ${data.error_msg}` 
      });
      return;
    }
    
    // 返回翻译结果
    if (data.trans_result && data.trans_result.length > 0) {
      console.log('百度翻译成功，结果:', {
        resultsCount: data.trans_result.length,
        srcLengths: data.trans_result.map(item => item.src?.length || 0),
        dstLengths: data.trans_result.map(item => item.dst?.length || 0),
        from: data.from,
        to: data.to
      });
      
      // 处理多段文本翻译结果 (多条trans_result)
      let translation;
      if (data.trans_result.length === 1) {
        // 单段文本
        translation = data.trans_result[0].dst;
      } else {
        // 多段文本 - 保持原始文本的换行格式
        translation = data.trans_result.map(item => item.dst).join('\n');
      }
      
      sendResponse({ 
        translation: translation,
        from: data.from,
        to: data.to
      });
    } else {
      console.error('未获取到百度翻译结果:', data);
      sendResponse({ error: '未获取到翻译结果' });
    }
  } catch (error) {
    console.error('百度翻译错误:', error);
    sendResponse({ error: `百度翻译服务错误: ${error.message}` });
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
