import { useEffect } from "react";
import { App as AntdApp, ConfigProvider, theme as antdTheme, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useAppStore } from "./stores/appStore";
import { TopicTreePanel } from "./features/topics/TopicTreePanel";
import { ChatView } from "./features/chat/ChatView";
import { GraphView } from "./features/graph/GraphView";
import { SettingsView } from "./features/settings/SettingsView";
import { setSetting } from "./db/repos/settings";
import { bootstrap } from "./app/init";
import { Button, Space, Tooltip } from "antd";
import {
  MessageOutlined,
  ApartmentOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

function TopBar() {
  const { t } = useTranslation();
  const { view, setView } = useAppStore();
  return (
    <div className="kui-topbar">
      <span className="kui-topbar-brand">kui</span>
      <Space size={4}>
        <Tooltip title={t("nav.chat")}>
          <Button
            size="small"
            type={view === "chat" ? "primary" : "text"}
            icon={<MessageOutlined />}
            onClick={() => setView("chat")}
          />
        </Tooltip>
        <Tooltip title={t("nav.graph")}>
          <Button
            size="small"
            type={view === "graph" ? "primary" : "text"}
            icon={<ApartmentOutlined />}
            onClick={() => setView("graph")}
          />
        </Tooltip>
      </Space>
      <div style={{ flex: 1 }} />
      <Tooltip title={t("nav.settings")}>
        <Button
          size="small"
          type={view === "settings" ? "primary" : "text"}
          icon={<SettingOutlined />}
          onClick={() => setView("settings")}
        />
      </Tooltip>
    </div>
  );
}

export default function App() {
  const { ready, settings, view, currentTopicId } = useAppStore();

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

  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={settings.language === "zh-CN" ? zhCN : enUS}
      theme={{
        algorithm: settings.theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { borderRadius: 8 },
        cssVar: true,
      }}
    >
      <AntdApp style={{ height: "100%" }}>
        <div className="kui-shell" data-theme={settings.theme}>
          <TopBar />
          <div className="kui-shell-body">
            <TopicTreePanel />
            <div className="kui-main">
              {view === "chat" && <ChatView />}
              {view === "graph" && <GraphView />}
              {view === "settings" && <SettingsView />}
            </div>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}
