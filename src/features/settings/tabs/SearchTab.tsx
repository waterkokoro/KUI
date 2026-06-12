import { useState } from "react";
import { Form, Radio, Input, Button, Space, message as antdMessage } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../stores/appStore";
import { setSetting, getAllSettings } from "../../../db/repos/settings";
import { verifySearchKey } from "../../search";
import type { SearchProviderType } from "../../../types";

const PROVIDERS: { value: SearchProviderType; labelKey: string; descKey: string; needsKey: boolean }[] = [
  { value: "auto", labelKey: "settings.search.provider.auto", descKey: "settings.search.autoDesc", needsKey: false },
  { value: "tavily", labelKey: "settings.search.provider.tavily", descKey: "settings.search.tavilyDesc", needsKey: true },
  { value: "serper", labelKey: "settings.search.provider.serper", descKey: "settings.search.serperDesc", needsKey: true },
  { value: "brave", labelKey: "settings.search.provider.brave", descKey: "settings.search.braveDesc", needsKey: true },
  { value: "anysearch_free", labelKey: "settings.search.provider.anysearch", descKey: "settings.search.anysearchDesc", needsKey: false },
];

export function SearchTab() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const [verifying, setVerifying] = useState(false);

  const update = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    await setSetting(key, value);
    const next = await getAllSettings();
    setSettings(next);
  };

  const updateApiKey = async (provider: string, key: string) => {
    const next = { ...settings.search_api_keys, [provider]: key };
    await update("search_api_keys", next);
  };

  const handleVerify = async (provider: string) => {
    const apiKey = settings.search_api_keys?.[provider];
    if (!apiKey) return;
    setVerifying(true);
    try {
      const ok = await verifySearchKey(provider as "tavily" | "serper" | "brave", apiKey);
      if (ok) {
        antdMessage.success(t("settings.search.verifySuccess"));
      } else {
        antdMessage.error(t("settings.search.verifyFailed"));
      }
    } catch {
      antdMessage.error(t("settings.search.verifyFailed"));
    } finally {
      setVerifying(false);
    }
  };

  const currentProvider = settings.search_provider ?? "auto";
  const currentApiKeys = settings.search_api_keys ?? {};

  // Show API key input for: selected provider (if it needs key), or all API providers in auto mode
  const showKeysFor =
    currentProvider === "auto"
      ? (["tavily", "serper", "brave"] as const)
      : PROVIDERS.find((p) => p.value === currentProvider)?.needsKey
        ? ([currentProvider] as unknown as readonly string[])
        : [];

  return (
    <Form layout="vertical" style={{ maxWidth: 520 }}>
      <Form.Item label={t("settings.search.provider")}>
        <Radio.Group
          value={currentProvider}
          onChange={(e) => void update("search_provider", e.target.value)}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {PROVIDERS.map((p) => (
              <Radio key={p.value} value={p.value}>
                <div>
                  <span style={{ fontWeight: 500 }}>{t(p.labelKey)}</span>
                  <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginTop: 2 }}>
                    {t(p.descKey)}
                  </div>
                </div>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Form.Item>

      {showKeysFor.length > 0 && (
        <Form.Item label={t("settings.search.apiKey")}>
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {(showKeysFor as readonly string[]).map((provider) => (
              <div key={provider}>
                <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </div>
                <Space.Compact style={{ width: "100%" }}>
                  <Input.Password
                    value={currentApiKeys[provider] || ""}
                    placeholder={t("settings.search.apiKeyPlaceholder", { provider })}
                    onChange={(e) => void updateApiKey(provider, e.target.value)}
                  />
                  <Button
                    onClick={() => void handleVerify(provider)}
                    loading={verifying}
                    disabled={!currentApiKeys[provider]}
                    icon={
                      currentApiKeys[provider] ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                  >
                    {t("settings.search.verify")}
                  </Button>
                </Space.Compact>
              </div>
            ))}
          </Space>
        </Form.Item>
      )}
    </Form>
  );
}
