import { useEffect, useState } from "react";
import { Form, Select, Radio } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../stores/appStore";
import { setSetting, getAllSettings } from "../../../db/repos/settings";
import { listAgents } from "../../../db/repos/agents";
import { listProviders, listModels } from "../../../db/repos/providers";
import type { Agent, ModelRow, Provider } from "../../../types";

export function GeneralTab() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);

  useEffect(() => {
    void Promise.all([listAgents(), listProviders(), listModels()]).then(([a, p, m]) => {
      setAgents(a);
      setProviders(p);
      setModels(m);
    });
  }, []);

  const update = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    await setSetting(key, value);
    const next = await getAllSettings();
    setSettings(next);
  };

  const modelOptions = providers
    .filter((p) => p.enabled === 1)
    .flatMap((p) =>
      models
        .filter((m) => m.provider_id === p.id)
        .map((m) => ({ value: `${p.id}:${m.model_id}`, label: `${p.name} · ${m.display_name}` }))
    );

  return (
    <Form layout="vertical" style={{ maxWidth: 520 }}>
      <Form.Item label={t("settings.startupMode")}>
        <Radio.Group
          value={settings.startup_mode}
          onChange={(e) => void update("startup_mode", e.target.value)}
        >
          <Radio value="last">{t("settings.startupMode.last")}</Radio>
          <Radio value="new">{t("settings.startupMode.new")}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t("settings.defaultAgent")}>
        <Select
          allowClear
          value={settings.default_agent_id ?? undefined}
          onChange={(v) => void update("default_agent_id", v ?? null)}
          options={agents.map((a) => ({ value: a.id, label: a.name }))}
        />
      </Form.Item>
      <Form.Item label={t("settings.defaultModel")}>
        <Select
          allowClear
          value={settings.default_model_ref ?? undefined}
          onChange={(v) => void update("default_model_ref", v ?? null)}
          options={modelOptions}
        />
      </Form.Item>
    </Form>
  );
}
