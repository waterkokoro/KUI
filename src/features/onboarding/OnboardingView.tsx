import { useState, useRef, useCallback } from "react";
import { App, Button, Form, Input, Select, Steps, Segmented, Popconfirm } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, SettingOutlined, RobotOutlined, UserOutlined, StarOutlined, PlusOutlined, DeleteOutlined, LinkOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { upsertProvider, upsertModel } from "../../db/repos/providers";
import { upsertAgent } from "../../db/repos/agents";
import { updateUser } from "../../db/repos/users";
import { setSetting, getAllSettings } from "../../db/repos/settings";
import { useAppStore } from "../../stores/appStore";
import { TextAvatar, AVATAR_PALETTE, buildTextAvatarStr } from "../../components/TextAvatar";
import kuiLogo from "../../assets/logo_icon.png";
import type { ProviderKind } from "../../types";
import type { AvatarLayout } from "../../components/TextAvatar";

/* ─── Provider Presets ─── */
interface ProviderPreset {
  name: string;
  kind: ProviderKind;
  base_url: string;
  apiKeyUrl: string;
  models: { model_id: string; display_name: string }[];
}

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  openai: {
    name: "OpenAI",
    kind: "openai",
    base_url: "https://api.openai.com/v1",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      { model_id: "gpt-4o", display_name: "GPT-4o" },
      { model_id: "gpt-4o-mini", display_name: "GPT-4o mini" },
      { model_id: "gpt-4.1", display_name: "GPT-4.1" },
      { model_id: "gpt-4.1-mini", display_name: "GPT-4.1 mini" },
      { model_id: "o3", display_name: "o3" },
      { model_id: "o4-mini", display_name: "o4-mini" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    kind: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { model_id: "claude-sonnet-4-20250514", display_name: "Claude Sonnet 4" },
      { model_id: "claude-3-5-sonnet-latest", display_name: "Claude 3.5 Sonnet" },
      { model_id: "claude-3-5-haiku-latest", display_name: "Claude 3.5 Haiku" },
      { model_id: "claude-opus-4-20250514", display_name: "Claude Opus 4" },
    ],
  },
  deepseek: {
    name: "DeepSeek",
    kind: "openai",
    base_url: "https://api.deepseek.com/v1",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    models: [
      { model_id: "deepseek-chat", display_name: "DeepSeek Chat (V3)" },
      { model_id: "deepseek-reasoner", display_name: "DeepSeek Reasoner (R1)" },
    ],
  },
  kimi: {
    name: "Kimi (月之暗面)",
    kind: "openai",
    base_url: "https://api.moonshot.cn/v1",
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    models: [
      { model_id: "moonshot-v1-8k", display_name: "Kimi 8K" },
      { model_id: "moonshot-v1-32k", display_name: "Kimi 32K" },
      { model_id: "moonshot-v1-128k", display_name: "Kimi 128K" },
    ],
  },
  minimax: {
    name: "MiniMax",
    kind: "openai",
    base_url: "https://api.minimax.chat/v1",
    apiKeyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    models: [
      { model_id: "MiniMax-Text-01", display_name: "MiniMax-Text-01" },
      { model_id: "abab6.5s-chat", display_name: "abab6.5s" },
      { model_id: "abab6.5-chat", display_name: "abab6.5" },
    ],
  },
  zhipu: {
    name: "智谱 AI",
    kind: "openai",
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    models: [
      { model_id: "glm-4-plus", display_name: "GLM-4-Plus" },
      { model_id: "glm-4", display_name: "GLM-4" },
      { model_id: "glm-4-flash", display_name: "GLM-4-Flash" },
    ],
  },
  custom: {
    name: "",
    kind: "openai",
    base_url: "",
    apiKeyUrl: "",
    models: [],
  },
};

const PRESET_OPTIONS = [
  { value: "openai", label: "🟢 OpenAI" },
  { value: "anthropic", label: "🟠 Anthropic (Claude)" },
  { value: "deepseek", label: "🔵 DeepSeek (深度求索)" },
  { value: "kimi", label: "🌙 Kimi (月之暗面)" },
  { value: "minimax", label: "🟣 MiniMax" },
  { value: "zhipu", label: "🔴 智谱 AI (GLM)" },
  { value: "custom", label: "⚙️ 自定义" },
];

/* ─── Agent presets ─── */
interface AgentDraft {
  id: string;
  name: string;
  system_prompt: string;
}
let agentDraftCounter = 0;
function newAgentDraft(): AgentDraft {
  agentDraftCounter++;
  return {
    id: `draft-${agentDraftCounter}`,
    name: agentDraftCounter === 1 ? "助理小葵" : "",
    system_prompt: agentDraftCounter === 1
      ? "你是助理小葵，一个友善、专注的AI助手。保持回答简洁有条理，必要时引用来源，并在不确定时询问用户以确认意图。"
      : "",
  };
}

/* ─── Main Component ─── */
export function OnboardingView() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { currentUser, setSettings, setShowOnboarding, settings } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Model step state
  const [providerForm] = Form.useForm();
  const [modelForm] = Form.useForm();
  const [providerCreated, setProviderCreated] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("openai");
  const [modelIdCustom, setModelIdCustom] = useState(false);

  // Agent step state — support multiple agents
  const [agents, setAgents] = useState<AgentDraft[]>([newAgentDraft()]);

  // Profile step state
  const [userName, setUserName] = useState(currentUser?.name ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar ?? null);
  const [avatarMode, setAvatarMode] = useState<"image" | "text">("image");
  const [avatarText, setAvatarText] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [avatarLayout, setAvatarLayout] = useState<AvatarLayout>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { title: t("onboarding.step.welcome"), icon: <StarOutlined /> },
    { title: t("onboarding.step.model"), icon: <SettingOutlined /> },
    { title: t("onboarding.step.agent"), icon: <RobotOutlined /> },
    { title: t("onboarding.step.profile"), icon: <UserOutlined /> },
    { title: t("onboarding.step.tour"), icon: <StarOutlined /> },
  ];

  const applyPreset = useCallback((key: string) => {
    setSelectedPreset(key);
    const preset = PROVIDER_PRESETS[key];
    if (key !== "custom") {
      providerForm.setFieldsValue({
        name: preset.name,
        kind: preset.kind,
        base_url: preset.base_url,
      });
    } else {
      providerForm.resetFields();
      providerForm.setFieldsValue({ kind: "openai" });
    }
    setModelIdCustom(false);
    modelForm.resetFields();
  }, [providerForm, modelForm]);

  const handleNext = async () => {
    // Step 1: Model — save provider + model
    if (currentStep === 1 && !providerCreated) {
      setLoading(true);
      try {
        const pv = await providerForm.validateFields();
        const mv = await modelForm.validateFields();
        const provider = await upsertProvider({
          name: pv.name,
          kind: pv.kind as ProviderKind,
          base_url: pv.base_url,
          api_key: pv.api_key ?? "",
          enabled: 1,
        });
        await upsertModel({
          provider_id: provider.id,
          model_id: mv.model_id,
          display_name: mv.display_name,
        });
        const modelRef = `${provider.id}:${mv.model_id}`;
        await setSetting("default_model_ref", modelRef);
        setProviderCreated(true);
        message.success(t("onboarding.model.saved"));
        setCurrentStep(2);
      } catch (e) {
        if (e && typeof e === "object" && "errorFields" in e) return;
        message.error(t("common.error"));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 2: Agents — save all agents
    if (currentStep === 2) {
      setLoading(true);
      try {
        const validAgents = agents.filter((a) => a.name.trim());
        if (validAgents.length === 0) {
          message.warning(t("onboarding.agent.atLeastOne"));
          setLoading(false);
          return;
        }
        let firstAgentId: string | null = null;
        for (const a of validAgents) {
          const agent = await upsertAgent({
            name: a.name.trim(),
            system_prompt: a.system_prompt,
            default_model_ref: settings.default_model_ref ?? null,
          });
          if (!firstAgentId) firstAgentId = agent.id;
        }
        if (firstAgentId) {
          await setSetting("default_agent_id", firstAgentId);
        }
        message.success(t("onboarding.agent.saved"));
      } catch {
        message.error(t("common.error"));
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    // Step 3: Profile
    if (currentStep === 3) {
      setLoading(true);
      try {
        if (currentUser) {
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
          await updateUser(currentUser.id, {
            name: userName.trim() || currentUser.name,
            avatar,
          });
        }
        message.success(t("onboarding.profile.saved"));
      } catch {
        message.error(t("common.error"));
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const handleSkipModel = () => {
    // Skip model config, go to next step
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setProviderCreated(false);
    }
    setCurrentStep(currentStep - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await setSetting("onboarding_done", true);
      const nextSettings = await getAllSettings();
      setSettings(nextSettings);
      setShowOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await setSetting("onboarding_done", true);
    const nextSettings = await getAllSettings();
    setSettings(nextSettings);
    setShowOnboarding(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Agent list operations
  const addAgent = () => setAgents([...agents, newAgentDraft()]);
  const removeAgent = (id: string) => setAgents(agents.filter((a) => a.id !== id));
  const updateAgent = (id: string, patch: Partial<AgentDraft>) =>
    setAgents(agents.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const preset = PROVIDER_PRESETS[selectedPreset];
  const currentPresetModels = selectedPreset !== "custom" ? preset.models : [];

  return (
    <div className="kui-onboarding">
      <div className="kui-onboarding-inner">
        {/* Header */}
        <div className="kui-onboarding-header">
          <img src={kuiLogo} alt="KUI" className="kui-onboarding-logo" />
          <span className="kui-onboarding-brand">KUI</span>
        </div>

        {/* Steps indicator */}
        <Steps
          current={currentStep}
          size="small"
          className="kui-onboarding-steps"
          items={steps.map((s) => ({ title: s.title, icon: s.icon }))}
        />

        {/* Step content — scrollable area */}
        <div className="kui-onboarding-content">
          {currentStep === 0 && <WelcomeStep t={t} />}
          {currentStep === 1 && (
            <ModelStep
              t={t}
              providerForm={providerForm}
              modelForm={modelForm}
              providerCreated={providerCreated}
              selectedPreset={selectedPreset}
              applyPreset={applyPreset}
              modelIdCustom={modelIdCustom}
              setModelIdCustom={setModelIdCustom}
              currentPresetModels={currentPresetModels}
              apiKeyUrl={preset.apiKeyUrl}
            />
          )}
          {currentStep === 2 && (
            <AgentStep
              t={t}
              agents={agents}
              addAgent={addAgent}
              removeAgent={removeAgent}
              updateAgent={updateAgent}
            />
          )}
          {currentStep === 3 && (
            <ProfileStep
              t={t}
              userName={userName}
              setUserName={setUserName}
              avatarMode={avatarMode}
              setAvatarMode={setAvatarMode}
              avatarPreview={avatarPreview}
              setAvatarPreview={setAvatarPreview}
              avatarText={avatarText}
              setAvatarText={setAvatarText}
              avatarColor={avatarColor}
              setAvatarColor={setAvatarColor}
              avatarLayout={avatarLayout}
              setAvatarLayout={setAvatarLayout}
              fileInputRef={fileInputRef}
              onUpload={handleAvatarUpload}
            />
          )}
          {currentStep === 4 && <TourStep t={t} />}
        </div>

        {/* Footer navigation — always at bottom */}
        <div className="kui-onboarding-footer">
          {!isFirstStep && (
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} disabled={loading}>
              {t("onboarding.back")}
            </Button>
          )}
          {currentStep === 1 && !providerCreated && (
            <Button type="text" onClick={handleSkipModel} style={{ opacity: 0.6 }}>
              {t("onboarding.skipStep")}
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {currentStep === 0 && (
            <Button type="text" onClick={handleSkip} style={{ opacity: 0.6 }}>
              {t("onboarding.skip")}
            </Button>
          )}
          {isLastStep ? (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleFinish} loading={loading}>
              {t("onboarding.finish")}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={handleNext}
              loading={loading}
              disabled={currentStep === 1 && providerCreated}
            >
              {currentStep === 0 ? t("onboarding.start") : t("onboarding.next")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step Components ─── */

function WelcomeStep({ t }: { t: (k: string) => string }) {
  return (
    <div className="kui-onboarding-step-center">
      <div className="kui-onboarding-welcome-icon">🐾</div>
      <h2 className="kui-onboarding-title">{t("onboarding.welcome.title")}</h2>
      <p className="kui-onboarding-desc">{t("onboarding.welcome.desc")}</p>
      <div className="kui-onboarding-features-preview">
        <div className="kui-onboarding-feature-pill">🌳 {t("onboarding.welcome.f1")}</div>
        <div className="kui-onboarding-feature-pill">💬 {t("onboarding.welcome.f2")}</div>
        <div className="kui-onboarding-feature-pill">🎨 {t("onboarding.welcome.f3")}</div>
        <div className="kui-onboarding-feature-pill">⚡ {t("onboarding.welcome.f4")}</div>
      </div>
    </div>
  );
}

function ModelStep({
  t,
  providerForm,
  modelForm,
  providerCreated,
  selectedPreset,
  applyPreset,
  modelIdCustom,
  setModelIdCustom,
  currentPresetModels,
  apiKeyUrl,
}: {
  t: (k: string) => string;
  providerForm: ReturnType<typeof Form.useForm>[0];
  modelForm: ReturnType<typeof Form.useForm>[0];
  providerCreated: boolean;
  selectedPreset: string;
  applyPreset: (key: string) => void;
  modelIdCustom: boolean;
  setModelIdCustom: (v: boolean) => void;
  currentPresetModels: { model_id: string; display_name: string }[];
  apiKeyUrl: string;
}) {
  if (providerCreated) {
    return (
      <div className="kui-onboarding-step-center">
        <div className="kui-onboarding-success-icon">✅</div>
        <h3>{t("onboarding.model.success")}</h3>
        <p style={{ opacity: 0.7 }}>{t("onboarding.model.successDesc")}</p>
      </div>
    );
  }

  const onPresetChange = (key: string) => applyPreset(key);

  return (
    <div className="kui-onboarding-form">
      <h3 className="kui-onboarding-step-title">{t("onboarding.model.title")}</h3>
      <p className="kui-onboarding-step-desc">{t("onboarding.model.desc")}</p>

      {/* Preset selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, opacity: 0.7 }}>
          {t("onboarding.model.chooseProvider")}
        </div>
        <div className="kui-onboarding-preset-grid">
          {PRESET_OPTIONS.map((o) => (
            <div
              key={o.value}
              className={`kui-onboarding-preset-item ${selectedPreset === o.value ? "kui-onboarding-preset-item--active" : ""}`}
              onClick={() => onPresetChange(o.value)}
            >
              {o.label}
            </div>
          ))}
        </div>
      </div>

      <Form
        form={providerForm}
        layout="vertical"
        size="middle"
        initialValues={{ kind: "openai", base_url: "https://api.openai.com/v1" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <Form.Item label={t("settings.providers.add")} name="name" rules={[{ required: true, message: t("onboarding.model.nameRequired") }]}>
          <Input placeholder="e.g. OpenAI, DeepSeek, Kimi..." />
        </Form.Item>
        <Form.Item label={t("settings.providers.kind")} name="kind" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "openai", label: "OpenAI compatible 接口协议" },
              { value: "anthropic", label: "Anthropic 接口协议" },
            ]}
          />
        </Form.Item>
        <Form.Item label={t("settings.providers.baseUrl")} name="base_url" rules={[{ required: true }]}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item
          label={t("settings.providers.apiKey")}
          name="api_key"
          extra={
            apiKeyUrl ? (
              <span style={{ fontSize: 12 }}>
                {t("onboarding.model.getApiKey")}{" "}
                <a
                  onClick={(e) => { e.preventDefault(); void openUrl(apiKeyUrl); }}
                  style={{ cursor: "pointer" }}
                >
                  <LinkOutlined /> {t("onboarding.model.openApiKeyPage")}
                </a>
              </span>
            ) : null
          }
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>
      </Form>

      <div style={{ marginTop: 4, marginBottom: 4, fontWeight: 500, fontSize: 13, opacity: 0.8 }}>
        {t("onboarding.model.modelSection")}
      </div>
      <Form
        form={modelForm}
        layout="vertical"
        size="middle"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <Form.Item label={t("settings.providers.modelId")} name="model_id" rules={[{ required: true }]}>
          {currentPresetModels.length > 0 && !modelIdCustom ? (
            <Select
              placeholder={t("onboarding.model.selectModel")}
              options={currentPresetModels.map((m) => ({
                value: m.model_id,
                label: `${m.display_name} (${m.model_id})`,
              }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: "4px 8px" }}>
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setModelIdCustom(true)}
                    >
                      {t("onboarding.model.customModelId")}
                    </Button>
                  </div>
                </>
              )}
              onChange={(v) => {
                const found = currentPresetModels.find((m) => m.model_id === v);
                if (found) modelForm.setFieldValue("display_name", found.display_name);
              }}
            />
          ) : (
            <div>
              <Input placeholder="e.g. gpt-4o-mini" />
              {currentPresetModels.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, marginTop: 4 }}
                  onClick={() => {
                    setModelIdCustom(false);
                    modelForm.setFieldValue("model_id", undefined);
                    modelForm.setFieldValue("display_name", undefined);
                  }}
                >
                  {t("onboarding.model.backToPreset")}
                </Button>
              )}
            </div>
          )}
        </Form.Item>
        <Form.Item label={t("onboarding.model.nickname")} name="display_name" rules={[{ required: true }]}>
          <Input placeholder="e.g. GPT-4o mini" />
        </Form.Item>
      </Form>
    </div>
  );
}

function AgentStep({
  t,
  agents,
  addAgent,
  removeAgent,
  updateAgent,
}: {
  t: (k: string) => string;
  agents: AgentDraft[];
  addAgent: () => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, patch: Partial<AgentDraft>) => void;
}) {
  return (
    <div className="kui-onboarding-form">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 className="kui-onboarding-step-title" style={{ margin: 0 }}>{t("onboarding.agent.title")}</h3>
        <Button size="small" icon={<PlusOutlined />} onClick={addAgent}>
          {t("onboarding.agent.addMore")}
        </Button>
      </div>
      <p className="kui-onboarding-step-desc">{t("onboarding.agent.desc")}</p>

      <div className="kui-onboarding-agents-list">
        {agents.map((agent, idx) => (
          <div key={agent.id} className="kui-onboarding-agent-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>
                #{idx + 1}
              </span>
              {agents.length > 1 && (
                <Popconfirm
                  title={t("common.delete")}
                  onConfirm={() => removeAgent(agent.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{t("settings.agents.name")}</div>
              <Input
                value={agent.name}
                onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                placeholder="e.g. 助理小葵"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{t("settings.agents.systemPrompt")}</div>
              <Input.TextArea
                value={agent.system_prompt}
                onChange={(e) => updateAgent(agent.id, { system_prompt: e.target.value })}
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder={t("onboarding.agent.promptPlaceholder")}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileStep({
  t,
  userName,
  setUserName,
  avatarMode,
  setAvatarMode,
  avatarPreview,
  setAvatarPreview,
  avatarText,
  setAvatarText,
  avatarColor,
  setAvatarColor,
  avatarLayout,
  setAvatarLayout,
  fileInputRef,
  onUpload,
}: {
  t: (k: string) => string;
  userName: string;
  setUserName: (v: string) => void;
  avatarMode: "image" | "text";
  setAvatarMode: (v: "image" | "text") => void;
  avatarPreview: string | null;
  setAvatarPreview: (v: string | null) => void;
  avatarText: string;
  setAvatarText: (v: string) => void;
  avatarColor: string;
  setAvatarColor: (v: string) => void;
  avatarLayout: AvatarLayout;
  setAvatarLayout: (v: AvatarLayout) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="kui-onboarding-form">
      <h3 className="kui-onboarding-step-title">{t("onboarding.profile.title")}</h3>
      <p className="kui-onboarding-step-desc">{t("onboarding.profile.desc")}</p>

      <div className="kui-onboarding-profile-form">
        <div className="kui-onboarding-avatar-section">
          <Segmented
            value={avatarMode}
            onChange={(v) => setAvatarMode(v as "image" | "text")}
            options={[
              { label: t("profile.avatarImage"), value: "image" },
              { label: t("profile.avatarText"), value: "text" },
            ]}
            style={{ marginBottom: 16 }}
          />

          {avatarMode === "image" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                className="kui-onboarding-avatar-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={avatarPreview || kuiLogo}
                  alt="avatar"
                  className="kui-onboarding-avatar-img"
                />
                <div className="kui-onboarding-avatar-overlay">
                  <span style={{ color: "#fff", fontSize: 12 }}>📷</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onUpload}
              />
              {avatarPreview && (
                <Button size="small" onClick={() => setAvatarPreview(null)}>
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <TextAvatar
                  text={avatarText || userName || "U"}
                  size={64}
                  borderRadius={14}
                  color={avatarColor || undefined}
                  layout={avatarLayout}
                />
                <Input
                  value={avatarText}
                  onChange={(e) => setAvatarText(e.target.value.slice(0, 6))}
                  placeholder={t("profile.avatarTextPlaceholder")}
                  maxLength={6}
                  style={{ width: 140 }}
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
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t("profile.nickname")}</div>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={t("profile.nicknamePlaceholder")}
            style={{ maxWidth: 300 }}
          />
        </div>
      </div>
    </div>
  );
}

function TourStep({ t }: { t: (k: string) => string }) {
  const features = [
    { icon: "🌳", title: t("onboarding.tour.treeTitle"), desc: t("onboarding.tour.treeDesc") },
    { icon: "🔀", title: t("onboarding.tour.subTitle"), desc: t("onboarding.tour.subDesc") },
    { icon: "🎨", title: t("onboarding.tour.interactiveTitle"), desc: t("onboarding.tour.interactiveDesc") },
    { icon: "👤", title: t("onboarding.tour.modesTitle"), desc: t("onboarding.tour.modesDesc") },
  ];

  return (
    <div className="kui-onboarding-form">
      <h3 className="kui-onboarding-step-title">{t("onboarding.tour.title")}</h3>
      <p className="kui-onboarding-step-desc">{t("onboarding.tour.desc")}</p>
      <div className="kui-onboarding-tour-grid">
        {features.map((f, i) => (
          <div key={i} className="kui-onboarding-tour-card">
            <div className="kui-onboarding-tour-icon">{f.icon}</div>
            <div className="kui-onboarding-tour-card-title">{f.title}</div>
            <div className="kui-onboarding-tour-card-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
