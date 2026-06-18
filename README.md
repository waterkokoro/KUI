<p align="center">
  <img src="./src/assets/kui/kui_def.png" alt="KUI" width="140">
  <br>
  <strong style="font-size: 1.5em;">KUI</strong>
</p>

<h1 align="center">KUI</h1>

<p align="center">
  <em>💬 笔记式 AI 对话 Client —— AI chat client like a notebook</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/waterkokoro/KUI/releases"><img src="https://img.shields.io/badge/version-0.1.8-blue" alt="Version"></a>
  <a href="https://github.com/waterkokoro/KUI/stargazers"><img src="https://img.shields.io/github/stars/waterkokoro/KUI?style=social" alt="Stars"></a>
  <a href="https://github.com/waterkokoro/KUI/network/members"><img src="https://img.shields.io/github/forks/waterkokoro/KUI?style=social" alt="Forks"></a>
  <a href="https://github.com/waterkokoro/KUI/issues"><img src="https://img.shields.io/github/issues/waterkokoro/KUI" alt="Issues"></a>
  <a href="https://github.com/waterkokoro/KUI/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">
  <strong>简体中文</strong> | <a href="./README_EN.md">English</a>
</p>

---

## 📖 介绍

**KUI** 是一个笔记式的 AI 对话客户端。你可以像整理笔记本一样组织 AI 对话，用树形目录构建知识体系，从对话中派生子话题层层深入，并将每次对话自动持久化为 Markdown 文件。

---

## 📸 预览

<p align="center">
  <img src="./pics/kui_n1.png" alt="KUI 主界面 - 目录树与欢迎页" width="700">
  <br><br>
  <img src="./pics/kui_n4.png" alt="KUI 对话与右键菜单" width="700">
  <br><br>
  <img src="./pics/kui_n2.png" alt="KUI 图视图 - 知识图谱" width="700">
  <br><br>
  <img src="./pics/kui_n3.png" alt="KUI 助手管理" width="700">
</p>

---

## 📋 更新日志

### v0.1.8

- 🎨 **交互对话模式**：AI 可渲染富交互 UI 组件，取代纯文本输出
- 🧩 **9 种组件类型**：选择卡片（selection）、表单（form）、按钮（buttons）、信息卡（card）、简答题（short_answer）、图表（chart）、翻译对照（translation）、自定义 HTML（custom）、多页容器（pages）
- 🖼️ **放大与全屏**：交互组件支持弹窗放大和全屏预览，沉浸式查看复杂内容
- 🔧 **自定义 HTML 组件**：支持 AI 生成完整 HTML+CSS+JS 小应用，在沙盒 iframe 中安全运行（计算器、测验、可视化等）
- 📊 **图表可视化**：内置柱状图、折线图、饼图，AI 可直接渲染数据图表
- 🔄 **交互结果回传**：用户操作结果自动回传给 AI，驱动下一步对话

### v0.1.7

- 🌐 **联网搜索**：对话中可开启联网搜索，AI 自动检索网页并引用来源
- 🔍 **多搜索服务商**：支持 Tavily、Serper（Google）、Brave Search、AnySearch Free，可配置优先级与自动降级
- 🛠️ **Tool Calling 增强**：OpenAI 兼容接口全面支持 function calling，深度思考模式也可调用工具
- 📎 **参考来源展示**：搜索结果以可折叠列表呈现，点击即可跳转原始链接
- 🎨 **UI 优化**：深度思考折叠箭头改为 chevron 风格，搜索中状态增加脉冲动画指示器
- 🐛 **修复**：优化 OpenAI streaming 在 tool call 场景下的多步执行稳定性

---

## ✨ 核心特性

### 🎨 交互对话

- AI 可渲染 9 种富交互 UI 组件，用可视化组件取代纯文本输出
- **选择卡片**（单选/多选）、**表单**（输入框/文本域/下拉/复选/数字/日期）、**操作按钮**
- **信息卡**（Markdown 内容展示）、**简答题**（文本输入问答）
- **图表**（柱状图 / 折线图 / 饼图）、**翻译对照**（双语词汇卡片）
- **自定义 HTML**：AI 生成完整 HTML+CSS+JS 小应用，在沙盒 iframe 中安全运行（计算器、测验、数据可视化等）
- **多页容器**（pages）：将多种组件组合成翻页式综合回答
- 所有交互组件支持弹窗放大和全屏查看，沉浸式呈现复杂内容
- 用户操作结果自动回传给 AI，驱动多轮交互对话流

### 🌳 树形目录管理

- 无限层级嵌套的 Topic 树，像文件系统一样组织你的知识
- 每个 Topic 可设置 Emoji 图标，快速区分内容类型
- 支持全文搜索过滤，跨所有话题实时检索
- 右键菜单支持新建子话题、重命名、设置图标、提升为根话题、在图中查看、删除

### 💬 对话派生与子话题

- 从对话中任意一条消息派生出子 Topic，层层深入探讨
- 派生时自动压缩父话题对话为摘要，作为子话题的背景上下文
- 子话题自动继承父话题的助手和模型配置

### 🔭 定位功能

- 一键定位当前话题在目录树中的位置
- 自动展开祖先节点，平滑滚动到目标位置
- 在深层嵌套树中快速找到当前会话的位置

### 🌐 联网搜索

- 对话中一键开启联网搜索，AI 自动检索实时网页信息
- 支持 4 种搜索服务商：Tavily（AI 搜索）、Serper（Google）、Brave Search、AnySearch Free
- 自动模式下按优先级尝试已配置服务，全部失败时自动降级到免费兜底方案
- 搜索结果以可折叠参考来源列表展示，方便溯源验证

### 🤖 自定义助手

- 创建多个 AI 助手，设置不同人格和系统提示词
- 每个助手可配置专属头像（文字头像或图片）
- 助手可绑定默认模型，对话时可随时切换助手
- 内置工具集：搜索笔记、获取目录树、回溯上下文、打标签、管理摘要

### 📝 Markdown 导出与持久化

- 每个 Topic 的对话自动保存为 `.md` 文件
- 可一键打开源文件，用外部编辑器查看或编辑
- AI 助手可检索所有 Markdown 内容，实现跨话题的知识召回

### 🗺️ 图视图

- 可视化展示所有 Topic 的树形层级关系
- 支持拖拽创建手动关联（虚线），可添加备注
- 纵向 / 横向布局切换，小地图导航

### 👤 多档案与头像

- 支持创建多个工作档案（Profile），各档案话题完全隔离
- 用户可设置个性化头像（文字 / 图片）
- 侧边栏快速切换档案，工作/学习/生活轻松分区

---

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Tauri 2](https://tauri.app/) + [React 19](https://react.dev/) |
| 语言 | TypeScript 5.8 + Rust |
| 构建 | Vite 7 |
| UI | Ant Design 5 |
| 状态 | Zustand 5 |
| AI | Vercel AI SDK（OpenAI / Anthropic） |
| 图可视化 | ReactFlow 11 |
| 数据库 | SQLite（tauri-plugin-sql） |

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18
- **Rust**（Tauri 后端编译需要）
- **包管理器**：npm / yarn / pnpm

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/waterkokoro/KUI.git
cd KUI

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 生产构建
npm run tauri build
```

### ⚠️ macOS 安装提示

由于应用未经过 Apple 公证，macOS 可能会提示「KUI 已损坏，无法打开」。解决方法：

```bash
xattr -cr /Applications/KUI.app
```

或右键点击 KUI.app → 选择「打开」→ 弹窗确认即可。

---

## 📄 License

[MIT](LICENSE) © waterkokoro
