// API 服务管理

function normalizeLangCode(lang) {
  try {
    const raw = String(lang || '').trim();
    if (!raw) return 'en';
    const lower = raw.toLowerCase();
    return (lower.split('-')[0] || 'en').trim() || 'en';
  } catch (e) {
    return 'en';
  }
}

function getLanguageNameZh(code) {
  const map = {
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
    no: '挪威文',
    da: '丹麦文',
    fi: '芬兰文',
    pl: '波兰文',
    cs: '捷克文',
    el: '希腊文',
    he: '希伯来文',
    fa: '波斯文',
    ur: '乌尔都文',
    uk: '乌克兰文',
    ro: '罗马尼亚文',
    hu: '匈牙利文',
    bn: '孟加拉文',
    ta: '泰米尔文',
    te: '泰卢固文'
  };
  return map[code] || '英文';
}

function resolveSuggestedReplyLang(options = {}) {
  try {
    const optLang = options.suggestedReplyLang || options.replyLang || options.lang;
    if (optLang) return normalizeLangCode(optLang);

    const chatWindow = document.getElementById('main') || document;
    const fn =
      window.getRememberedLanguage || (typeof getRememberedLanguage === 'function' ? getRememberedLanguage : null);
    if (typeof fn === 'function') {
      return normalizeLangCode(fn(chatWindow));
    }
  } catch (e) {
    // ignore
  }
  return 'en';
}

function buildSuggestedReplyLangHint(options = {}) {
  try {
    const langCode = resolveSuggestedReplyLang(options);
    const langName = getLanguageNameZh(langCode);
    let hint = `\n\n语言要求：除“建议回复示例”这一项外，其它所有内容必须使用中文输出；“建议回复示例”请使用${langName}输出。不要附加翻译说明或多余标签。`;

    hint += `\n\n强制要求：如果“建议回复示例”不是${langName}（language code: ${langCode}），请先自行改写为${langName}后再输出最终结果。`;

    // 强约束：避免模型把模板里的示例/说明原样复述进“建议回复示例”字段
    hint += `\n\n格式要求：“建议回复示例”这一项的引号内只写一条可直接发送的回复文本，不要复述模板示例文字，不要写解释，不要换成多条。`;

    // 语言约束：当目标语言不是中文时，只约束“建议回复示例”不要夹杂中文（不要影响其它字段的中文输出）
    if (String(langCode || '') !== 'zh') {
      hint += `\n\n补充：在“建议回复示例”的回复文本中不要夹杂中文。`;
    }

    // 语言约束：当目标语言不是英文时，避免模型偷懒输出英文示例
    if (String(langCode || '') !== 'en') {
      hint += `\n\n补充：在“建议回复示例”的回复文本中不要使用英文。`;
    }

    try {
      const otherCount = Number(options?.otherMessageCount);
      if (Number.isFinite(otherCount) && otherCount === 0) {
        hint += `\n\n额外上下文：对方在所选聊天记录中没有发送任何消息，因此“对方态度”应写为“未发言/无法判断”，不要臆测对方态度。`;
        hint += `\n\n补充要求：在“建议回复方式”里，不要写成“回应对方观点/对方态度”，而是聚焦：我方下一步怎么做（是否需要继续补充信息、如何礼貌收尾、是否要明确提问、是否无需回复等）。`;
      }
    } catch (e2) {
      // ignore
    }
    return hint;
  } catch (e) {
    return `\n\n额外要求：建议回复示例请使用英文输出；不要附加翻译说明或多余标签。`;
  }
}

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

    // OpenAI接口翻译
    async siliconflow(text, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-3.5-turbo', targetLang = 'zh') {
      try {
        const requestStartAt = Date.now();
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
          const err = new Error(`API错误: ${response.status} ${response.statusText}`);
          try {
            err.status = response.status;
            err.statusText = response.statusText;
          } catch (e) {
            // ignore
          }
          throw err;
        }
        
        // 解析响应数据
        const data = await response.json();
        const latencyMs = Math.max(0, Date.now() - requestStartAt);
        const usage = (data && typeof data === 'object') ? data.usage : undefined;

        const meta = {
          service: 'siliconflow',
          model,
          apiUrl,
          latencyMs,
          usage
        };
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
              ,
              meta
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
                ,
                meta
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
                  ,
                  meta
                };
              }
            }
            
            // 如果还是无法分割，则整个返回作为翻译结果
            return {
              thinking: '模型没有按照要求提供思考过程，请检查当前模型是否为推理模型，如果不需要推理，请关闭启用推理显示。',
              translation: content,
              hasThinking: true
              ,
              meta
            };
          }
        }
        
        // 如果未开启推理模式，则直接返回内容（但附带 meta，方便 UI 显示耗时/token）
        try {
          const boxed = new String(content);
          boxed.meta = meta;
          return boxed;
        } catch (e) {
          return content;
        }
      } catch (error) {
        console.error('OpenAI翻译错误:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
  },

  // AI 分析服务
  analysis: {
    // OpenAI分析
    async siliconflow(messages, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-3.5-turbo', options = {}) {
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
              "content": `${promptSettings.systemRole}\n\n${promptSettings.analysisTemplate}${buildSuggestedReplyLangHint(options)}`
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
    }
  }
};

// 获取翻译服务配置
window.getTranslationSettings = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['translationApi', 'targetLanguage'], (data) => {
      const rawService = data.translationApi || 'google';
      const service = rawService === 'siliconflow' ? 'siliconflow' : 'google';
      resolve({
        service: service,    // 默认使用 Google
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

          // 只保留 OpenAI 通用接口（siliconflow）
          const service = 'siliconflow';
          let apiKey = null;
          let apiUrl = null;
          let model = null;
          let systemRole = data.aiSystemRole || '你是一位助手，请简明扼要地分析以下对话，提供重点摘要和主要观点。';

          apiKey = data.siliconflowApiKey_ai || '';
          apiUrl = data.siliconflowApiUrl_ai || 'https://api.openai.com/v1/chat/completions';
          model = data.siliconflowModel_ai || 'gpt-3.5-turbo';

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
"REPLY_EXAMPLE_TEXT"`;

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
    chrome.storage.sync.get(
      ['translationApi', 'siliconflowApiKey', 'siliconflowApiUrl', 'siliconflowModel', 'targetLanguage'],
      (data) => {
        const rawService = data.translationApi || 'google';
        const service = rawService === 'siliconflow' || rawService === 'google' ? rawService : 'google';

        const apiKey = service === 'siliconflow' ? (data.siliconflowApiKey || '') : '';
        const apiUrl = data.siliconflowApiUrl || 'https://api.openai.com/v1/chat/completions';
        const model = data.siliconflowModel || 'gpt-3.5-turbo';

        // OpenAI 通用接口未配置 key 时，自动回退到 Google（避免把用户卡死在不可用状态）
        if (service === 'siliconflow' && !apiKey) {
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            apiUrl: '',
            model: '',
            targetLang: data.targetLanguage || 'zh-CN'
          });
          return;
        }

        resolve({
          service,
          apiKey,
          secretKey: '',
          apiUrl: service === 'siliconflow' ? apiUrl : '',
          model: service === 'siliconflow' ? model : '',
          targetLang: data.targetLanguage || 'zh-CN'
        });
      }
    );
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