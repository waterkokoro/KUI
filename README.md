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
  <a href="https://github.com/waterkokoro/KUI/releases"><img src="https://img.shields.io/badge/version-0.1.2-blue" alt="Version"></a>
  <a href="https://github.com/waterkokoro/KUI/stargazers"><img src="https://img.shields.io/github/stars/waterkokoro/KUI?style=social" alt="Stars"></a>
  <a href="https://github.com/waterkokoro/KUI/network/members"><img src="https://img.shields.io/github/forks/waterkokoro/KUI?style=social" alt="Forks"></a>
  <a href="https://github.com/waterkokoro/KUI/issues"><img src="https://img.shields.io/github/issues/waterkokoro/KUI" alt="Issues"></a>
  <a href="https://github.com/waterkokoro/KUI/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

---

## 📖 介绍

**KUI** 是一个笔记式的 AI 对话客户端，将 AI 对话与知识管理有机结合。你可以像整理笔记本一样组织对话，用树形目录管理知识结构，用图视图可视化知识关联，让 AI 成为你的思维伙伴。

### 核心亮点

- 🚀 **轻量高效** — 基于 Tauri 2 + React 19 + TypeScript 构建，原生性能，极低资源占用
- 🌳 **树形知识管理** — 层级 Topic 目录，支持无限嵌套子 topic、排序、emoji 图标
- 🤖 **多模型支持** — 兼容 OpenAI API 及 Anthropic Claude，可自由配置多个 Provider
- 🛠️ **智能 Agent 工具** — AI 可主动搜索笔记、打标签、生成摘要、回溯上下文
- 🗺️ **图视图** — 可视化 Topic 之间的层级和手动关联关系
- 📝 **Markdown 持久化** — 每个 Topic 自动生成 Markdown 文件，支持外部编辑器打开
- 🌙 **深浅主题** — 暗色 / 亮色主题一键切换
- 🌐 **中英双语** — 完整的 i18n 支持（简体中文 / English）
- 🔧 **跨平台** — Windows、macOS、Linux 全覆盖

---

## 📸 预览

<p align="center">
  <img src="./pics/kui-use.png" alt="KUI 使用界面" width="700">
  <br><br>
  <img src="./pics/kui-cav.png" alt="KUI 图视图" width="700">
</p>

---

## ✨ 功能特性

### 💬 对话系统

| 功能 | 说明 |
|------|------|
| 多轮流式对话 | 上下文连贯的多轮 AI 对话，逐字流式输出 |
| 多模型切换 | 每个 Topic 可独立指定 Agent 和模型 |
| 对话派生 | 从任意消息处派生子 Topic，自动压缩上下文 |
| 消息操作 | 复制、删除单条消息 |
| 中止生成 | 随时停止 AI 输出 |

### 🌳 知识管理

| 功能 | 说明 |
|------|------|
| 树形 Topic 目录 | 无限层级嵌套，自由拖拽排序 |
| Emoji 图标 | 32 个预设 + 自定义 emoji 作为 Topic 图标 |
| 全文搜索 | 跨所有笔记的正则/文本搜索，秒级响应 |
| 标签系统 | 为 Topic 打标签分类管理 |
| 自动摘要 | AI 自动生成 Topic 汇总，支持重新生成 |
| Markdown 文件 | 每个 Topic 持久化为 `.md` 文件，可外部编辑 |

### 🤖 智能 Agent

| 功能 | 说明 |
|------|------|
| 自定义 Agent | 创建多个 Agent，设置不同人格/系统 prompt |
| 内置工具集 | `search_notes` 全文搜索、`get_topic_tree` 获取目录、`recall_context` 上下文回溯、`tag_topic` 打标签、`save_topic_summary` 摘要管理 |
| 多步推理 | 单次请求最多 6 步工具调用 |
| 默认模型绑定 | Agent 可绑定默认模型，开箱即用 |

### 🗺️ 图视图

| 功能 | 说明 |
|------|------|
| 知识图谱 | 可视化所有 Topic 的层级关系 |
| 手动关联 | 拖拽创建 Topic 之间的手动连线（虚线），支持备注 |
| 布局切换 | 纵向/横向自由切换布局方向 |
| 交互操作 | 缩放、平移、小地图导航 |

### ⚙️ 设置与配置

| 功能 | 说明 |
|------|------|
| Provider 管理 | 添加多个 AI 服务商（OpenAI 兼容 / Anthropic） |
| 模型管理 | 每个 Provider 下添加多个模型 |
| 启动行为 | 打开上次关闭的 topic 或新建引导页 |
| 外观主题 | 暗色 / 亮色 |
| 语言切换 | 简体中文 / English |

---

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Tauri 2](https://tauri.app/) + [React 19](https://react.dev/) |
| 语言 | TypeScript 5.8 + Rust |
| 构建 | Vite 7 |
| UI 组件 | Ant Design 5 |
| 状态管理 | Zustand 5 |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`) |
| 图可视化 | ReactFlow 11 |
| Markdown | Mermaid 11 + @uiw/react-md-editor |
| 数据库 | SQLite（via tauri-plugin-sql） |
| 国际化 | i18next + react-i18next |

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

由于应用未经过 Apple 公证，macOS 可能会提示「KUI 已损坏，无法打开」。请使用以下任一方式解决：

**方式一：终端移除隔离属性（推荐）**

```bash
xattr -cr /Applications/KUI.app
```

**方式二：右键打开**

在 Finder 中找到 KUI.app → 按住 `Control` 点击（或右键）→ 选择「打开」→ 弹窗中再点「打开」。

**方式三：临时允许任何来源**

```bash
# 开启
sudo spctl --master-disable
# 安装完成后建议关闭
sudo spctl --master-enable
```

---

## 📁 项目结构

```
src/
├── app/            # 应用初始化 & i18n 配置
├── assets/         # 静态资源（logo、吉祥物表情包）
├── components/     # 通用组件（Markdown 渲染器）
├── db/repos/       # 数据库操作层（topics, messages, agents, providers...）
├── features/
│   ├── agent/      # AI Agent 运行时 & 工具集
│   ├── chat/       # 对话界面 & 派生子 topic
│   ├── graph/      # 图视图（ReactFlow）
│   ├── settings/   # 设置面板（通用/模型/Agent/外观/语言）
│   └── topics/     # Topic 树形面板 & 树构建
├── fs/             # Markdown 文件读写
├── ipc/            # Tauri IPC 命令封装
├── locales/        # i18n 翻译文件（zh-CN / en-US）
├── stores/         # Zustand 全局状态
└── types.ts        # 核心类型定义

src-tauri/
├── migrations/     # SQLite 迁移脚本
└── src/            # Rust 后端（文件操作 & 全文检索）
```

---

## 📄 License

[MIT](LICENSE) © waterkokoro
