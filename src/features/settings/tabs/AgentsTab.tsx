import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { listAgents, upsertAgent, deleteAgent } from "../../../db/repos/agents";
import { listProviders, listModels } from "../../../db/repos/providers";
import type { Agent, ModelRow, Provider } from "../../../types";

export function AgentsTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<Agent>();

  const reload = async () => {
    setAgents(await listAgents());
    setProviders(await listProviders());
    setModels(await listModels());
  };
  useEffect(() => {
    void reload();
  }, []);

  const modelOptions = providers
    .filter((p) => p.enabled === 1)
    .flatMap((p) =>
      models
        .filter((m) => m.provider_id === p.id)
        .map((m) => ({ value: `${p.id}:${m.model_id}`, label: `${p.name} · ${m.display_name}` }))
    );

  const openEdit = (a: Agent | null) => {
    if (a) {
      form.setFieldsValue(a);
      setEditing(a);
    } else {
      form.resetFields();
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
    await upsertAgent({
      id: editing?.id,
      name: v.name,
      system_prompt: v.system_prompt ?? "",
      default_model_ref: v.default_model_ref ?? null,
      avatar: v.avatar ?? null,
    });
    message.success(t("common.save"));
    close();
    void reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
          {t("settings.agents.add")}
        </Button>
      </div>
      {agents.length === 0 ? (
        <Empty description={t("settings.agents.empty")} />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {agents.map((a) => (
            <Card
              key={a.id}
              size="small"
              title={a.name}
              extra={
                <Space>
                  <Button size="small" onClick={() => openEdit(a)}>
                    {t("common.edit")}
                  </Button>
                  <Popconfirm
                    title={t("common.delete")}
                    onConfirm={async () => {
                      await deleteAgent(a.id);
                      void reload();
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                {a.default_model_ref ?? "—"}
              </div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{a.system_prompt}</div>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        open={creating || !!editing}
        title={editing ? t("common.edit") : t("settings.agents.add")}
        onCancel={close}
        onOk={save}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item label={t("settings.agents.name")} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t("settings.agents.systemPrompt")} name="system_prompt">
            <Input.TextArea autoSize={{ minRows: 6, maxRows: 16 }} />
          </Form.Item>
          <Form.Item label={t("settings.agents.defaultModel")} name="default_model_ref">
            <Select allowClear options={modelOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
