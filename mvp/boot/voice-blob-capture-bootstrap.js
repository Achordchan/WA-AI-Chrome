/*
用途：在 document_start 尽早注入 page hook，捕获 WhatsApp 预取阶段通过 URL.createObjectURL 生成的音频 blob URL，并在 content script 侧缓存（供语音转写按钮使用）。
作者：Achord
*/

(function () {
  try {
    const VOICE_CAPTURE_EVENT_NAME = 'waap:voice-capture';
    const MAX_AUDIO_BLOB_SIZE = 30 * 1024 * 1024;
    const ALLOWED_TYPES = new Set([
      'VOICE_HOOK_READY',
      'VOICE_HOOK_ERROR',
      'VOICE_OBJURL_CREATED',
      'VOICE_MEDIA_PLAY',
      'VOICE_BLOB_CREATED'
    ]);

    if (!window.WAAP) window.WAAP = {};
    if (!window.WAAP.state) window.WAAP.state = {};
    if (!window.WAAP.state.voice) window.WAAP.state.voice = {};

    const st = window.WAAP.state.voice;
    if (!st.blobMetaByUrl) st.blobMetaByUrl = {};
    if (!st.objUrlEvents) st.objUrlEvents = [];
    if (!st.blobUrlByMessageKey) st.blobUrlByMessageKey = {};
    if (!st.blobUrlByRequestId) st.blobUrlByRequestId = {};
    if (!st.audioBlobByUrl) st.audioBlobByUrl = {};
    if (!st.audioBlobByMessageKey) st.audioBlobByMessageKey = {};
    if (!st.audioBlobByRequestId) st.audioBlobByRequestId = {};
    if (!st._audioBlobUrlRing) st._audioBlobUrlRing = [];
    if (!st.playedSrcByMessageKey) st.playedSrcByMessageKey = {};
    if (!st.playedSrcByRequestId) st.playedSrcByRequestId = {};

    function isPlainObject(value) {
      return !!value && Object.prototype.toString.call(value) === '[object Object]';
    }

    function normalizeText(value, maxLength = 256) {
      try {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed || trimmed.length > maxLength) return null;
        return trimmed;
      } catch (e) {
        return null;
      }
    }

    function normalizeBlobUrl(value) {
      const text = normalizeText(value, 2048);
      return text && text.startsWith('blob:') ? text : null;
    }

    function normalizeFiniteNumber(value) {
      return Number.isFinite(value) ? value : null;
    }

    function dispatchCaptureEvent(detail) {
      try {
        if (typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
        window.dispatchEvent(new CustomEvent(VOICE_CAPTURE_EVENT_NAME, { detail }));
      } catch (e) {
        // ignore
      }
    }

    function trimAudioBlobCache() {
      try {
        st._audioBlobUrlRing = Array.isArray(st._audioBlobUrlRing) ? st._audioBlobUrlRing : [];
        const MAX = 40;
        if (st._audioBlobUrlRing.length <= MAX) return;
        const overflow = st._audioBlobUrlRing.splice(0, st._audioBlobUrlRing.length - MAX);
        overflow.forEach((u) => {
          try {
            const removedBlob = u && st.audioBlobByUrl ? st.audioBlobByUrl[u] : null;
            if (u && st.audioBlobByUrl && Object.prototype.hasOwnProperty.call(st.audioBlobByUrl, u)) {
              delete st.audioBlobByUrl[u];
            }
            if (removedBlob) {
              Object.keys(st.audioBlobByMessageKey || {}).forEach((key) => {
                try {
                  if (st.audioBlobByMessageKey[key] === removedBlob) delete st.audioBlobByMessageKey[key];
                } catch (e2) {
                  // ignore
                }
              });
              Object.keys(st.audioBlobByRequestId || {}).forEach((key) => {
                try {
                  if (st.audioBlobByRequestId[key] === removedBlob) delete st.audioBlobByRequestId[key];
                } catch (e3) {
                  // ignore
                }
              });
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }
    }

    function cacheAudioBlob(blobUrl, blob, requestId, messageKey, meta = {}) {
      try {
        if (!blobUrl || typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
          return { ok: false, reason: 'invalid_blob_url' };
        }
        if (!(typeof Blob !== 'undefined' && blob instanceof Blob)) {
          return { ok: false, reason: 'invalid_blob' };
        }

        const size = typeof blob.size === 'number' ? blob.size : normalizeFiniteNumber(meta.size);
        if (size && size > MAX_AUDIO_BLOB_SIZE) {
          try {
            st.blobMetaByUrl[blobUrl] = {
              ...(st.blobMetaByUrl[blobUrl] || {}),
              mime: meta.mime || blob.type || null,
              size,
              createdAt: normalizeFiniteNumber(meta.createdAt) || Date.now(),
              rejectedReason: 'blob_too_large'
            };
          } catch (e) {
            // ignore
          }
          return { ok: false, reason: 'blob_too_large', size };
        }

        st.audioBlobByUrl[blobUrl] = blob;
        if (messageKey) st.audioBlobByMessageKey[messageKey] = blob;
        if (requestId) st.audioBlobByRequestId[requestId] = blob;
        st._audioBlobUrlRing.push(blobUrl);
        trimAudioBlobCache();
        return { ok: true, size };
      } catch (e) {
        return { ok: false, reason: 'cache_failed' };
      }
    }

    function sanitizeVoicePayload(data) {
      try {
        if (!isPlainObject(data)) return null;
        if (data.__waap !== 'voice') return null;
        const type = normalizeText(data.type, 64);
        if (!type || !ALLOWED_TYPES.has(type)) return null;

        const payload = {
          type,
          requestId: normalizeText(data.requestId),
          messageKey: normalizeText(data.messageKey, 512),
          ts: normalizeFiniteNumber(data.ts) || Date.now()
        };

        if (type === 'VOICE_HOOK_ERROR') {
          payload.reason = normalizeText(data.reason, 128);
          return payload;
        }

        if (type === 'VOICE_HOOK_READY') {
          return payload;
        }

        if (type === 'VOICE_MEDIA_PLAY') {
          payload.src = normalizeBlobUrl(data.src);
          if (!payload.src) return null;
          return payload;
        }

        payload.blobUrl = normalizeBlobUrl(data.blobUrl);
        if (!payload.blobUrl) return null;
        payload.mime = normalizeText(data.mime, 128);
        payload.objType = normalizeText(data.objType, 128);
        payload.size = normalizeFiniteNumber(data.size);

        if (type === 'VOICE_BLOB_CREATED') {
          if (typeof Blob !== 'undefined' && data.blob instanceof Blob) {
            payload.blob = data.blob;
          } else {
            payload.blob = null;
          }
        }

        return payload;
      } catch (e) {
        return null;
      }
    }

    // Install message listener early to avoid missing postMessage from page.
    try {
      if (!st._blobListenerInstalled) {
        window.addEventListener('message', (event) => {
          try {
            if (!event || event.source !== window) return;
            const d = sanitizeVoicePayload(event.data);
            if (!d) return;
            if (d.type === 'VOICE_HOOK_READY') {
              st.hookReadyAt = d.ts;
              return;
            }
            if (d.type === 'VOICE_HOOK_ERROR') {
              st.hookErrorAt = d.ts;
              st.hookErrorReason = d.reason || null;
              dispatchCaptureEvent({
                status: 'hook-error',
                reason: d.reason || 'unknown',
                ts: d.ts
              });
              return;
            }
            if (d.type === 'VOICE_OBJURL_CREATED') {
              try {
                if (d.requestId && d.blobUrl) st.blobUrlByRequestId[d.requestId] = d.blobUrl;
                if (d.messageKey && d.blobUrl) st.blobUrlByMessageKey[d.messageKey] = d.blobUrl;
                st.objUrlEvents.push({
                  blobUrl: d.blobUrl || null,
                  mime: d.mime || null,
                  objType: d.objType || null,
                  size: d.size,
                  requestId: d.requestId || null,
                  messageKey: d.messageKey || null,
                  createdAt: d.ts
                });
                if (st.objUrlEvents.length > 80) {
                  st.objUrlEvents.splice(0, st.objUrlEvents.length - 80);
                }
              } catch (e) {
                // ignore
              }
              dispatchCaptureEvent({
                status: 'objurl-created',
                blobUrl: d.blobUrl,
                mime: d.mime || null,
                size: d.size,
                requestId: d.requestId || null,
                messageKey: d.messageKey || null,
                ts: d.ts
              });
              return;
            }

            if (d.type === 'VOICE_MEDIA_PLAY') {
              try {
                const src = d.src || '';
                const rid = d.requestId || null;
                const mk = d.messageKey || null;
                if (rid) st.playedSrcByRequestId[rid] = src;
                if (mk) st.playedSrcByMessageKey[mk] = src;
                if (rid) st.blobUrlByRequestId[rid] = src;
                if (mk) st.blobUrlByMessageKey[mk] = src;

                dispatchCaptureEvent({
                  status: 'media-play',
                  blobUrl: src,
                  src,
                  requestId: rid,
                  messageKey: mk,
                  ts: d.ts
                });

                if ((rid || mk) && typeof src === 'string' && src.startsWith('blob:')) {
                  fetch(src)
                    .then((res) => res.blob())
                    .then((b) => {
                      try {
                        const cached = cacheAudioBlob(src, b, rid, mk, {
                          mime: b?.type || null,
                          size: typeof b?.size === 'number' ? b.size : null,
                          createdAt: d.ts
                        });
                        if (cached.ok) {
                          dispatchCaptureEvent({
                            status: 'blob-ready',
                            blobUrl: src,
                            requestId: rid,
                            messageKey: mk,
                            mime: b?.type || null,
                            size: cached.size,
                            ts: Date.now()
                          });
                        } else {
                          dispatchCaptureEvent({
                            status: 'blob-rejected',
                            blobUrl: src,
                            requestId: rid,
                            messageKey: mk,
                            reason: cached.reason,
                            size: cached.size || (typeof b?.size === 'number' ? b.size : null),
                            ts: Date.now()
                          });
                        }
                      } catch (e1) {
                        // ignore
                      }
                    })
                    .catch(() => {
                      dispatchCaptureEvent({
                        status: 'blob-error',
                        blobUrl: src,
                        requestId: rid,
                        messageKey: mk,
                        reason: 'fetch_failed',
                        ts: Date.now()
                      });
                    });
                }
              } catch (e) {
                // ignore
              }
              return;
            }

            if (d.type !== 'VOICE_BLOB_CREATED') return;
            const blobUrl = d.blobUrl;
            if (!blobUrl || typeof blobUrl !== 'string') return;

            // Deterministic only: do NOT guess bindings here.
            // requestId/messageKey binding should come from VOICE_MEDIA_PLAY (real play()) or explicit fields.
            const requestId = d.requestId || null;
            const messageKey = d.messageKey || null;

            try {
              if (requestId) st.blobUrlByRequestId[requestId] = blobUrl;
              if (messageKey) st.blobUrlByMessageKey[messageKey] = blobUrl;
              const cached = cacheAudioBlob(blobUrl, d.blob, requestId, messageKey, {
                mime: d.mime || null,
                size: d.size,
                createdAt: d.ts
              });
              if (d.blob && !cached.ok) {
                dispatchCaptureEvent({
                  status: 'blob-rejected',
                  blobUrl,
                  requestId,
                  messageKey,
                  reason: cached.reason,
                  size: cached.size || d.size || null,
                  ts: d.ts
                });
              } else if (d.blob && cached.ok) {
                dispatchCaptureEvent({
                  status: 'blob-ready',
                  blobUrl,
                  requestId,
                  messageKey,
                  mime: d.mime || d.blob?.type || null,
                  size: cached.size || d.size || null,
                  ts: d.ts
                });
              }
            } catch (e) {
              // ignore
            }

            st.blobMetaByUrl[blobUrl] = {
              ...(st.blobMetaByUrl[blobUrl] || {}),
              mime: d.mime || null,
              size: d.size,
              createdAt: d.ts
            };
          } catch (e) {
            // ignore
          }
        });
        st._blobListenerInstalled = true;
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
})();
