/*
用途：在 MAIN world（page context）尽早 hook URL.createObjectURL，捕获 WhatsApp 预取阶段生成的语音 blob URL，并通过 window.postMessage 通知 content script。
作者：Achord
*/

(function () {
  try {
    let lastRequest = { requestId: null, messageKey: null, ts: 0 };
    const activeReqByMessageKey = {};
    let lastClickedMessageKey = null;
    let lastClickedRequestId = null;
    let lastClickedAt = 0;

    const postReady = (payload) => {
      try {
        window.postMessage({ __waap: 'voice', ...payload }, '*');
      } catch (e) {
        // ignore
      }
    };

    try {
      if (!window.__waapVoiceBlobs) window.__waapVoiceBlobs = [];
    } catch (e) {
      // ignore
    }

    try {
      if (!window.__waapVoiceObjUrls) window.__waapVoiceObjUrls = [];
    } catch (e) {
      // ignore
    }

    try {
      if (!window.__waapVoicePlays) window.__waapVoicePlays = [];
    } catch (e) {
      // ignore
    }

    try {
      if (!window.__waapVoiceRequests) window.__waapVoiceRequests = [];
    } catch (e) {
      // ignore
    }

    try {
      window.addEventListener('message', (event) => {
        try {
          if (!event || event.source !== window) return;
          const d = event.data;
          if (!d || typeof d !== 'object') return;
          if (d.__waap !== 'voice') return;
          if (d.type !== 'VOICE_REQUEST') return;
          lastRequest = {
            requestId: d.requestId || null,
            messageKey: d.messageKey || null,
            ts: typeof d.ts === 'number' ? d.ts : Date.now()
          };

          try {
            const arr = window.__waapVoiceRequests;
            if (arr && typeof arr.push === 'function') {
              arr.push({ requestId: lastRequest.requestId, messageKey: lastRequest.messageKey, ts: lastRequest.ts });
              if (arr.length > 30) arr.splice(0, arr.length - 30);
            }
          } catch (e1) {
            // ignore
          }
          try {
            const mk = d.messageKey || null;
            if (mk) {
              activeReqByMessageKey[mk] = {
                requestId: d.requestId || null,
                messageKey: mk,
                ts: typeof d.ts === 'number' ? d.ts : Date.now()
              };
            }
          } catch (e2) {
            // ignore
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }

    try {
      const getMessageKeyFromNode = (node) => {
        try {
          if (!node || !node.closest) return null;
          const id = node.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
          if (id) return id;
          const pre = node.closest?.('div[data-pre-plain-text]')?.getAttribute?.('data-pre-plain-text') || '';
          if (pre) return pre;
          return null;
        } catch (e) {
          return null;
        }
      };

      document.addEventListener(
        'click',
        (ev) => {
          try {
            const t = ev?.target;
            if (!t || !t.closest) return;
            const btn =
              t.closest('button[aria-label*="播放语音"],button[aria-label*="Play voice"],button[aria-label*="Play voice message"]') || null;
            if (!btn) return;
            let rid = null;
            let mk = null;
            try {
              rid = btn.getAttribute('data-waap-voice-request-id') || btn.dataset?.waapVoiceRequestId || null;
              mk = btn.getAttribute('data-waap-voice-message-key') || btn.dataset?.waapVoiceMessageKey || null;
            } catch (e2) {
              rid = null;
              mk = null;
            }

            if (!mk) {
              mk = getMessageKeyFromNode(btn);
            }
            if (!mk && !rid) return;

            lastClickedRequestId = rid || null;
            lastClickedMessageKey = mk || null;
            lastClickedAt = Date.now();
          } catch (e) {
            // ignore
          }
        },
        true
      );
    } catch (e) {
      // ignore
    }

    try {
      const proto = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
      const origPlay = proto && proto.play;
      if (proto && typeof origPlay === 'function' && origPlay.__waap_voice_play_hooked !== true) {
        proto.play = function () {
          try {
            const now = Date.now();
            const req = (() => {
              try {
                // Only bind when play() is triggered right after a voice-play click.
                if (!lastClickedMessageKey && !lastClickedRequestId) return null;
                if (!lastClickedAt || now - lastClickedAt > 6000) return null;

                // Prefer explicit attributes set by content script.
                if (lastClickedRequestId || lastClickedMessageKey) {
                  return {
                    requestId: lastClickedRequestId || null,
                    messageKey: lastClickedMessageKey || null,
                    ts: lastClickedAt
                  };
                }

                const ar = lastClickedMessageKey ? activeReqByMessageKey[lastClickedMessageKey] : null;
                if (!ar || !ar.ts || now - ar.ts > 8000) return null;
                if (!ar.requestId && !ar.messageKey) return null;
                return ar;
              } catch (e) {
                return null;
              }
            })();

            const src = (() => {
              try {
                return String(this?.currentSrc || this?.src || '');
              } catch (e) {
                return '';
              }
            })();

            if (src && req && this instanceof HTMLAudioElement) {
              try {
                const arr = window.__waapVoicePlays;
                if (arr && typeof arr.push === 'function') {
                  arr.push({ src, requestId: req ? req.requestId : null, messageKey: req ? req.messageKey : null, ts: now });
                  if (arr.length > 30) arr.splice(0, arr.length - 30);
                }
              } catch (e2) {
                // ignore
              }
              postReady({
                type: 'VOICE_MEDIA_PLAY',
                src,
                requestId: req ? req.requestId : null,
                messageKey: req ? req.messageKey : null,
                ts: now
              });

              try {
                // prevent reusing stale click info
                lastClickedRequestId = null;
                lastClickedMessageKey = null;
                lastClickedAt = 0;
              } catch (e2) {
                // ignore
              }
            }
          } catch (e) {
            // ignore
          }
          return origPlay.apply(this, arguments);
        };
        try {
          proto.play.__waap_voice_play_hooked = true;
          origPlay.__waap_voice_play_hooked = true;
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    const sniffAudioMagic = async (blob) => {
      try {
        if (!blob || typeof blob.size !== 'number' || blob.size <= 0) return null;
        const head = blob.slice(0, 4);
        const buf = await head.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const s = String.fromCharCode(u8[0] || 0, u8[1] || 0, u8[2] || 0, u8[3] || 0);
        if (s === 'OggS') return 'audio/ogg';
        if (s === 'RIFF') return 'audio/wav';
        if (s === 'ID3') return 'audio/mpeg';
        return null;
      } catch (e) {
        return null;
      }
    };

    const install = (URLRef) => {
      try {
        if (!URLRef) return false;
        const orig = URLRef.createObjectURL;
        if (typeof orig !== 'function') return false;
        if (orig.__waap_voice_hooked === true) return true;

        URLRef.createObjectURL = function (obj) {
          const url = orig.apply(this, arguments);
          try {
            try {
              window.__waapCreateObjectURLCount = (window.__waapCreateObjectURLCount || 0) + 1;
            } catch (e) {
              // ignore
            }

            const req = (() => {
              try {
                const now = Date.now();
                if (!lastRequest) return null;
                if (!lastRequest.ts) return null;
                if (now - lastRequest.ts > 15000) return null;
                if (!lastRequest.requestId && !lastRequest.messageKey) return null;
                return lastRequest;
              } catch (e) {
                return null;
              }
            })();

            const size = obj && typeof obj.size === 'number' ? obj.size : null;
            const t0 = obj && obj.type ? String(obj.type) : '';
            const looksLikeBlob = typeof Blob !== 'undefined' && obj instanceof Blob;
            const ctorName = (() => {
              try {
                const c = obj && obj.constructor ? obj.constructor : null;
                const n = c && c.name ? String(c.name) : '';
                return n || null;
              } catch (e) {
                return null;
              }
            })();

            try {
              postReady({
                type: 'VOICE_OBJURL_CREATED',
                blobUrl: url,
                objType: ctorName,
                mime: t0 ? t0 : null,
                size,
                requestId: req ? req.requestId : null,
                messageKey: req ? req.messageKey : null,
                ts: Date.now()
              });
            } catch (e) {
              // ignore
            }

            try {
              const arr = window.__waapVoiceObjUrls;
              if (arr && typeof arr.push === 'function') {
                arr.push({
                  blobUrl: url,
                  objType: ctorName,
                  mime: t0 ? t0 : null,
                  size,
                  requestId: req ? req.requestId : null,
                  messageKey: req ? req.messageKey : null,
                  ts: Date.now()
                });
                if (arr.length > 80) arr.splice(0, arr.length - 80);
              }
            } catch (e) {
              // ignore
            }

            const emit = (mimeGuess) => {
              try {
                try {
                  const arr = window.__waapVoiceBlobs;
                  if (arr && typeof arr.push === 'function') {
                    arr.push({
                      blobUrl: url,
                      mime: mimeGuess || (t0 ? t0 : null),
                      size,
                      requestId: req ? req.requestId : null,
                      messageKey: req ? req.messageKey : null,
                      ts: Date.now()
                    });
                    if (arr.length > 30) arr.splice(0, arr.length - 30);
                  }
                } catch (e) {
                  // ignore
                }
                postReady({
                  type: 'VOICE_BLOB_CREATED',
                  blobUrl: url,
                  mime: mimeGuess || (t0 ? t0 : null),
                  size,
                  blob: looksLikeBlob ? obj : null,
                  requestId: req ? req.requestId : null,
                  messageKey: req ? req.messageKey : null,
                  ts: Date.now()
                });
              } catch (e) {
                // ignore
              }
            };

            if (t0 && t0.startsWith('audio/')) {
              emit(t0);
            } else if (looksLikeBlob && size && size > 0 && size <= 30 * 1024 * 1024) {
              if (!t0 || t0 === 'application/octet-stream') {
                sniffAudioMagic(obj).then((mimeGuess) => {
                  if (mimeGuess) emit(mimeGuess);
                });
              }
            }
          } catch (e) {
            // ignore
          }
          return url;
        };

        try {
          URLRef.createObjectURL.__waap_voice_hooked = true;
        } catch (e) {
          // ignore
        }
        try {
          orig.__waap_voice_hooked = true;
        } catch (e) {
          // ignore
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    const tryInstall = () => {
      try {
        const ok1 = install(window.URL);
        const ok2 = install(window.webkitURL);
        if (ok1 || ok2) {
          try {
            window.__waapVoiceHookReadyAt = Date.now();
            window.__waapVoiceHookErrorReason = null;
          } catch (e) {
            // ignore
          }
          postReady({ type: 'VOICE_HOOK_READY', ts: Date.now() });
          return true;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    if (tryInstall()) return;

    // If URL.createObjectURL isn't ready at document_start, retry for a short period.
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (tryInstall() || tries >= 30) {
        try {
          clearInterval(timer);
        } catch (e) {
          // ignore
        }
        if (tries >= 30) {
          try {
            window.__waapVoiceHookErrorReason = 'install_timeout';
          } catch (e) {
            // ignore
          }
          postReady({ type: 'VOICE_HOOK_ERROR', reason: 'install_timeout', ts: Date.now() });
        }
      }
    }, 100);
  } catch (e) {
    // ignore
  }
})();
