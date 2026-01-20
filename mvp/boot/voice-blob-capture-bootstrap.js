/*
用途：在 document_start 尽早注入 page hook，捕获 WhatsApp 预取阶段通过 URL.createObjectURL 生成的音频 blob URL，并在 content script 侧缓存（供语音转写按钮使用）。
作者：Achord
*/

(function () {
  try {
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

    // Install message listener early to avoid missing postMessage from page.
    try {
      if (!st._blobListenerInstalled) {
        window.addEventListener('message', (event) => {
          try {
            if (!event || event.source !== window) return;
            const d = event.data;
            if (!d || typeof d !== 'object') return;
            if (d.__waap !== 'voice') return;
            if (d.type === 'VOICE_HOOK_READY') {
              st.hookReadyAt = typeof d.ts === 'number' ? d.ts : Date.now();
              return;
            }
            if (d.type === 'VOICE_HOOK_ERROR') {
              st.hookErrorAt = typeof d.ts === 'number' ? d.ts : Date.now();
              st.hookErrorReason = d.reason || null;
              return;
            }
            if (d.type === 'VOICE_OBJURL_CREATED') {
              try {
                st.objUrlEvents.push({
                  blobUrl: d.blobUrl || null,
                  mime: d.mime || null,
                  objType: d.objType || null,
                  size: typeof d.size === 'number' ? d.size : null,
                  requestId: d.requestId || null,
                  messageKey: d.messageKey || null,
                  createdAt: typeof d.ts === 'number' ? d.ts : Date.now()
                });
                if (st.objUrlEvents.length > 80) {
                  st.objUrlEvents.splice(0, st.objUrlEvents.length - 80);
                }
              } catch (e) {
                // ignore
              }
              return;
            }

            if (d.type === 'VOICE_MEDIA_PLAY') {
              try {
                const src = d.src || '';
                const rid = d.requestId || null;
                const mk = d.messageKey || null;
                if (rid) st.playedSrcByRequestId[rid] = src;
                if (mk) st.playedSrcByMessageKey[mk] = src;

                if ((rid || mk) && typeof src === 'string' && src.startsWith('blob:')) {
                  // Eagerly copy the Blob while it's still alive.
                  fetch(src)
                    .then((res) => res.blob())
                    .then((b) => {
                      try {
                        if (b && typeof Blob !== 'undefined' && b instanceof Blob) {
                          st.audioBlobByUrl[src] = b;
                          if (mk) st.audioBlobByMessageKey[mk] = b;
                          if (rid) st.audioBlobByRequestId[rid] = b;

                          try {
                            st._audioBlobUrlRing.push(src);
                            const MAX = 40;
                            if (st._audioBlobUrlRing.length > MAX) {
                              const overflow = st._audioBlobUrlRing.splice(0, st._audioBlobUrlRing.length - MAX);
                              overflow.forEach((u) => {
                                try {
                                  if (u && st.audioBlobByUrl && Object.prototype.hasOwnProperty.call(st.audioBlobByUrl, u)) {
                                    delete st.audioBlobByUrl[u];
                                  }
                                } catch (e3) {
                                  // ignore
                                }
                              });
                            }
                          } catch (e2) {
                            // ignore
                          }
                        }
                      } catch (e1) {
                        // ignore
                      }
                    })
                    .catch(() => {});
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
              const b = d.blob;
              const mime = String(d.mime || '').toLowerCase();
              if (b && typeof Blob !== 'undefined' && b instanceof Blob && mime.startsWith('audio/')) {
                st.audioBlobByUrl[blobUrl] = b;

                try {
                  st._audioBlobUrlRing.push(blobUrl);
                  const MAX = 40;
                  if (st._audioBlobUrlRing.length > MAX) {
                    const overflow = st._audioBlobUrlRing.splice(0, st._audioBlobUrlRing.length - MAX);
                    overflow.forEach((u) => {
                      try {
                        if (u && st.audioBlobByUrl && Object.prototype.hasOwnProperty.call(st.audioBlobByUrl, u)) {
                          delete st.audioBlobByUrl[u];
                        }
                      } catch (e3) {
                        // ignore
                      }
                    });
                  }
                } catch (e2) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }

            st.blobMetaByUrl[blobUrl] = {
              mime: d.mime || null,
              size: typeof d.size === 'number' ? d.size : null,
              createdAt: typeof d.ts === 'number' ? d.ts : Date.now()
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
