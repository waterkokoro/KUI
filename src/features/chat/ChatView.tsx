import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Select, Space, Tooltip, message as antdMessage } from "antd";
import { CopyOutlined, FolderOpenOutlined, PlusOutlined, SettingOutlined, StopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Markdown } from "../../components/Markdown";
import { useAppStore } from "../../stores/appStore";
import { getTopic, updateTopic } from "../../db/repos/topics";
import { listMessages, insertMessage } from "../../db/repos/messages";
import { listAgents } from "../../db/repos/agents";
import { listProviders, listModels } from "../../db/repos/providers";
import { topicMdAbsPath, appendMessageMd } from "../../fs/mdRepo";
import type { Agent, MessageRow, ModelRow, Provider, Topic } from "../../types";
import { runAgent } from "../agent/runAgent";
import { DeriveSubTopicModal } from "./DeriveSubTopicModal";

export function ChatView() {
  const { t } = useTranslation();
  const { currentTopicId, settings, reloadTree } = useAppStore();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [mdPath, setMdPath] = useState("");
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveSeed, setDeriveSeed] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const composingRef = useRef(false);

  useEffect(() => {
    void Promise.all([listAgents(), listProviders(), listModels()]).then(([a, p, m]) => {
      setAgents(a);
      setProviders(p);
      setModels(m);
    });
  }, []);

  useEffect(() => {
    if (!currentTopicId) {
      setTopic(null);
      setMessages([]);
      return;
    }
    void getTopic(currentTopicId).then((t) => setTopic(t));
    void listMessages(currentTopicId).then(setMessages);
    void topicMdAbsPath(currentTopicId).then(setMdPath);
  }, [currentTopicId]);

  const modelOptions = useMemo(
    () =>
      providers
        .filter((p) => p.enabled === 1)
        .flatMap((p) => models.filter((m) => m.provider_id === p.id).map((m) => ({
          value: `${p.id}:${m.model_id}`,
          label: `${p.name} · ${m.display_name}`,
        }))),
    [providers, models]
  );

  const effectiveAgentId = topic?.agent_id ?? settings.default_agent_id ?? agents[0]?.id ?? null;
  const effectiveModelRef =
    topic?.model_ref ??
    (effectiveAgentId ? agents.find((a) => a.id === effectiveAgentId)?.default_model_ref : null) ??
    settings.default_model_ref ??
    modelOptions[0]?.value ??
    null;

  const onAgentChange = async (id: string) => {
    if (!topic) return;
    await updateTopic(topic.id, { agent_id: id });
    setTopic({ ...topic, agent_id: id });
  };
  const onModelChange = async (ref: string) => {
    if (!topic) return;
    await updateTopic(topic.id, { model_ref: ref });
    setTopic({ ...topic, model_ref: ref });
  };

  const send = async () => {
    if (!topic || !input.trim() || streaming) return;
    if (!effectiveModelRef) {
      antdMessage.error("Please configure a model in Settings.");
      return;
    }
    const userText = input.trim();
    const agent = agents.find((a) => a.id === effectiveAgentId);
    const userMsg = await insertMessage({
      topic_id: topic.id,
      role: "user",
      content: userText,
    });
    await appendMessageMd(topic.id, "user", userText);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamBuf("");
    stopRequestedRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    let buf = "";
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const text = await runAgent({
        modelRef: effectiveModelRef,
        systemPrompt: agent?.system_prompt ?? "",
        topicId: topic.id,
        messages: history,
        signal: controller.signal,
        onToken: (delta) => {
          buf += delta;
          setStreamBuf(buf);
        },
      });
      const aiMsg = await insertMessage({
        topic_id: topic.id,
        role: "assistant",
        content: text,
      });
      await appendMessageMd(topic.id, "assistant", text);
      setMessages((prev) => [...prev, aiMsg]);
      // Auto-title for first reply
      if (!topic.title || topic.title === t("topic.newTitle") || topic.title === "Untitled") {
        const guess = userText.slice(0, 28).replace(/\n/g, " ");
        await updateTopic(topic.id, { title: guess });
        setTopic({ ...topic, title: guess });
        reloadTree();
      }
    } catch (e: unknown) {
      if (stopRequestedRef.current) {
        // 用户主动中断：保留已收到的部分内容作为助手消息落库
        if (buf.trim()) {
          const partial = buf + `\n\n_[${t("chat.stopped")}]_`;
          const aiMsg = await insertMessage({
            topic_id: topic.id,
            role: "assistant",
            content: partial,
          });
          await appendMessageMd(topic.id, "assistant", partial);
          setMessages((prev) => [...prev, aiMsg]);
        }
        antdMessage.info(t("chat.stopped"));
      } else {
        antdMessage.error((e as Error).message ?? String(e));
      }
    } finally {
      setStreaming(false);
      setStreamBuf("");
      abortRef.current = null;
      stopRequestedRef.current = false;
    }
  };

  const stop = () => {
    if (!abortRef.current) return;
    stopRequestedRef.current = true;
    abortRef.current.abort();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 输入法 composition 中的回车（中文、日文选词等）不触发发送
    if (composingRef.current) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const deriveFrom = (seedContent: string) => {
    setDeriveSeed(seedContent);
    setDeriveOpen(true);
  };

  if (!currentTopicId || !topic) {
    return <div className="kui-empty">{t("topic.empty")}</div>;
  }

  return (
    <>
      <div className="kui-chat-header">
        <div className="kui-chat-title">{topic.title}</div>
        <Select
          size="small"
          style={{ minWidth: 130 }}
          placeholder="Agent"
          value={effectiveAgentId ?? undefined}
          options={agents.map((a) => ({ value: a.id, label: a.name }))}
          onChange={onAgentChange}
        />
        <Select
          size="small"
          style={{ minWidth: 220 }}
          placeholder="Model"
          value={effectiveModelRef ?? undefined}
          options={modelOptions}
          onChange={onModelChange}
        />
        <Tooltip title={mdPath}>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={async () => {
              await navigator.clipboard.writeText(mdPath);
              antdMessage.success(t("common.copied"));
            }}
          >
            {t("topic.openMd")}
          </Button>
        </Tooltip>
        <Button size="small" icon={<PlusOutlined />} onClick={() => deriveFrom("")}>
          {t("topic.deriveSub")}
        </Button>
        <Button size="small" icon={<SettingOutlined />} onClick={() => useAppStore.getState().setView("settings")} />
      </div>

      <div className="kui-chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`kui-chat-bubble ${m.role}`}>
            <div className="kui-chat-meta">
              <span>{m.role}</span>
              <Space size={4}>
                <Tooltip title={t("chat.copy")}>
                  <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => {
                    void navigator.clipboard.writeText(m.content);
                    antdMessage.success(t("common.copied"));
                  }} />
                </Tooltip>
                <Tooltip title={t("chat.deriveFromHere")}>
                  <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => deriveFrom(m.content)} />
                </Tooltip>
              </Space>
            </div>
            <Markdown content={m.content} />
          </div>
        ))}
        {streaming && (
          <div className="kui-chat-bubble assistant">
            <div className="kui-chat-meta">{t("chat.thinking")}</div>
            <Markdown content={streamBuf} />
          </div>
        )}
      </div>

      <div className="kui-composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          placeholder={t("topic.placeholder")}
          rows={3}
        />
        {streaming ? (
          <Button danger icon={<StopOutlined />} onClick={stop}>
            {t("chat.stop")}
          </Button>
        ) : (
          <Button type="primary" onClick={send}>
            {t("chat.send")}
          </Button>
        )}
      </div>

      {deriveOpen && (
        <DeriveSubTopicModal
          parentTopic={topic}
          parentMessages={messages}
          seedContent={deriveSeed}
          onCancel={() => setDeriveOpen(false)}
          onCreated={() => {
            setDeriveOpen(false);
            reloadTree();
          }}
        />
      )}
    </>
  );
}
