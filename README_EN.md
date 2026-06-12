<p align="center">
  <img src="./src/assets/kui/kui_def.png" alt="KUI" width="140">
  <br>
  <strong style="font-size: 1.5em;">KUI</strong>
</p>

<h1 align="center">KUI</h1>

<p align="center">
  <em>💬 AI Chat Client Like a Notebook</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/waterkokoro/KUI/releases"><img src="https://img.shields.io/badge/version-0.1.7-blue" alt="Version"></a>
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

<p align="center">
  <img src="./pics/kui_n1.png" alt="KUI Main Interface - Topic Tree & Welcome" width="700">
  <br><br>
  <img src="./pics/kui_n4.png" alt="KUI Chat & Context Menu" width="700">
  <br><br>
  <img src="./pics/kui_n2.png" alt="KUI Graph View - Knowledge Graph" width="700">
  <br><br>
  <img src="./pics/kui_n3.png" alt="KUI Agent Management" width="700">
</p>

---

## 📋 Changelog

### v0.1.7

- 🌐 **Web Search**: Enable web search in chat, AI automatically retrieves web pages and cites sources
- 🔍 **Multiple Search Providers**: Support for Tavily, Serper (Google), Brave Search, AnySearch Free with priority-based auto-fallback
- 🛠️ **Enhanced Tool Calling**: Full function calling support for OpenAI-compatible APIs, including in thinking mode
- 📎 **Reference Display**: Search results shown in a collapsible reference list with clickable source links
- 🎨 **UI Improvements**: Chevron-style collapse arrows for reasoning blocks, pulse animation indicator for search-in-progress
- 🐛 **Fix**: Improved OpenAI streaming stability in multi-step tool call scenarios

---

## ✨ Key Features

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
