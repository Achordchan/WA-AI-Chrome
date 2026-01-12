(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.translateConfirmDialogFallback) return;

  const STYLE_ID = 'waap-translate-confirm-dialog-style';

  function ensureStyles(documentRef) {
    try {
      if (!documentRef) return;
      if (documentRef.getElementById(STYLE_ID)) return;

      const styleElement = documentRef.createElement('style');
      styleElement.id = STYLE_ID;
      styleElement.textContent = `
        .confirm-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .confirm-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 400px;
        }

        .confirm-content h3 {
          margin: 0 0 12px;
          color: #41525d;
          font-size: 16px;
        }

        .confirm-content p {
          margin: 0 0 20px;
          color: #667781;
          font-size: 14px;
          line-height: 1.5;
        }

        .confirm-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .confirm-buttons button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #f0f2f5;
          color: #667781;
        }

        .cancel-btn:hover {
          background: #e9edef;
        }

        .confirm-btn {
          background: #00a884;
          color: white;
        }

        .confirm-btn:hover {
          background: #008f72;
        }
      `;

      documentRef.head.appendChild(styleElement);
    } catch (e) {
      // ignore
    }
  }

  function showTranslateConfirmDialog(messageContainer, deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const translateAllMessages = deps.translateAllMessages;

      if (!documentRef) return false;

      ensureStyles(documentRef);

      const confirmDialog = documentRef.createElement('div');
      confirmDialog.className = 'confirm-dialog';
      confirmDialog.innerHTML = `
        <div class="confirm-content">
          <h3>批量翻译确认</h3>
          <p>该操作将使用Google翻译来翻译当前聊天记录中显示的所有消息。</p>
          <p style="color: #00a884; margin-top: 8px;">注：此功能将直接调用Google翻译，不支持其他模型，无思考过程。</p>
          <div class="confirm-buttons">
            <button class="cancel-btn" type="button">取消</button>
            <button class="confirm-btn" type="button">确认翻译</button>
          </div>
        </div>
      `;

      try {
        documentRef.body.appendChild(confirmDialog);
      } catch (e) {
        return false;
      }

      const removeDialog = () => {
        try {
          confirmDialog.remove();
        } catch (e) {
          // ignore
        }
      };

      try {
        const cancelBtn = confirmDialog.querySelector('.cancel-btn');
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            removeDialog();
          };
        }
      } catch (e) {
        // ignore
      }

      try {
        const confirmBtn = confirmDialog.querySelector('.confirm-btn');
        if (confirmBtn) {
          confirmBtn.onclick = async () => {
            removeDialog();
            try {
              if (typeof translateAllMessages === 'function') {
                await translateAllMessages(messageContainer);
              }
            } catch (e) {
              // ignore
            }
          };
        }
      } catch (e) {
        // ignore
      }

      try {
        confirmDialog.addEventListener('click', (e) => {
          if (e.target === confirmDialog) {
            removeDialog();
          }
        });
      } catch (e) {
        // ignore
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.translateConfirmDialogFallback = {
    showTranslateConfirmDialog
  };
})();
