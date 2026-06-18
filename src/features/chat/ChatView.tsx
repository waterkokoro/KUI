import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Input, Modal, Popover, Space, Tooltip, message as antdMessage } from "antd";
import { AimOutlined, ArrowLeftOutlined, CodeOutlined, CopyOutlined, EditOutlined, FolderOpenOutlined, FullscreenExitOutlined, FullscreenOutlined, GlobalOutlined, InfoCircleOutlined, LoadingOutlined, PlusOutlined, RobotOutlined, StopOutlined, ThunderboltOutlined, ToolOutlined } from "@ant-design/icons";
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
import { runAgent, type ToolCallEvent } from "../agent/runAgent";
import { DeriveSubTopicModal } from "./DeriveSubTopicModal";
import { EMOJI_PRESETS, DEFAULT_TOPIC_ICON } from "../../constants/emojiPresets";
import { Twemoji } from "../../components/Twemoji";
import kuiDef from "../../assets/logo_icon.png";
import kuiHappy from "../../assets/kui/positive_emotions/kui_emoji_happy.png";
import kuiYeah from "../../assets/kui/positive_emotions/kui_emoji_yeah.png";
import kuiDefault from "../../assets/kui/kui_def.png";
import { InteractiveContainer } from "../interactive/components/InteractiveContainer";
import type { InteractivePayload, InteractiveResult, InteractiveMessageResult } from "../interactive/types";

// ── ErrorBoundary for interactive components ──
interface EBRProps { children: React.ReactNode; fallback: React.ReactNode }
interface EBState { hasError: boolean }
class InteractiveErrorBoundary extends React.Component<EBRProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error("[InteractiveBlock render error]", err); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const MASCOT_IMGS = [kuiDefault, kuiHappy, kuiYeah];

/** 检测流式内容中是否有未闭合的代码块，返回语言名 */
function detectOpenCodeBlock(buf: string): string | null {
  const re = /```(\w*)/g;
  let count = 0;
  let lastLang = "";
  let m;
  while ((m = re.exec(buf)) !== null) {
    count++;
    if (m[1]) lastLang = m[1];
  }
  return count % 2 === 1 ? lastLang : null;
}

/** 从思考内容中提取最后一行有意义的文本，用于实时预览 */
function getLastThinkingLine(buf: string, maxLen = 80): string {
  if (!buf) return "";
  const lines = buf.split("\n").map(l => l.trim()).filter(l => {
    if (!l) return false;
    if (l.startsWith("`")) return false;
    if (l.startsWith("#")) return false;
    return true;
  });
  const last = lines[lines.length - 1] || "";
  if (!last) return "";
  return last.length > maxLen ? last.slice(0, maxLen) + "\u2026" : last;
}

/** 工具名称友好化显示 */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  render_ui: "构建组件",
  web_search: "联网搜索",
  read_file: "读取文件",
  write_file: "写入文件",
  list_files: "列出文件",
};
function friendlyToolName(name: string): string {
  return TOOL_DISPLAY_NAMES[name] ?? name.replace(/_/g, " ");
}

/** 尝试将 user message content 解析为 InteractiveMessageResult */
function tryParseInteractiveResult(content: string): InteractiveMessageResult | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && typeof parsed.ui_id === "string" && Array.isArray(parsed.results)) {
      return parsed as InteractiveMessageResult;
    }
  } catch { /* not JSON */ }
  return null;
}

/** 根据原始 payload 和交互结果，生成人类可读的摘要文本 */
function getInteractiveResultSummary(payload: InteractivePayload, result: InteractiveResult): string {
  const blockIdx = payload.blocks.findIndex((b) => b.type === result.type);
  const block = blockIdx >= 0 ? payload.blocks[blockIdx] : null;

  switch (result.type) {
    case "selection": {
      const selData = block?.type === "selection" ? block.data : null;
      const labels = result.selected.map((id) => {
        const opt = selData?.options.find((o) => o.id === id);
        return opt ? (opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label) : id;
      });
      return labels.join("、");
    }
    case "buttons": {
      const btnData = block?.type === "buttons" ? block.data : null;
      const btn = btnData?.items.find((b) => b.id === result.clicked);
      return btn ? (btn.emoji ? `${btn.emoji} ${btn.label}` : btn.label) : result.clicked;
    }
    case "form": {
      const formData = block?.type === "form" ? block.data : null;
      const parts = Object.entries(result.values).map(([key, val]) => {
        const field = formData?.fields.find((f) => f.name === key);
        const label = field?.label || key;
        return `${label}: ${String(val)}`;
      });
      return parts.join("、");
    }
    case "short_answer":
      return result.answer;
    default:
      return JSON.stringify(result);
  }
}

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
  const { currentTopicId, settings, reloadTree, currentUser, locateInTree, chatFullscreen, setChatFullscreen } = useAppStore();
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
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRefs, setSearchRefs] = useState<{ title: string; url: string }[]>([]);
  const [mdPath, setMdPath] = useState("");
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveSeed, setDeriveSeed] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const composingRef = useRef(false);
  // ── Custom component iframe retry tracking ──
  const customRetryCountRef = useRef<Map<string, number>>(new Map());

  // ── Interactive state ──
  const [interactivePayload, setInteractivePayload] = useState<InteractivePayload | null>(null);
  const [submittedUiIds, setSubmittedUiIds] = useState<Set<string>>(new Set());
  // ── Tool calling indicator ──
  const [toolCallingName, setToolCallingName] = useState<string>("");

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
    setInteractivePayload(null);
    setSubmittedUiIds(new Set());
    customRetryCountRef.current.clear();
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
    setInteractivePayload(null);
    await runAgentFlow({
      topicObj: topic,
      agent,
      userText,
      allMessages: [...messages, userMsg],
    });
  };

  // Shared agent execution logic
  const runAgentFlow = async (params: {
    topicObj: Topic;
    agent: Agent | undefined;
    userText: string;
    allMessages: MessageRow[];
  }) => {
    const { topicObj, agent, userText, allMessages } = params;
    setStreaming(true);
    setStreamBuf("");
    setReasoningBuf("");
    setSearchQuery("");
    setSearchRefs([]);
    stopRequestedRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    let buf = "";
    let capturedInteractivePayload: InteractivePayload | null = null;
    try {
      const history = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      let reasoningAll = "";
      let collectedRefs: { title: string; url: string }[] = [];
      const { text } = await runAgent({
        modelRef: effectiveModelRef!,
        systemPrompt: agent?.system_prompt ?? "",
        topicId: topicObj.id,
        messages: history,
        signal: controller.signal,
        thinking: thinkingEnabled,
        webSearch: webSearchEnabled,
        interactive: topicObj.type === "interactive",
        onToken: (delta) => {
          buf += delta;
          setStreamBuf(buf);
        },
        onReasoning: thinkingEnabled ? (delta) => {
          reasoningAll += delta;
          setReasoningBuf(reasoningAll);
        } : undefined,
        onToolCall: (event: ToolCallEvent) => {
          // Track generic tool calling state (only web_search has its own dedicated UI)
          if (event.toolName !== "web_search") {
            if (event.status === "calling") {
              setToolCallingName(friendlyToolName(event.toolName));
            } else if (event.status === "done" || event.status === "render") {
              setToolCallingName("");
            }
          }
          if (event.toolName === "web_search") {
            if (event.status === "calling") {
              setSearchQuery(event.args.query as string);
            } else if (event.status === "done") {
              setSearchQuery("");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = event.result as any;
              if (result?.results?.length) {
                const refs = result.results.slice(0, 10).map((r: { title: string; url: string }) => ({
                  title: r.title,
                  url: r.url,
                }));
                collectedRefs = refs;
                setSearchRefs(refs);
              }
            }
          }
          if (event.toolName === "render_ui" && event.status === "render") {
            const payload = event.result as InteractivePayload;
            capturedInteractivePayload = payload;
            setInteractivePayload(payload);
          }
        },
      });
      // Build final content with optional reasoning block and references
      let finalContent = reasoningAll
        ? `<details class="kui-reasoning-block"><summary>${t("chat.reasoningTitle")}</summary>\n\n${reasoningAll}\n\n</details>\n\n${text}`
        : text;
      if (collectedRefs.length > 0) {
        const refsHtml = collectedRefs
          .map((r, i) => `${i + 1}. [${r.title}](${r.url})`)
          .join("\n");
        finalContent += `\n\n<details class="kui-search-refs"><summary>${t("chat.searchRefs")} (${collectedRefs.length})</summary>\n\n${refsHtml}\n\n</details>`;
      }
      const interactiveDataStr = capturedInteractivePayload
        ? JSON.stringify(capturedInteractivePayload)
        : null;
      const aiMsg = await insertMessage({
        topic_id: topicObj.id,
        role: "assistant",
        content: finalContent,
        interactive_data: interactiveDataStr,
      });
      await appendMessageMd(topicObj.id, "assistant", finalContent);
      setMessages((prev) => [...prev, aiMsg]);
      // Keep interactive payload active if render_ui was called
      if (capturedInteractivePayload) {
        setInteractivePayload(capturedInteractivePayload);
      }
      // Auto-title for first reply
      if (!topicObj.title || topicObj.title === t("topic.newTitle") || topicObj.title === "Untitled") {
        const guess = userText.slice(0, 28).replace(/\n/g, " ");
        await updateTopic(topicObj.id, { title: guess });
        setTopic({ ...topicObj, title: guess });
        reloadTree();
      }
    } catch (e: unknown) {
      if (stopRequestedRef.current) {
        if (buf.trim()) {
          const partial = buf + `\n\n_[${t("chat.stopped")}]_`;
          const aiMsg = await insertMessage({
            topic_id: topicObj.id,
            role: "assistant",
            content: partial,
          });
          await appendMessageMd(topicObj.id, "assistant", partial);
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
      setSearchQuery("");
      setSearchRefs([]);
      setToolCallingName("");
      abortRef.current = null;
      stopRequestedRef.current = false;
    }
  };

  // Handle interactive component submission
  const handleInteractiveSubmit = async (payload: InteractivePayload, results: InteractiveResult[]) => {
    if (!topic || streaming) return;
    // Mark as submitted
    setSubmittedUiIds((prev) => new Set(prev).add(payload.ui_id));
    setInteractivePayload(null);

    const resultMsg: InteractiveMessageResult = { ui_id: payload.ui_id, results };
    const userText = JSON.stringify(resultMsg);
    const agent = agents.find((a) => a.id === effectiveAgentId);
    const userMsg = await insertMessage({
      topic_id: topic.id,
      role: "user",
      content: userText,
    });
    await appendMessageMd(topic.id, "user", userText);
    setMessages((prev) => [...prev, userMsg]);
    await runAgentFlow({
      topicObj: topic,
      agent,
      userText: `[Interactive Response] ${userText}`,
      allMessages: [...messages, userMsg],
    });
  };

  // Handle custom component iframe JS error → AI retry (max 3)
  const handleCustomRetry = async (errorMessage: string) => {
    if (streaming || !topic) return;
    const payload = interactivePayload;
    if (!payload) return;

    const uiId = payload.ui_id;
    const count = (customRetryCountRef.current.get(uiId) ?? 0) + 1;
    customRetryCountRef.current.set(uiId, count);

    if (count > 3) {
      antdMessage.error(t("chat.customRenderFailed"));
      return;
    }

    antdMessage.info(t("chat.customRetrying", { count }));
    setInteractivePayload(null);

    const feedback = `[System] The custom HTML component you rendered had a JavaScript error: "${errorMessage}". Please fix the code and call render_ui again with corrected HTML. This is retry attempt ${count}/3.`;
    const errMsg = await insertMessage({
      topic_id: topic.id,
      role: "user",
      content: feedback,
    });
    let currentMsgs: MessageRow[] = [];
    setMessages((prev) => {
      currentMsgs = [...prev, errMsg];
      return currentMsgs;
    });

    const agent = agents.find((a) => a.id === effectiveAgentId);
    await runAgentFlow({
      topicObj: topic,
      agent,
      userText: feedback,
      allMessages: currentMsgs,
    });
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

  // Build ui_id -> InteractivePayload map from assistant messages
  const payloadMap = useMemo(() => {
    const map = new Map<string, InteractivePayload>();
    for (const msg of messages) {
      if (msg.interactive_data) {
        try {
          const p = JSON.parse(msg.interactive_data) as InteractivePayload;
          if (p.ui_id) map.set(p.ui_id, p);
        } catch { /* ignore */ }
      }
    }
    return map;
  }, [messages]);

  if (!currentTopicId || !topic) {
    return (
      <div className={`kui-empty${chatFullscreen ? " kui-empty--fullscreen" : ""}`}>
        <div className="kui-drag-top" data-tauri-drag-region="true" />
        {chatFullscreen && (
          <div className="kui-fullscreen-back-bar">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setChatFullscreen(false)}>
              {t("chat.exitFullscreen")}
            </Button>
          </div>
        )}
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
        {chatFullscreen && (
          <Tooltip title={t("chat.exitFullscreen")}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setChatFullscreen(false)}
              className="kui-fullscreen-back-btn"
            />
          </Tooltip>
        )}
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
        <Tooltip title={chatFullscreen ? t("chat.exitFullscreen") : t("chat.enterFullscreen")}>
          <Button
            size="small"
            type="text"
            icon={chatFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setChatFullscreen(!chatFullscreen)}
          />
        </Tooltip>
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

          // Parse interactive_data if present
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsedInteractive: InteractivePayload | null = null;
          if (m.interactive_data) {
            try {
              parsedInteractive = JSON.parse(m.interactive_data) as InteractivePayload;
            } catch { /* ignore */ }
          }
          const isSubmitted = parsedInteractive ? submittedUiIds.has(parsedInteractive.ui_id) : false;

          // Check if user message is an interactive result
          let interactiveResultSummary: React.ReactNode = null;
          if (isUser && !parsedInteractive) {
            const parsedResult = tryParseInteractiveResult(m.content);
            if (parsedResult) {
              // Find the original payload from a previous assistant message
              const origPayload = payloadMap.get(parsedResult.ui_id) ?? null;
              if (origPayload) {
                const summaries = parsedResult.results.map((r, i) => {
                  const block = origPayload.blocks[i];
                  const title = block?.title;
                  const summaryText = getInteractiveResultSummary(origPayload, r);
                  return (
                    <div key={i} className="kui-interactive-result-item">
                      {title && <span className="kui-interactive-result-title">{title}</span>}
                      <span className="kui-interactive-result-value">{summaryText}</span>
                    </div>
                  );
                });
                interactiveResultSummary = (
                  <div className="kui-interactive-result-summary">
                    {summaries}
                  </div>
                );
              }
            }
          }

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
                {parsedInteractive ? (
                  <>
                    <InteractiveErrorBoundary fallback={<Markdown content={m.content} />}>
                      <InteractiveContainer
                        payload={parsedInteractive}
                        submitted={isSubmitted}
                        onSubmit={(results) => handleInteractiveSubmit(parsedInteractive!, results)}
                        onRetry={handleCustomRetry}
                      />
                    </InteractiveErrorBoundary>
                    {/* Always show text content alongside interactive UI */}
                    {m.content.trim() && <Markdown content={m.content} />}
                  </>
                ) : interactiveResultSummary ? (
                  interactiveResultSummary
                ) : (
                  <Markdown content={m.content} />
                )}
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
                <div className="kui-chat-meta">
                  {searchQuery ? (
                    <span className="kui-search-indicator"><GlobalOutlined /> {t("chat.searching")} "{searchQuery}"</span>
                  ) : toolCallingName ? (
                    <span className="kui-tool-indicator"><ToolOutlined /> {t("chat.callingTool", { name: toolCallingName })}...</span>
                  ) : (() => {
                    // 优先检查流式输出中的代码块
                    const streamCodeLang = detectOpenCodeBlock(streamBuf);
                    if (streamCodeLang !== null) {
                      return <span className="kui-code-indicator"><CodeOutlined /> {t("chat.writingCode", { lang: streamCodeLang || "code" })}...</span>;
                    }
                    // 检查思考内容中是否有正在编写的代码块
                    const reasonCodeLang = detectOpenCodeBlock(reasoningBuf);
                    if (reasonCodeLang !== null) {
                      return <span className="kui-code-indicator"><CodeOutlined /> {t("chat.writingCode", { lang: reasonCodeLang || "code" })}...</span>;
                    }
                    // 思考中：显示最新思考片段作为实时预览
                    const lastLine = getLastThinkingLine(reasoningBuf);
                    return (
                      <span className="kui-thinking-indicator">
                        <LoadingOutlined />
                        <span>{t("chat.thinking")}</span>
                        {lastLine && <span className="kui-thinking-preview">{lastLine}</span>}
                        <span className="kui-thinking-dots"><span></span><span></span><span></span></span>
                      </span>
                    );
                  })()}
                </div>
                {thinkingEnabled && reasoningBuf && (
                  <details className="kui-reasoning-block" open={!streamBuf}>
                    <summary>{t("chat.reasoningTitle")}</summary>
                    <div className="kui-reasoning-content">
                      <Markdown content={reasoningBuf} />
                    </div>
                  </details>
                )}
                {searchRefs.length > 0 && (
                  <details className="kui-search-refs" open>
                    <summary>{t("chat.searchRefs")} ({searchRefs.length})</summary>
                    <ol>
                      {searchRefs.map((r, i) => (
                        <li key={i}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></li>
                      ))}
                    </ol>
                  </details>
                )}
                {streamBuf && <Markdown content={streamBuf} />}
                {interactivePayload && !submittedUiIds.has(interactivePayload.ui_id) && (
                  <InteractiveErrorBoundary fallback={null}>
                    <InteractiveContainer
                      payload={interactivePayload}
                      submitted={false}
                      onSubmit={(results) => handleInteractiveSubmit(interactivePayload!, results)}
                      onRetry={handleCustomRetry}
                    />
                  </InteractiveErrorBoundary>
                )}
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
            placeholder={topic.type === "interactive" ? t("topic.interactivePlaceholder") : t("topic.placeholder")}
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
              <button
                className={`kui-selector-pill${webSearchEnabled ? " kui-selector-pill--active" : ""}`}
                onClick={() => setWebSearchEnabled((v) => !v)}
                title={t("chat.webSearch")}
              >
                <GlobalOutlined />
                <span>{t("chat.webSearch")}</span>
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
