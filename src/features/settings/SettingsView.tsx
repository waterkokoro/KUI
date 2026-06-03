import { Button, Tabs } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { GeneralTab } from "./tabs/GeneralTab";
import { ProvidersTab } from "./tabs/ProvidersTab";
import { AgentsTab } from "./tabs/AgentsTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { LanguageTab } from "./tabs/LanguageTab";
import { useAppStore } from "../../stores/appStore";

export function SettingsView() {
  const { t } = useTranslation();
  const { appDataDir, setView } = useAppStore();
  return (
    <div className="kui-settings">
      <div style={{ marginBottom: 12 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setView("chat")}
        >
          {t("nav.back")}
        </Button>
      </div>
      <Tabs
        defaultActiveKey="general"
        items={[
          { key: "general", label: t("settings.tab.general"), children: <GeneralTab /> },
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
                <div style={{ marginTop: 6, opacity: 0.7 }}>kui v0.1.0</div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
