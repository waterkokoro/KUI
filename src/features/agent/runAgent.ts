import { streamText, generateText } from "ai";
import type { CoreMessage } from "ai";
import { resolveModel } from "./getModel";
import { buildTools } from "./tools";

export interface RunAgentOpts {
  modelRef: string;
  systemPrompt: string;
  topicId: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}

export async function runAgent(opts: RunAgentOpts): Promise<string> {
  const model = await resolveModel(opts.modelRef);
  const tools = await buildTools(opts.topicId);
  const messages: CoreMessage[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  })) as CoreMessage[];

  const result = streamText({
    model,
    system: opts.systemPrompt || undefined,
    messages,
    tools,
    maxSteps: 6,
    abortSignal: opts.signal,
  });
  let full = "";
  for await (const delta of result.textStream) {
    full += delta;
    opts.onToken(delta);
  }
  return full;
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
