<div align="center">

# WhatsApp Assistant Pro+

<img src="images/icon.svg" width="128" height="128" alt="WhatsApp Assistant Pro+ Logo">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-V3.2.0-green.svg)](https://github.com/Achordchan/WA-AI-chrome/releases)
![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/pending)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Achordchan/WA-AI-chrome/pulls)

🌍 一个功能强大的 WhatsApp 网页版 AI 助手，集成实时翻译、对话分析、智能号码识别、天气信息等多项功能

[English](./README_EN.md) | 简体中文

</div>

## ✨ 核心特性

### 版本 V3.2.0 (最新版本)
- 语音消息转写：设置中开启并填写 API 信息后，语音气泡新增“听”按钮，一键转写语音内容
- STT 获取方式：需自行获取语音转写服务，建议使用智谱 AI
- 修复部分场景下信息提示不消失导致布局异常的问题
- 修复语音翻译 Token 数显示为 N/A 的问题
- 天气/时间显示可自定义：可单独开启/关闭天气与当地时间显示
- 号码获取更稳定：优先从标题/聊天内容识别，必要时自动使用“联系人信息侧栏”兜底获取真实号码
- 防误判 + 缓存：避免把 WhatsApp 内部 ID 误当手机号，成功获取后会缓存，减少重复弹出与干扰

### 🤖 AI 功能
- 🎯 **实时消息翻译** - 支持多种语言互译
- 🤖 **AI 对话分析** - 智能分析对话内容和情感
- 💬 **输入框实时翻译** - 边输入边翻译
- 🔄 **多引擎支持** - DeepSeek、通义千问、火山翻译等

### 🎨 用户体验
- 🎨 **现代化界面** - 优雅简洁的 UI 设计
- ⚡ **高性能** - 低延迟，快速响应
- 🌐 **国际化支持** - 多语言界面
- 📱 **跨平台兼容** - 适配各种设备

## 🚀 快速开始

### 📦 安装方式

#### 方式一：Chrome 网上应用店（推荐）
1. 访问 [Chrome 网上应用店](https://chrome.google.com/webstore/pending)
2. 搜索 "WhatsApp Assistant Pro+"
3. 点击"添加至 Chrome"

#### 方式二：开发者模式安装
1. 下载最新 [Release](https://github.com/Achordchan/WA-AI-chrome/releases)
2. 解压到本地文件夹
3. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压的文件夹

### 🎯 使用步骤
1. 安装完成后，访问 [WhatsApp Web](https://web.whatsapp.com/)
2. 在扩展弹窗中配置 API Key（可选，部分功能需要）
3. 选择聊天对象，即可看到号码归属地、天气、时间等信息
4. 开始使用翻译和 AI 分析功能

## 🛠️ 支持的服务

### 🌐 翻译服务
- [DeepSeek AI](https://deepseek.com/) - 高质量 AI 翻译
- [通义千问](https://tongyi.aliyun.com/) - 阿里云 AI 翻译
- [火山翻译](https://translate.volcengine.com/) - 字节跳动翻译引擎
- [Google 翻译](https://translate.google.com/) - 免费翻译服务
- [百度翻译](https://fanyi.baidu.com/) - 百度翻译 API

### 🌤️ 天气服务
- 内置天气 API - 提供实时天气信息
- 自动定位 - 基于手机号码归属地获取天气

### 📍 地理服务
- 手机号码归属地识别
- 时区自动计算
- 国家/地区信息显示

## 📸 功能预览

<div align="center">

### 🌍 智能号码识别 & 天气信息
<img src="screenshots/phone-weather-preview.png" width="600" alt="号码识别和天气信息">

### 🤖 AI 翻译 & 对话分析  
<img src="screenshots/translation-preview.png" width="600" alt="翻译功能">

### ⚙️ 设置面板
<img src="screenshots/settings-preview.png" width="600" alt="设置面板">

</div>

> 💡 **提示**: 如果图片无法显示，请查看 [screenshots](./screenshots/) 文件夹中的完整截图

## 🔑 API 配置

### 🆓 免费功能（无需配置）
- 智能号码识别
- 实时天气信息
- 当地时间显示
- Google 翻译
- 百度翻译

### 🚀 高级功能（需要 API Key）
在扩展设置中配置以下 API 以使用高级功能：

| 服务商 | API Key | 功能 | 获取地址 |
|--------|---------|------|----------|
| DeepSeek | `sk-xxx` | AI 翻译 & 对话分析 | [获取 API Key](https://deepseek.com/) |
| 通义千问 | `sk-xxx` | AI 翻译 & 智能分析 | [获取 API Key](https://tongyi.aliyun.com/) |
| 火山翻译 | `xxx` | 专业翻译服务 | [获取 API Key](https://translate.volcengine.com/) |

### ⚙️ 配置步骤
1. 点击 Chrome 工具栏中的扩展图标
2. 在弹出的设置面板中输入相应的 API Key
3. 保存设置后即可使用高级功能

## 📊 项目统计

![GitHub stars](https://img.shields.io/github/stars/Achordchan/WA-AI-chrome?style=social)
![GitHub forks](https://img.shields.io/github/forks/Achordchan/WA-AI-chrome?style=social)
![GitHub issues](https://img.shields.io/github/issues/Achordchan/WA-AI-chrome)
![GitHub last commit](https://img.shields.io/github/last-commit/Achordchan/WA-AI-chrome)

## 🤝 贡献指南

我们欢迎各种形式的贡献！无论是 Bug 报告、功能建议还是代码贡献。

### 🐛 报告 Bug
- 使用 [Issue 模板](https://github.com/Achordchan/WA-AI-chrome/issues/new?template=bug_report.md)
- 提供详细的复现步骤
- 包含浏览器版本和扩展版本信息

### 💡 功能建议
- 使用 [功能请求模板](https://github.com/Achordchan/WA-AI-chrome/issues/new?template=feature_request.md)
- 详细描述期望的功能
- 说明使用场景和价值

### 🔧 代码贡献
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 遵循代码规范，添加必要的注释
4. 提交修改 (`git commit -m 'Add some AmazingFeature'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 创建 Pull Request

### 📋 开发规范
- 使用 ESLint 进行代码检查
- 遵循 [JavaScript Standard Style](https://standardjs.com/)
- 为新功能添加适当的注释
- 测试新功能的兼容性

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Achordchan">
        <img src="https://avatars.githubusercontent.com/u/179492542?v=4" width="100px;" alt="Achord"/>
        <br />
        <sub><b>Achord</b></sub>
      </a>
    </td>
  </tr>
</table>

## 📈 更新日志

### 版本 V3.2.0 (最新版本)
- 语音消息转写：设置中开启并填写 API 信息后，语音气泡新增“听”按钮，一键转写语音内容
- STT 获取方式：需自行获取语音转写服务，建议使用智谱 AI
- 修复部分场景下信息提示不消失导致布局异常的问题
- 修复语音翻译 Token 数显示为 N/A 的问题
- 天气/时间显示可自定义：可单独开启/关闭天气与当地时间显示
- 号码获取更稳定：优先从标题/聊天内容识别，必要时自动使用“联系人信息侧栏”兜底获取真实号码
- 防误判 + 缓存：避免把 WhatsApp 内部 ID 误当手机号，成功获取后会缓存，减少重复弹出与干扰

### 版本 V3.1
- 输入框快捷翻译发送：回车先翻译，再回车发送
- 目标语言按联系人保存：不同聊天可使用不同目标语言
- 输入框为空时可快速设置目标语言并保存
- OpenAI 通用接口翻译提示词增强，支持更多目标语言
- 修复 AI 分析抓取消息为 0 条的问题
- 设置面板体验优化（防误触关闭、管理员预设一键填充）

[查看完整更新日志](./CHANGELOG.md)

## 🆘 常见问题

<details>
<summary><strong>Q: 为什么看不到号码归属地信息？</strong></summary>

A: 请确保：
1. 对方使用的是手机号码（非固定电话）
2. 号码格式正确（包含国家代码）
3. 扩展已正确加载
</details>

<details>
<summary><strong>Q: 天气信息不准确怎么办？</strong></summary>

A: 天气信息基于号码归属地获取，可能存在以下情况：
1. 归属地与实际位置不符
2. 天气数据更新延迟
3. 可以手动刷新页面更新信息
</details>

<details>
<summary><strong>Q: 如何获取 API Key？</strong></summary>

A: 
1. **DeepSeek**: 访问 [deepseek.com](https://deepseek.com) 注册账号
2. **通义千问**: 访问 [tongyi.aliyun.com](https://tongyi.aliyun.com) 申请
3. **火山翻译**: 访问 [translate.volcengine.com](https://translate.volcengine.com) 开通服务
</details>

## 📮 联系方式

- 📧 **Email**: [achordchan@gmail.com](mailto:achordchan@gmail.com)
- 📱 **Tel**: 13160235855
- 💬 **微信**: 同手机号
- 🐙 **GitHub**: [@Achordchan](https://github.com/Achordchan)

## 🌟 支持项目

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目点个星标
- 🔄 分享给朋友
- 🐛 报告 Bug 或提出建议
- 💝 [赞助开发](https://github.com/sponsors/Achordchan)

## 📜 法律信息

- **许可证**: [MIT License](./LICENSE)
- **隐私政策**: [查看详情](./PrivacyPolicy.html)
- **服务条款**: [查看详情](./TERMS.md)

---

<div align="center">

**🎉 感谢使用 WhatsApp Assistant Pro+！**

Made with ❤️ by [Achord](https://github.com/Achordchan)

</div> 
