(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.countryFlagService) return;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeCountryCode(input) {
    try {
      const raw = typeof input === 'string'
        ? input
        : (input && typeof input === 'object' ? input.country : '');
      const code = String(raw || '').trim().toUpperCase();
      return /^[A-Z]{2}$/.test(code) ? code : '';
    } catch (e) {
      return '';
    }
  }

  function getFlagAssetPath(input) {
    const code = normalizeCountryCode(input);
    if (!code) return '';
    return `images/flags/${code.toLowerCase()}.svg`;
  }

  function getFlagUrl(input, deps = {}) {
    try {
      const assetPath = getFlagAssetPath(input);
      if (!assetPath) return '';
      const chromeRef = deps.chrome || window.chrome;
      if (chromeRef?.runtime?.getURL) {
        return chromeRef.runtime.getURL(assetPath);
      }
      return assetPath;
    } catch (e) {
      return '';
    }
  }

  function ensureStyles(deps = {}) {
    try {
      const documentRef = deps.document || window.document;
      if (!documentRef || documentRef.querySelector('#wa-country-flag-styles')) return true;

      const style = documentRef.createElement('style');
      style.id = 'wa-country-flag-styles';
      style.textContent = `
        .wa-country-flag-shell{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;flex-shrink:0;line-height:1;}
        .wa-country-flag-img{display:block;width:18px;height:auto;aspect-ratio:4 / 3;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,0.08);}
        .wa-country-flag-code-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:14px;padding:0 4px;border-radius:5px;background:rgba(0,0,0,0.08);color:#3b4a54;font-size:10px;font-weight:700;letter-spacing:0.35px;line-height:1;text-transform:uppercase;}
        .wa-country-inline-label{display:inline-flex;align-items:center;gap:6px;vertical-align:middle;line-height:1.3;}
        .wa-country-inline-name{display:inline-block;}
        .wa-country-inline-code{display:inline-block;font-size:11px;font-weight:600;color:rgba(0,0,0,0.48);letter-spacing:0.25px;text-transform:uppercase;}
        .wa-country-picker-flag .wa-country-flag-img{width:20px;border-radius:3px;}
        .country-flag .wa-country-flag-img{width:18px;}
      `;
      documentRef.head.appendChild(style);
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderFlagHtml(input, options = {}, deps = {}) {
    try {
      ensureStyles(deps);
      const code = normalizeCountryCode(input);
      const shellClassName = escapeHtml(options.shellClassName || 'wa-country-flag-shell');
      const imageClassName = escapeHtml(options.imageClassName || 'wa-country-flag-img');
      const badgeClassName = escapeHtml(options.badgeClassName || 'wa-country-flag-code-badge');
      const alt = escapeHtml(options.alt || (input && input.name ? `${input.name}国旗` : '国家图标'));
      const flagUrl = getFlagUrl(code, deps);

      if (flagUrl) {
        return `<span class="${shellClassName}"><img class="${imageClassName}" src="${escapeHtml(flagUrl)}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></span>`;
      }

      return `<span class="${shellClassName}"><span class="${badgeClassName}">${escapeHtml(code || '--')}</span></span>`;
    } catch (e) {
      return '<span class="wa-country-flag-shell"><span class="wa-country-flag-code-badge">--</span></span>';
    }
  }

  function renderCountryLabelHtml(item, options = {}, deps = {}) {
    try {
      ensureStyles(deps);
      if (!item) return '暂无数据';
      const wrapperClassName = escapeHtml(options.wrapperClassName || 'wa-country-inline-label');
      const nameClassName = escapeHtml(options.nameClassName || 'wa-country-inline-name');
      const codeClassName = escapeHtml(options.codeClassName || 'wa-country-inline-code');
      const name = String(item.name || '').trim();
      const code = normalizeCountryCode(item);
      const flagHtml = renderFlagHtml(item, options, deps);

      const parts = [`<span class="${wrapperClassName}">`, flagHtml];
      if (name) parts.push(`<span class="${nameClassName}">${escapeHtml(name)}</span>`);
      if (code) parts.push(`<span class="${codeClassName}">${escapeHtml(code)}</span>`);
      parts.push('</span>');
      return parts.join('');
    } catch (e) {
      return '暂无数据';
    }
  }

  window.WAAP.services.countryFlagService = {
    ensureStyles,
    normalizeCountryCode,
    getFlagAssetPath,
    getFlagUrl,
    renderFlagHtml,
    renderCountryLabelHtml
  };
})();
