import { streamText, generateText } from "ai";
import type { CoreMessage } from "ai";
import { resolveModel, getProviderKind, getProviderConfig } from "./getModel";
import { buildTools } from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import { INTERACTIVE_SYSTEM_PROMPT } from "../interactive/prompt";

export interface ToolCallEvent {
  toolName: string;
  status: "calling" | "done" | "render";
  args: Record<string, unknown>;
  result?: unknown;
}

export interface RunAgentOpts {
  modelRef: string;
  systemPrompt: string;
  topicId: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  onToken: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  thinking?: boolean;
  webSearch?: boolean;
  interactive?: boolean;
  signal?: AbortSignal;
}

export interface RunAgentResult {
  text: string;
  reasoning: string;
  /** render_ui 产生的交互 payload，如果 agent 调用了 render_ui */
  interactivePayload?: unknown;
}

export async function runAgent(opts: RunAgentOpts): Promise<RunAgentResult> {
  const providerKind = await getProviderKind(opts.modelRef);

  // For OpenAI-compatible providers with thinking enabled,
  // use custom streaming to extract reasoning_content
  if (opts.thinking && providerKind === "openai") {
    return runAgentWithOpenAIReasoning(opts);
  }

  // Inject current date/time so the model is time-aware
  const now = new Date();
  const timeHint = `[Current date and time: ${now.toISOString()} (${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})]`;

  // Build effective system prompt with interactive supplement
  const basePrompt = opts.systemPrompt ? `${opts.systemPrompt}\n\n${timeHint}` : timeHint;
  const effectiveSystemPrompt = opts.interactive
    ? `${basePrompt}\n\n${INTERACTIVE_SYSTEM_PROMPT}`
    : basePrompt;

  // For Anthropic or non-thinking mode, use Vercel AI SDK
  const model = await resolveModel(opts.modelRef);

  let interactivePayload: unknown = undefined;

  // Wrap onToolCall to capture render_ui payloads
  const origOnToolCall = opts.onToolCall;
  const wrappedOnToolCall = (event: ToolCallEvent) => {
    if (event.toolName === "render_ui" && event.status === "render") {
      interactivePayload = event.result;
    }
    origOnToolCall?.(event);
  };

  const tools = await buildTools(opts.topicId, opts.webSearch ?? true, wrappedOnToolCall, opts.interactive ?? false);
  const messages: CoreMessage[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  })) as CoreMessage[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let providerOptions: any = undefined;
  if (opts.thinking && providerKind === "anthropic") {
    providerOptions = { anthropic: { thinking: { type: "enabled", budgetTokens: 10000 } } };
  }

  const result = streamText({
    model,
    system: effectiveSystemPrompt || undefined,
    messages,
    tools,
    maxSteps: 6,
    abortSignal: opts.signal,
    providerOptions,
  });

  let full = "";
  let reasoning = "";

  for await (const part of result.fullStream) {
    if (part.type === "reasoning" && opts.onReasoning) {
      reasoning += (part as { type: "reasoning"; textDelta: string }).textDelta;
      opts.onReasoning((part as { type: "reasoning"; textDelta: string }).textDelta);
    } else if (part.type === "text-delta") {
      full += (part as { type: "text-delta"; textDelta: string }).textDelta;
      opts.onToken((part as { type: "text-delta"; textDelta: string }).textDelta);
    } else if (part.type === "tool-call") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tc = part as any;
      // web_search fires its own events from within tools.ts execute()
      if (tc.toolName !== "web_search") {
        wrappedOnToolCall({ toolName: tc.toolName, status: "calling", args: (tc.args ?? {}) as Record<string, unknown> });
      }
    } else if (part.type === "tool-result") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tc = part as any;
      // web_search fires its own done; render_ui fires "render" internally
      if (tc.toolName !== "render_ui" && tc.toolName !== "web_search") {
        wrappedOnToolCall({ toolName: tc.toolName, status: "done", args: (tc.args ?? {}) as Record<string, unknown> });
      }
    }
  }

  return { text: full, reasoning, interactivePayload };
}

// ─────────────────────────────────────────────────────────────────
// OpenAI-compatible streaming with reasoning_content + tool calling
// ─────────────────────────────────────────────────────────────────

interface OpenAIToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

interface StreamToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

/**
 * Convert Vercel AI SDK tools to OpenAI function calling format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolsToOpenAIFormat(tools: Record<string, any>) {
  return Object.entries(tools).map(([name, t]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zodSchema = (t as any).parameters;
    let jsonSchema: Record<string, unknown> = { type: "object", properties: {} };
    try {
      if (zodSchema) {
        jsonSchema = zodToJsonSchema(zodSchema, { target: "openAi" }) as Record<string, unknown>;
        // Remove $schema and additionalProperties that OpenAI doesn't want
        delete jsonSchema.$schema;
        delete jsonSchema.additionalProperties;
      }
    } catch {
      // Fallback: empty schema
    }
    return {
      type: "function" as const,
      function: {
        name,
        description: t.description || "",
        parameters: jsonSchema,
      },
    };
  });
}

/**
 * Execute a tool call using the Vercel AI SDK tool definitions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeToolCall(tools: Record<string, any>, name: string, args: string): Promise<string> {
  const t = tools[name];
  if (!t?.execute) {
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
  try {
    const parsedArgs = JSON.parse(args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await t.execute(parsedArgs, {} as any);
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}

const MAX_STEPS = 6;

/**
 * Custom streaming for OpenAI-compatible APIs (DeepSeek, Qwen, etc.)
 * that return reasoning_content in streaming responses.
 * Now supports tool calling with multi-step execution.
 */
async function runAgentWithOpenAIReasoning(opts: RunAgentOpts): Promise<RunAgentResult> {
  const config = await getProviderConfig(opts.modelRef);

  let interactivePayload: unknown = undefined;
  let renderUiCalled = false;

  const origOnToolCall = opts.onToolCall;
  const wrappedOnToolCall = (event: ToolCallEvent) => {
    if (event.toolName === "render_ui" && event.status === "render") {
      interactivePayload = event.result;
      renderUiCalled = true;
    }
    origOnToolCall?.(event);
  };

  const tools = await buildTools(opts.topicId, opts.webSearch ?? true, wrappedOnToolCall, opts.interactive ?? false);
  const openaiTools = toolsToOpenAIFormat(tools);

  // Inject current date/time so the model is time-aware
  const now2 = new Date();
  const timeHint2 = `[Current date and time: ${now2.toISOString()} (${now2.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})]`;

  const basePrompt2 = opts.systemPrompt ? `${opts.systemPrompt}\n\n${timeHint2}` : timeHint2;
  const effectiveSystemPrompt = opts.interactive
    ? `${basePrompt2}\n\n${INTERACTIVE_SYSTEM_PROMPT}`
    : basePrompt2;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiMessages: Array<any> = [];
  if (effectiveSystemPrompt) {
    apiMessages.push({ role: "system", content: effectiveSystemPrompt });
  }
  for (const m of opts.messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  let full = "";
  let reasoning = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const body: Record<string, unknown> = {
      model: config.modelId,
      messages: apiMessages,
      stream: true,
    };
    if (openaiTools.length > 0) {
      body.tools = openaiTools;
    }

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    let stepContent = "";
    const toolCallsMap = new Map<number, { id: string; type: string; name: string; arguments: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Extract reasoning_content (DeepSeek, Qwen, etc.)
          if (delta.reasoning_content && opts.onReasoning) {
            reasoning += delta.reasoning_content;
            opts.onReasoning(delta.reasoning_content);
          }

          // Extract regular content
          if (delta.content) {
            stepContent += delta.content;
            full += delta.content;
            opts.onToken(delta.content);
          }

          // Accumulate tool calls
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls as StreamToolCallDelta[]) {
              const idx = tc.index;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, { id: "", type: "function", name: "", arguments: "" });
              }
              const entry = toolCallsMap.get(idx)!;
              if (tc.id) entry.id = tc.id;
              if (tc.type) entry.type = tc.type;
              if (tc.function?.name) entry.name += tc.function.name;
              if (tc.function?.arguments) entry.arguments += tc.function.arguments;
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // If no tool calls, we're done
    if (toolCallsMap.size === 0) {
      break;
    }

    // Build assistant message with tool calls
    const toolCalls: OpenAIToolCall[] = Array.from(toolCallsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => ({
        id: tc.id,
        type: tc.type,
        function: { name: tc.name, arguments: tc.arguments },
      }));

    apiMessages.push({
      role: "assistant",
      content: stepContent || null,
      tool_calls: toolCalls,
    });

    // Execute each tool and add results
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      let parsedArgs: Record<string, unknown> = {};
      try { parsedArgs = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
      // web_search fires its own events from within tools.ts execute()
      if (toolName !== "web_search") {
        opts.onToolCall?.({ toolName, status: "calling", args: parsedArgs });
      }
      const resultStr = await executeToolCall(tools, toolName, tc.function.arguments);
      // render_ui fires its own "render" event internally; web_search fires its own "done"
      if (toolName !== "render_ui" && toolName !== "web_search") {
        opts.onToolCall?.({ toolName, status: "done", args: parsedArgs });
      }
      apiMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: resultStr,
      });
    }

    // If render_ui was called, stop processing - wait for user interaction
    if (renderUiCalled) {
      break;
    }
  }

  return { text: full, reasoning, interactivePayload };
}

export async function summarizeConversation(opts: {
  modelRef: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  language?: string;
}): Promise<string> {
  const model = await resolveModel(opts.modelRef);
  const isZh = (opts.language ?? "").toLowerCase().startsWith("zh");

  const sys = isZh
    ? "你是会话压缩助手，负责将对话历史压缩为紧凑、忠实的摘要。保留事实、决策、待解决的问题及未完结的线索。使用 Markdown 输出，包含三个小节：## 事实、## 决策、## 待解决的问题。全部用中文书写，简洁准确。"
    : "You compress chat histories into a tight, faithful summary. Preserve facts, decisions, open questions, and unfinished threads. Output Markdown with three sections: ## Facts, ## Decisions, ## Open questions. Write entirely in English. Be concise.";

  const instr = isZh
    ? "请总结以下对话，控制在 600 字以内，最终输出使用中文。\n\n"
    : "Summarize the following conversation. Keep it under 400 words. Output in English.\n\n";

  const userMsg =
    instr +
    opts.messages
      .map((m) => `### ${m.role}\n${m.content}`)
      .join("\n\n");
  const { text } = await generateText({
    model,
    system: sys,
    prompt: userMsg,
  });
  return text;
}
