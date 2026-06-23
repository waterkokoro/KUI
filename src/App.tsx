import React, { useEffect } from "react";
import { App as AntdApp, ConfigProvider, theme as antdTheme, Spin } from "antd";
import { Group, Panel, Separator } from "react-resizable-panels";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useAppStore } from "./stores/appStore";
import { TopicTreePanel } from "./features/topics/TopicTreePanel";
import { ChatView } from "./features/chat/ChatView";
import { GraphView } from "./features/graph/GraphView";
import { SettingsView } from "./features/settings/SettingsView";
import { OnboardingView } from "./features/onboarding/OnboardingView";
import { UpdateChecker } from "./components/UpdateChecker";
import { setSetting } from "./db/repos/settings";
import { bootstrap } from "./app/init";

// ── Top-level ErrorBoundary ──
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 32,
          background: "#16181d", color: "#e6e6e6", fontFamily: "monospace",
        }}>
          <h2 style={{ color: "#ff4d4f", marginBottom: 16 }}>Something went wrong</h2>
          <pre style={{
            maxWidth: 600, maxHeight: 300, overflow: "auto", padding: 16,
            background: "#1c1f26", borderRadius: 8, fontSize: 13, whiteSpace: "pre-wrap",
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20, padding: "8px 24px", background: "#1677ff",
              color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
              fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


export default function App() {
  const { ready, settings, view, currentTopicId, currentProfileId, chatFullscreen, showOnboarding } = useAppStore();

  useEffect(() => {
    void bootstrap();
  }, []);

  // sync data-theme onto <html> so fallback colors apply before AntD cssVars load
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // persist last_topic_id when changes
  useEffect(() => {
    if (!ready) return;
    void setSetting("last_topic_id", currentTopicId);
  }, [currentTopicId, ready]);

  // persist last_profile_id when changes
  useEffect(() => {
    if (!ready) return;
    void setSetting("last_profile_id", currentProfileId);
  }, [currentProfileId, ready]);

  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <ConfigProvider
        locale={settings.language === "zh-CN" ? zhCN : enUS}
        theme={{
          algorithm: settings.theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: { borderRadius: 8 },
          cssVar: true,
        }}
      >
        <AntdApp style={{ height: "100%" }}>
          {/* Auto-updater: checks for new versions on startup */}
          <UpdateChecker />
          <div className="kui-shell" data-theme={settings.theme}>
            {/* Onboarding overlay */}
            {showOnboarding && (
              <div className="kui-onboarding-overlay">
                <OnboardingView />
              </div>
            )}

            <Group orientation="horizontal" id="kui-layout" className="kui-shell-body">
              <Panel id="sidebar" defaultSize="20%" minSize="12%" maxSize="40%" className="kui-sidebar-panel">
                <TopicTreePanel />
              </Panel>
              <Separator className="kui-resize-handle" />
              <Panel id="main" minSize="40%" className="kui-main">
                {view === "chat" && !chatFullscreen && <ChatView />}
                {view === "graph" && <GraphView />}
                {view === "settings" && <SettingsView />}
              </Panel>
            </Group>

            {/* Fullscreen chat overlay */}
            {chatFullscreen && view === "chat" && (
              <div className="kui-chat-fullscreen">
                <ChatView />
              </div>
            )}
          </div>
        </AntdApp>
      </ConfigProvider>
    </AppErrorBoundary>
  );
}
