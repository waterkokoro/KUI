import { streamText, generateText } from "ai";
import type { CoreMessage } from "ai";
import { resolveModel, getProviderKind, getProviderConfig } from "./getModel";
import { buildTools } from "./tools";

export interface RunAgentOpts {
  modelRef: string;
  systemPrompt: string;
  topicId: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  onToken: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  thinking?: boolean;
  signal?: AbortSignal;
}

export interface RunAgentResult {
  text: string;
  reasoning: string;
}

export async function runAgent(opts: RunAgentOpts): Promise<RunAgentResult> {
  const providerKind = await getProviderKind(opts.modelRef);

  // For OpenAI-compatible providers with thinking enabled,
  // use custom streaming to extract reasoning_content
  if (opts.thinking && providerKind === "openai") {
    return runAgentWithOpenAIReasoning(opts);
  }

  // For Anthropic or non-thinking mode, use Vercel AI SDK
  const model = await resolveModel(opts.modelRef);
  const tools = await buildTools(opts.topicId);
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
    system: opts.systemPrompt || undefined,
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
    }
  }

  return { text: full, reasoning };
}

/**
 * Custom streaming for OpenAI-compatible APIs (DeepSeek, Qwen, etc.)
 * that return reasoning_content in streaming responses.
 * The @ai-sdk/openai package does NOT extract this field.
 */
async function runAgentWithOpenAIReasoning(opts: RunAgentOpts): Promise<RunAgentResult> {
  const config = await getProviderConfig(opts.modelRef);

  const apiMessages: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) {
    apiMessages.push({ role: "system", content: opts.systemPrompt });
  }
  for (const m of opts.messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  const body = {
    model: config.modelId,
    messages: apiMessages,
    stream: true,
  };

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

  let full = "";
  let reasoning = "";

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
      if (data === "[DONE]") break;

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
          full += delta.content;
          opts.onToken(delta.content);
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return { text: full, reasoning };
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
