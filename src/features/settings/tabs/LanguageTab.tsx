import { Form, Select } from "antd";
import { useTranslation } from "react-i18next";
import i18n from "../../../app/i18n";
import { useAppStore } from "../../../stores/appStore";
import { setSetting, getAllSettings } from "../../../db/repos/settings";

export function LanguageTab() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const onChange = async (lang: "zh-CN" | "en-US") => {
    await setSetting("language", lang);
    await i18n.changeLanguage(lang);
    setSettings(await getAllSettings());
  };
  return (
    <Form layout="vertical" style={{ maxWidth: 320 }}>
      <Form.Item label={t("settings.language.label")}>
        <Select
          value={settings.language}
          onChange={(v) => void onChange(v)}
          options={[
            { value: "zh-CN", label: "中文" },
            { value: "en-US", label: "English" },
          ]}
        />
      </Form.Item>
    </Form>
  );
}
