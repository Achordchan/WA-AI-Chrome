(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.settingsAdminPresetService) return;

  function getField(id, root) {
    try {
      return root?.querySelector?.(`#${id}`) || document.getElementById(id) || null;
    } catch (e) {
      return null;
    }
  }

  function applyAdminPreset(root) {
    const presetApiKey = '6c9033c7e08b403abd6f66f09f146f60.hvyHTj91HZQOzT7E';
    const presetApiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const presetModel = 'glm-4-flash-250414';
    const presetSttApiKey = '6c9033c7e08b403abd6f66f09f146f60.hvyHTj91HZQOzT7E';
    const presetSttApiUrl = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';
    const presetSttModel = 'glm-asr-2512';

    const translationApiSelect = getField('translationApi', root);
    if (translationApiSelect) {
      translationApiSelect.value = 'siliconflow';
      translationApiSelect.dispatchEvent(new Event('change'));
    }

    const apiUrlEl = getField('siliconflowApiUrl', root);
    if (apiUrlEl) apiUrlEl.value = presetApiUrl;
    const modelEl = getField('siliconflowModel', root);
    if (modelEl) modelEl.value = presetModel;
    const keyEl = getField('siliconflowApiKey', root);
    if (keyEl) keyEl.value = presetApiKey;

    const aiEnabledToggle = getField('aiEnabled', root);
    if (aiEnabledToggle) {
      aiEnabledToggle.checked = true;
      aiEnabledToggle.dispatchEvent(new Event('change'));
    }

    const aiApiSelect = getField('aiApi', root);
    if (aiApiSelect) {
      aiApiSelect.value = 'siliconflow';
      aiApiSelect.dispatchEvent(new Event('change'));
    }

    const apiUrlElAi = getField('siliconflowApiUrl_ai', root);
    if (apiUrlElAi) apiUrlElAi.value = presetApiUrl;
    const modelElAi = getField('siliconflowModel_ai', root);
    if (modelElAi) modelElAi.value = presetModel;
    const keyElAi = getField('siliconflowApiKey_ai', root);
    if (keyElAi) keyElAi.value = presetApiKey;

    const sttEnabledToggle = getField('sttEnabled', root);
    if (sttEnabledToggle) {
      sttEnabledToggle.checked = true;
      sttEnabledToggle.dispatchEvent(new Event('change'));
    }

    const sttKeyEl = getField('sttApiKey', root);
    if (sttKeyEl) sttKeyEl.value = presetSttApiKey;
    const sttUrlEl = getField('sttApiUrl', root);
    if (sttUrlEl) sttUrlEl.value = presetSttApiUrl;
    const sttModelEl = getField('sttModel', root);
    if (sttModelEl) sttModelEl.value = presetSttModel;
  }

  function openDialog(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      const modal = deps.modal;
      const showToast = deps.showToast;
      if (!documentRef || !modal) return false;

      const existing = documentRef.querySelector('.admin-preset-overlay');
      if (existing) existing.remove();

      const overlay = documentRef.createElement('div');
      overlay.className = 'admin-preset-overlay';
      overlay.innerHTML = `
        <div class="admin-preset-card" role="dialog" aria-modal="true">
          <div class="admin-preset-header">
            <div class="admin-preset-title">管理员预设</div>
            <button type="button" class="admin-preset-close" aria-label="关闭">×</button>
          </div>
          <div class="admin-preset-body">
            <div class="admin-preset-row">
              <label class="admin-preset-label">管理员口令</label>
              <input class="admin-preset-input" type="password" id="adminPresetPass" placeholder="请输入口令">
            </div>
            <div class="admin-preset-hint">将自动把“翻译服务”和“AI分析服务”切换到 OpenAI 通用接口，并填充 API Key / URL / 模型。</div>
          </div>
          <div class="admin-preset-footer">
            <button type="button" class="admin-preset-secondary" id="adminPresetCancel">取消</button>
            <button type="button" class="admin-preset-primary" id="adminPresetApply">应用预设</button>
          </div>
        </div>
      `;

      modal.appendChild(overlay);

      const close = () => {
        try {
          overlay.remove();
        } catch (e) {
          // ignore
        }
      };

      const passEl = overlay.querySelector('#adminPresetPass');
      overlay.querySelector('.admin-preset-close')?.addEventListener('click', close);
      overlay.querySelector('#adminPresetCancel')?.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      overlay.querySelector('#adminPresetApply')?.addEventListener('click', () => {
        try {
          const pass = String(passEl?.value || '').trim();
          if (pass !== 'Achord666') {
            showToast?.('口令错误', 'error');
            passEl?.focus?.();
            return;
          }

          applyAdminPreset(documentRef);
          showToast?.('已应用管理员预设', 'success');
          close();
        } catch (e) {
          console.error('应用管理员预设失败:', e);
          showToast?.('应用管理员预设失败', 'error');
        }
      });

      passEl?.focus?.();
      passEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          overlay.querySelector('#adminPresetApply')?.click?.();
        }
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.services.settingsAdminPresetService = {
    openDialog,
    applyAdminPreset
  };
})();
