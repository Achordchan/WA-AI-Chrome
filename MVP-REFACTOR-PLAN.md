# WhatsApp Assistant Pro+ —— 全量 MVP 重构计划（不引入框架、不破坏现有功能）

> 目标：把当前偏“超大 content.js 总控”的结构，重构为 **MVP（Model/Service + View + Presenter）** 的文件组织方式。
> 
> 核心诉求：
> - **每个文件更短**，便于维护，也便于 AI 在改动时读取更少上下文、更精准。
> - **功能不回退**：翻译、输入框翻译、AI 分析、更新弹窗、引导卡片、天气等都保持可用。
> - **不引入新环境/打包**：继续使用原生 JS + MV3 content scripts 的加载机制。

---

## 1. 现状与问题（简述）

- `manifest.json` 的 content scripts 以“脚本串行注入”的方式工作，代码主要通过 `window.xxx` 共享。
- `content.js` 目前承担了：
  - 初始化编排（orchestration）
  - DOM 观察/选择器策略
  - UI 注入与事件
  - 状态与队列
  - popup 的运行状态查询（`CHECK_CHAT_WINDOW`/`CHECK_BUTTONS`/`SHOW_UPDATE_LOG`）
- `quick-chat.js` 等功能脚本存在对 `content.js` 的隐式依赖（例如直接调用 `initialize()`），导致边界不清。

---

## 2. 重构总原则（保证不破坏功能）

- **原则 A：增量迁移**
  - 每次只移动一个“可独立验证”的模块。
  - 迁移阶段保留旧的全局 API（例如继续支持 `window.initialize()` 直到最后）。

- **原则 B：不改逻辑，只改归属**
  - 第一阶段只做“搬家/拆分文件”，尽量不改实现细节。

- **原则 C：严格控制脚本加载顺序**
  - content scripts 仍依赖注入顺序，因此新增文件会在 `manifest.json` 中显式排序。

- **原则 D：保留回滚开关**
  - 每个阶段都能通过还原 `manifest.json` 的注入顺序回到旧实现。

---

## 2.1 迁移生效验证 / 删除旧逻辑策略（p10，保守模式）

> 目的：保证每次“搬家/拆分/变薄”都 **可验证、可回滚、可逐步删旧逻辑**，避免一次性切割导致语法断裂或功能回归。

### A. 迁移统一步骤（每个模块都遵守）

1. **新增 MVP 实现（不删旧实现）**
   - 新增文件必须带文件头（用途 + 作者 Achord）。
   - 新实现优先挂在 `window.WAAP.services|views|presenters`。

2. **manifest 顺序保证**
   - 新增脚本必须在 `manifest.json` 中 **放在 `content.js` 之前**。
   - 如果是 legacy fallback（旧实现拆出）则放在 `content.js` 之前，但在对应 MVP 文件之后也可以（只要 `content.js` 能访问到它）。

3. **content.js 改成“薄代理”**
   - 统一写法：
     - 先 `try` 调 MVP（返回 `true/false` 或 Promise），成功就 `return`。
     - 失败再回退到 `legacy*`（旧实现）或旧逻辑。
   - 旧实现短期保留：
     - 方式 1：同文件内 `legacyXxx`（短期）
     - 方式 2：迁移到 `mvp/legacy/*.js`（推荐，便于 content.js 变薄）

4. **硬门槛：语法检查必须通过**
   - 每次结构性移动后必须跑：
     - `node --check content.js`
     - 以及新增/修改的 MVP 文件 `node --check`
   - 不通过就立刻回滚（不要继续叠加改动）。

5. **关键路径自测（最少 2 分钟）**
   - 用本文档第 6 节自测清单，至少验证：
     - 按钮出现
     - 核心功能能跑通
     - 保存设置后行为同步（如自动翻译/天气等）

### B. 删除旧逻辑（真正“变薄”）的安全规则

1. **删除前置条件（必须同时满足）**
   - MVP 功能跑通并已被你确认“OK”。
   - `node --check` 全部通过。
   - legacy fallback 保留在：
     - `mvp/legacy/*.js`（推荐），并已在 `manifest.json` 注入。

2. **删除方式**
   - 优先做“范围预演”（只读）：
     - 输出要迁出的函数起止行号、前后片段，确认无误后再执行。
   - 执行迁出时必须：
     - 先生成带时间戳的备份（例如 `content.js.bak-xxx-YYYYMMDD-HHMMSS`）
     - 迁出后立刻 `node --check`

3. **禁止事项（防踩坑）**
   - 禁止靠“文本搜索截断”处理包含大量模板字符串的函数（容易切坏 `${...}`）。
   - 禁止在同一次改动里“迁出 + 大改逻辑 + 大改样式”。一次只做一类变化。

### C. 回滚策略（最省力）

1. **回滚到上一稳定版本**
   - 直接用最近一次 `content.js.bak-*` 覆盖回 `content.js`。

2. **关闭 MVP（保留文件不删）**
   - 临时把 `manifest.json` 中新增的 `mvp/*` 脚本注释/移除（或调整顺序），回到旧版注入顺序。

---

---

## 3. MVP 在本项目的落地定义

- **Model / Service（数据与能力）**
  - 封装 `chrome.storage`、`chrome.runtime.sendMessage`、API 调用、DOM 查询策略等。

- **View（纯 UI）**
  - 只负责创建/更新 DOM、样式注入、把事件回调交给 Presenter。

- **Presenter（业务与状态机）**
  - 负责“什么时候渲染、什么时候调用服务、如何节流/去重/排队、如何处理聊天切换”等。

> 说明：因为我们不引入框架，所以 View 仍是“命令式 DOM”。Presenter 负责把它组织得可维护。

---

## 4. 目标目录结构（建议）

新增目录（不影响现有文件）：

- `mvp/`
  - `core/`
    - `namespace.js`（统一挂载 `window.WAAP`）
    - `events.js`（轻量事件总线，可选）
  - `services/`
    - `storage-service.js`
    - `runtime-message-router.js`（给 popup 用的 CHECK_*）
    - `whatsapp-dom-service.js`（统一选择器/定位）
  - `views/`
    - `...`（逐步把 DOM 构建拆出去）
  - `presenters/`
    - `content-orchestrator.js`（替代 content.js 的“总调度”）
    - `quick-chat-presenter.js`
    - `...`（翻译、分析、自动翻译队列等按功能拆）

> 备注：最终 `content.js` 会“变薄”，只做启动与兼容桥接。

---

## 5. 分阶段里程碑（每阶段都可验证、可回滚）

### 阶段 1：搭 MVP 基础设施（低风险）
- 新增：`mvp/core/namespace.js`（`window.WAAP`）
- 新增：`mvp/services/storage-service.js`（对 `chrome.storage` 的薄封装）
- 新增：`mvp/services/runtime-message-router.js`（从 `content.js` 拆出 popup 的 CHECK_* 逻辑）
- 修改：`manifest.json` 增加新脚本，并确保顺序在 `content.js` 之前。
- 修改：`content.js` 删除对应已迁移的 message listener（避免重复监听）。

验证点：
- popup 仍能正常显示“已进入聊天/按钮是否加载/查看更新说明”。

### 阶段 2：统一 WhatsApp DOM 定位（中风险）
- 新增：`mvp/services/whatsapp-dom-service.js`
- 将 `content.js` 中“找 main/footer/输入框/消息列表”等逻辑集中到此 service。

验证点：
- 翻译按钮仍出现；输入框翻译仍可用；聊天切换仍正常。

### 阶段 3：拆分翻译功能 Presenter（中风险）
- 新增：`mvp/presenters/translation-presenter.js`
- 新增：`mvp/views/translation-view.js`（按钮、toast、结果容器等）
- `content.js`/`content-orchestrator` 只负责调用 `TranslationPresenter.init()`。

验证点：
- 单条翻译、全部翻译、自动翻译（如有）工作正常。

### 阶段 4：拆分 AI 分析 Presenter（中风险）
- 新增：`mvp/presenters/analysis-presenter.js`
- 新增：`mvp/views/analysis-view.js`

验证点：
- AI 分析按钮出现；能抓到消息并展示结果。

### 阶段 5：重构 quick-chat（低~中风险）
- 新增：`mvp/presenters/quick-chat-presenter.js`
- 新增：`mvp/views/quick-chat-view.js`
- 移除 `quick-chat.js` 对 `initialize()` 的依赖，改为由 orchestrator 显式启动。

验证点：
- 快速对话按钮注入、弹窗、跳转逻辑正常。

### 阶段 6：content.js 变薄 + 兼容桥接（收尾）
- `content.js` 最终仅保留：
  - 兼容旧的 `window.initialize()`（内部转调 `WAAP.presenters.ContentOrchestrator.init()`）
  - 最小启动逻辑

验证点：
- 全功能回归检查全部通过。

---

## 6. 自测清单（每次改动后都跑一遍）

- 打开 WhatsApp Web：
  - 能看到更新说明（自动/手动）
  - 能看到引导卡片（未进入聊天时）
  - 进入任意聊天后：翻译按钮/分析按钮/输入框翻译入口正常
- popup：
  - 状态检测正常（未进入聊天提示、进入后显示“已加载”）
  - “查看更新说明”按钮可用
- 翻译：
  - Google 翻译
  - 其它翻译服务（DeepSeek/百度/硅基流动等）
  - 错误提示仍可用
- 输入框翻译：
  - 正常翻译替换
  - 快捷翻译发送（如已启用）
- 天气：
  - 天气模块仍可初始化（不报错）

---

## 7. 回滚方案（最重要）

- 回滚只需要：
  - `manifest.json` 移除新增 `mvp/*` 脚本（或把旧 `content.js` 放回原逻辑）
  - `content.js` 恢复迁移前代码块

我会在每个阶段尽量保持“可回退”的小改动，避免一次性大迁移。
