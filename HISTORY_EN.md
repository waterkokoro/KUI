# KUI Changelog History

## v0.2.1

- 🐛 **Fix**: Pages-type interactive components no longer show a false "Submitted" badge in disabled state

## v0.2.0

- 🚀 **Onboarding Wizard**: New 5-step setup guide for quick model provider, AI agent, and profile configuration
- 🔄 **Auto-Updater**: Built-in update checker with auto-detection on startup and one-click download & install
- 🔁 **Regenerate Responses**: Re-generate AI replies by deleting old responses and re-running
- ⏹️ **Stop Generation**: Stop streaming output at any time during generation
- 🌐 **Concurrent Multi-Topic Streaming**: Refactored streaming architecture with per-topic isolated state, supporting simultaneous multi-topic generation
- 🍎 **macOS Signing & Notarization**: CI/CD integrated with Apple code signing and notarization for ready-to-run downloads
- 🐛 **Stability Fixes**: Fixed interactive component state persistence, race conditions, cascade deletion, and more
- 🔧 **Unified Dev Port**: Development server port unified to 10101

## v0.1.9

- 📝 **Documentation**: Restructured README with comprehensive interactive conversation and web search feature descriptions and preview screenshots

## v0.1.8

- 🎨 **Interactive Conversation Mode**: AI can render rich interactive UI components instead of plain text output
- 🧩 **9 Component Types**: Selection cards, forms, buttons, info cards, short answer, charts, translation pairs, custom HTML, and multi-page containers
- 🖼️ **Expand & Fullscreen**: Interactive components support modal expansion and fullscreen preview for immersive viewing
- 🔧 **Custom HTML Components**: AI can generate complete HTML+CSS+JS mini-apps running safely in sandboxed iframes (calculators, quizzes, visualizations, etc.)
- 📊 **Chart Visualization**: Built-in bar, line, and pie charts — AI can render data charts directly
- 🔄 **Interaction Feedback Loop**: User interaction results are automatically sent back to AI, driving the next conversational step

## v0.1.7

- 🌐 **Web Search**: Enable web search in chat, AI automatically retrieves web pages and cites sources
- 🔍 **Multiple Search Providers**: Support for Tavily, Serper (Google), Brave Search, AnySearch Free with priority-based auto-fallback
- 🛠️ **Enhanced Tool Calling**: Full function calling support for OpenAI-compatible APIs, including in thinking mode
- 📎 **Reference Display**: Search results shown in a collapsible reference list with clickable source links
- 🎨 **UI Improvements**: Chevron-style collapse arrows for reasoning blocks, pulse animation indicator for search-in-progress
- 🐛 **Fix**: Improved OpenAI streaming stability in multi-step tool call scenarios

## v0.1.6

- 📝 **Topic Types**: Added topic type categorization
- 🗺️ **Graph View Improvements**: Enhanced knowledge graph visualization experience

## v0.1.4

- 🎨 **UI Redesign**: Removed top bar, adopted IM-style chat window layout
- 😊 **Emoji Style**: Improved emoji icon rendering
- 👤 **Avatar Support**: Added user and agent avatar support

## v0.1.3

- 📖 **Documentation**: Improved README and project documentation

## v0.1.2

- 🌻 **KUI Emojis**: Added custom KUI emoji icons
- 🎨 **App Logo**: Improved application icon design

## v0.1.1

- 🔧 **Core Improvements**: Version management and foundational feature refinements

## v0.0.1

- 🎉 **Initial Release**: Notebook-style AI chat client
- 🌳 **Tree Directory**: Unlimited nesting Topic tree for knowledge organization
- 💬 **Conversation Derivation**: Derive sub-topics from messages for deeper exploration
- 📝 **Markdown Export**: Conversations auto-saved as `.md` files
- 🤖 **Custom Agents**: Create multiple AI agents with custom personas and models
