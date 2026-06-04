import { useEffect, useRef, useState } from "react";
import { App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Segmented, Select, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { listAgents, upsertAgent, deleteAgent } from "../../../db/repos/agents";
import { listProviders, listModels } from "../../../db/repos/providers";
import type { Agent, ModelRow, Provider } from "../../../types";
import kuiDef from "../../../assets/logo_icon.png";
import { TextAvatar, AVATAR_PALETTE, parseTextAvatar, buildTextAvatarStr } from "../../../components/TextAvatar";
import type { AvatarLayout } from "../../../components/TextAvatar";

export function AgentsTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<Agent>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"image" | "text">("image");
  const [avatarText, setAvatarText] = useState("");
  const [avatarColor, setAvatarColor] = useState<string>("");
  const [avatarLayout, setAvatarLayout] = useState<AvatarLayout>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // detect avatar mode
      if (a.avatar && a.avatar.startsWith("text:")) {
        const parsed = parseTextAvatar(a.avatar);
        setAvatarMode("text");
        setAvatarText(parsed.text);
        setAvatarColor(parsed.color ?? "");
        setAvatarLayout(parsed.layout ?? "auto");
        setAvatarPreview(null);
      } else {
        setAvatarMode("image");
        setAvatarPreview(a.avatar);
        setAvatarText("");
        setAvatarColor("");
        setAvatarLayout("auto");
      }
      setEditing(a);
    } else {
      form.resetFields();
      setAvatarPreview(null);
      setAvatarMode("image");
      setAvatarText("");
      setAvatarColor("");
      setAvatarLayout("auto");
      setEditing(null);
      setCreating(true);
    }
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
    setAvatarPreview(null);
    setAvatarMode("image");
    setAvatarText("");
    setAvatarColor("");
    setAvatarLayout("auto");
    form.resetFields();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      form.setFieldValue("avatar", dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const resetAvatar = () => {
    setAvatarPreview(null);
    form.setFieldValue("avatar", null);
  };
  const save = async () => {
    const v = await form.validateFields();
    let avatar: string | null = null;
    if (avatarMode === "text" && avatarText.trim()) {
      avatar = buildTextAvatarStr(
        avatarText.trim().slice(0, 6),
        avatarColor || undefined,
        avatarLayout !== "auto" ? avatarLayout : undefined
      );
    } else if (avatarMode === "image" && avatarPreview) {
      avatar = avatarPreview;
    }
    await upsertAgent({
      id: editing?.id,
      name: v.name,
      system_prompt: v.system_prompt ?? "",
      default_model_ref: v.default_model_ref ?? null,
      avatar,
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
          {agents.map((a) => {
            // Resolve avatar
            const renderListAvatar = () => {
              if (a.avatar && a.avatar.startsWith("text:")) {
                const parsed = parseTextAvatar(a.avatar);
                return <TextAvatar text={parsed.text} size={36} borderRadius={10} color={parsed.color} layout={parsed.layout} />;
              }
              if (a.avatar && a.avatar.startsWith("data:")) {
                return <img src={a.avatar} alt={a.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />;
              }
              return <img src={kuiDef} alt={a.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />;
            };
            // Resolve model display name
            const modelLabel = modelOptions.find((m) => m.value === a.default_model_ref)?.label ?? null;

            return (
              <Card
                key={a.id}
                size="small"
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {renderListAvatar()}
                    <span>{a.name}</span>
                  </div>
                }
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
                  {modelLabel ?? "—"}
                </div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{a.system_prompt}</div>
              </Card>
            );
          })}
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
        <Form form={form} layout="vertical" onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          <Form.Item label={t("settings.agents.avatar")}>
            <Segmented
              size="small"
              value={avatarMode}
              onChange={(v) => setAvatarMode(v as "image" | "text")}
              options={[
                { label: t("settings.agents.avatarImage"), value: "image" },
                { label: t("settings.agents.avatarText"), value: "text" },
              ]}
              style={{ marginBottom: 12 }}
            />
            {avatarMode === "image" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  className="kui-agent-avatar-upload"
                  onClick={() => fileInputRef.current?.click()}
                  title={t("settings.agents.avatarHint")}
                >
                  <img
                    src={avatarPreview || kuiDef}
                    alt="avatar"
                    className="kui-agent-avatar-img"
                  />
                  <div className="kui-agent-avatar-overlay">
                    <PlusOutlined style={{ fontSize: 20, color: "#fff" }} />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarUpload}
                />
                {avatarPreview && (
                  <Button size="small" onClick={resetAvatar}>
                    {t("settings.agents.avatarRemove")}
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <TextAvatar
                    text={avatarText || form.getFieldValue("name") || "A"}
                    size={72}
                    borderRadius={16}
                    color={avatarColor || undefined}
                    layout={avatarLayout}
                  />
                  <Input
                    value={avatarText}
                    onChange={(e) => setAvatarText(e.target.value.slice(0, 6))}
                    placeholder={t("settings.agents.avatarTextPlaceholder")}
                    maxLength={6}
                    style={{ width: 160 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.colorLabel")}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    {AVATAR_PALETTE.map((c) => (
                      <div
                        key={c}
                        onClick={() => setAvatarColor(c)}
                        style={{
                          width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer",
                          border: avatarColor === c ? "2px solid var(--ant-color-text)" : "2px solid transparent",
                        }}
                      />
                    ))}
                    <Input
                      type="color"
                      value={avatarColor || "#1677ff"}
                      onChange={(e) => setAvatarColor(e.target.value)}
                      style={{ width: 28, height: 22, padding: 1, borderRadius: 4, marginLeft: 4 }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.layout")}</div>
                  <Segmented
                    size="small"
                    value={avatarLayout}
                    onChange={(v) => setAvatarLayout(v as AvatarLayout)}
                    options={[
                      { label: "Auto", value: "auto" },
                      { label: "2×2", value: "2x2" },
                      { label: "2×3", value: "2x3" },
                      { label: "1×4", value: "1x4" },
                    ]}
                  />
                </div>
              </div>
            )}
          </Form.Item>
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
