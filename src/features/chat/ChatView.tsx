import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Input, Modal, Popover, Space, Tooltip, message as antdMessage } from "antd";
import { AimOutlined, CopyOutlined, EditOutlined, FolderOpenOutlined, InfoCircleOutlined, PlusOutlined, RobotOutlined, StopOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Markdown } from "../../components/Markdown";
import { TextAvatar, parseTextAvatar } from "../../components/TextAvatar";
import { useAppStore } from "../../stores/appStore";
import { getTopic, updateTopic } from "../../db/repos/topics";
import { listMessages, insertMessage } from "../../db/repos/messages";
import { listAgents } from "../../db/repos/agents";
import { listProviders, listModels } from "../../db/repos/providers";
import { topicMdAbsPath, appendMessageMd } from "../../fs/mdRepo";
import type { Agent, MessageRow, ModelRow, Provider, Topic } from "../../types";
import { runAgent } from "../agent/runAgent";
import { DeriveSubTopicModal } from "./DeriveSubTopicModal";
import { EMOJI_PRESETS, DEFAULT_TOPIC_ICON } from "../../constants/emojiPresets";
import { Twemoji } from "../../components/Twemoji";
import kuiDef from "../../assets/logo_icon.png";
import kuiHappy from "../../assets/kui/positive_emotions/kui_emoji_happy.png";
import kuiYeah from "../../assets/kui/positive_emotions/kui_emoji_yeah.png";
import kuiDefault from "../../assets/kui/kui_def.png";

const MASCOT_IMGS = [kuiDefault, kuiHappy, kuiYeah];

/** 根据小时数返回问候语 i18n key */
function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "empty.greeting.morning";
  if (h >= 12 && h < 14) return "empty.greeting.noon";
  if (h >= 14 && h < 18) return "empty.greeting.afternoon";
  if (h >= 18 && h < 22) return "empty.greeting.evening";
  return "empty.greeting.night";
}

/** 随机励志话语，每次渲染稳定一句 */
const SLOGAN_KEYS = [
  "empty.slogan.1",
  "empty.slogan.2",
  "empty.slogan.3",
  "empty.slogan.4",
  "empty.slogan.5",
  "empty.slogan.6",
];

function useDailySlogan() {
  // 每天换一句，基于日期做index
  const idx = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return day % SLOGAN_KEYS.length;
  }, []);
  return SLOGAN_KEYS[idx];
}

/** 每次进入空白页随机选一张吉祥物表情 */
function useRandomMascot() {
  return useMemo(() => {
    const idx = Math.floor(Math.random() * MASCOT_IMGS.length);
    return MASCOT_IMGS[idx];
  }, []);
}

export function ChatView() {
  const { t } = useTranslation();
  const { currentTopicId, settings, reloadTree, currentUser, locateInTree } = useAppStore();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [reasoningBuf, setReasoningBuf] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
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
    setReasoningBuf("");
    stopRequestedRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    let buf = "";
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      let reasoningAll = "";
      const { text } = await runAgent({
        modelRef: effectiveModelRef,
        systemPrompt: agent?.system_prompt ?? "",
        topicId: topic.id,
        messages: history,
        signal: controller.signal,
        thinking: thinkingEnabled,
        onToken: (delta) => {
          buf += delta;
          setStreamBuf(buf);
        },
        onReasoning: thinkingEnabled ? (delta) => {
          reasoningAll += delta;
          setReasoningBuf(reasoningAll);
        } : undefined,
      });
      // Build final content with optional reasoning block
      const finalContent = reasoningAll
        ? `<details class="kui-reasoning-block"><summary>${t("chat.reasoningTitle")}</summary>\n\n${reasoningAll}\n\n</details>\n\n${text}`
        : text;
      const aiMsg = await insertMessage({
        topic_id: topic.id,
        role: "assistant",
        content: finalContent,
      });
      await appendMessageMd(topic.id, "assistant", finalContent);
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
      setReasoningBuf("");
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

  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [iconPicking, setIconPicking] = useState(false);
  const [iconValue, setIconValue] = useState("");

  const startEditTitle = () => {
    setEditTitleValue(topic?.title ?? "");
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!topic) return;
    const next = editTitleValue.trim() || t("topic.untitled");
    await updateTopic(topic.id, { title: next });
    setTopic({ ...topic, title: next });
    setEditingTitle(false);
    reloadTree();
  };

  const startEditIcon = () => {
    setIconValue(topic?.icon || "");
    setIconPicking(true);
  };

  const saveIcon = async () => {
    if (!topic) return;
    const icon = iconValue.trim() || null;
    await updateTopic(topic.id, { icon });
    setTopic({ ...topic, icon });
    setIconPicking(false);
    reloadTree();
  };

  const deriveFrom = (seedContent: string) => {
    setDeriveSeed(seedContent);
    setDeriveOpen(true);
  };

  const sloganKey = useDailySlogan();
  const mascotImg = useRandomMascot();

  if (!currentTopicId || !topic) {
    return (
      <div className="kui-empty">
        <div className="kui-drag-top" data-tauri-drag-region="true" />
        <div className="kui-empty-content">
          <img src={mascotImg} alt="KUI" className="kui-empty-icon" />
          <div className="kui-empty-greeting">{t(getGreetingKey())}</div>
          <div className="kui-empty-slogan">{t(sloganKey)}</div>
          <div className="kui-empty-hint">{t("topic.empty")}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kui-chat-header" data-tauri-drag-region="true">
        <div className="kui-chat-title-group">
          <Tooltip title={t("tree.menu.setIcon")}>
            <span
              className="kui-chat-title-icon"
              onClick={startEditIcon}
            >
              <Twemoji emoji={topic.icon || DEFAULT_TOPIC_ICON} size={18} />
            </span>
          </Tooltip>
          {editingTitle ? (
            <Input
              size="small"
              className="kui-chat-title-input"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onPressEnter={() => void saveTitle()}
              onBlur={() => void saveTitle()}
              autoFocus
            />
          ) : (
            <>
              <span className="kui-chat-title">{topic.title}</span>
              <Tooltip title={t("tree.menu.rename")}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={startEditTitle} />
              </Tooltip>
              <Tooltip title={t("topic.locateInTree")}>
                <Button type="text" size="small" icon={<AimOutlined />} onClick={locateInTree} />
              </Tooltip>
            </>
          )}
        </div>
        <Tooltip title={mdPath}>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => {
              if (mdPath) void revealItemInDir(mdPath);
            }}
          >
            {t("topic.openMd")}
          </Button>
        </Tooltip>
        <Button size="small" icon={<PlusOutlined />} onClick={() => deriveFrom("")}>
          {t("topic.deriveSub")}
        </Button>
        <Popover
          trigger="click"
          placement="bottomRight"
          title={t("topic.info")}
          content={
            <div style={{ minWidth: 200, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-secondary, #888)" }}>{t("topic.info.createdAt")}</span>
                <span>{dayjs(topic.created_at).format("YYYY-MM-DD HH:mm")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-secondary, #888)" }}>{t("topic.info.updatedAt")}</span>
                <span>{dayjs(topic.updated_at).format("YYYY-MM-DD HH:mm")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-secondary, #888)" }}>{t("topic.info.lastMessage")}</span>
                <span>
                  {messages.length > 0
                    ? dayjs(messages[messages.length - 1].created_at).format("YYYY-MM-DD HH:mm")
                    : t("topic.info.noMessages")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary, #888)" }}>{t("topic.info.messageCount")}</span>
                <span>{messages.length}</span>
              </div>
            </div>
          }
        >
          <Tooltip title={t("topic.info")}>
            <Button size="small" type="text" icon={<InfoCircleOutlined />} />
          </Tooltip>
        </Popover>
      </div>

      <div className="kui-chat-messages">
        {messages.length === 0 && !streaming && (
          <div className="kui-empty-inline">
            <img src={mascotImg} alt="KUI" className="kui-empty-icon" />
            <div className="kui-empty-greeting">{t(getGreetingKey())}</div>
            <div className="kui-empty-slogan">{t(sloganKey)}</div>
            <div className="kui-empty-hint">{t("empty.startHint")}</div>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === "user";
          const currentAgent = agents.find((a) => a.id === effectiveAgentId);
          const agentAvatar = currentAgent?.avatar;
          const agentName = currentAgent?.name ?? "Agent";

          // Render avatar element
          const renderAvatar = () => {
            if (isUser) {
              // User avatar
              const ua = currentUser?.avatar;
              if (ua && ua.startsWith("data:")) {
                return <img src={ua} alt="user" className="kui-chat-avatar" />;
              }
              if (ua && ua.startsWith("text:")) {
                const parsed = parseTextAvatar(ua);
                return <TextAvatar text={parsed.text} size={36} borderRadius={10} color={parsed.color} layout={parsed.layout} />;
              }
              // Default: generate text avatar from name
              return <TextAvatar text={currentUser?.name?.slice(0, 6) || "U"} size={36} borderRadius={10} />;
            } else {
              // Agent avatar
              if (agentAvatar && agentAvatar.startsWith("text:")) {
                const parsed = parseTextAvatar(agentAvatar);
                return <TextAvatar text={parsed.text} size={36} borderRadius={10} color={parsed.color} layout={parsed.layout} />;
              }
              if (agentAvatar && agentAvatar.startsWith("data:")) {
                return <img src={agentAvatar} alt="agent" className="kui-chat-avatar" />;
              }
              return <img src={kuiDef} alt="agent" className="kui-chat-avatar" />;
            }
          };

          return (
            <div key={m.id} className={`kui-chat-row ${m.role}`}>
              {renderAvatar()}
              <div className={`kui-chat-bubble ${m.role}`}>
                <div className="kui-chat-meta">
                  <span>{isUser ? t("chat.you") : agentName}</span>
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
            </div>
          );
        })}
        {streaming && (() => {
          const currentAgent = agents.find((a) => a.id === effectiveAgentId);
          const agentAvatar = currentAgent?.avatar;
          const renderStreamAvatar = () => {
            if (agentAvatar && agentAvatar.startsWith("text:")) {
              const parsed = parseTextAvatar(agentAvatar);
              return <TextAvatar text={parsed.text} size={36} borderRadius={10} color={parsed.color} layout={parsed.layout} />;
            }
            if (agentAvatar && agentAvatar.startsWith("data:")) {
              return <img src={agentAvatar} alt="agent" className="kui-chat-avatar" />;
            }
            return <img src={kuiDef} alt="agent" className="kui-chat-avatar" />;
          };
          return (
            <div className="kui-chat-row assistant">
              {renderStreamAvatar()}
              <div className="kui-chat-bubble assistant">
                <div className="kui-chat-meta">{t("chat.thinking")}</div>
                {thinkingEnabled && reasoningBuf && (
                  <details className="kui-reasoning-block" open={!streamBuf}>
                    <summary>{t("chat.reasoningTitle")}</summary>
                    <div className="kui-reasoning-content">
                      <Markdown content={reasoningBuf} />
                    </div>
                  </details>
                )}
                {streamBuf && <Markdown content={streamBuf} />}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="kui-composer">
        <div className="kui-composer-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            placeholder={t("topic.placeholder")}
            rows={3}
          />
          <div className="kui-composer-toolbar">
            <div className="kui-composer-selectors">
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: agents.map((a) => ({ key: a.id, label: a.name })),
                  selectedKeys: effectiveAgentId ? [effectiveAgentId] : [],
                  onClick: ({ key }) => void onAgentChange(key),
                }}
              >
                <button className="kui-selector-pill">
                  <RobotOutlined />
                  <span>{agents.find((a) => a.id === effectiveAgentId)?.name ?? "Agent"}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
                </button>
              </Dropdown>
              <button
                className={`kui-selector-pill${thinkingEnabled ? " kui-selector-pill--active" : ""}`}
                onClick={() => setThinkingEnabled((v) => !v)}
                title={t("chat.thinkingMode")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6H8.2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
                  <path d="M9 17h6" />
                  <path d="M10 21h4" />
                </svg>
                <span>{t("chat.thinkingMode")}</span>
              </button>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: modelOptions.map((m) => ({ key: m.value, label: m.label })),
                  selectedKeys: effectiveModelRef ? [effectiveModelRef] : [],
                  onClick: ({ key }) => void onModelChange(key),
                }}
              >
                <button className="kui-selector-pill">
                  <ThunderboltOutlined />
                  <span>{modelOptions.find((m) => m.value === effectiveModelRef)?.label ?? "Model"}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
                </button>
              </Dropdown>
            </div>
            {streaming ? (
              <button className="kui-send-btn kui-send-btn--stop" onClick={stop}>
                <StopOutlined />
                <span>{t("chat.stop")}</span>
              </button>
            ) : (
              <button className="kui-send-btn" onClick={send}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 8L13.5 8M9 3.5L13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
              </button>
            )}
          </div>
        </div>
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

      {/* 图标选择 Modal */}
      <Modal
        title={t("tree.menu.setIcon")}
        open={iconPicking}
        onCancel={() => setIconPicking(false)}
        onOk={() => void saveIcon()}
        destroyOnClose
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={400}
      >
        <div style={{ marginBottom: 12 }}>
          <Input
            value={iconValue}
            placeholder={t("tree.icon.inputPlaceholder")}
            autoFocus
            onChange={(e) => setIconValue(e.target.value)}
            suffix={
              iconValue ? (
                <span
                  style={{ cursor: "pointer", opacity: 0.5 }}
                  onClick={() => setIconValue("")}
                >
                  {t("tree.icon.clear")}
                </span>
              ) : null
            }
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 4,
          }}
        >
          {EMOJI_PRESETS.map((emoji) => (
            <Button
              key={emoji}
              type={iconValue === emoji ? "primary" : "text"}
              style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setIconValue(emoji)}
            >
              <Twemoji emoji={emoji} size={20} />
            </Button>
          ))}
        </div>
      </Modal>
    </>
  );
}
