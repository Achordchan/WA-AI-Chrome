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

// MD5函数 (为百度翻译API签名使用)
function md5(string) {
  console.log('背景页使用MD5计算签名, 输入长度:', string.length);
  
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  
  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  
  let blks, i;
  const n = string.length;
  blks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (i = 0; i < n; i++) {
    blks[i >> 2] |= string.charCodeAt(i) << ((i % 4) * 8);
  }
  blks[i >> 2] |= 0x80 << ((i % 4) * 8);
  blks[14] = n * 8;
  
  let x = [1732584193, -271733879, -1732584194, 271733878];
  for (i = 0; i < blks.length; i += 16) {
    const tempX = x.slice(0);
    md5cycle(tempX, blks.slice(i, i + 16));
    for (let j = 0; j < 4; j++) {
      x[j] = tempX[j];
    }
  }
  
  let result = '';
  for (i = 0; i < 4; i++) {
    let s = x[i].toString(16);
    // 确保每部分是8位
    while (s.length < 8) {
      s = '0' + s;
    }
    // 如果超过8位(不应该发生)，截断
    if (s.length > 8) {
      s = s.substring(0, 8);
    }
    result += s;
  }
  
  // 确保最终结果是32位小写
  result = result.toLowerCase();
  
  // 验证结果
  if (result.length !== 32 || !/^[0-9a-f]{32}$/.test(result)) {
    console.error('MD5计算结果不符合要求:', {
      length: result.length,
      isValid: /^[0-9a-f]{32}$/.test(result)
    });
    
    // 尝试修复
    result = result.replace(/[^0-9a-f]/g, '0');
    if (result.length > 32) {
      result = result.substring(0, 32);
    } else while (result.length < 32) {
      result += '0';
    }
    
    console.log('修复后的MD5结果:', result);
  }
  
  console.log('背景页MD5计算完成:', result.substring(0, 8) + '...');
  return result;
}

function add32(a, b) {
  return (a + b) & 0xFFFFFFFF;
}

