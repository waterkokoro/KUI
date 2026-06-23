import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Input, Select, Form, Spin, message as antdMessage } from "antd";
import { useTranslation } from "react-i18next";
import { listAgents } from "../../db/repos/agents";
import { listProviders, listModels } from "../../db/repos/providers";
import { createTopic } from "../../db/repos/topics";
import { insertMessage } from "../../db/repos/messages";
import { appendMessageMd } from "../../fs/mdRepo";
import { summarizeConversation } from "../agent/runAgent";
import { useAppStore } from "../../stores/appStore";
import type { Agent, MessageRow, ModelRow, Provider, Topic } from "../../types";

export function DeriveSubTopicModal({
  parentTopic,
  parentMessages,
  seedContent,
  onCancel,
  onCreated,
}: {
  parentTopic: Topic;
  parentMessages: MessageRow[];
  seedContent: string;
  onCancel(): void;
  onCreated(): void;
}) {
  const { t } = useTranslation();
  const { setCurrentTopic, settings } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [form] = Form.useForm();
  const [compressing, setCompressing] = useState(true);
  const [creating, setCreating] = useState(false);
  const summarizeStartedRef = useRef(false);

  useEffect(() => {
    void Promise.all([listAgents(), listProviders(), listModels()]).then(([a, p, m]) => {
      setAgents(a);
      setProviders(p);
      setModels(m);
    });
  }, []);

  const modelOptions = useMemo(
    () =>
      providers
        .filter((p) => p.enabled === 1)
        .flatMap((p) =>
          models
            .filter((m) => m.provider_id === p.id)
            .map((m) => ({
              value: `${p.id}:${m.model_id}`,
              label: `${p.name} · ${m.display_name}`,
            }))
        ),
    [providers, models]
  );

  useEffect(() => {
    const initialModel =
      parentTopic.model_ref ?? settings.default_model_ref ?? modelOptions[0]?.value ?? null;
    const initialAgent =
      parentTopic.agent_id ?? settings.default_agent_id ?? agents[0]?.id ?? null;
    form.setFieldsValue({
      title: seedContent ? seedContent.slice(0, 28).replace(/\n/g, " ") : t("topic.newTitle"),
      prompt: seedContent || "",
      modelRef: initialModel,
      agentId: initialAgent,
    });

    // Prevent duplicate summarizeConversation calls when agents/models load
    if (summarizeStartedRef.current) return;
    // If no model available yet, wait for providers/models to load
    if (!initialModel && modelOptions.length === 0) return;
    summarizeStartedRef.current = true;

    const run = async () => {
      if (!initialModel || parentMessages.length === 0) {
        form.setFieldValue("compressed", "");
        setCompressing(false);
        return;
      }
      try {
        const summary = await summarizeConversation({
          modelRef: initialModel,
          messages: parentMessages.map((m) => ({ role: m.role, content: m.content })),
          language: settings.language,
        });
        form.setFieldValue("compressed", summary);
      } catch (e: unknown) {
        antdMessage.warning((e as Error).message);
        form.setFieldValue(
          "compressed",
          parentMessages
            .slice(-6)
            .map((m) => `### ${m.role}\n${m.content}`)
            .join("\n\n")
        );
      } finally {
        setCompressing(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length, modelOptions.length]);

  const onConfirm = async () => {
    try {
      const v = await form.validateFields();
      setCreating(true);
      const child = await createTopic({
        title: v.title || t("topic.newTitle"),
        parent_id: parentTopic.id,
        profile_id: parentTopic.profile_id,
        agent_id: v.agentId ?? null,
        model_ref: v.modelRef ?? null,
        summary: v.compressed ?? null,
      });
      // Persist parent summary as system context in child md
      if (v.compressed) {
        await appendMessageMd(child.id, "system", `Parent summary:\n\n${v.compressed}`);
        await insertMessage({
          topic_id: child.id,
          role: "system",
          content: `Parent summary:\n\n${v.compressed}`,
        });
      }
      if (v.prompt && v.prompt.trim()) {
        await appendMessageMd(child.id, "user", v.prompt);
        await insertMessage({ topic_id: child.id, role: "user", content: v.prompt });
      }
      setCurrentTopic(child.id);
      onCreated();
    } catch (e: unknown) {
      if ((e as { errorFields?: unknown }).errorFields) return;
      antdMessage.error((e as Error).message ?? String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open
      title={t("derive.title")}
      onCancel={onCancel}
      onOk={onConfirm}
      okText={t("derive.confirm")}
      cancelText={t("derive.cancel")}
      width={780}
      confirmLoading={creating}
    >
      <Spin spinning={compressing} tip={t("derive.compressing")}>
        <Form layout="vertical" form={form} onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          <Form.Item label={t("derive.titleLabel")} name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t("derive.compressedLabel")} name="compressed">
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
          </Form.Item>
          <Form.Item label={t("derive.promptLabel")} name="prompt">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
          <Form.Item label={t("derive.agentLabel")} name="agentId">
            <Select options={agents.map((a) => ({ value: a.id, label: a.name }))} allowClear />
          </Form.Item>
          <Form.Item label={t("derive.modelLabel")} name="modelRef">
            <Select options={modelOptions} allowClear />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
