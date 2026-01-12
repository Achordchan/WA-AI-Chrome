/*
用途：封装 input-translate.js 的“翻译按钮注入（输入框旁边的小翻译按钮）”相关逻辑。
说明：把 createTranslateButton / isChatWindowActiveForInputTranslate / addInputTranslateButton / 重试与 MutationObserver 统一放到 service，
      让 input-translate.js 更接近 orchestrator（薄 glue）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.inputTranslateUiService) return;

  let installed = false;
  let cleanupFn = null;

  const INPUT_TRANSLATE_THROTTLE_MS = 800;
  let lastInputTranslateAttemptAt = 0;

  function isChatWindowActiveForInputTranslate(deps = {}) {
    const doc = deps.document || window.document;

    const main = doc.getElementById('main');
    if (!main) return false;

    if (doc.querySelector('footer._ak1i')) return true;

    if (main.querySelector('.lexical-rich-text-input div[contenteditable="true"]')) return true;

    return false;
  }

  function createTranslateButton(deps = {}) {
    const doc = deps.document || window.document;
    const createTranslateModal = deps.createTranslateModal;

    const createTranslateButtonFromView = () => {
      try {
        const view = window.WAAP?.views?.inputTranslateButtonView;
        if (!view?.createTranslateButton) return null;

        return view.createTranslateButton({
          document: doc,
          onClick: async () => {
            try {
              const footer = doc.querySelector('footer._ak1i');
              if (!footer) return;

              const inputBox = footer.querySelector(
                '.lexical-rich-text-input div[contenteditable="true"]'
              );
              if (!inputBox) return;

              const text = (inputBox.textContent || '').trim();

              if (typeof createTranslateModal !== 'function') return;
              const modal = createTranslateModal(text, inputBox, { hideSource: !text });
              if (!modal) return;

              try {
                const btn = doc.querySelector('.input-translate-btn');
                btn?.parentElement && btn.parentElement.appendChild(modal);
              } catch (e3) {
                // ignore
              }
            } catch (err) {
              // ignore
            }
          }
        });
      } catch (e) {
        return null;
      }
    };

    try {
      const fromView = createTranslateButtonFromView();
      if (fromView) return fromView;
    } catch (e) {
      // ignore
    }

    const button = doc.createElement('button');
    button.className =
      'xjb2p0i xk390pu x1ypdohk xjbqb8w x972fbf xcfux6l x1qhh985 xm0m39n x1okw0bk x5yr21d x14yjl9h xudhj91 x18nykt9 xww2gxu';
    button.setAttribute('title', '翻译');
    button.innerHTML = `
    <span aria-hidden="true" class="translate-icon">
      <svg viewBox="0 0 1024 1024" height="20" width="20" fill="currentColor">
        <path d="M608 416h288c35.36 0 64 28.48 64 64v416c0 35.36-28.48 64-64 64H480c-35.36 0-64-28.48-64-64v-288H128c-35.36 0-64-28.48-64-64V128c0-35.36 28.48-64 64-64h416c35.36 0 64 28.48 64 64v288z m0 64v64c0 35.36-28.48 64-64 64h-64v256.032c0 17.664 14.304 31.968 31.968 31.968H864a31.968 31.968 0 0 0 31.968-31.968V512a31.968 31.968 0 0 0-31.968-31.968H608zM128 159.968V512c0 17.664 14.304 31.968 31.968 31.968H512a31.968 31.968 0 0 0 31.968-31.968V160A31.968 31.968 0 0 0 512.032 128H160A31.968 31.968 0 0 0 128 159.968z m64 244.288V243.36h112.736V176h46.752c6.4 0.928 9.632 1.824 9.632 2.752a10.56 10.56 0 0 1-1.376 4.128c-2.752 7.328-4.128 16.032-4.128 26.112v34.368h119.648v156.768h-50.88v-20.64h-68.768v118.272H306.112v-118.272H238.752v24.768H192z m46.72-122.368v60.48h67.392V281.92H238.752z m185.664 60.48V281.92h-68.768v60.48h68.768z m203.84 488H576L668.128 576h64.64l89.344 254.4h-54.976l-19.264-53.664h-100.384l-19.232 53.632z m33.024-96.256h72.864l-34.368-108.608h-1.376l-37.12 108.608zM896 320h-64a128 128 0 0 0-128-128V128a192 192 0 0 1 192 192zM128 704h64a128 128 0 0 0 128 128v64a192 192 0 0 1-192-192z"/>
      </svg>
    </span>
  `;

    button.style.cssText = `
    color: #8696a0;
    transition: all 0.15s ease;
    padding: 4px;
    margin: 0 2px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  `;

    button.addEventListener('mouseenter', () => {
      button.style.color = '#00a884';
    });

    button.addEventListener('mouseleave', () => {
      button.style.color = '#8696a0';
    });

    button.onclick = async (e) => {
      try {
        e.stopPropagation();
      } catch (e2) {
        // ignore
      }

      try {
        const footer = doc.querySelector('footer._ak1i');
        if (!footer) return;

        const inputBox = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
        if (!inputBox) return;

        const text = (inputBox.textContent || '').trim();

        if (typeof createTranslateModal !== 'function') return;
        const modal = createTranslateModal(text, inputBox, { hideSource: !text });
        if (!modal) return;

        try {
          button.parentElement && button.parentElement.appendChild(modal);
        } catch (e3) {
          // ignore
        }
      } catch (err) {
        // ignore
      }
    };

    return button;
  }

  function handleRetry(deps, reason, retryCount, maxRetries) {
    const doc = deps.document || window.document;
    const setTimeoutFn = deps.setTimeout || window.setTimeout;

    if (!isChatWindowActiveForInputTranslate({ document: doc })) {
      return false;
    }

    if (retryCount < maxRetries) {
      setTimeoutFn(() => {
        addInputTranslateButton(deps, retryCount + 1, maxRetries);
      }, 1000 * (retryCount + 1));
      return false;
    }

    return false;
  }

  function addInputTranslateButton(deps = {}, retryCount = 0, maxRetries = 5) {
    const doc = deps.document || window.document;

    if (!isChatWindowActiveForInputTranslate({ document: doc })) {
      return false;
    }

    const nowMs = Date.now();
    if (nowMs - lastInputTranslateAttemptAt < INPUT_TRANSLATE_THROTTLE_MS && retryCount === 0) {
      return false;
    }
    lastInputTranslateAttemptAt = nowMs;

    if (doc.querySelector('.input-translate-btn')) {
      return true;
    }

    const footer = doc.querySelector('footer._ak1i');
    if (!footer) {
      return handleRetry(deps, 'footer', retryCount, maxRetries);
    }

    const inputBox = footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]');
    if (!inputBox) {
      return handleRetry(deps, 'input box', retryCount, maxRetries);
    }

    try {
      const translateBtn = createTranslateButton({
        document: doc,
        createTranslateModal: deps.createTranslateModal
      });
      translateBtn.classList.add('input-translate-btn');

      const container = inputBox.closest('.lexical-rich-text-input');
      if (!container) {
        return handleRetry(deps, 'container', retryCount, maxRetries);
      }

      container.parentNode.insertBefore(translateBtn, container.nextSibling);
      return true;
    } catch (error) {
      return handleRetry(deps, 'error', retryCount, maxRetries);
    }
  }

  function ensureInstalled(deps = {}) {
    if (installed) return cleanupFn;
    installed = true;

    const doc = deps.document || window.document;
    const MutationObserverRef = deps.MutationObserver || window.MutationObserver;

    try {
      const observer = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'childList' &&
            mutation.addedNodes.length > 0 &&
            !doc.querySelector('.input-translate-btn')
          ) {
            if (!isChatWindowActiveForInputTranslate({ document: doc })) {
              continue;
            }
            if (addInputTranslateButton({
              document: doc,
              setTimeout: deps.setTimeout || window.setTimeout,
              createTranslateModal: deps.createTranslateModal
            })) {
              break;
            }
          }
        }
      });

      observer.observe(doc.body, { childList: true, subtree: true });

      addInputTranslateButton({
        document: doc,
        setTimeout: deps.setTimeout || window.setTimeout,
        createTranslateModal: deps.createTranslateModal
      });

      cleanupFn = () => {
        try {
          observer.disconnect();
        } catch (e) {
          // ignore
        }
      };

      return cleanupFn;
    } catch (e) {
      cleanupFn = () => {};
      return cleanupFn;
    }
  }

  window.WAAP.services.inputTranslateUiService = {
    ensureInstalled,
    createTranslateButton,
    addInputTranslateButton,
    isChatWindowActiveForInputTranslate
  };
})();
