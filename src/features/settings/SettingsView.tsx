import { Button, Tabs, App as AntdApp } from "antd";
import { ArrowLeftOutlined, PlayCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { GeneralTab } from "./tabs/GeneralTab";
import { SearchTab } from "./tabs/SearchTab";
import { ProvidersTab } from "./tabs/ProvidersTab";
import { AgentsTab } from "./tabs/AgentsTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { LanguageTab } from "./tabs/LanguageTab";
import { ProfilesTab } from "./tabs/ProfilesTab";
import { useAppStore } from "../../stores/appStore";
import { useUpdaterStore } from "../../stores/updaterStore";
import { setSetting } from "../../db/repos/settings";

export function SettingsView() {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const { appDataDir, setView, settingsTab, setSettingsTab, setShowOnboarding } = useAppStore();
  const { check, checking } = useUpdaterStore();

  const replayGuide = async () => {
    await setSetting("onboarding_done", false);
    setShowOnboarding(true);
  };

  const handleCheckUpdate = async () => {
    await check(false); // manual check, shows modal if no update found
    if (useUpdaterStore.getState().noUpdate) {
      message.info(t("update.no_update", "已是最新版本"));
    }
  };

  return (
    <div className="kui-settings">
      <div className="kui-chat-header" data-tauri-drag-region="true">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setView("chat")}
        >
          {t("nav.back")}
        </Button>
      </div>
      <Tabs
        activeKey={settingsTab}
        onChange={(key) => setSettingsTab(key)}
        items={[
          { key: "general", label: t("settings.tab.general"), children: <GeneralTab /> },
          { key: "search", label: t("settings.tab.search"), children: <SearchTab /> },
          { key: "profiles", label: t("settings.tab.profiles"), children: <ProfilesTab /> },
          { key: "providers", label: t("settings.tab.providers"), children: <ProvidersTab /> },
          { key: "agents", label: t("settings.tab.agents"), children: <AgentsTab /> },
          { key: "appearance", label: t("settings.tab.appearance"), children: <AppearanceTab /> },
          { key: "language", label: t("settings.tab.language"), children: <LanguageTab /> },
          {
            key: "about",
            label: t("settings.tab.about"),
            children: (
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div>
                  <strong>{t("settings.about.appData")}: </strong>
                  <code>{appDataDir}</code>
                </div>
                <div style={{ marginTop: 6, opacity: 0.7 }}>kui v0.2.1</div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <Button
                    icon={<SyncOutlined spin={checking} />}
                    loading={checking}
                    onClick={handleCheckUpdate}
                  >
                    {t("update.check", "检查更新")}
                  </Button>
                  <Button icon={<PlayCircleOutlined />} onClick={replayGuide}>
                    {t("settings.replayGuide")}
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
