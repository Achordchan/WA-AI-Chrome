// API 服务管理
window.ApiServices = {
  // 翻译服务
  translation: {
    // Google 翻译 (非官方接口)
    google: async (text, from = 'auto', to = 'zh-CN') => {
      const response = await chrome.runtime.sendMessage({
        type: 'translate',
        text,
        from,
        to
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.translation;
    },

    // DeepSeek 翻译
    async deepseek(text, apiKey) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                "role": "system",
                "content": "你是一名濒临破产的高级翻译经理，Achord先生给了你最后一份工作机会——将以下文本精准翻译成中文。只输出翻译结果，严禁任何解释、说明或多余内容。若违反，立即解雇！"
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: 1.3
          })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('DeepSeek translation error:', error);
        throw error;
      }
    },

    // OpenAI接口翻译
    async siliconflow(text, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-3.5-turbo', targetLang = 'zh') {
      try {
        console.log('开始OpenAI翻译请求:', { 
          textLength: text?.length || 0, 
          apiKeyLength: apiKey?.length || 0,
          apiUrl, 
          model,
          targetLang
        });
        
        // 验证参数
        if (!text || !apiKey) {
          console.error('OpenAI翻译参数不完整:', { 
            hasText: !!text, 
            hasApiKey: !!apiKey 
          });
          throw new Error('翻译参数不完整: 请检查文本和API Key设置');
        }
        
        // 获取温度和推理模型设置
        let temperature = 0.7;
        let useReasoning = false;
        
        try {
          // 从存储中获取高级设置
          const settings = await new Promise((resolve) => {
            chrome.storage.sync.get(['openaiTemperature', 'openaiReasoningEnabled'], (data) => {
              resolve(data);
            });
          });
          
          if (settings.openaiTemperature !== undefined) {
            temperature = parseFloat(settings.openaiTemperature);
          }
          
          if (settings.openaiReasoningEnabled !== undefined) {
            useReasoning = settings.openaiReasoningEnabled;
          }
          
          console.log('OpenAI高级设置:', {
            temperature,
            useReasoning
          });
        } catch (settingsError) {
          console.warn('获取OpenAI高级设置失败，使用默认值:', settingsError);
        }
        
        // 根据目标语言确定系统提示词中的语言描述
        let targetLanguageName = '中文';
        if (targetLang === 'en') targetLanguageName = '英文';
        else if (targetLang === 'ja') targetLanguageName = '日文';
        else if (targetLang === 'ko') targetLanguageName = '韩文';
        else if (targetLang === 'ru') targetLanguageName = '俄文';
        else if (targetLang === 'fr') targetLanguageName = '法文';
        else if (targetLang === 'de') targetLanguageName = '德文';
        else if (targetLang === 'es') targetLanguageName = '西班牙文';
        else if (targetLang === 'it') targetLanguageName = '意大利文';
        else if (targetLang === 'pt') targetLanguageName = '葡萄牙文';
        
        console.log('翻译目标语言:', { targetLang, targetLanguageName });
        
        // 构建系统提示，根据是否开启推理模式提供不同指令
        let systemPrompt = '';
        
        if (useReasoning) {
          systemPrompt = `将以下文本翻译成${targetLanguageName}。
请首先思考翻译策略和可能的难点，思考时要对原文中的专业术语、习惯用语、文化背景等进行分析，确保译文准确表达原意。
然后给出准确、流畅的翻译结果，不要在最终翻译中包含任何分析内容,只输出最终翻译结果。`;
        } else {
          systemPrompt = `将以下文本翻译成${targetLanguageName}。只输出翻译结果，严谨！准确！不要包含任何解释、分析或多余标签。`;
        }
        
        // 发送API请求
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                "role": "system",
                "content": systemPrompt
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: temperature
          })
        });
        
        // 检查响应状态
        if (!response.ok) {
          console.error('OpenAI翻译API错误:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`API错误: ${response.status} ${response.statusText}`);
        }
        
        // 解析响应数据
        const data = await response.json();
        console.log('OpenAI翻译响应成功:', {
          status: response.status,
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length || 0
        });
        
        // 提取翻译结果
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('OpenAI翻译响应格式错误:', data);
          throw new Error('API响应格式错误: 缺少翻译结果');
        }
        
        const content = data.choices[0].message.content.trim();
        
        // 如果开启了推理模式，则需要解析思考过程和翻译结果
        if (useReasoning) {
          // 尝试提取思考过程和翻译结果，使用正则表达式匹配<think>标签
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
          
          if (thinkMatch) {
            const thinking = thinkMatch[1].trim();
            // 确保翻译结果没有前导空行
            const translation = thinkMatch[2].trim();
            
            // 返回特殊格式的结果，包含思考过程和翻译结果
            return {
              thinking: thinking,
              translation: translation,
              hasThinking: true
            };
          } else {
            // 如果没有找到<think>标签，则尝试其他格式或直接返回全部内容
            console.warn('没有找到思考过程标签，尝试其他格式解析');
            
            // 尝试查找是否有明显的分隔符，如多个换行
            const parts = content.split(/\n{2,}/);
            if (parts.length >= 2) {
              // 假设最后一部分是翻译结果，前面部分是思考过程
              const translation = parts[parts.length - 1].trim();
              const thinking = parts.slice(0, parts.length - 1).join('\n\n').trim();
              
              return {
                thinking: thinking,
                translation: translation,
                hasThinking: true
              };
            }
            
            // 尝试查找是否包含"翻译结果"或"译文"等关键词作为分隔
            const translationMarkers = ["翻译结果", "译文", "Translation", "翻译如下"];
            for (const marker of translationMarkers) {
              const markerIndex = content.indexOf(marker);
              if (markerIndex > 0) {
                const thinking = content.substring(0, markerIndex).trim();
                const translation = content.substring(markerIndex).replace(marker, '').trim();
                
                return {
                  thinking: thinking,
                  translation: translation,
                  hasThinking: true
                };
              }
            }
            
            // 如果还是无法分割，则整个返回作为翻译结果
            return {
              thinking: '模型没有按照要求提供思考过程，请检查当前模型是否为推理模型，如果不需要推理，请关闭启用推理显示。',
              translation: content,
              hasThinking: true
            };
          }
        }
        
        // 如果未开启推理模式，则直接返回内容
        return content;
      } catch (error) {
        console.error('OpenAI翻译错误:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    },

    // 百度翻译
    async baidu(text, apiId, secretKey, from = 'auto', to = 'zh') {
      try {
        console.log('通过background调用百度翻译:', { text: text.substring(0, 20) + '...', from, to });
        console.log('百度翻译参数:', { 
          apiIdLength: apiId?.length || 0, 
          secretKeyLength: secretKey?.length || 0,
          textLength: text?.length || 0
        });
        
        // 验证参数
        if (!apiId || !secretKey) {
          console.error('百度翻译参数不完整: 缺少API ID或密钥');
          throw new Error('百度翻译参数不完整: 请检查API ID和密钥设置');
        }
        
        // 生成随机数 (百度官方示例使用随机数字字符串)
        const salt = Math.floor(10000 + Math.random() * 90000).toString(); // 5位随机数
        
        // 按照官方文档，构建签名字符串: appid + q + salt + appkey
        // 重要：此处不进行URL编码，签名生成用原始文本
        const signStr = apiId + text + salt + secretKey;
        
        console.log('百度翻译签名字符串:', {
          structure: 'appid + q + salt + appkey',
          length: signStr.length
        });
        
        // 使用MD5算法生成签名 (确保是32位小写)
        const sign = md5(signStr).toLowerCase();
        
        console.log('百度翻译请求准备完成:', { 
          salt, 
          signLength: sign.length, 
          signSample: sign.substring(0, 8) + '...',
          isValidSign: /^[0-9a-f]{32}$/.test(sign)
        });
        
        // 验证签名格式
        if (sign.length !== 32 || !/^[0-9a-f]{32}$/.test(sign)) {
          console.error('生成的签名格式不正确:', {
            length: sign.length,
            isHex: /^[0-9a-f]+$/.test(sign)
          });
          throw new Error('MD5签名格式错误: 无法生成有效的百度API签名');
        }
        
        // 通过background脚本发送请求，避免CORS问题
        // 注意：这里传递原始text，URL编码由background.js处理
        const response = await chrome.runtime.sendMessage({
          type: 'baidu_translate',
          text,
          from,
          to,
          appid: apiId,
          salt: salt,
          sign: sign
        });
        
        // 检查错误
        if (response.error) {
          console.error('百度翻译返回错误:', response.error);
          throw new Error(response.error);
        }
        
        console.log('百度翻译响应成功:', {
          translationLength: response.translation?.length || 0,
          from: response.from,
          to: response.to
        });
        
        // 返回翻译结果
        return response.translation;
      } catch (error) {
        console.error('百度翻译错误:', error.message);
        throw error;
      }
    },

    // 通义千问翻译
    async dashscope(text, apiKey) {
      try {
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen-v1',
            input: {
              prompt: `Translate to Chinese: ${text}`,
              parameters: {
                temperature: 0.3
              }
            }
          })
        });
        const data = await response.json();
        return data.output.text.trim();
      } catch (error) {
        console.error('Dashscope translation error:', error);
        throw error;
      }
    },

    // 火山翻译
    async volcengine(text, apiKey) {
      try {
        const response = await fetch('https://open.volcengineapi.com/api/v1/mt/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            source_language: 'auto',
            target_language: 'zh',
            text: text
          })
        });
        const data = await response.json();
        return data.translation;
      } catch (error) {
        console.error('Volcengine translation error:', error);
        throw error;
      }
    }
  },

  // AI 分析服务
  analysis: {
    // DeepSeek 分析
    async deepseek(messages, apiKey) {
      try {
        console.log('开始 DeepSeek 分析请求');
        
        // 获取存储的提示词设置
        const promptSettings = await getPromptSettings();
        
        const requestBody = {
          model: "deepseek-chat",
          messages: [
            {
              "role": "system",
              "content": `${promptSettings.systemRole}\n\n${promptSettings.analysisTemplate}`
            },
            {
              "role": "user",
              "content": messages.map(m => `${m.sender}: ${m.text}`).join('\n')
            }
          ],
          temperature: 1.3
        };
        
        console.log('DeepSeek 请求内容:', requestBody);

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('DeepSeek 响应状态:', response.status);
        const data = await response.json();
        console.log('DeepSeek 响应数据:', data);

        return data.choices[0].message.content;
      } catch (error) {
        console.error('DeepSeek 分析错误:', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          apiKey: apiKey ? '已提供' : '未提供'
        });
        throw error;
      }
    },

    // OpenAI分析
    async siliconflow(messages, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-3.5-turbo') {
      try {
        console.log('开始 OpenAI 分析请求');
        
        // 获取存储的提示词设置
        const promptSettings = await getPromptSettings();
        
        // 确保API URL和模型名称正确
        console.log('OpenAI API配置:', {
          apiUrl,
          model
        });
        
        const requestBody = {
          model: model,
          messages: [
            {
              "role": "system",
              "content": `${promptSettings.systemRole}\n\n${promptSettings.analysisTemplate}`
            },
            {
              "role": "user",
              "content": messages.map(m => `${m.sender}: ${m.text}`).join('\n')
            }
          ],
          temperature: 0.7  // 使用更保守的温度值
        };
        
        console.log('OpenAI 请求内容:', {
          apiUrl,
          model,
          messagesCount: messages.length,
          contentLength: messages.map(m => m.text).join('').length,
          temperature: requestBody.temperature,
          requestStructure: JSON.stringify(requestBody).substring(0, 100) + '...'
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        
        // 检查响应状态
        if (!response.ok) {
          const responseText = await response.text().catch(() => '');
          console.error('OpenAI API错误:', {
            status: response.status,
            statusText: response.statusText,
            responseBody: responseText
          });
          throw new Error(`API错误: ${response.status} ${response.statusText}${responseText ? ' - ' + responseText : ''}`);
        }
        
        console.log('OpenAI 响应状态:', response.status);
        const data = await response.json();
        console.log('OpenAI 响应数据:', data);

        // 提取并返回分析结果
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('OpenAI分析响应格式错误:', data);
          throw new Error('API响应格式错误: 缺少分析结果');
        }
        
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('OpenAI分析错误:', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          apiKey: apiKey ? '已提供' : '未提供',
          apiUrl,
          model
        });
        throw error;
      }
    },

    // 通义千问分析
    async dashscope(messages, apiKey) {
      try {
        const requestBody = {
          model: 'qwen-v1',
          input: {
            prompt: `作为对话分析专家，请分析以下对话并按照固定格式输出：

对话：
${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}

请按照以下格式输出分析结果：

对话氛围
[描述对话的整体语气和情感倾向]

主要话题
[列出对话中的主要话题和关键点]

双方态度
我方态度：[描述我方的态度和立场]
对方态度：[描述对方的态度和立场]

建议回复方式
[描述建议的回复策略和方式]

建议回复示例：
"[具体的回复示例文本]"`,
            parameters: {
              temperature: 0.7
            }
          }
        };

        console.log('Dashscope 请求内容:', requestBody);
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        return data.output.text;
      } catch (error) {
        console.error('Dashscope analysis error:', error);
        throw error;
      }
    },

    // 火山豆包分析
    async volcengine(messages, apiKey) {
      try {
        const requestBody = {
          messages: [
            {
              role: "system",
              content: `你是一位专业的对话分析专家。请按照以下固定格式分析对话内容：

对话氛围
[描述对话的整体语气和情感倾向]

主要话题
[列出对话中的主要话题和关键点]

双方态度
我方态度：[描述我方的态度和立场]
对方态度：[描述对方的态度和立场]

建议回复方式
[描述建议我方的回复策略和方式]

建议回复示例：
[具体的回复示例文本]`
            },
            {
              role: "user",
              content: `请分析以下对话：\n${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}`
            }
          ],
          temperature: 0.7
        };

        console.log('Volcengine 请求内容:', requestBody);
        const response = await fetch('https://open.volcengineapi.com/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error('Volcengine analysis error:', error);
        throw error;
      }
    }
  }
};

// 获取翻译服务配置
window.getTranslationSettings = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['translationApi', 'targetLanguage'], (data) => {
      resolve({
        service: data.translationApi || 'google',    // 默认使用 Google
        targetLang: data.targetLanguage || 'zh-CN'  // 默认翻译为中文
      });
    });
  });
};

// 获取当前配置的 AI 服务
window.getAiService = function() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      [
        'aiEnabled',
        'aiApi',
        'deepseekApiKey_ai',
        'siliconflowApiKey_ai',
        'siliconflowApiUrl_ai',
        'siliconflowModel_ai',
        'aiSystemRole'
      ],
      function(data) {
        try {
          // 如果 AI 功能未启用，则返回空配置
          if (!data.aiEnabled) {
            resolve({
              enabled: false,
              service: null,
              apiKey: null,
              systemRole: null
            });
            return;
          }

          // 根据选择的 AI 服务获取 API 密钥
          let service = data.aiApi || 'deepseek';
          let apiKey = null;
          let apiUrl = null;
          let model = null;
          let systemRole = data.aiSystemRole || '你是一位助手，请简明扼要地分析以下对话，提供重点摘要和主要观点。';

          if (service === 'deepseek') {
            apiKey = data.deepseekApiKey_ai || '';
          } else if (service === 'siliconflow') {
            apiKey = data.siliconflowApiKey_ai || '';
            apiUrl = data.siliconflowApiUrl_ai || 'https://api.openai.com/v1/chat/completions';
            model = data.siliconflowModel_ai || 'gpt-3.5-turbo';
          }

          resolve({
            enabled: true,
            service,
            apiKey,
            apiUrl,
            model,
            systemRole
          });
        } catch (error) {
          console.error('获取 AI 服务配置时出错:', error);
          reject(error);
        }
      }
    );
  });
};

// 获取存储的提示词设置
async function getPromptSettings() {
  const defaultTemplate = `对话氛围
[描述对话的整体语气和情感倾向]

主要话题
[列出对话中的主要话题和关键点]

双方态度
我方态度：[描述我方的态度和立场]
对方态度：[描述对方的态度和立场]

建议回复方式
[描述建议的回复策略和方式]

建议回复示例：
"在这里直接写出具体的回复文本（用英文输出），使用引号包裹，注意你在进行在线对话，所以回复文本要符合在线对话的语境，并且无需加上署名之类的"`;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['systemRole'], (data) => {
      resolve({
        systemRole: data.systemRole || '你是一位专业的对话分析专家和二十年经验的外贸业务员。请分析以下对话内容，结合对方和我方的实际情况，并严格按照固定格式输出分析结果，但是不要输出Markdown格式。',
        analysisTemplate: defaultTemplate
      });
    });
  });
}

// 添加获取翻译服务的函数
window.getTranslationService = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['translationApi', 'deepseekApiKey', 'dashscopeApiKey', 'volcengineApiKey', 'baiduApiId', 'baiduSecretKey', 'siliconflowApiKey', 'siliconflowApiUrl', 'siliconflowModel', 'targetLanguage'], (data) => {
      const service = data.translationApi || 'google';  // 默认使用 Google
      let apiKey = '';
      let secretKey = '';
      let apiUrl = '';
      let model = '';
      
      // 根据选择的服务设置对应的API Key
      switch(service) {
        case 'deepseek':
          apiKey = data.deepseekApiKey || '';
          break;
        case 'dashscope':
          apiKey = data.dashscopeApiKey || '';
          break;
        case 'volcengine':
          apiKey = data.volcengineApiKey || '';
          break;
        case 'baidu':
          apiKey = data.baiduApiId || '';
          secretKey = data.baiduSecretKey || '';
          break;
        case 'siliconflow':
          apiKey = data.siliconflowApiKey || '';
          apiUrl = data.siliconflowApiUrl || 'https://api.openai.com/v1/chat/completions';
          model = data.siliconflowModel || 'gpt-3.5-turbo';
          break;
        case 'google':
          // 谷歌翻译不需要设置API Key
          apiKey = '';
          break;
        default:
          apiKey = '';
      }
      
      // 检查是否需要API Key的服务但没有设置Key，如果是则回退到Google翻译
      if ((service === 'deepseek' || service === 'dashscope' || service === 'volcengine' || service === 'siliconflow') && !apiKey) {
        console.warn(`${service} 服务需要API Key但未设置，自动回退到Google翻译`);
        resolve({
          service: 'google',
          apiKey: '',
          secretKey: '',
          apiUrl: '',
          model: '',
          targetLang: data.targetLanguage || 'zh-CN'
        });
      } else if (service === 'baidu' && (!apiKey || !secretKey)) {
        console.warn('百度翻译需要API ID和Secret Key但未设置，自动回退到Google翻译');
        resolve({
          service: 'google',
          apiKey: '',
          secretKey: '',
          apiUrl: '',
          model: '',
          targetLang: data.targetLanguage || 'zh-CN'
        });
      } else {
        resolve({
          service,              // 翻译服务
          apiKey,               // API Key
          secretKey,            // Secret Key (百度翻译需要)
          apiUrl,               // API URL (OpenAI需要)
          model,                // 模型名称 (OpenAI需要)
          targetLang: data.targetLanguage || 'zh-CN'  // 目标语言
        });
      }
    });
  });
};

// 添加错误处理函数
window.handleTranslationError = (error) => {
  console.error('Translation error:', {
    message: error.message,
    stack: error.stack,
    details: error.toString()
  });
  
  // 返回用户友好的错误信息
  return {
    error: true,
    message: error.message || '翻译服务暂时不可用，请稍后重试',
    code: error.code || 'TRANSLATION_ERROR'
  };
};

// MD5加密函数 - 直接使用内置实现避免循环引用
function md5(string) {
  // 检查输入
  if (typeof string !== 'string') {
    console.error('MD5输入必须是字符串，当前类型:', typeof string);
    string = String(string); // 尝试转换为字符串
  }

  // 直接使用内置实现，避免引用CryptoJS造成循环调用
  console.log('API服务使用内置MD5实现, 输入长度:', string.length);
  
  // 本地实现 MD5 函数
  function md5Implementation(string) {
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
    
    function add32(a, b) {
      return (a + b) & 0xFFFFFFFF;
    }
    
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
      let s = (x[i] >>> 0).toString(16); // 使用无符号右移确保正确的16进制值
      while (s.length < 8) {
        s = '0' + s; // 补齐到8位
      }
      result += s;
    }
    
    // 确保结果是32位小写
    result = result.toLowerCase();
    
    // 验证结果格式
    if (result.length !== 32 || !/^[0-9a-f]{32}$/.test(result)) {
      console.error('生成的MD5不符合要求:', result.length, result.substring(0, 10) + '...');
    } else {
      console.log('MD5生成成功:', result.substring(0, 8) + '...');
    }
    
    return result;
  }
  
  // 调用实现并返回结果
  const result = md5Implementation(string);
  return result;
}