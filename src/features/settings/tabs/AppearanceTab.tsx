import { Form, Radio } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../stores/appStore";
import { setSetting, getAllSettings } from "../../../db/repos/settings";

export function AppearanceTab() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const onChange = async (theme: "dark" | "light") => {
    await setSetting("theme", theme);
    setSettings(await getAllSettings());
  };
  return (
    <Form layout="vertical">
      <Form.Item label={t("settings.appearance.theme")}>
        <Radio.Group value={settings.theme} onChange={(e) => void onChange(e.target.value)}>
          <Radio.Button value="dark">{t("settings.appearance.theme.dark")}</Radio.Button>
          <Radio.Button value="light">{t("settings.appearance.theme.light")}</Radio.Button>
        </Radio.Group>
      </Form.Item>
    </Form>
  );
}
