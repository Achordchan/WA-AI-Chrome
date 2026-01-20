/*
用途：样式注入 legacy fallback（从 content.js 迁移出来）。负责注入翻译按钮/分析面板等 UI 所需的 CSS。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.legacy) window.WAAP.legacy = {};

  if (window.WAAP.legacy.injectStylesFallback) return;

  function injectStyles(deps = {}) {
    try {
      const documentRef = deps.document || window.document;

      const styles = `
    .translate-btn-container {
      position: static;
      display: inline-flex;
      align-items: center;
      margin-right: 6px;
      opacity: 0.9;
    }

    div[data-pre-plain-text]:hover .translate-btn-container {
      opacity: 1;
    }

    /* 语音消息等场景可能没有 data-pre-plain-text，这里提供通用样式兜底 */
    .translate-btn {
      height: 22px;
      padding: 0 8px;
      background: rgba(255, 255, 255, 0.75);
      color: #0f766e;
      border: 1px solid rgba(15, 118, 110, 0.22);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .translate-btn:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 118, 110, 0.35);
    }

    body.dark .translate-btn,
    [data-theme="dark"] .translate-btn {
      background: rgba(20, 20, 20, 0.55);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.22);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
    }

    body.dark .translate-btn:hover,
    [data-theme="dark"] .translate-btn:hover {
      background: rgba(20, 20, 20, 0.72);
      border-color: rgba(52, 211, 153, 0.34);
    }

    div[data-pre-plain-text] .translate-btn {
      height: 22px;
      padding: 0 8px;
      background: rgba(255, 255, 255, 0.75);
      color: #0f766e;
      border: 1px solid rgba(15, 118, 110, 0.22);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    div[data-pre-plain-text] .translate-btn:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 118, 110, 0.35);
    }

    body.dark div[data-pre-plain-text] .translate-btn,
    [data-theme="dark"] div[data-pre-plain-text] .translate-btn {
      background: rgba(20, 20, 20, 0.55);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.22);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
    }

    body.dark div[data-pre-plain-text] .translate-btn:hover,
    [data-theme="dark"] div[data-pre-plain-text] .translate-btn:hover {
      background: rgba(20, 20, 20, 0.72);
      border-color: rgba(52, 211, 153, 0.34);
    }

    .translation {
      color: #667781;
      font-size: 14px;
      margin-top: 4px;
      padding-left: 4px;
      border-left: 2px solid #25D366;
    }

    .translation p {
      margin: 4px 0;
    }

    .translation p:first-child {
      margin-top: 0;
    }

    .translation p:last-child {
      margin-bottom: 0;
    }

    .translation-loading {
      color: #667781;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #00a884;
      background-color: rgba(0, 168, 132, 0.05);
      border-radius: 0 4px 4px 0;
      display: flex;
      align-items: center;
    }

    /* 深色模式适配 */
    html[data-theme='dark'] .translation-loading,
    .dark .translation-loading {
      color: #aebac1;
      background-color: rgba(0, 168, 132, 0.1);
    }

    .transcription-loading {
      color: #667781;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #00a884;
      background-color: rgba(0, 168, 132, 0.05);
      border-radius: 0 4px 4px 0;
      display: flex;
      align-items: center;
      white-space: pre-wrap;
    }

    html[data-theme='dark'] .transcription-loading,
    .dark .transcription-loading {
      color: #aebac1;
      background-color: rgba(0, 168, 132, 0.1);
    }

    .transcription-error {
      color: #b42318;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #b42318;
      background-color: rgba(180, 35, 24, 0.06);
      border-radius: 0 4px 4px 0;
      white-space: pre-wrap;
    }

    html[data-theme='dark'] .transcription-error,
    .dark .transcription-error {
      color: #ffb4a6;
      background-color: rgba(180, 35, 24, 0.12);
    }

    .transcription-content {
      position: relative;
      color: #333;
      margin-top: 12px;
      padding: 10px 18px 20px 10px;
      font-size: 0.95em;
      white-space: pre-wrap;
      border-left: 3px solid #4ade80;
      background-color: rgba(232, 245, 233, 0.8);
      border-radius: 0 5px 5px 0;
    }

    .transcription-content .transcription-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .transcription-content .transcription-text {
      flex: 1;
      min-width: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .transcription-content .transcription-translation {
      margin-top: 6px;
    }

    @media (max-width: 420px) {
      .transcription-content {
        margin-top: 14px;
        padding-right: 18px;
      }
    }

    html[data-theme='dark'] .transcription-content,
    .dark .transcription-content {
      background-color: rgba(60, 150, 80, 0.2);
      color: #e0e0e0;
    }

    .loading-dots {
      display: inline-flex;
      align-items: center;
      vertical-align: baseline;
      margin-left: 4px;
      line-height: 1;
      height: 1em;
    }

    .loading-dots::after {
      content: '';
      display: inline-block;
      min-width: 1.2em;
      text-align: left;
      line-height: 1;
      animation: waapEllipsis 1.5s steps(1, end) infinite;
    }

    @keyframes waapEllipsis {
      0% { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
      100% { content: '.'; }
    }

    .thinking-content {
      position: relative;
      overflow-y: auto;
      max-height: 300px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }

    .thinking-content::-webkit-scrollbar {
      width: 6px;
    }

    .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    html[data-theme='dark'] .thinking-content::-webkit-scrollbar-thumb,
    .dark .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
    }

    /* 闪烁的光标效果 */
    .thinking-content.typing::after {
      content: '|';
      display: inline-block;
      animation: blinkCursor 0.8s infinite;
      font-weight: normal;
      color: #666;
    }

    html[data-theme='dark'] .thinking-content.typing::after,
    .dark .thinking-content.typing::after {
      color: #ccc;
    }

    @keyframes blinkCursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .translation-content {
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .translation-content .translation-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .translation-content .translation-text {
      flex: 1;
      min-width: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .translation-meta-popover {
      position: fixed;
      z-index: 2147483000;
      pointer-events: auto;
      --waap-arrow-x: 50%;
    }

    .translation-meta-popover-card {
      width: fit-content;
      max-width: min(320px, calc(100vw - 20px));
      background: rgba(28, 28, 30, 0.72);
      color: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 12px 12px 10px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      -webkit-backdrop-filter: blur(18px);
      backdrop-filter: blur(18px);
    }

    .translation-meta-popover::after {
      content: '';
      position: absolute;
      left: var(--waap-arrow-x);
      width: 12px;
      height: 12px;
      background: rgba(28, 28, 30, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.14);
      transform: translateX(-50%) rotate(45deg);
      border-radius: 3px;
    }

    .translation-meta-popover.is-above::after {
      bottom: -6px;
      border-top: none;
      border-right: none;
    }

    .translation-meta-popover.is-below::after {
      top: -6px;
      border-bottom: none;
      border-left: none;
    }

    .translation-meta-popover-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.2px;
      margin-bottom: 8px;
    }

    .translation-meta-popover-check {
      width: 18px;
      height: 18px;
      color: #22c55e;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .translation-meta-row {
      display: grid;
      grid-template-columns: 66px 1fr;
      gap: 8px;
      padding: 5px 0;
    }

    .translation-meta-label {
      color: rgba(255, 255, 255, 0.60);
      font-weight: 650;
      font-size: 12px;
    }

    .translation-meta-value {
      color: rgba(255, 255, 255, 0.92);
      font-weight: 700;
      font-size: 13px;
      word-break: break-word;
    }

    .translation-meta-popover-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .translation-meta-retry {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.10);
      color: rgba(255, 255, 255, 0.92);
      border-radius: 12px;
      padding: 7px 9px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 650;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }

    .translation-meta-retry:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.24);
    }

    .translation-meta-retry:disabled {
      opacity: 0.6;
      cursor: default;
      transform: none;
    }

    .translation-content .translation-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .translation-content .translation-toolbar-btn {
      width: 20px;
      height: 20px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(255, 255, 255, 0.55);
      color: #41525d;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      line-height: 1;
      font-weight: 700;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }

    .translation-content .translation-toolbar-btn:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.75);
      border-color: rgba(0, 0, 0, 0.16);
    }

    .translation-content .translation-toolbar-btn:disabled {
      opacity: 0.6;
      cursor: default;
      transform: none;
    }

    html[data-theme='dark'] .translation-content .translation-toolbar-btn,
    .dark .translation-content .translation-toolbar-btn {
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(17, 24, 39, 0.35);
      color: #e5e7eb;
      box-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
    }

    html[data-theme='dark'] .translation-content .translation-toolbar-btn:hover,
    .dark .translation-content .translation-toolbar-btn:hover {
      background: rgba(17, 24, 39, 0.55);
      border-color: rgba(255, 255, 255, 0.22);
    }

    .translation-content .translation-meta {
      margin-top: 6px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.04);
      color: #667781;
      font-size: 12px;
      line-height: 1.35;
      word-break: break-word;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .translation-content .translation-meta-text {
      flex: 1;
      min-width: 0;
    }

    html[data-theme='dark'] .translation-content .translation-meta,
    .dark .translation-content .translation-meta {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }

    .translation-error {
      color: #e53935;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #e53935;
      background-color: rgba(229, 57, 53, 0.05);
      border-radius: 0 4px 4px 0;
    }

    html[data-theme='dark'] .translation-error,
    .dark .translation-error {
      color: #ff6b6b;
      background-color: rgba(229, 57, 53, 0.1);
    }

    .analysis-btn-container {
      display: flex;
      align-items: center;
      margin-left: 12px;
      gap: 4px;
    }

    .settings-modal {
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

    .settings-modal iframe {
      width: 80%;
      max-width: 800px;
      height: 80vh;
      border: none;
      border-radius: 8px;
      background: white;
    }

    html[data-theme='dark'] .settings-modal iframe,
    .dark .settings-modal iframe {
      background: #1f2937;
    }

    .analysis-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 50%;
      transition: all 0.2s;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .analysis-btn:hover {
      background-color: rgba(134, 150, 160, 0.1);
      color: #1296db;
    }

    html[data-theme='dark'] .analysis-btn:hover,
    .dark .analysis-btn:hover {
      background-color: rgba(134, 150, 160, 0.2);
    }

    .analysis-panel {
      position: fixed;
      right: 20px;
      top: 20px;
      width: 380px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }

    html[data-theme='dark'] .analysis-panel,
    .dark .analysis-panel {
      background: #1f2937;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .analysis-content {
      padding: 20px;
    }

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e9edef;
    }

    html[data-theme='dark'] .analysis-header,
    .dark .analysis-header {
      border-bottom: 1px solid #374151;
    }

    .analysis-header h3 {
      margin: 0;
      color: #41525d;
      font-size: 18px;
      font-weight: 600;
    }

    html[data-theme='dark'] .analysis-header h3,
    .dark .analysis-header h3 {
      color: #e5e7eb;
    }

    .close-btn {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 22px;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    /* 输入框高亮效果 */
    .input-highlight {
      animation: inputHighlight 1.5s ease-in-out 3;
    }

    @keyframes inputHighlight {
      0% {
        border-color: #e9edef;
        box-shadow: none;
      }
      50% {
        border-color: #ff3b30;
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
      }
      100% {
        border-color: #e9edef;
        box-shadow: none;
      }
    }

    /* 这是一个更强调的红色脉动效果 */
    .input-required {
      animation: inputRequired 1.5s ease-in-out 3;
    }
    
    @keyframes inputRequired {
      0% {
        border-color: #e9edef;
        box-shadow: none;
      }
      50% {
        border-color: #ff3b30;
        box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.3);
        transform: translateY(-2px);
      }
      100% {
        border-color: #e9edef;
        box-shadow: none;
        transform: translateY(0);
      }
    }

    .analysis-section h4 {
      color: #41525d;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 16px;
    }

    html[data-theme='dark'] .analysis-section h4,
    .dark .analysis-section h4 {
      color: #e5e7eb;
    }

    .analysis-mood {
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
      padding: 12px 16px;
      background: #f0f2f5;
      border-radius: 8px;
    }

    html[data-theme='dark'] .analysis-mood,
    .dark .analysis-mood {
      background: rgba(255, 255, 255, 0.06);
      color: #e5e7eb;
    }

    .analysis-topics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .topic-item {
      background: #e7f7ef;
      color: #00a884;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    html[data-theme='dark'] .topic-item,
    .dark .topic-item {
      background: rgba(16, 185, 129, 0.14);
      color: #a7f3d0;
    }

    .analysis-attitudes {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
    }

    .analysis-section + .analysis-section {
      margin-top: 18px;
    }

    html[data-theme='dark'] .analysis-attitudes,
    .dark .analysis-attitudes {
      background: rgba(255, 255, 255, 0.06);
    }

    .attitude-item {
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.5;
    }

    .attitude-value {
      white-space: pre-wrap;
    }

    .analysis-mood,
    .suggestion-text,
    .reply-text {
      white-space: pre-wrap;
    }

    .attitude-item:last-child {
      margin-bottom: 0;
    }

    .attitude-label {
      color: #41525d;
      font-weight: 500;
    }

    html[data-theme='dark'] .attitude-label,
    .dark .attitude-label {
      color: #e5e7eb;
    }

    .attitude-value {
      color: #667781;
    }

    html[data-theme='dark'] .attitude-value,
    .dark .attitude-value {
      color: #d1d5db;
    }

    .analysis-suggestions {
      margin-bottom: 16px;
    }

    .suggestion-item {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
    }

    html[data-theme='dark'] .suggestion-item,
    .dark .suggestion-item {
      background: rgba(255, 255, 255, 0.06);
      color: #e5e7eb;
    }

    .suggested-reply {
      margin-top: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #dcf8c6 0%, #e7f7ef 100%);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 168, 132, 0.1);
    }

    html[data-theme='dark'] .suggested-reply,
    .dark .suggested-reply {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    }

    .suggested-reply h4 {
      color: #075e54;
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    html[data-theme='dark'] .suggested-reply h4,
    .dark .suggested-reply h4 {
      color: #d1fae5;
    }

    .reply-text {
      position: relative;
      color: #111b21;
      font-size: 14px;
      line-height: 1.6;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      border: 1px solid rgba(0, 168, 132, 0.2);
      white-space: pre-wrap;
    }

    html[data-theme='dark'] .reply-text,
    .dark .reply-text {
      color: #f3f4f6;
      background: rgba(17, 24, 39, 0.55);
      border: 1px solid rgba(16, 185, 129, 0.26);
    }

    .reply-text::before,
    .reply-text::after {
      content: '"';
      position: absolute;
      font-size: 24px;
      color: #00a884;
      opacity: 0.5;
    }

    .reply-text::before {
      left: 8px;
      top: 4px;
    }

    .reply-text::after {
      right: 8px;
      bottom: 4px;
    }

    .analysis-loading {
      padding: 40px 20px;
      text-align: center;
      color: #667781;
      font-size: 14px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
    }

    html[data-theme='dark'] .analysis-loading,
    .dark .analysis-loading {
      color: #d1d5db;
    }

 

    /* 消息列表样式 */
    .chat-list {
      border: 1px solid #e9edef;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;
      background-color: #fff;
      margin: 12px 0;
    }

    html[data-theme='dark'] .chat-list,
    .dark .chat-list {
      border: 1px solid rgba(255, 255, 255, 0.12);
      background-color: rgba(17, 24, 39, 0.55);
    }

    .chat-list-header {
      background-color: #f0f2f5;
      padding: 12px;
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e9edef;
    }

    html[data-theme='dark'] .chat-list-header,
    .dark .chat-list-header {
      background-color: rgba(255, 255, 255, 0.06);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .chat-list-header label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #41525d;
      font-size: 14px;
    }

    html[data-theme='dark'] .chat-list-header label,
    .dark .chat-list-header label {
      color: #e5e7eb;
    }

    .chat-list-header input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .selected-count {
      color: #667781;
      font-size: 13px;
    }

    html[data-theme='dark'] .selected-count,
    .dark .selected-count {
      color: #d1d5db;
    }

    .chat-message {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      border-bottom: 1px solid #e9edef;
      transition: background-color 0.2s;
    }

    html[data-theme='dark'] .chat-message,
    .dark .chat-message {
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .chat-message:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    html[data-theme='dark'] .chat-message:hover,
    .dark .chat-message:hover {
      background-color: rgba(255, 255, 255, 0.04);
    }

    .chat-message.me {
      background-color: rgba(217, 253, 211, 0.1);
    }

    html[data-theme='dark'] .chat-message.me,
    .dark .chat-message.me {
      background-color: rgba(16, 185, 129, 0.08);
    }

    .chat-message.other {
      background-color: #ffffff;
    }

    html[data-theme='dark'] .chat-message.other,
    .dark .chat-message.other {
      background-color: transparent;
    }

    .message-select {
      display: flex;
      align-items: center;
      padding: 0 12px;
    }

    .message-select input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .message-sender {
      font-size: 13px;
      font-weight: 500;
    }

    .sender-me {
      color: #1fa855;
    }

    .sender-other {
      color: #53bdeb;
    }

    .message-time {
      color: #667781;
      font-size: 12px;
    }

    html[data-theme='dark'] .message-time,
    .dark .message-time {
      color: #9ca3af;
    }

    .message-text {
      color: #111b21;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }

    html[data-theme='dark'] .message-text,
    .dark .message-text {
      color: #f3f4f6;
    }

    /* 开始分析按钮样式 */
    .analysis-actions {
      padding: 16px 0 0;
      text-align: right;
    }

    .start-analysis {
      background: #00a884;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .start-analysis:hover {
      background: #008f72;
    }

    .start-analysis:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }

    /* 滚动条样式 */
    .chat-list::-webkit-scrollbar {
      width: 6px;
    }

    .chat-list::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .chat-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .chat-list::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    .prompt-input {
      margin-bottom: 16px;
    }

    .prompt-input label {
      display: block;
      margin-bottom: 8px;
      color: #41525d;
      font-size: 14px;
    }

    .prompt-input textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      font-family: inherit;
    }

    .prompt-input textarea:focus {
      outline: none;
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section h4 {
      color: #41525d;
      font-size: 16px;
      margin: 0 0 16px;
    }
  `;

      // 创建样式元素
      const styleElement = documentRef.createElement('style');
      styleElement.textContent = styles;
      documentRef.head.appendChild(styleElement);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.WAAP.legacy.injectStylesFallback = {
    injectStyles
  };
})();
