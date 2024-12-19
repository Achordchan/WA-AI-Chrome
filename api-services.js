// API 服务管理
window.ApiServices = {
  // 翻译服务
  translation: {
    // Google 翻译 (非官方接口)
    google: async (text, targetLang = 'zh-CN') => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data[0]) {
          // 合并所有翻译段落
          const translation = data[0]
            .filter(item => item && item[0])  // 过滤掉空值
            .map(item => item[0])             // 提取翻译文本
            .join('\n');                      // 用换行符连接
          
          return translation;
        } else {
          throw new Error('Translation result format error');
        }
      } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Translation service is temporarily unavailable, please try again later');
      }
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
                "content": "You are a translator. Translate the following text to Chinese. Only provide the translation, no explanations."
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: 0.3
          })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('DeepSeek translation error:', error);
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
          temperature: 0.7
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

// 获取当前设置的翻译服务
window.getTranslationService = async function() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'translationApi',
      'targetLanguage',
      'deepseekApiKey',
      'dashscopeApiKey',
      'volcengineApiKey'
    ], (data) => {
      resolve({
        service: data.translationApi || 'google',
        targetLang: data.targetLanguage || 'zh-CN',
        apiKey: data[`${data.translationApi}ApiKey`]
      });
    });
  });
};

// 获取当前设置的 AI 服务
window.getAiService = async function() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'aiApi',
      'deepseekApiKey',
      'dashscopeApiKey',
      'volcengineApiKey'
    ], (data) => {
      console.log('获取 AI 服务设置:', {
        service: data.aiApi || 'deepseek',
        hasApiKey: !!data[`${data.aiApi || 'deepseek'}ApiKey`]
      });
      resolve({
        service: data.aiApi || 'deepseek',
        apiKey: data[`${data.aiApi || 'deepseek'}ApiKey`]
      });
    });
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