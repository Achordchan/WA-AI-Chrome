/*
用途：语音消息转写（STT）与可选翻译的核心服务：从 blob: URL 读取 ogg/opus，转成 wav，调用 OpenAI 兼容 STT 接口，并把转写结果交给翻译服务。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.voiceTranscribeService) return;

  function getDefaultSttApiUrl() {
    return 'https://api.openai.com/v1/audio/transcriptions';
  }

  function getDefaultZhipuSttApiUrl() {
    return 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';
  }

  async function safeGetSttServiceConfig(deps = {}) {
    const chromeRef = deps.chrome || window.chrome;

    const fallbackKey = (() => {
      try {
        // fallback to existing AI translation key for convenience
        return null;
      } catch (e) {
        return null;
      }
    })();

    return await new Promise((resolve) => {
      try {
        if (!chromeRef?.storage?.sync?.get) {
          resolve({ service: 'openai', apiKey: null, apiUrl: getDefaultSttApiUrl(), model: 'whisper-1', language: null });
          return;
        }
        chromeRef.storage.sync.get(
          [
            'sttApi',
            'sttApiKey',
            'sttApiUrl',
            'sttModel',
            'sttLanguage',
            // fallback to existing AI translation setting (optional)
            'siliconflowApiKey'
          ],
          (data) => {
            const service = data?.sttApi || 'openai';
            const apiKey = data?.sttApiKey || data?.siliconflowApiKey || fallbackKey || null;
            const apiUrl = data?.sttApiUrl || (service === 'zhipu' ? getDefaultZhipuSttApiUrl() : getDefaultSttApiUrl());
            const model = data?.sttModel || (service === 'zhipu' ? 'glm-asr-2512' : 'whisper-1');
            const language = data?.sttLanguage || null;
            resolve({ service, apiKey, apiUrl, model, language });
          }
        );
      } catch (e) {
        resolve({ service: 'openai', apiKey: null, apiUrl: getDefaultSttApiUrl(), model: 'whisper-1', language: null });
      }
    });
  }

  async function fetchBlobFromBlobUrl(blobUrl) {
    try {
      const res = await fetch(blobUrl);
      const b = await res.blob();
      return b;
    } catch (e) {
      try {
        const cached = window.WAAP?.state?.voice?.audioBlobByUrl?.[blobUrl] || null;
        if (cached && typeof Blob !== 'undefined' && cached instanceof Blob) return cached;
      } catch (e2) {
        // ignore
      }
      throw e;
    }
  }

  function isBlob(v) {
    try {
      return typeof Blob !== 'undefined' && v instanceof Blob;
    } catch (e) {
      return false;
    }
  }

  function encodeWavFromAudioBuffer(audioBuffer) {
    // 16-bit PCM WAV
    const numChannels = Math.min(2, Math.max(1, audioBuffer.numberOfChannels || 1));
    const sampleRate = audioBuffer.sampleRate || 48000;
    const length = audioBuffer.length || 0;

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }

    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        if (sample > 1) sample = 1;
        else if (sample < -1) sample = -1;
        const s16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, s16, true);
        offset += 2;
      }
    }

    return { wavBlob: new Blob([buffer], { type: 'audio/wav' }), durationSec: sampleRate ? length / sampleRate : null };
  }

  async function decodeToWav(audioBlob) {
    const ab = await audioBlob.arrayBuffer();
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) {
      throw new Error('当前浏览器不支持 AudioContext，无法转写语音');
    }
    const ctx = new AudioContextRef();

    try {
      const audioBuffer = await new Promise((resolve, reject) => {
        try {
          ctx.decodeAudioData(ab, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
      return encodeWavFromAudioBuffer(audioBuffer);
    } finally {
      try {
        await ctx.close();
      } catch (e) {
        // ignore
      }
    }
  }

  async function sttZhipu(wavBlob, config) {
    const apiKey = config?.apiKey;
    const apiUrl = config?.apiUrl || getDefaultZhipuSttApiUrl();
    const model = config?.model || 'glm-asr-2512';

    if (!apiKey) {
      const err = new Error('语音转写未配置：请在设置中填写 STT API Key（智谱）');
      err.code = 'STT_NO_KEY';
      err.waapUserVisible = true;
      throw err;
    }

    const fd = new FormData();
    fd.append('file', wavBlob, 'audio.wav');
    fd.append('model', model);
    fd.append('stream', 'false');

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: fd
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const err = new Error(`语音转写失败：HTTP ${res.status} ${txt || ''}`.trim());
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => null);
    const text = data?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('语音转写失败：服务未返回 text 字段');
    }
    return text;
  }

  async function transcribeFromBlobUrl(blobUrl, deps = {}) {
    const showToast = deps.showToast || window.showToast;

    const safeToast = (msg, type = 'info', ms = 2600) => {
      try {
        if (typeof showToast === 'function') showToast(msg, type, ms);
      } catch (e) {
        // ignore
      }
    };

    // Allow passing a Blob directly to avoid blob: URL expiry (e.g., after chat switches).
    const input = blobUrl;
    if (!isBlob(input)) {
      if (!input || typeof input !== 'string' || !input.startsWith('blob:')) {
        throw new Error('未找到语音音频（blob URL）');
      }
    }

    safeToast('正在提取语音并转写…', 'info', 1800);

    const audioBlob = isBlob(input) ? input : await fetchBlobFromBlobUrl(input);
    const { wavBlob, durationSec } = await decodeToWav(audioBlob);

    const maxBytes = 25 * 1024 * 1024;
    if (wavBlob?.size && wavBlob.size > maxBytes) {
      const err = new Error('语音转写失败：音频文件过大（需 ≤ 25MB）');
      err.code = 'STT_FILE_TOO_LARGE';
      err.waapUserVisible = true;
      throw err;
    }

    if (typeof durationSec === 'number' && durationSec > 30.2) {
      const err = new Error('语音转写失败：音频时长过长（需 ≤ 30 秒）');
      err.code = 'STT_DURATION_TOO_LONG';
      err.waapUserVisible = true;
      throw err;
    }

    const cfg = await safeGetSttServiceConfig({ chrome: deps.chrome || window.chrome });

    let transcript;
    if (cfg.service === 'zhipu') {
      transcript = await sttZhipu(wavBlob, cfg);
    } else if (cfg.service === 'openai') {
      transcript = await sttOpenAiCompatible(wavBlob, cfg);
    } else {
      transcript = await sttOpenAiCompatible(wavBlob, cfg);
    }

    return { transcript, meta: { sttService: cfg.service, sttModel: cfg.model, sttApiUrl: cfg.apiUrl } };
  }

  async function sttOpenAiCompatible(wavBlob, config) {
    const apiKey = config?.apiKey;
    const apiUrl = config?.apiUrl || getDefaultSttApiUrl();
    const model = config?.model || 'whisper-1';
    const language = config?.language || null;

    if (!apiKey) {
      const err = new Error('语音转写未配置：请在设置中填写 STT API Key（可先复用 AI 翻译 Key）');
      err.code = 'STT_NO_KEY';
      err.waapUserVisible = true;
      throw err;
    }

    const fd = new FormData();
    fd.append('file', wavBlob, 'audio.wav');
    fd.append('model', model);
    if (language) fd.append('language', language);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: fd
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const err = new Error(`语音转写失败：HTTP ${res.status} ${txt || ''}`.trim());
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => null);
    const text = data?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('语音转写失败：服务未返回 text 字段');
    }
    return text;
  }

  async function transcribeAndTranslateFromBlobUrl(blobUrl, deps = {}) {
    const stt = await transcribeFromBlobUrl(blobUrl, deps);
    const transcript = stt?.transcript || '';

    let translated = null;
    try {
      const orch = deps.translationOrchestratorService || window.WAAP?.services?.translationOrchestratorService;
      if (orch?.translateText) {
        translated = await orch.translateText(transcript, {
          getTranslationSettings: window.getTranslationSettings,
          getTranslationService: window.getTranslationService,
          ApiServices: window.ApiServices,
          showToast: deps.showToast || window.showToast,
          showSettingsModal: window.showSettingsModal
        });
      }
    } catch (e) {
      translated = null;
    }

    return { transcript, translated, meta: stt?.meta || null };
  }

  window.WAAP.services.voiceTranscribeService = {
    transcribeFromBlobUrl,
    transcribeAndTranslateFromBlobUrl
  };
})();
