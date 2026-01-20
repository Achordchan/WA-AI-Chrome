/*
用途：语音消息的“听/转写”按钮交互 Presenter：定位语音消息内的 <audio src="blob:...">，调用 voiceTranscribeService 转写并渲染结果。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.voiceTranscribePresenter) return;

  function resolveVoiceRoot(messageElement) {
    try {
      return (
        messageElement?.closest?.('div[tabindex="-1"]') ||
        messageElement?.closest?.('div[data-pre-plain-text]') ||
        messageElement?.closest?.('div[role="row"]') ||
        messageElement?.closest?.('div[role="listitem"]') ||
        messageElement
      );
    } catch (e) {
      return messageElement;
    }
  }

  function getVoiceMessageKey(messageElement) {
    try {
      if (!messageElement) return '';
      const wrapperId = messageElement?.closest?.('[data-id]')?.getAttribute?.('data-id') || '';
      if (wrapperId) return wrapperId;
      const pre = messageElement?.getAttribute?.('data-pre-plain-text') || '';
      if (pre) return pre;

      const root = resolveVoiceRoot(messageElement);
      try {
        const existing = root?.dataset?.waapVoiceKey || '';
        if (existing) return existing;
      } catch (e) {
        // ignore
      }

      const gen = `vmsg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      try {
        if (root && root.dataset) root.dataset.waapVoiceKey = gen;
      } catch (e) {
        // ignore
      }
      return gen;
    } catch (e) {
      return '';
    }
  }

  function postVoiceRequest(requestId, messageKey) {
    try {
      window.postMessage(
        {
          __waap: 'voice',
          type: 'VOICE_REQUEST',
          requestId: requestId || null,
          messageKey: messageKey || null,
          ts: Date.now()
        },
        '*'
      );
    } catch (e) {
      // ignore
    }
  }

  function findAudioBlobUrlForMessage(messageElement) {
    try {
      if (!messageElement) return null;

      const resolveRoot = (el) => {
        try {
          return (
            el.closest?.('div[tabindex="-1"]') ||
            el.closest?.('div[data-pre-plain-text]') ||
            el.closest?.('div[role="row"]') ||
            el.closest?.('div[role="listitem"]') ||
            el
          );
        } catch (e) {
          return el;
        }
      };

      const root = resolveRoot(messageElement);
      const candidates = [messageElement, root].filter(Boolean);

      for (const scope of candidates) {
        try {
          const audioEl = scope.querySelector?.('audio');
          const src = audioEl?.currentSrc || audioEl?.src;
          if (src && typeof src === 'string' && src.startsWith('blob:')) return src;
        } catch (e) {
          // ignore
        }
      }

      const audios = document.querySelectorAll('audio');
      for (const a of audios) {
        const s = a?.currentSrc || a?.src;
        if (!s || typeof s !== 'string' || !s.startsWith('blob:')) continue;
        try {
          const aRoot = resolveRoot(a);
          if (aRoot && root && aRoot === root) return s;
          if (root && (root.contains(a) || aRoot?.contains?.(root))) return s;
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async function tryResolveAudioFromRecentObjUrls(sinceTs, hint = {}) {
    try {
      const st = window.WAAP?.state?.voice;
      const events = st?.objUrlEvents;
      if (!events || !Array.isArray(events) || events.length === 0) return null;

      const hintRequestId = hint?.requestId || '';
      const hintMessageKey = hint?.messageKey || '';

      const filterCandidates = (strictHint) => {
        return events
          .filter((e) => {
            try {
              const ts = typeof e?.createdAt === 'number' ? e.createdAt : 0;
              if (sinceTs && ts < sinceTs) return false;
              if (strictHint) {
                if (hintRequestId && String(e?.requestId || '') !== hintRequestId) return false;
                if (hintMessageKey && String(e?.messageKey || '') !== hintMessageKey) return false;
              }
              const u = String(e?.blobUrl || '');
              if (!u.startsWith('blob:')) return false;
              const mime = String(e?.mime || '').toLowerCase();
              // Prefer audio-ish object URLs
              if (mime && !mime.startsWith('audio/')) return false;
              return true;
            } catch (err) {
              return false;
            }
          })
          .slice(-12)
          .reverse();
      };

      let candidates = filterCandidates(true);
      // WhatsApp may create object URLs without our requestId/messageKey attached.
      // If strict match yields nothing, fall back to unattributed audio URLs created after the click.
      if (candidates.length === 0 && (hintRequestId || hintMessageKey)) {
        candidates = filterCandidates(false);
      }

      const sniff = async (blobUrl) => {
        const res = await fetch(blobUrl);
        const b = await res.blob();
        const ab = await b.slice(0, 4).arrayBuffer();
        const u8 = new Uint8Array(ab);
        const s = String.fromCharCode(u8[0] || 0, u8[1] || 0, u8[2] || 0, u8[3] || 0);
        if (s === 'OggS') return true;
        if (s === 'RIFF') return true;
        if (s === 'ID3') return true;
        return false;
      };

      for (const c of candidates) {
        const u = String(c?.blobUrl || '');
        if (!u.startsWith('blob:')) continue;
        try {
          const ok = await sniff(u);
          if (ok) return u;
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function findRecentCapturedBlobUrl(sinceTs) {
    try {
      const st = window.WAAP?.state?.voice;
      const m = st?.blobMetaByUrl;
      if (!m || typeof m !== 'object') return null;
      let best = null;
      let bestTs = 0;
      for (const k of Object.keys(m)) {
        const meta = m[k];
        const ts = typeof meta?.createdAt === 'number' ? meta.createdAt : 0;
        if (sinceTs && ts < sinceTs) continue;
        if (ts >= bestTs) {
          bestTs = ts;
          best = k;
        }
      }
      if (best && typeof best === 'string' && best.startsWith('blob:')) return best;
    } catch (e) {
      return null;
    }
    return null;
  }

  async function ensureAudioBlobForMessage(messageElement, deps = {}) {
    const root = resolveVoiceRoot(messageElement);

    const messageKey = deps?.messageKey || '';
    const requestId = deps?.requestId || '';

    try {
      const st = window.WAAP?.state?.voice;
      const b0 = requestId ? st?.audioBlobByRequestId?.[requestId] : null;
      if (b0 && typeof Blob !== 'undefined' && b0 instanceof Blob) return b0;
    } catch (e) {
      // ignore
    }

    let playBtn = null;
    try {
      const scope = root || messageElement;
      playBtn =
        scope.querySelector?.('button[aria-label*="播放语音消息"]') ||
        scope.querySelector?.('button[aria-label*="Play voice message"]') ||
        scope.querySelector?.('button[aria-label*="Play voice"]') ||
        null;
    } catch (e) {
      playBtn = null;
    }

    const since = Date.now();

    try {
      if (playBtn) {
        try {
          // Force WhatsApp to actually switch the playing source to this message.
          const audios = document.querySelectorAll('audio');
          for (const a of audios) {
            try {
              if (!a) continue;
              if (!a.paused) a.pause();
            } catch (e1) {
              // ignore
            }
          }
        } catch (e0) {
          // ignore
        }
        try {
          if (requestId) playBtn.setAttribute('data-waap-voice-request-id', requestId);
          if (messageKey) playBtn.setAttribute('data-waap-voice-message-key', messageKey);
        } catch (e0) {
          // ignore
        }
        playBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    } catch (e) {
      // ignore
    }

    const maxWaitMs = 9000;
    const stepMs = 200;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      try {
        const st = window.WAAP?.state?.voice;
        if (st) {
          const b0 = requestId ? st?.audioBlobByRequestId?.[requestId] : null;
          if (b0 && typeof Blob !== 'undefined' && b0 instanceof Blob) return b0;

          if (requestId && st.playedSrcByRequestId && typeof st.playedSrcByRequestId === 'object') {
            const s = st.playedSrcByRequestId[requestId];
            if (s && typeof s === 'string' && s.startsWith('blob:')) {
              const b2 = st?.audioBlobByUrl?.[s] || null;
              if (b2 && typeof Blob !== 'undefined' && b2 instanceof Blob) return b2;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      await new Promise((r) => setTimeout(r, stepMs));
    }

    return null;
  }

  async function transcribeMessage(messageElement, deps = {}) {
    let messageKey = '';
    let requestId = '';
    try {
      if (!messageElement) return false;

      try {
        const st0 = window.WAAP?.state?.voice;
        if (st0?.transcribeInFlight) {
          try {
            const showToast = deps.showToast || window.showToast;
            if (typeof showToast === 'function') showToast('正在处理上一条语音，请稍等…', 'info', 1600);
          } catch (e0) {
            // ignore
          }
          return false;
        }
      } catch (e) {
        // ignore
      }

      messageKey = getVoiceMessageKey(messageElement);
      requestId = `vreq_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      try {
        const stLock = window.WAAP?.state?.voice;
        if (stLock) stLock.transcribeInFlight = requestId;
      } catch (e) {
        // ignore
      }

      try {
        const st = window.WAAP?.state?.voice;
        if (st) {
          st.activeRequest = { requestId, messageKey, startedAt: Date.now() };
        }
      } catch (e) {
        // ignore
      }
      postVoiceRequest(requestId, messageKey);

      let messageContainer = messageElement.closest?.('.message-container');
      if (!messageContainer) {
        messageContainer = messageElement.parentElement || messageElement;
        try {
          messageContainer.classList.add('message-container');
        } catch (e) {
          // ignore
        }
      }

      const view = window.WAAP?.views?.voiceTranscribeView;
      const svc = window.WAAP?.services?.voiceTranscribeService;
      const callFn = svc?.transcribeFromBlobUrl;
      if (!view || typeof callFn !== 'function') return false;

      if (view.toggleExisting?.(messageContainer)) {
        return true;
      }

      try {
        view.clearTransient?.(messageContainer);
      } catch (e0) {
        // ignore
      }

      const loadingEl = view.renderLoading?.(messageContainer);

      const audioBlob = await ensureAudioBlobForMessage(messageElement, { ...deps, requestId, messageKey });
      if (!audioBlob) {
        try {
          if (loadingEl && messageContainer.contains(loadingEl)) messageContainer.removeChild(loadingEl);
        } catch (e) {}
        view.renderError?.(messageContainer, '未找到语音 audio/blob');
        return false;
      }

      const r = await callFn(audioBlob, {
        chrome: deps.chrome || window.chrome,
        showToast: deps.showToast || window.showToast,
        translationOrchestratorService: window.WAAP?.services?.translationOrchestratorService
      });

      try {
        if (loadingEl && messageContainer.contains(loadingEl)) messageContainer.removeChild(loadingEl);
      } catch (e) {}

      view.renderTranscription?.(messageContainer, r?.transcript || '', null);
      return true;
    } catch (e) {
      try {
        const msg = e?.message || '未知错误';
        const messageContainer = messageElement?.closest?.('.message-container') || messageElement?.parentElement || messageElement;
        try {
          window.WAAP?.views?.voiceTranscribeView?.clearTransient?.(messageContainer);
        } catch (e0) {
          // ignore
        }
        window.WAAP?.views?.voiceTranscribeView?.renderError?.(messageContainer, msg);
      } catch (e2) {
        // ignore
      }
      return false;
    } finally {
      try {
        const st = window.WAAP?.state?.voice;
        try {
          if (st && st.transcribeInFlight) {
            if (!requestId || st.transcribeInFlight === requestId) st.transcribeInFlight = null;
          }
        } catch (e4) {
          // ignore
        }
        if (st && st.activeRequest && st.activeRequest.requestId === requestId) {
          const clearLater = () => {
            try {
              if (st.activeRequest && st.activeRequest.requestId === requestId) {
                st.activeRequest = null;
              }
            } catch (e3) {
              // ignore
            }
          };
          try {
            setTimeout(clearLater, 10000);
          } catch (e2) {
            clearLater();
          }
        }
      } catch (e2) {
        // ignore
      }
    }
  }

  window.WAAP.presenters.voiceTranscribePresenter = {
    transcribeMessage
  };
})();
