/*
用途：输入框翻译按钮（输入框旁边的小翻译 icon 按钮）的 MVP View。
说明：只负责按钮的 DOM 结构 / icon / hover 样式与基础交互（点击回调由调用方注入）。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.views) window.WAAP.views = {};

  if (window.WAAP.views.inputTranslateButtonView) return;

  function createTranslateButton(deps = {}) {
    try {
      const doc = deps.document || window.document;
      const onClick = deps.onClick;

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

      button.addEventListener('click', async (e) => {
        try {
          e.stopPropagation();
        } catch (e2) {
          // ignore
        }

        try {
          if (typeof onClick === 'function') {
            await onClick(e, button);
          }
        } catch (e3) {
          // ignore
        }
      });

      return button;
    } catch (e) {
      return null;
    }
  }

  window.WAAP.views.inputTranslateButtonView = {
    createTranslateButton
  };
})();
