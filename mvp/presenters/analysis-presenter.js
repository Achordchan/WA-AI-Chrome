(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.analysisPresenter) return;

  function parseAnalysis(text) {
    const result = {
      mood: '',
      topics: [],
      attitudes: {
        me: '',
        other: ''
      },
      suggestions: [],
      suggestedReply: ''
    };

    const sanitizeSuggestedReply = (raw) => {
      try {
        let v = String(raw || '').trim();
        if (!v) return '';

        // 常见“模板泄露”句：如果模型把模板提示也输出进了引号内，这里直接剔除
        v = v.replace(/^在这里直接写出具体的回复文本[\s\S]*?(\n\n|\n|$)/, '').trim();
        v = v.replace(/^reply example text\s*/i, '').trim();
        v = v.replace(/^reply_example_text\s*/i, '').trim();
        v = v.replace(/^reply\s*example\s*text\s*/i, '').trim();

        // 有些模型会把额外要求拼进引号内，做一次保守清理
        v = v.replace(/\n\s*额外要求[\s\S]*$/i, '').trim();
        v = v.replace(/\n\s*格式要求[\s\S]*$/i, '').trim();
        v = v.replace(/\n\s*语言要求[\s\S]*$/i, '').trim();

        // 去掉首尾多余引号
        v = v.replace(/^['"“”]+/, '').replace(/['"“”]+$/, '').trim();

        return v;
      } catch (e) {
        return String(raw || '').trim();
      }
    };

    try {
      console.log('开始解析文本:', text);

      if (!text || typeof text !== 'string') {
        console.error('无效的分析文本:', text);
        return result;
      }

      const replyPatterns = [
        /建议回复示例[：:]\s*["”]([^"”]+)["”]/,
        /建议回复示例[：:]\s*[']([^']+)[']/,
        /建议回复[：:]\s*["”]([^"”]+)["”]/,
        /建议回复[：:]\s*[']([^']+)[']/,
        /示例[：:]\s*["”]([^"”]+)["”]/,
        /示例[：:]\s*[']([^']+)[']/,
        /回复示例[：:]\s*["”]([^"”]+)["”]/,
        /回复示例[：:]\s*[']([^']+)[']/,
        /["”]([^"”]{10,})["”]/,
        /[']([^']{10,})[']/
      ];

      for (const pattern of replyPatterns) {
        const match = text.match(pattern);
        if (match) {
          const reply = match[1].trim();
          result.suggestedReply = sanitizeSuggestedReply(reply.replace(/^\[(.*)\]$/, '$1').trim());
          console.log('找到建议回复示例:', result.suggestedReply);
          break;
        }
      }

      const cleanText = text.replace(/\r\n/g, '\n');

      let sections = [];
      if (cleanText.includes('\n\n')) {
        sections = cleanText.split('\n\n');
      } else {
        sections = cleanText
          .split('\n')
          .filter((line) => line.trim())
          .reduce((acc, line) => {
            if (/^(对话氛围|主要话题|双方态度|建议回复方式|回复示例)/.test(line)) {
              acc.push(line);
            } else if (acc.length > 0) {
              acc[acc.length - 1] += '\n' + line;
            }
            return acc;
          }, []);
      }

      console.log('解析的段落数:', sections.length);

      for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();

        if (/对话氛围/.test(title)) {
          if (lines.length <= 1) {
            const moodPattern = /氛围[是为：:]\s*(.+)/;
            const moodMatch = cleanText.match(moodPattern);
            if (moodMatch) {
              result.mood = moodMatch[1].replace(/[\[\]]/g, '').trim();
            }
          } else {
            result.mood = lines
              .slice(1)
              .join(' ')
              .replace(/[\[\]]/g, '')
              .trim();
          }
        } else if (/主要话题/.test(title)) {
          const topicContent = lines.slice(1).join(' ');
          let topics = [];

          if (topicContent.includes('。')) {
            topics = topicContent
              .replace(/[\[\]]/g, '')
              .split(/[。；;]/)
              .map((t) => t.trim())
              .filter((t) => t);
          } else {
            topics = lines
              .slice(1)
              .map((line) => line.replace(/^[\d\-、]+[\s.]*|[\[\]]/g, '').trim())
              .filter((t) => t);
          }

          if (topics.length > 0) {
            result.topics = topics;
          }
        } else if (/双方态度/.test(title)) {
          const mePatterns = [/我方态度[：:]\s*(.+)/, /我方[：:]\s*(.+)/, /我方的态度(是)?[：:)]\s*(.+)/];
          const otherPatterns = [/对方态度[：:]\s*(.+)/, /对方[：:]\s*(.+)/, /对方的态度(是)?[：:)]\s*(.+)/];

          const isPlaceholder = (v) => {
            const s = String(v || '').trim();
            if (!s) return true;
            if (/^\[?描述/.test(s)) return true;
            if (/描述.*态度/.test(s)) return true;
            return false;
          };

          const meBullets = [];
          const otherBullets = [];
          let current = '';

          const pushBullet = (who, raw) => {
            const v = String(raw || '')
              .replace(/^[\s\-•*\d、.]+/, '')
              .replace(/[\[\]]/g, '')
              .trim();
            if (!v) return;
            if (isPlaceholder(v)) return;
            if (who === 'me') meBullets.push(v);
            if (who === 'other') otherBullets.push(v);
          };

          for (const line of lines) {
            const rawLine = String(line || '').trim();
            if (!rawLine) continue;

            for (const pattern of mePatterns) {
              const match = line.match(pattern);
              if (match) {
                const v = (match[2] || match[1]).replace(/[\[\]]/g, '').trim();
                result.attitudes.me = isPlaceholder(v) ? '' : v;
                current = 'me';
                break;
              }
            }

            for (const pattern of otherPatterns) {
              const match = line.match(pattern);
              if (match) {
                const v = (match[2] || match[1]).replace(/[\[\]]/g, '').trim();
                result.attitudes.other = isPlaceholder(v) ? '' : v;
                current = 'other';
                break;
              }
            }

            if (current === 'me') {
              pushBullet('me', rawLine);
            } else if (current === 'other') {
              if (/未发言\s*\/\s*无法判断|未发言|无法判断/.test(rawLine)) {
                result.attitudes.other = '未发言/无法判断';
              } else {
                pushBullet('other', rawLine);
              }
            }
          }

          if (!result.attitudes.me && meBullets.length > 0) {
            result.attitudes.me = meBullets.join('\n');
          }

          if (!result.attitudes.other) {
            if (otherBullets.length > 0) {
              result.attitudes.other = otherBullets.join('\n');
            }
          }

          if (!result.attitudes.me) {
            for (const pattern of mePatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.me = (match[2] || match[1]).replace(/[\[\]]/g, '').trim();
                break;
              }
            }
          }

          if (!result.attitudes.other) {
            for (const pattern of otherPatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.other = (match[2] || match[1]).replace(/[\[\]]/g, '').trim();
                break;
              }
            }
          }
        } else if (/建议回复方式|回复建议|回复策略/.test(title)) {
          const suggestions = [];

          for (const line of lines.slice(1)) {
            const cleanLine = line.replace(/[\[\]]/g, '').trim();

            const isPlaceholderSuggestion = (v) => {
              const s = String(v || '').trim();
              if (!s) return true;
              if (/^描述建议/.test(s)) return true;
              if (/建议的回复策略和方式/.test(s)) return true;
              return false;
            };

            if (
              cleanLine &&
              !isPlaceholderSuggestion(cleanLine) &&
              !cleanLine.includes('建议回复示例') &&
              !cleanLine.includes('回复示例') &&
              !cleanLine.startsWith('"') &&
              !cleanLine.startsWith('“') &&
              !cleanLine.startsWith("'")
            ) {
              suggestions.push(cleanLine);
            }
          }

          if (suggestions.length > 0) {
            result.suggestions = suggestions;
          }
        }
      }

      // 兜底：如果对方未发言，则过滤掉明显“回应对方”的建议条目（避免不合理内容）
      try {
        const otherNoSpeech = /未发言\s*\/\s*无法判断|未发言|无法判断/.test(String(result.attitudes.other || ''));
        if (otherNoSpeech && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
          result.suggestions = result.suggestions.filter((s) => !/对方|回应对方|回复对方|对对方/.test(String(s || '')));
        }
      } catch (e) {
        // ignore
      }

      if (!result.mood) {
        const moodPattern = /对话(的)?(氛围|语气)(是|为)?[：:]\s*(.+?)(?=\n|$)/;
        const moodMatch = cleanText.match(moodPattern);
        if (moodMatch) {
          result.mood = moodMatch[4].replace(/[\[\]]/g, '').trim();
        }
      }

      if (!result.mood && cleanText.length > 0) {
        const firstPara = cleanText.split('\n')[0];
        if (firstPara.length > 10 && !firstPara.includes('对话')) {
          result.mood = firstPara.replace(/[\[\]]/g, '').trim();
        }
      }

      if (result.topics.length === 0 && cleanText.includes('话题')) {
        const topicSection = cleanText.match(/话题[：:]\s*(.+?)(?=\n\n|\n[^\n]|$)/s);
        if (topicSection) {
          result.topics = [topicSection[1].replace(/[\[\]]/g, '').trim()];
        }
      }

      console.log('最终解析结果:', result);
      return result;
    } catch (error) {
      console.error('解析分析结果时出错:', error);

      if (text && typeof text === 'string') {
        const firstLine = text.split('\n')[0];
        if (firstLine && firstLine.length > 0) {
          result.mood = firstLine.replace(/[\[\]]/g, '').trim();
        }

        const paragraphs = text.split('\n\n');
        if (paragraphs.length > 1) {
          const longestPara = paragraphs.reduce((longest, current) => (current.length > longest.length ? current : longest), '');
          if (longestPara.length > 20) {
            result.suggestedReply = longestPara.replace(/[\[\]"]/g, '').trim();
          }
        }
      }

      return result;
    }
  }

  async function showResult(container, analysisText, options = {}) {
    try {
      const normalizeLang = (v) => {
        try {
          const raw = String(v || '').trim();
          if (!raw) return 'en';
          const lower = raw.toLowerCase();
          return (lower.split('-')[0] || 'en').trim() || 'en';
        } catch (e) {
          return 'en';
        }
      };

      const looksLikeEnglish = (s) => {
        try {
          const t = String(s || '').trim();
          if (!t) return false;
          const letters = (t.match(/[A-Za-z]/g) || []).length;
          if (letters < 6) return false;
          const nonSpace = t.replace(/\s/g, '');
          const ratio = nonSpace.length ? letters / nonSpace.length : 0;
          return ratio >= 0.45;
        } catch (e) {
          return false;
        }
      };

      const hasJapanese = (s) => {
        try {
          return /[\u3040-\u30ff\u4e00-\u9fff]/.test(String(s || ''));
        } catch (e) {
          return false;
        }
      };

      const parsed = parseAnalysis(analysisText);
      const target = normalizeLang(options?.suggestedReplyLang);

      try {
        if (parsed?.suggestedReply && target && target !== 'en') {
          const replyText = String(parsed.suggestedReply || '').trim();
          const shouldFix = looksLikeEnglish(replyText) && (target !== 'ja' || !hasJapanese(replyText));
          if (shouldFix) {
            const api = options?.ApiServices || window.ApiServices;
            const translateFn = api?.translation?.google;
            if (typeof translateFn === 'function') {
              const translated = await translateFn(replyText, 'auto', target);
              const v = String(translated || '').trim();
              if (v) parsed.suggestedReply = v;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      window.WAAP?.views?.analysisView?.renderResult?.(container, parsed);
    } catch (e) {
      try {
        window.WAAP?.views?.analysisView?.renderError?.(container, e?.message || 'unknown');
      } catch (e2) {
        // ignore
      }
    }
  }

  function showError(container, message) {
    try {
      window.WAAP?.views?.analysisView?.renderError?.(container, message);
    } catch (e) {
      // ignore
    }
  }

  async function open(container, options = {}) {
    const deps = options || {};

    try {
      window.WAAP?.views?.analysisView?.ensurePanel?.(container);
    } catch (e) {
      // ignore
    }

    try {
      const checkEnabled = deps.checkAiEnabled || (async () => {
        return await new Promise((resolve) => {
          try {
            chrome.storage.sync.get(['aiEnabled'], (data) => resolve(data.aiEnabled === true));
          } catch (e) {
            resolve(false);
          }
        });
      });

      const aiEnabled = await checkEnabled();
      if (!aiEnabled) {
        try {
          const toast = document.createElement('div');
          toast.className = 'settings-toast error';
          toast.textContent = 'AI分析功能未启用，请在设置中开启并配置API参数';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } catch (e) {
          // ignore
        }

        try {
          deps.showSettingsModal?.();
        } catch (e) {
          // ignore
        }
        return;
      }

      const getAiService = deps.getAiService || window.getAiService;
      const serviceInfo = await (typeof getAiService === 'function' ? getAiService() : null);
      const service = serviceInfo?.service;
      const apiKey = serviceInfo?.apiKey;
      const apiUrl = serviceInfo?.apiUrl;
      const model = serviceInfo?.model;

      if (!apiKey) {
        try {
          const toast = document.createElement('div');
          toast.className = 'settings-toast error';
          toast.textContent = '请先在设置中配置 OpenAI AI分析 API Key';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } catch (e) {
          // ignore
        }

        try {
          deps.showSettingsModal?.();
        } catch (e) {
          // ignore
        }
        return;
      }

      const getMessageTextRoot = deps.getMessageTextRoot;
      const collectTextContent = deps.collectTextContent;

      const messageElements = container?.querySelectorAll?.('div[data-pre-plain-text]') || [];
      const messages = [];

      try {
        messageElements.forEach((element) => {
          const msgContainer = element.closest?.('.message-in, .message-out');
          const preText = element.getAttribute?.('data-pre-plain-text');
          let time = '';
          let text = '';
          const isMe = !!(msgContainer && msgContainer.classList && msgContainer.classList.contains('message-out'));
          const sender = isMe ? '我方' : '对方';

          if (preText) {
            const timeMatch = preText.match(/(\d{1,2}:\d{2}(?:\s*(?:上午|下午|AM|PM)?)?)/);
            if (timeMatch) time = timeMatch[1];
          }

          try {
            if (typeof getMessageTextRoot === 'function' && typeof collectTextContent === 'function') {
              const textRoot = getMessageTextRoot(element);
              text = collectTextContent(textRoot);
            } else {
              text = element.textContent || '';
            }
          } catch (e) {
            text = '';
          }

          if (text) {
            messages.push({ sender, text, time, isMe });
          }
        });
      } catch (e) {
        // ignore
      }

      const exportChat = async () => {
        try {
          const getChatTitle = window.WAAP?.services?.whatsappDomService?.getChatTitleFirstLine;
          let headerName = '';
          if (typeof getChatTitle === 'function') {
            headerName = String(getChatTitle() || '').trim();
          }
          if (!headerName) headerName = '未知联系人';

          const msgs = container?.querySelectorAll?.('div[data-pre-plain-text]') || [];
          let chatContent = `聊天记录导出时间: ${new Date().toLocaleString()}\n`;
          chatContent += `对话者: ${headerName}\n\n`;

          msgs.forEach((msg) => {
            try {
              const pre = msg.getAttribute('data-pre-plain-text') || '';

              let messageText = '';
              try {
                if (typeof getMessageTextRoot === 'function' && typeof collectTextContent === 'function') {
                  const textRoot = getMessageTextRoot(msg);
                  messageText = collectTextContent(textRoot) || '';
                }
              } catch (e) {
                messageText = '';
              }

              if (!messageText) {
                try {
                  messageText = msg.querySelector('.selectable-text')?.textContent || '';
                } catch (e) {
                  messageText = '';
                }
              }

              if (!messageText) {
                try {
                  messageText = msg.textContent || '';
                } catch (e) {
                  messageText = '';
                }
              }

              const cleanedText = String(messageText || '').replace(/译$/, '').trim();
              if (cleanedText) chatContent += `${pre}${cleanedText}\n`;
            } catch (e) {
              // ignore
            }
          });

          const fileName = `WhatsApp-${headerName}-${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
          const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error('导出聊天记录时发生错误:', e);
        }
      };

      window.WAAP?.views?.analysisView?.renderPicker?.(container, messages, {
        onExport: exportChat,
        onStart: async (selectedMessages) => {
          try {
            if (!selectedMessages || selectedMessages.length === 0) return;
            window.WAAP?.views?.analysisView?.renderLoading?.(container);

            const decodeSafe = (v) => {
              try {
                return decodeURIComponent(String(v ?? ''));
              } catch (e) {
                return String(v ?? '');
              }
            };

            const normalizedMessages = selectedMessages.map((m) => ({
              sender: decodeSafe(m.sender),
              text: decodeSafe(m.text),
              time: decodeSafe(m.time)
            }));

            const api = deps.ApiServices || window.ApiServices;
            const analysisFns = api?.analysis;
            if (!analysisFns || !analysisFns[service]) {
              throw new Error('AI分析服务不可用');
            }

            let suggestedReplyLang = 'en';
            try {
              const fn =
                window.getRememberedLanguage || (typeof getRememberedLanguage === 'function' ? getRememberedLanguage : null);
              const chatWindow = document.getElementById('main') || container || document;
              if (typeof fn === 'function') {
                suggestedReplyLang = String(fn(chatWindow) || 'en');
              }
            } catch (e) {
              // ignore
            }

            let meMessageCount = 0;
            let otherMessageCount = 0;
            try {
              normalizedMessages.forEach((m) => {
                if (String(m?.sender || '') === '我方') meMessageCount += 1;
                if (String(m?.sender || '') === '对方') otherMessageCount += 1;
              });
            } catch (e) {
              // ignore
            }

            let analysis;
            if (service === 'siliconflow') {
              analysis = await analysisFns[service](normalizedMessages, apiKey, apiUrl, model, {
                suggestedReplyLang,
                meMessageCount,
                otherMessageCount
              });
            } else {
              analysis = await analysisFns[service](normalizedMessages, apiKey, {
                suggestedReplyLang,
                meMessageCount,
                otherMessageCount
              });
            }

            await showResult(container, analysis, {
              suggestedReplyLang,
              ApiServices: api
            });
          } catch (e) {
            showError(container, e?.message || 'unknown');
          }
        }
      });
    } catch (e) {
      try {
        showError(container, e?.message || 'unknown');
      } catch (e2) {
        // ignore
      }
    }
  }

  window.WAAP.presenters.analysisPresenter = {
    showResult,
    showError,
    parseAnalysis,
    open
  };
})();
