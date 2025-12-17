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
        
        const normalizeTargetLang = (lang) => {
          const raw = String(lang || '').trim();
          if (!raw) return 'zh';
          const lower = raw.toLowerCase();
          if (lower === 'zh-cn' || lower === 'zh-hans') return 'zh';
          if (lower === 'zh-tw' || lower === 'zh-hant') return 'zh';
          const base = lower.split('-')[0];
          return base || 'zh';
        };

        const langNameMap = {
          zh: '中文',
          en: '英文',
          ja: '日文',
          ko: '韩文',
          fr: '法文',
          de: '德文',
          es: '西班牙文',
          it: '意大利文',
          pt: '葡萄牙文',
          ru: '俄文',
          ar: '阿拉伯文',
          hi: '印地文',
          th: '泰文',
          vi: '越南文',
          id: '印尼文',
          ms: '马来文',
          tr: '土耳其文',
          nl: '荷兰文',
          sv: '瑞典文',
          da: '丹麦文',
          fi: '芬兰文',
          no: '挪威文',
          pl: '波兰文',
          cs: '捷克文',
          hu: '匈牙利文',
          ro: '罗马尼亚文',
          uk: '乌克兰文',
          he: '希伯来文',
          fa: '波斯文',
          ur: '乌尔都文',
          bn: '孟加拉文',
          ta: '泰米尔文',
          te: '泰卢固文'
        };

        const normalizedTargetLang = normalizeTargetLang(targetLang);
        const targetLanguageName = langNameMap[normalizedTargetLang] || '目标语言';
        
        console.log('翻译目标语言:', { targetLang, targetLanguageName });
        
        // 构建系统提示，根据是否开启推理模式提供不同指令
        let systemPrompt = '';

        if (useReasoning) {
          systemPrompt = `你是一位专业翻译。
将用户提供的文本翻译成${targetLanguageName}。
请先思考翻译策略与难点（术语、习惯用语、语气、文化背景、格式等），但最终只输出译文正文。
要求：
1) 只输出译文，不要解释，不要加标签，不要加引号；
2) 保留原文的换行与段落结构；
3) 不要翻译人名/品牌名/产品型号/URL（除非原文本身就是翻译后的形式）；
4) 保持原语气、敬语与情绪。`;
        } else {
          systemPrompt = `你是一位专业翻译。
将用户提供的文本翻译成${targetLanguageName}。
要求：只输出译文正文，不要解释，不要加标签，不要加引号；保留原文换行与段落；保持语气与信息完整。`;
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
        const sign = MD5(signStr).toLowerCase();
        
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