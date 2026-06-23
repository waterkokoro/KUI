<p align="center">
  <img src="./src/assets/kui/kui_def.png" alt="KUI" width="140">
</p>

<h1 align="center">KUI</h1>

<p align="center">
  <em>💬 笔记式 AI 对话 Client —— AI chat client like a notebook</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/waterkokoro/KUI/releases"><img src="https://img.shields.io/badge/version-0.2.1-blue" alt="Version"></a>
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

### 基础界面

<p align="center">
  <img src="./pics/kui_n1.png" alt="KUI 主界面" width="700">
  <br>
  <em>主界面 — 树形目录与欢迎页</em>
</p>

<p align="center">
  <img src="./pics/kui_n4.png" alt="对话界面" width="340">
  &nbsp;&nbsp;
  <img src="./pics/kui_n2.png" alt="图视图" width="340">
  <br>
  <em>对话界面 &nbsp;/&nbsp; 图视图 — 知识图谱</em>
</p>

<p align="center">
  <img src="./pics/kui_n3.png" alt="助手管理" width="340">
  &nbsp;&nbsp;
  <img src="./pics/模式.png" alt="对话模式" width="340">
  <br>
  <em>助手管理 &nbsp;/&nbsp; 对话模式切换</em>
</p>

### 交互对话

<p align="center">
  <img src="./pics/交互式对话-ai卡片回答展示.png" alt="AI 卡片回答" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai让我选.png" alt="AI 选择卡片" width="225">
  &nbsp;
  <img src="./pics/交互式对话-股票信息查询.png" alt="股票查询" width="225">
  <br>
  <em>信息卡片 &nbsp;/&nbsp; 选择卡片 &nbsp;/&nbsp; 实时数据查询</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-ai演示三角函数动画.png" alt="三角函数动画" width="340">
  &nbsp;&nbsp;
  <img src="./pics/交互式对话-ai演示线性代数.png" alt="线性代数" width="340">
  <br>
  <em>数学可视化 — 三角函数动画 &nbsp;/&nbsp; 线性代数</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-ai演示二叉树遍历1.png" alt="二叉树默认" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai演示二叉树遍历2-放大.png" alt="二叉树放大" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai演示二叉树遍历3-全屏.png" alt="二叉树全屏" width="225">
  <br>
  <em>二叉树遍历 — 默认 &nbsp;/&nbsp; 放大 &nbsp;/&nbsp; 全屏三态视图</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-小游戏.png" alt="小游戏" width="340">
  &nbsp;&nbsp;
  <img src="./pics/交互式对话-给一个抽奖能力.png" alt="抽奖" width="340">
  <br>
  <em>自定义 HTML 应用 — 小游戏 &nbsp;/&nbsp; 抽奖</em>
</p>

### 讲解对比：KUI vs 豆包

<p align="center">
  <strong>「讲解消融实验」同一问题，不同产品回答效果对比</strong>
  <br><br>
  <img src="./pics/豆包截图-讲解消融实验.png" alt="豆包" width="340">
  &nbsp;&nbsp;
  <img src="./pics/KUI-讲解消融实验-回答页.png" alt="KUI" width="340">
  <br>
  <em>左：豆包 &nbsp;|&nbsp; 右：KUI</em>
  <br><br>
  <img src="./pics/KUI-讲解消融实验-放大回答.png" alt="KUI 放大查看" width="500">
  <br>
  <em>KUI — 放大查看完整回答</em>
</p>

---

## 📋 更新日志

### v0.2.1

- 🐛 **修复**：pages 类型交互组件在禁用态下不再错误显示「已提交」徽章

> 📜 历史版本更新记录请查看 [HISTORY.md](./HISTORY.md)

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
