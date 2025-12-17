(function() {
  console.log('正在应用翻译服务修复 v1.1.3...');

  // 保存原始的翻译服务获取函数
  const originalGetTranslationService = window.getTranslationService;

  // 重写翻译服务获取函数
  window.getTranslationService = function() {
    return new Promise((resolve) => {
      // 调用原始函数
      originalGetTranslationService().then(result => {
        console.log('翻译服务配置:', result);
        
        // 检查配置是否合法
        if (result.service === 'google') {
          // 对于谷歌翻译，不需要API密钥
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            targetLang: result.targetLang
          });
        } else if (result.service === 'baidu' && (!result.apiKey || !result.secretKey)) {
          // 如果百度翻译缺少必要的密钥，回退到谷歌翻译
          console.warn('百度翻译缺少API ID或Secret Key，回退到谷歌翻译');
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            targetLang: result.targetLang
          });
        } else if (['deepseek', 'dashscope', 'volcengine'].includes(result.service) && !result.apiKey) {
          // 如果AI翻译缺少API密钥，回退到谷歌翻译
          console.warn(`${result.service} 翻译缺少API Key，回退到谷歌翻译`);
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            targetLang: result.targetLang
          });
        } else {
          // 其他情况保持原样
          resolve(result);
        }
      });
    });
  };

  // 修复百度翻译函数
  const originalBaiduTranslation = window.ApiServices.translation.baidu;
  window.ApiServices.translation.baidu = async function(text, apiId, secretKey, from = 'auto', to = 'zh') {
    try {
      console.log('增强版百度翻译被调用', { 
        textLength: text?.length || 0,
        from,
        to,
        apiIdLength: apiId?.length || 0,
        secretKeyLength: secretKey?.length || 0
      });
      
      // 参数验证
      if (!apiId || !secretKey) {
        console.error('百度翻译API ID或Secret Key未提供');
        // 自动切换到谷歌翻译
        console.log('自动切换到谷歌翻译...');
        return await window.ApiServices.translation.google(text, from, to);
      }
      
      // 使用固定格式的随机数 (百度官方示例使用10位以内数字)
      const salt = '19125'; // 使用固定的盐值进行测试
      
      // 打印处理前的输入参数 (便于调试)
      console.log('百度翻译输入:', {
        appid: apiId,
        q: text.length > 100 
          ? text.replace(/\n/g, '\\n').substring(0, 100) + '...' 
          : text.replace(/\n/g, '\\n'),  // 仅在日志中替换换行符为可见形式
        rawLength: text.length,
        hasNewlines: text.includes('\n'),
        newlineCount: (text.match(/\n/g) || []).length,
        newlinePositions: text.split('').map((char, i) => char === '\n' ? i : -1).filter(pos => pos !== -1),
        salt,
        from,
        to,
        secretKey: secretKey.substring(0, 4) + '****' // 保护密钥安全
      });
      
      // 严格按照官方文档构建签名字符串: appid + q + salt + appkey
      // 注意: 这里的文本不应该进行URL编码，且需要保留原始换行符
      const signStr = apiId + text + salt + secretKey;
      
      console.log('签名字符串长度:', signStr.length);
      console.log('签名字符串结构:', 'appid + q(保留换行符) + salt + 密钥');
      
      // 使用官方MD5函数生成签名
      let sign;
      try {
        if (typeof MD5 === 'function') {
          sign = MD5(signStr);
          console.log('使用MD5函数生成签名');
        } else {
          throw new Error('没有可用的MD5函数');
        }
        
        // 确保签名是32位小写
        if (sign.length !== 32) {
          console.warn(`签名长度异常: ${sign.length}，应为32位`);
          if (sign.length > 32) {
            sign = sign.substring(0, 32);
          } else {
            throw new Error(`MD5签名长度不正确: ${sign.length}，应为32位`);
          }
        }
        
        // 确保是小写
        sign = sign.toLowerCase();
        
        console.log('MD5生成的原始签名:', {
          sign: sign.substring(0, 8) + '...',
          length: sign.length
        });
      } catch (md5Error) {
        console.error('MD5计算失败:', md5Error);
        // 如果MD5计算失败，切换到谷歌翻译
        console.log('MD5计算失败，切换到谷歌翻译...');
        return await window.ApiServices.translation.google(text, from, to);
      }
      
      // 通过background脚本发送请求
      // 注意：这里text需要进行URL编码，但在上面生成签名时不能编码
      const response = await chrome.runtime.sendMessage({
        type: 'baidu_translate',
        text, // 传递原始text，background.js中会正确编码
        from,
        to,
        appid: apiId,
        salt: salt,
        sign: sign
      });
      
      // 检查错误
      if (response.error) {
        console.error('百度翻译返回错误:', response.error);
        
        let reason = '服务异常';
        // 诊断错误类型
        if (response.error.includes('54001') || response.error.includes('Invalid Sign')) {
          reason = 'API签名验证失败';
          console.error('百度翻译签名错误，切换到谷歌翻译');
          console.error('签名验证失败详情:', {
            appid: apiId,
            salt: salt,
            sign: sign.substring(0, 8) + '...',
            textLength: text.length
          });
        } else if (response.error.includes('52001')) {
          reason = '请求超时';
        } else if (response.error.includes('52002')) {
          reason = '系统错误';
        } else if (response.error.includes('52003')) {
          reason = '未授权用户';
        } else if (response.error.includes('54003')) {
          reason = '访问频率受限';
        } else if (response.error.includes('54004')) {
          reason = '账户余额不足';
        } else if (response.error.includes('54005')) {
          reason = '长查询请求频繁';
        } else if (response.error.includes('58000')) {
          reason = '客户端IP非法';
        } else if (response.error.includes('58001')) {
          reason = '译文语言方向不支持';
        }
        
        // 通知用户服务切换
        try {
          chrome.runtime.sendMessage({
            action: 'showTranslationServiceSwitch',
            from: 'baidu',
            to: 'google',
            reason: `百度翻译${reason}`
          }, function(response) {
            console.log('通知服务切换消息已发送', response);
          });
        } catch (notifyError) {
          console.error('发送通知失败:', notifyError);
        }
        
        // 切换到谷歌翻译
        console.log('切换到谷歌翻译服务...');
        return await window.ApiServices.translation.google(text, from, to);
      }
      
      console.log('百度翻译成功');
      return response.translation;
    } catch (error) {
      console.error('百度翻译错误:', error);
      
      // 如果出现错误，尝试使用谷歌翻译
      try {
        console.log('百度翻译失败，尝试使用谷歌翻译...');
        // 添加通知用户切换到谷歌翻译
        chrome.runtime.sendMessage({
          action: 'showTranslationServiceSwitch',
          from: 'baidu',
          to: 'google',
          reason: error.message || '百度翻译服务异常'
        });
        return await window.ApiServices.translation.google(text, from, to);
      } catch (googleError) {
        console.error('谷歌翻译也失败:', googleError);
        throw error; // 如果谷歌翻译也失败，抛出原始错误
      }
    }
  };
  
  // 修复翻译文本函数
  const fixTranslateText = async function(text, targetLang = 'zh-CN') {
    try {
      const { service, apiKey, secretKey, apiUrl, model } = await window.getTranslationService();
      console.log('正在使用翻译服务:', service);
      
      // 调用对应的翻译服务
      let translation;
      if (service === 'baidu') {
        // 百度翻译需要额外的secretKey参数
        console.log('调用百度翻译服务', { hasApiKey: !!apiKey, hasSecretKey: !!secretKey });
        translation = await window.ApiServices.translation[service](text, apiKey, secretKey, 'auto', targetLang === 'zh-CN' ? 'zh' : targetLang);
      } else if (service === 'google') {
        // 谷歌翻译不需要apiKey
        console.log('调用谷歌翻译服务');
        translation = await window.ApiServices.translation[service](text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        // OpenAI翻译需要额外的apiUrl和model参数
        console.log('调用OpenAI翻译服务', { hasApiKey: !!apiKey, hasApiUrl: !!apiUrl, hasModel: !!model });
        translation = await window.ApiServices.translation[service](text, apiKey, apiUrl, model, targetLang);
      } else {
        // 其他翻译服务
        console.log('调用其他翻译服务:', service);
        translation = await window.ApiServices.translation[service](text, apiKey);
      }
      
      return translation;
    } catch (error) {
      console.error('翻译失败:', error);
      
      // 如果当前服务不是谷歌翻译，尝试使用谷歌翻译作为备选
      try {
        console.log('尝试使用谷歌翻译作为备选...');
        return await window.ApiServices.translation.google(text, 'auto', targetLang);
      } catch (fallbackError) {
        console.error('备选翻译也失败:', fallbackError);
        throw error; // 抛出原始错误
      }
    }
  };

  // 监听浏览器扩展消息
  const originalAddListener = chrome.runtime.onMessage.addListener;
  if (originalAddListener) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request && request.type === 'check_baidu_translation') {
        console.log('收到百度翻译状态检查请求');
        sendResponse({
          status: 'fixed',
          message: '百度翻译服务已修复',
          version: 'V3.0'
        });
        return true;
      }
    });
  }

  // 暴露修复函数供使用
  window.fixedTranslateText = fixTranslateText;
  
  console.log('翻译服务修复已应用，包括:');
  console.log('1. 增强的翻译服务获取函数');
  console.log('2. 修复的百度翻译实现');
  console.log('3. 添加自动服务回退机制');
})(); 