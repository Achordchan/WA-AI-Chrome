/*
用途：语音消息的“听/转写”按钮交互 Presenter：定位语音消息内的 <audio src="blob:...">，调用 voiceTranscribeService 转写并渲染结果。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.presenters) window.WAAP.presenters = {};

  if (window.WAAP.presenters.voiceTranscribePresenter) return;

  const VOICE_CAPTURE_EVENT_NAME = 'waap:voice-capture';
  const MAX_AUDIO_BLOB_SIZE = 30 * 1024 * 1024;

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

  function resolveVoiceRenderContainer(messageElement) {
    try {
      const processing = window.WAAP?.presenters?.messageProcessingPresenter;
      return (
        processing?.resolveMessageOwnerElement?.(messageElement) ||
        resolveVoiceRoot(messageElement) ||
        messageElement ||
        null
      );
    } catch (e) {
      return resolveVoiceRoot(messageElement);
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

  function getVoiceState() {
    try {
      return window.WAAP?.state?.voice || null;
    } catch (e) {
      return null;
    }
  }

  function isBlobInstance(value) {
    try {
      return typeof Blob !== 'undefined' && value instanceof Blob;
    } catch (e) {
      return false;
    }
  }

  function getCachedAudioBlob(requestId, messageKey, blobUrl) {
    try {
      const st = getVoiceState();
      if (!st) return null;

      const byRequestId = requestId ? st.audioBlobByRequestId?.[requestId] : null;
      if (isBlobInstance(byRequestId)) return byRequestId;

      const byMessageKey = messageKey ? st.audioBlobByMessageKey?.[messageKey] : null;
      if (isBlobInstance(byMessageKey)) return byMessageKey;

      const urls = [
        blobUrl,
        requestId ? st.blobUrlByRequestId?.[requestId] : null,
        messageKey ? st.blobUrlByMessageKey?.[messageKey] : null,
        requestId ? st.playedSrcByRequestId?.[requestId] : null,
        messageKey ? st.playedSrcByMessageKey?.[messageKey] : null
      ].filter((value, index, arr) => typeof value === 'string' && value.startsWith('blob:') && arr.indexOf(value) === index);

      for (const url of urls) {
        const byUrl = st.audioBlobByUrl?.[url] || null;
        if (isBlobInstance(byUrl)) return byUrl;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async function fetchBlobFromUrl(blobUrl) {
    try {
      if (!blobUrl || typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) return null;
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      if (!isBlobInstance(blob)) return null;
      if (typeof blob.size === 'number' && blob.size > MAX_AUDIO_BLOB_SIZE) {
        throw new Error('语音文件过大，暂不支持转写');
      }
      return blob;
    } catch (e) {
      if (e && e.message === '语音文件过大，暂不支持转写') throw e;
      return null;
    }
  }

  function waitForCapturedAudioBlob(hint = {}) {
    const requestId = String(hint?.requestId || '').trim();
    const messageKey = String(hint?.messageKey || '').trim();
    const timeoutMs = Number.isFinite(hint?.timeoutMs) ? hint.timeoutMs : 9000;

    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let handleCaptureEvent = null;

      const cleanup = () => {
        try {
          if (timer) clearTimeout(timer);
        } catch (e) {
          // ignore
        }
        timer = null;
        try {
          if (handleCaptureEvent) {
            window.removeEventListener(VOICE_CAPTURE_EVENT_NAME, handleCaptureEvent);
          }
        } catch (e) {
          // ignore
        }
      };

      const finish = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value || null);
      };

      const matches = (detail) => {
        try {
          if (!detail || typeof detail !== 'object') return false;
          if (requestId) return String(detail.requestId || '') === requestId;
          if (messageKey) return String(detail.messageKey || '') === messageKey;
        } catch (e) {
          return false;
        }
        return false;
      };

      const tryResolveFromState = (blobUrl) => {
        const cached = getCachedAudioBlob(requestId, messageKey, blobUrl);
        if (cached) {
          finish({
            blob: cached,
            blobUrl: blobUrl || null,
            status: 'blob-ready'
          });
          return true;
        }
        return false;
      };

      handleCaptureEvent = (event) => {
        try {
          const detail = event?.detail;
          if (!matches(detail)) return;

          if (detail?.status === 'blob-rejected') {
            finish({
              rejected: true,
              reason: detail.reason || 'blob_rejected',
              size: detail.size || null,
              blobUrl: detail.blobUrl || null,
              status: detail.status
            });
            return;
          }

          if (tryResolveFromState(detail?.blobUrl || detail?.src || null)) return;

          if (detail?.status === 'blob-error') {
            finish({
              rejected: true,
              reason: detail.reason || 'blob_error',
              blobUrl: detail.blobUrl || null,
              status: detail.status
            });
          }
        } catch (e) {
          // ignore
        }
      };

      if (tryResolveFromState()) return;

      try {
        window.addEventListener(VOICE_CAPTURE_EVENT_NAME, handleCaptureEvent);
      } catch (e) {
        finish(null);
        return;
      }

      if (tryResolveFromState()) return;

      timer = setTimeout(() => {
        finish(null);
      }, timeoutMs);
    });
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
    const waitTimeoutMs = Number.isFinite(deps?.waitTimeoutMs) ? deps.waitTimeoutMs : 9000;

    const directCachedBlob = getCachedAudioBlob(requestId, messageKey);
    if (directCachedBlob) return directCachedBlob;

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
    const directBlobUrl = findAudioBlobUrlForMessage(messageElement);

    if (directBlobUrl) {
      const cachedByUrl = getCachedAudioBlob(requestId, messageKey, directBlobUrl);
      if (cachedByUrl) return cachedByUrl;
      const directBlob = await fetchBlobFromUrl(directBlobUrl);
      if (directBlob) return directBlob;
    }

    const waitForCapture = waitForCapturedAudioBlob({
      requestId,
      messageKey,
      timeoutMs: waitTimeoutMs
    });

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

    const captured = await waitForCapture;
    if (captured?.blob && isBlobInstance(captured.blob)) {
      return captured.blob;
    }

    if (captured?.rejected && captured.reason === 'blob_too_large') {
      throw new Error('语音文件过大，暂不支持转写');
    }

    const cachedAfterEvent = getCachedAudioBlob(requestId, messageKey);
    if (cachedAfterEvent) return cachedAfterEvent;

    const playedUrl = (() => {
      try {
        const st = getVoiceState();
        return (
          (requestId ? st?.playedSrcByRequestId?.[requestId] : null) ||
          (messageKey ? st?.playedSrcByMessageKey?.[messageKey] : null) ||
          (requestId ? st?.blobUrlByRequestId?.[requestId] : null) ||
          (messageKey ? st?.blobUrlByMessageKey?.[messageKey] : null) ||
          null
        );
      } catch (e) {
        return null;
      }
    })();

    if (playedUrl) {
      const blobFromPlayedUrl = getCachedAudioBlob(requestId, messageKey, playedUrl);
      if (blobFromPlayedUrl) return blobFromPlayedUrl;
      const fetchedPlayedBlob = await fetchBlobFromUrl(playedUrl);
      if (fetchedPlayedBlob) return fetchedPlayedBlob;
    }

    const recentObjUrl = await tryResolveAudioFromRecentObjUrls(since, { requestId, messageKey });
    if (recentObjUrl) {
      const recentBlob = getCachedAudioBlob(requestId, messageKey, recentObjUrl) || (await fetchBlobFromUrl(recentObjUrl));
      if (recentBlob) return recentBlob;
    }

    const recentCaptured = findRecentCapturedBlobUrl(since);
    if (recentCaptured) {
      const recentCapturedBlob = getCachedAudioBlob(requestId, messageKey, recentCaptured) || (await fetchBlobFromUrl(recentCaptured));
      if (recentCapturedBlob) return recentCapturedBlob;
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

      let messageContainer = resolveVoiceRenderContainer(messageElement);
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
        const messageContainer = resolveVoiceRenderContainer(messageElement) || messageElement?.parentElement || messageElement;
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
