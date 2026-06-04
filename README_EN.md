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
  <a href="https://github.com/waterkokoro/KUI/releases"><img src="https://img.shields.io/badge/version-0.1.3-blue" alt="Version"></a>
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

**KUI** is a notebook-style AI chat client that seamlessly integrates AI conversations with knowledge management. Organize your conversations like a notebook, manage knowledge structures with a tree directory, visualize knowledge connections with a graph view, and let AI become your thinking partner.

### Highlights

- 🚀 **Lightweight & Fast** — Built with Tauri 2 + React 19 + TypeScript, native performance with minimal resource usage
- 🌳 **Tree-based Knowledge Management** — Hierarchical Topic directory with unlimited nesting, drag-and-drop sorting, and emoji icons
- 🤖 **Multi-model Support** — Compatible with OpenAI API and Anthropic Claude, freely configure multiple Providers
- 🛠️ **Smart Agent Tools** — AI can proactively search notes, tag topics, generate summaries, and recall context
- 🗺️ **Graph View** — Visualize hierarchical and manual relationships between Topics
- 📝 **Markdown Persistence** — Each Topic auto-generates a Markdown file, editable with external editors
- 🌙 **Dark & Light Themes** — One-click theme switching
- 🌐 **Bilingual** — Full i18n support (简体中文 / English)
- 🔧 **Cross-platform** — Windows, macOS, and Linux

---

## 📸 Preview

<p align="center">
  <img src="./pics/kui-use.png" alt="KUI Interface" width="700">
  <br><br>
  <img src="./pics/kui-cav.png" alt="KUI Graph View" width="700">
</p>

---

## ✨ Features

### 💬 Chat System

| Feature | Description |
|---------|-------------|
| Multi-turn Streaming | Context-aware multi-turn AI conversations with token-by-token streaming |
| Model Switching | Each Topic can independently specify its Agent and model |
| Conversation Derivation | Derive sub-Topics from any message with automatic context compression |
| Message Actions | Copy or delete individual messages |
| Stop Generation | Abort AI output at any time |

### 🌳 Knowledge Management

| Feature | Description |
|---------|-------------|
| Tree Topic Directory | Unlimited nesting levels, drag-and-drop sorting |
| Emoji Icons | 32 presets + custom emoji as Topic icons |
| Full-text Search | Regex/text search across all notes with instant results |
| Tag System | Tag Topics for categorized management |
| Auto Summary | AI-generated Topic summaries with regeneration support |
| Markdown Files | Each Topic persisted as `.md` file, externally editable |

### 🤖 Smart Agents

| Feature | Description |
|---------|-------------|
| Custom Agents | Create multiple Agents with different personas/system prompts |
| Built-in Tools | `search_notes` full-text search, `get_topic_tree` directory access, `recall_context` context recall, `tag_topic` tagging, `save_topic_summary` summary management |
| Multi-step Reasoning | Up to 6 tool calls per request |
| Default Model Binding | Agents can bind a default model for out-of-the-box usage |

### 🗺️ Graph View

| Feature | Description |
|---------|-------------|
| Knowledge Graph | Visualize hierarchical relationships of all Topics |
| Manual Links | Drag to create manual connections (dashed lines) between Topics with notes |
| Layout Toggle | Switch between vertical and horizontal layouts |
| Interactions | Zoom, pan, and minimap navigation |

### ⚙️ Settings & Configuration

| Feature | Description |
|---------|-------------|
| Provider Management | Add multiple AI providers (OpenAI-compatible / Anthropic) |
| Model Management | Add multiple models under each Provider |
| Startup Behavior | Reopen last Topic or show welcome page |
| Appearance | Dark / Light theme |
| Language | 简体中文 / English |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri 2](https://tauri.app/) + [React 19](https://react.dev/) |
| Language | TypeScript 5.8 + Rust |
| Build | Vite 7 |
| UI Components | Ant Design 5 |
| State Management | Zustand 5 |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`) |
| Graph Visualization | ReactFlow 11 |
| Markdown | Mermaid 11 + @uiw/react-md-editor |
| Database | SQLite (via tauri-plugin-sql) |
| Internationalization | i18next + react-i18next |

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

Since the app is not notarized by Apple, macOS may show "KUI is damaged and can't be opened". Use any of the following methods to resolve:

**Method 1: Remove quarantine attribute in Terminal (Recommended)**

```bash
xattr -cr /Applications/KUI.app
```

**Method 2: Right-click to open**

Find KUI.app in Finder → Hold `Control` and click (or right-click) → Select "Open" → Click "Open" in the dialog.

**Method 3: Temporarily allow apps from anywhere**

```bash
# Enable
sudo spctl --master-disable
# Disable after installation (recommended)
sudo spctl --master-enable
```

---

## 📁 Project Structure

```
src/
├── app/            # App initialization & i18n config
├── assets/         # Static assets (logo, mascot emojis)
├── components/     # Shared components (Markdown renderer)
├── db/repos/       # Database layer (topics, messages, agents, providers...)
├── features/
│   ├── agent/      # AI Agent runtime & tools
│   ├── chat/       # Chat interface & topic derivation
│   ├── graph/      # Graph view (ReactFlow)
│   ├── settings/   # Settings panel (general/models/agents/appearance/language)
│   └── topics/     # Topic tree panel & tree building
├── fs/             # Markdown file I/O
├── ipc/            # Tauri IPC command wrappers
├── locales/        # i18n translation files (zh-CN / en-US)
├── stores/         # Zustand global state
└── types.ts        # Core type definitions

src-tauri/
├── migrations/     # SQLite migration scripts
└── src/            # Rust backend (file ops & full-text search)
```

---

## 📄 License

[MIT](LICENSE) © waterkokoro
