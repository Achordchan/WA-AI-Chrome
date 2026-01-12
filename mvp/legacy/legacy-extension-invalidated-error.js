/*
用途：扩展上下文失效提示 legacy fallback（从 content.js 迁移出来）。当扩展 context invalidated 时，展示覆盖层提示并提供“刷新页面”按钮。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.extensionInvalidatedFallback) return;

  function showExtensionInvalidatedError(deps = {}) {
    const documentRef = deps.document || window.document;
    const locationRef = deps.location || window.location;

    const errorMessage = `
      <div class="extension-error">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h3>扩展上下文已失效</h3>
          <p>这可能是由于以下原因导致的：</p>
          <ul>
            <li>浏览器扩展已被更新或重新加载</li>
            <li>浏览器已运行很长时间</li>
            <li>浏览器已更新</li>
          </ul>
          <p>请尝试以下解决方法：</p>
          <ol>
            <li>刷新当前页面</li>
            <li>如果问题仍然存在，请重新启动浏览器</li>
            <li>如果仍未解决，请禁用然后重新启用此扩展</li>
          </ol>
        </div>
        <button class="refresh-btn">刷新页面</button>
      </div>
    `;

    const errorDiv = documentRef.createElement('div');
    errorDiv.className = 'extension-error-overlay';
    errorDiv.innerHTML = errorMessage;
    documentRef.body.appendChild(errorDiv);

    // 添加样式
    const style = documentRef.createElement('style');
    style.textContent = `
      .extension-error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
      }

      .extension-error {
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }

      .error-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 15px;
      }

      .error-content {
        margin-bottom: 20px;
      }

      .error-content h3 {
        color: #e74c3c;
        margin-top: 0;
      }

      .refresh-btn {
        background: #2ecc71;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        display: block;
        margin: 0 auto;
      }

      .refresh-btn:hover {
        background: #27ae60;
      }
    `;
    documentRef.head.appendChild(style);

    // 添加刷新按钮功能
    const refreshBtn = errorDiv.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        try {
          locationRef.reload();
        } catch (e) {
          // ignore
        }
      });
    }

    return true;
  }

  window.WAAP.legacy.extensionInvalidatedFallback = {
    showExtensionInvalidatedError
  };
})();
