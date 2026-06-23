import { runAgent, type ToolCallEvent } from "../agent/runAgent";
import { insertMessage } from "../../db/repos/messages";
import { appendMessageMd } from "../../fs/mdRepo";
import {
  useStreamingStore,
  defaultStreamState,
  setAbortController,
  getAbortController,
  clearAbortController,
  abortTopic as abortTopicController,
} from "../../stores/streamingStore";
import type { Agent, MessageRow, Topic } from "../../types";
import type { InteractivePayload } from "../interactive/types";

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

export interface StartStreamingParams {
  topicObj: Topic;
  agent?: Agent;
  allMessages: MessageRow[];
  modelRef: string;
  thinking: boolean;
  webSearch: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** Called when a new assistant message is inserted */
  onNewMessage: (msg: MessageRow) => void;
  /** Called when topic title should be updated (first reply) */
  onAutoTitle: (topicObj: Topic, guess: string, allMessages: MessageRow[]) => void;
  /** Called to show info toast */
  onInfo: (msg: string) => void;
  /** Called to show error toast */
  onError: (msg: string) => void;
  /** If set, this userText is used (for regenerate where user msg already exists) */
  userText?: string;
}

/**
 * Start a streaming agent flow for a given topic.
 * This is the main entry point for executing agent requests.
 * Multiple topics can stream concurrently - each has isolated state.
 */
export async function startStreaming(params: StartStreamingParams): Promise<void> {
  const {
    topicObj,
    agent,
    allMessages,
    modelRef,
    thinking,
    webSearch,
    t,
    onNewMessage,
    onAutoTitle,
    onInfo,
    onError,
  } = params;

  const topicId = topicObj.id;
  console.info(`[KUI-stream] START topic=${topicId}`);
  const store = useStreamingStore.getState();

  // Reset and set streaming state
  store.setState(topicId, {
    streaming: true,
    streamBuf: "",
    reasoningBuf: "",
    searchQuery: "",
    searchRefs: [],
    toolCallingName: "",
    interactivePayload: null,
    stopped: false,
  });

  // Set up abort controller
  const controller = new AbortController();
  setAbortController(topicId, controller);

  let buf = "";
  let capturedInteractivePayload: InteractivePayload | null = null;

  try {
    const history = allMessages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    let reasoningAll = "";
    let collectedRefs: { title: string; url: string }[] = [];

    const { text } = await runAgent({
      modelRef,
      systemPrompt: agent?.system_prompt ?? "",
      topicId,
      messages: history,
      signal: controller.signal,
      thinking,
      webSearch,
      interactive: topicObj.type === "interactive",
      onToken: (delta) => {
        buf += delta;
        useStreamingStore.getState().setState(topicId, { streamBuf: buf });
      },
      onReasoning: thinking
        ? (delta) => {
            reasoningAll += delta;
            useStreamingStore.getState().setState(topicId, { reasoningBuf: reasoningAll });
          }
        : undefined,
      onToolCall: (event: ToolCallEvent) => {
        const s = useStreamingStore.getState();
        if (event.toolName !== "web_search") {
          if (event.status === "calling") {
            s.setState(topicId, { toolCallingName: friendlyToolName(event.toolName) });
          } else if (event.status === "done" || event.status === "render") {
            s.setState(topicId, { toolCallingName: "" });
          }
        }
        if (event.toolName === "web_search") {
          if (event.status === "calling") {
            s.setState(topicId, { searchQuery: event.args.query as string });
          } else if (event.status === "done") {
            s.setState(topicId, { searchQuery: "" });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = event.result as any;
            if (result?.results?.length) {
              const refs = result.results.slice(0, 10).map((r: { title: string; url: string }) => ({
                title: r.title,
                url: r.url,
              }));
              collectedRefs = refs;
              s.setState(topicId, { searchRefs: refs });
            }
          }
        }
        if (event.toolName === "render_ui" && event.status === "render") {
          const payload = event.result as InteractivePayload;
          capturedInteractivePayload = payload;
          s.setState(topicId, { interactivePayload: payload });
        }
      },
    });

    // Build final content with optional reasoning block and references
    let finalContent = reasoningAll
      ? `<details class="kui-reasoning-block"><summary>${t("chat.reasoningTitle")}</summary>\n\n${reasoningAll}\n\n</details>\n\n${text}`
      : text;
    // Fallback: if search produced refs but model generated no text, add a notice
    if (!text.trim() && collectedRefs.length > 0 && !capturedInteractivePayload) {
      console.warn(`[KUI-stream] EMPTY_TEXT_WITH_REFS topic=${topicId} refs=${collectedRefs.length}`);
      finalContent = `_${t("chat.searchCompleteNoText")}_\n\n${finalContent}`;
    }
    if (collectedRefs.length > 0) {
      const refsHtml = collectedRefs
        .map((r, i) => `${i + 1}. [${r.title}](${r.url})`)
        .join("\n");
      finalContent += `\n\n<details class="kui-search-refs"><summary>${t("chat.searchRefs")} (${collectedRefs.length})</summary>\n\n${refsHtml}\n\n</details>`;
    }

    // Guard: don't insert an empty assistant message if nothing was generated
    if (!finalContent.trim() && !capturedInteractivePayload) {
      console.warn(`[KUI-stream] EMPTY topic=${topicId} (no content generated)`);
      useStreamingStore.getState().setState(topicId, {
        streaming: false,
        streamBuf: "",
        reasoningBuf: "",
        searchQuery: "",
        searchRefs: [],
        toolCallingName: "",
        stopped: false,
      });
      clearAbortController(topicId);
      onError(t("chat.noResponse"));
      return;
    }

    const interactiveDataStr = capturedInteractivePayload
      ? JSON.stringify(capturedInteractivePayload)
      : null;

    console.info(`[KUI-stream] COMPLETE topic=${topicId} len=${finalContent.length}`);

    // Retry DB insert to handle concurrent write contention when multiple streams finish simultaneously
    let aiMsg: MessageRow;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        aiMsg = await insertMessage({
          topic_id: topicId,
          role: "assistant",
          content: finalContent,
          interactive_data: interactiveDataStr,
        });
        break;
      } catch (dbErr) {
        if (attempt === maxRetries - 1) throw dbErr;
        console.warn(`[KUI-stream] DB insert retry topic=${topicId} attempt=${attempt + 1}`, dbErr);
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }

    // Update UI first so the message is visible immediately, even if file write fails
    onNewMessage(aiMsg!);

    // Append to markdown file (non-critical — don't let failure affect the message)
    try {
      await appendMessageMd(topicId, "assistant", finalContent);
    } catch (mdErr) {
      console.error(`[KUI-stream] appendMessageMd failed topic=${topicId}`, mdErr);
    }

    // Keep interactive payload in store if render_ui was called
    if (capturedInteractivePayload) {
      useStreamingStore.getState().setState(topicId, {
        interactivePayload: capturedInteractivePayload,
      });
    }

    // Auto-title for first reply
    if (
      !topicObj.title ||
      topicObj.title === t("topic.newTitle") ||
      topicObj.title === t("topic.newInteractiveTitle") ||
      topicObj.title === "Untitled"
    ) {
      const userText = params.userText ?? allMessages.filter((m) => m.role === "user").pop()?.content ?? "";
      const guess = userText.slice(0, 28).replace(/\n/g, " ");
      onAutoTitle(topicObj, guess, allMessages);
    }
  } catch (e: unknown) {
    // Check if this session has been superseded by a newer streaming session
    const activeController = getAbortController(topicId);
    const isSuperseded = activeController !== controller;
    console.error(`[KUI-stream] CATCH topic=${topicId} aborted=${controller.signal.aborted} superseded=${isSuperseded} err=${(e as Error)?.message ?? String(e)}`);

    if (controller.signal.aborted) {
      if (isSuperseded) {
        // This session was aborted because a new session started.
        // Don't touch the streaming state — the new session is in charge.
      } else {
        // This session was stopped by the user
        if (buf.trim()) {
          const partial = buf + `\n\n_[${t("chat.stopped")}]_`;
          const aiMsg = await insertMessage({
            topic_id: topicId,
            role: "assistant",
            content: partial,
          });
          await appendMessageMd(topicId, "assistant", partial);
          onNewMessage(aiMsg);
        }
        // Show "Stopped" indicator in the bubble before auto-clearing
        useStreamingStore.getState().setState(topicId, {
          streaming: false,
          stopped: true,
        });
        onInfo(t("chat.stopped"));
      }
    } else {
      onError((e as Error).message ?? String(e));
    }
  } finally {
    // Re-check supersession in finally
    const activeControllerFinally = getAbortController(topicId);
    const isSupersededFinally = activeControllerFinally !== controller;
    console.info(`[KUI-stream] FINALLY topic=${topicId} aborted=${controller.signal.aborted} superseded=${isSupersededFinally}`);

    if (isSupersededFinally) {
      // New session has started — don't touch the streaming state
      return;
    }

    if (controller.signal.aborted) {
      // Delay clearing so the "Stopped" indicator is visible briefly
      setTimeout(() => {
        // Guard: don't clear if a new streaming session has started
        if (!useStreamingStore.getState().isStreaming(topicId)) {
          useStreamingStore.getState().setState(topicId, {
            ...defaultStreamState,
          });
          clearAbortController(topicId);
        }
      }, 1500);
    } else {
      // Clear streaming state and abort controller
      useStreamingStore.getState().setState(topicId, {
        streaming: false,
        streamBuf: "",
        reasoningBuf: "",
        searchQuery: "",
        searchRefs: [],
        toolCallingName: "",
        stopped: false,
      });
      clearAbortController(topicId);
    }
  }
}

/**
 * Stop a streaming agent flow for a given topic.
 */
export function stopStreaming(topicId: string): void {
  abortTopicController(topicId);
}

/**
 * Check if a topic is currently streaming.
 */
export function isTopicStreaming(topicId: string): boolean {
  return useStreamingStore.getState().isStreaming(topicId);
}
