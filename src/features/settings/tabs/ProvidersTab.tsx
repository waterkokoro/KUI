import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, Select, Switch, Modal, Popconfirm, Space, Empty } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  listProviders,
  upsertProvider,
  deleteProvider,
  listModels,
  upsertModel,
  deleteModel,
} from "../../../db/repos/providers";
import type { ModelRow, Provider } from "../../../types";

export function ProvidersTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<Provider>();
  const [modelForm] = Form.useForm<{ provider_id: string; model_id: string; display_name: string }>();
  const [modelEditOf, setModelEditOf] = useState<string | null>(null);

  const reload = async () => {
    setProviders(await listProviders());
    setModels(await listModels());
  };
  useEffect(() => {
    void reload();
  }, []);

  const openEdit = (p: Provider | null) => {
    if (p) {
      form.setFieldsValue(p);
      setEditing(p);
    } else {
      form.resetFields();
      form.setFieldsValue({
        kind: "openai",
        base_url: "https://api.openai.com/v1",
        enabled: 1,
      } as Partial<Provider> as Provider);
      setEditing(null);
      setCreating(true);
    }
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
    form.resetFields();
  };

  const save = async () => {
    const v = await form.validateFields();
    await upsertProvider({
      id: editing?.id,
      name: v.name,
      kind: v.kind,
      base_url: v.base_url,
      api_key: v.api_key ?? "",
      enabled: v.enabled ? 1 : 0,
    });
    message.success(t("common.save"));
    close();
    void reload();
  };

  const addModel = async (providerId: string) => {
    modelForm.resetFields();
    modelForm.setFieldValue("provider_id", providerId);
    setModelEditOf(providerId);
  };

  const saveModel = async () => {
    const v = await modelForm.validateFields();
    await upsertModel({ provider_id: v.provider_id, model_id: v.model_id, display_name: v.display_name });
    setModelEditOf(null);
    void reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
          {t("settings.providers.add")}
        </Button>
      </div>
      {providers.length === 0 ? (
        <Empty description={t("settings.providers.empty")} />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {providers.map((p) => (
            <Card
              key={p.id}
              size="small"
              title={
                <span>
                  {p.name} <span style={{ opacity: 0.5, fontSize: 12 }}>({p.kind})</span>
                </span>
              }
              extra={
                <Space>
                  <Switch
                    size="small"
                    checked={p.enabled === 1}
                    onChange={async (v) => {
                      await upsertProvider({ ...p, enabled: v ? 1 : 0 });
                      void reload();
                    }}
                  />
                  <Button size="small" onClick={() => openEdit(p)}>
                    {t("common.edit")}
                  </Button>
                  <Popconfirm
                    title={t("common.delete")}
                    onConfirm={async () => {
                      await deleteProvider(p.id);
                      void reload();
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{p.base_url}</div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{t("settings.providers.models")}: </strong>
                <Button size="small" onClick={() => void addModel(p.id)}>
                  {t("settings.providers.addModel")}
                </Button>
              </div>
              <Space wrap>
                {models
                  .filter((m) => m.provider_id === p.id)
                  .map((m) => (
                    <Space key={m.id} size={4}>
                      <span style={{ fontSize: 12 }}>
                        {m.display_name}{" "}
                        <span style={{ opacity: 0.5 }}>({m.model_id})</span>
                      </span>
                      <Popconfirm
                        title={t("common.delete")}
                        onConfirm={async () => {
                          await deleteModel(m.id);
                          void reload();
                        }}
                      >
                        <Button size="small" type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ))}
              </Space>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        open={creating || !!editing}
        title={editing ? t("common.edit") : t("settings.providers.add")}
        onCancel={close}
        onOk={save}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={form} layout="vertical" onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t("settings.providers.kind")} name="kind" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "openai", label: "OpenAI compatible" },
                { value: "anthropic", label: "Anthropic" },
              ]}
            />
          </Form.Item>
          <Form.Item label={t("settings.providers.baseUrl")} name="base_url" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t("settings.providers.apiKey")} name="api_key">
            <Input.Password />
          </Form.Item>
          <Form.Item label={t("settings.providers.enabled")} name="enabled" valuePropName="checked"
            getValueFromEvent={(v) => (v ? 1 : 0)}
            normalize={(v) => (v === 1 || v === true ? true : false)}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!modelEditOf}
        title={t("settings.providers.addModel")}
        onCancel={() => setModelEditOf(null)}
        onOk={saveModel}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={modelForm} layout="vertical" onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          <Form.Item name="provider_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label={t("settings.providers.modelId")} name="model_id" rules={[{ required: true }]}>
            <Input placeholder="e.g. gpt-4o-mini" />
          </Form.Item>
          <Form.Item label={t("settings.providers.modelDisplay")} name="display_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
