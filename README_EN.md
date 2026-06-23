<p align="center">
  <img src="./src/assets/kui/kui_def.png" alt="KUI" width="140">
</p>

<h1 align="center">KUI</h1>

<p align="center">
  <em>💬 AI Chat Client Like a Notebook</em>
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
  <a href="./README.md">简体中文</a> | <strong>English</strong>
</p>

---

## 📖 Introduction

**KUI** is a notebook-style AI chat client. Organize your AI conversations like a notebook, build knowledge structures with a tree directory, derive sub-topics from conversations to explore deeper, and automatically persist every conversation as a Markdown file.

---

## 📸 Preview

### Core Interface

<p align="center">
  <img src="./pics/kui_n1.png" alt="KUI Main" width="700">
  <br>
  <em>Main Interface — Topic Tree & Welcome Page</em>
</p>

<p align="center">
  <img src="./pics/kui_n4.png" alt="Chat View" width="340">
  &nbsp;&nbsp;
  <img src="./pics/kui_n2.png" alt="Graph View" width="340">
  <br>
  <em>Chat View &nbsp;/&nbsp; Graph View — Knowledge Graph</em>
</p>

<p align="center">
  <img src="./pics/kui_n3.png" alt="Agent Management" width="340">
  &nbsp;&nbsp;
  <img src="./pics/模式.png" alt="Chat Modes" width="340">
  <br>
  <em>Agent Management &nbsp;/&nbsp; Chat Mode Switching</em>
</p>

### Interactive Conversation

<p align="center">
  <img src="./pics/交互式对话-ai卡片回答展示.png" alt="AI Info Card" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai让我选.png" alt="Selection Cards" width="225">
  &nbsp;
  <img src="./pics/交互式对话-股票信息查询.png" alt="Stock Query" width="225">
  <br>
  <em>Info Card &nbsp;/&nbsp; Selection Cards &nbsp;/&nbsp; Live Data Query</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-ai演示三角函数动画.png" alt="Trigonometry" width="340">
  &nbsp;&nbsp;
  <img src="./pics/交互式对话-ai演示线性代数.png" alt="Linear Algebra" width="340">
  <br>
  <em>Math Visualization — Trigonometry Animation &nbsp;/&nbsp; Linear Algebra</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-ai演示二叉树遍历1.png" alt="Tree Default" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai演示二叉树遍历2-放大.png" alt="Tree Zoomed" width="225">
  &nbsp;
  <img src="./pics/交互式对话-ai演示二叉树遍历3-全屏.png" alt="Tree Fullscreen" width="225">
  <br>
  <em>Binary Tree Traversal — Default &nbsp;/&nbsp; Zoomed &nbsp;/&nbsp; Fullscreen Views</em>
</p>

<p align="center">
  <img src="./pics/交互式对话-小游戏.png" alt="Mini Game" width="340">
  &nbsp;&nbsp;
  <img src="./pics/交互式对话-给一个抽奖能力.png" alt="Lottery" width="340">
  <br>
  <em>Custom HTML Apps — Mini Game &nbsp;/&nbsp; Lottery</em>
</p>

### Ablation Study Comparison: KUI vs Doubao

<p align="center">
  <strong>Same question "Explain Ablation Study" — comparing response quality</strong>
  <br><br>
  <img src="./pics/豆包截图-讲解消融实验.png" alt="Doubao" width="340">
  &nbsp;&nbsp;
  <img src="./pics/KUI-讲解消融实验-回答页.png" alt="KUI" width="340">
  <br>
  <em>Left: Doubao &nbsp;|&nbsp; Right: KUI</em>
  <br><br>
  <img src="./pics/KUI-讲解消融实验-放大回答.png" alt="KUI Zoomed" width="500">
  <br>
  <em>KUI — Zoomed Full Response View</em>
</p>

---

## 📋 Changelog

### v0.2.1

- 🐛 **Fix**: Pages-type interactive components no longer show a false "Submitted" badge in disabled state

> 📜 For previous version changelogs, see [HISTORY_EN.md](./HISTORY_EN.md)

---

## ✨ Key Features

### 🎨 Interactive Conversation

- AI can render 9 types of rich interactive UI components, replacing plain text output with visual components
- **Selection cards** (single/multi-select), **forms** (input, textarea, dropdown, checkbox, number, date), **action buttons**
- **Info cards** (Markdown content display), **short answer** (text input Q&A)
- **Charts** (bar / line / pie), **translation pairs** (bilingual vocabulary cards)
- **Custom HTML**: AI generates complete HTML+CSS+JS mini-apps running safely in sandboxed iframes (calculators, quizzes, data visualizations, etc.)
- **Pages container**: Combine multiple component types into a paginated, comprehensive response
- All interactive components support modal expansion and fullscreen viewing for immersive presentation
- User interaction results are automatically fed back to AI, driving multi-turn interactive conversation flows

### 🌳 Tree Directory Management

- Unlimited nesting levels for Topics, organize knowledge like a file system
- Custom Emoji icons for each Topic to quickly identify content types
- Full-text search and filtering across all topics in real-time
- Right-click menu: new child topic, rename, set icon, promote to root, open in graph, delete

### 💬 Conversation Derivation & Sub-Topics

- Derive sub-Topics from any message in a conversation, exploring layer by layer
- Automatically compress parent conversation into a summary as context for the child topic
- Child topics inherit parent's agent and model configuration

### 🔭 Locate in Tree

- One-click locate current topic's position in the directory tree
- Auto-expand ancestor nodes with smooth scroll to target
- Quickly find your current session in deeply nested trees

### 🌐 Web Search

- One-click web search in conversations, AI retrieves real-time web information automatically
- 4 search providers: Tavily (AI search), Serper (Google), Brave Search, AnySearch Free
- Auto mode tries configured providers by priority, falls back to free provider on failure
- Search results displayed as collapsible reference list for easy source verification

### 🤖 Custom Agents

- Create multiple AI agents with different personas and system prompts
- Customize avatar for each agent (text or image)
- Bind default model to agents, switch agents on-the-fly during chat
- Built-in tools: search notes, get topic tree, recall context, tag topics, manage summaries

### 📝 Markdown Export & Persistence

- Every Topic's conversation is automatically saved as a `.md` file
- One-click open source file in external editor
- AI agents can search all Markdown content for cross-topic knowledge recall

### 🗺️ Graph View

- Visualize hierarchical relationships of all Topics
- Drag to create manual links (dashed lines) with notes
- Vertical / horizontal layout toggle, minimap navigation

### 👤 Multi-Profile & Avatars

- Create multiple work profiles with fully isolated topic sets
- Personalized user avatars (text / image)
- Quick profile switching in sidebar for work/study/life separation

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri 2](https://tauri.app/) + [React 19](https://react.dev/) |
| Language | TypeScript 5.8 + Rust |
| Build | Vite 7 |
| UI | Ant Design 5 |
| State | Zustand 5 |
| AI | Vercel AI SDK (OpenAI / Anthropic) |
| Graph | ReactFlow 11 |
| Database | SQLite (tauri-plugin-sql) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **Rust** (required for Tauri backend compilation)
- **Package Manager**: npm / yarn / pnpm

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/waterkokoro/KUI.git
cd KUI

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Production build
npm run tauri build
```

### ⚠️ macOS Installation Note

Since the app is not notarized by Apple, macOS may show "KUI is damaged and can't be opened". Fix:

```bash
xattr -cr /Applications/KUI.app
```

Or right-click KUI.app → select "Open" → confirm in the dialog.

---

## 📄 License

[MIT](LICENSE) © waterkokoro
