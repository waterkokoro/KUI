import { tool } from "ai";
import { z } from "zod";
import { listTopics, getTopic, updateTopic } from "../../db/repos/topics";
import { setTopicTags } from "../../db/repos/tags";
import { grepTopics } from "../../ipc";
import { topicsRoot } from "../../fs/mdRepo";
import { webSearch } from "../search";
import type { ToolCallEvent } from "./runAgent";

export async function buildTools(
  currentTopicId: string | null,
  webSearchEnabled = true,
  onToolCall?: (event: ToolCallEvent) => void,
  interactive = false,
) {
  return {
    search_notes: tool({
      description:
        "Full-text search (case-insensitive) across all topic markdown notes. Returns matching topic_id, file path, line number, and snippet.",
      parameters: z.object({ query: z.string().describe("text to search") }),
      execute: async ({ query }) => {
        const root = await topicsRoot();
        return await grepTopics(root, query, false);
      },
    }),
    get_topic_tree: tool({
      description: "Return the entire topic tree as a flat list of {id, parent_id, title, summary}.",
      parameters: z.object({}),
      execute: async () => {
        return (await listTopics()).map((t) => ({
          id: t.id,
          parent_id: t.parent_id,
          title: t.title,
          summary: t.summary,
        }));
      },
    }),
    get_topic_summary: tool({
      description: "Get the stored summary of a topic by id.",
      parameters: z.object({ topic_id: z.string() }),
      execute: async ({ topic_id }) => {
        const t = await getTopic(topic_id);
        return t?.summary ?? null;
      },
    }),
    save_topic_summary: tool({
      description: "Save / overwrite the summary of a topic.",
      parameters: z.object({ topic_id: z.string(), summary: z.string() }),
      execute: async ({ topic_id, summary }) => {
        await updateTopic(topic_id, { summary });
        return { ok: true };
      },
    }),
    tag_topic: tool({
      description: "Replace all tags of a topic with the given list.",
      parameters: z.object({
        topic_id: z.string(),
        tags: z.array(z.string()),
      }),
      execute: async ({ topic_id, tags }) => {
        await setTopicTags(topic_id, tags);
        return { ok: true };
      },
    }),
    recall_context: tool({
      description:
        "Recall related context for the current or specified topic: ancestors and siblings with their summaries.",
      parameters: z.object({ topic_id: z.string().optional() }),
      execute: async ({ topic_id }) => {
        const id = topic_id ?? currentTopicId;
        if (!id) return [];
        const all = await listTopics();
        const byId = new Map(all.map((t) => [t.id, t]));
        const t = byId.get(id);
        if (!t) return [];
        const out: { id: string; title: string; summary: string | null; rel: string }[] = [];
        let cur = t.parent_id ? byId.get(t.parent_id) : undefined;
        while (cur) {
          out.push({ id: cur.id, title: cur.title, summary: cur.summary, rel: "ancestor" });
          cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
        }
        for (const s of all
          .filter((x) => x.parent_id === t.parent_id && x.id !== t.id)
          .slice(0, 5)) {
          out.push({ id: s.id, title: s.title, summary: s.summary, rel: "sibling" });
        }
        return out;
      },
    }),

    ...(webSearchEnabled
      ? {
          web_search: tool({
            description:
              "Search the web for real-time information. Use when you need the latest news, technical docs, current events, or any external knowledge not in your training data.",
            parameters: z.object({
              query: z.string().describe("search keywords"),
              maxResults: z.number().optional().describe("max results, default 10"),
            }),
            execute: async ({ query, maxResults }) => {
              try {
                onToolCall?.({ toolName: "web_search", status: "calling", args: { query, maxResults } });
                const payload = await webSearch(query, { maxResults: maxResults ?? 10 });
                if (payload.results.length === 0) {
                  const result = { query, message: "No results found.", results: [], provider: payload.provider };
                  onToolCall?.({ toolName: "web_search", status: "done", args: { query }, result });
                  return result;
                }
                const formatted = payload.results
                  .slice(0, 10)
                  .map((r, i) => `${i + 1}. **${r.title}**\n${r.url}\n${r.content}`)
                  .join("\n\n");
                const result = {
                  query,
                  provider: payload.provider,
                  results: payload.results,
                  formatted,
                };
                onToolCall?.({ toolName: "web_search", status: "done", args: { query }, result });
                return result;
              } catch (e) {
                return { error: `Search failed: ${(e as Error).message}` };
              }
            },
          }),
        }
      : {}),

    // ─────────────────────────────────────────────────────────────────
    // render_ui: 渲染交互 UI 组件，仅在交互对话中可用
    // ─────────────────────────────────────────────────────────────────
    ...(interactive
      ? {
          render_ui: tool({
            description:
              "Render a rich UI component for the user. This is your PRIMARY output method for presenting structured content (tables, charts, cards, comparisons, lists, recommendations) — not just for collecting user input. Always prefer this over plain text when the answer contains structured, visual, or listable data. Also use for interactive elements (choices, forms, buttons). After calling this tool, the system will pause and wait for user interaction. Available types: selection (single/multiple choice), form (input fields), buttons (action buttons), card (info display with markdown), short_answer (text input), chart (bar/line/pie), translation (language pairs), custom (arbitrary HTML/CSS/JS), pages (multi-page container — use this to combine multiple component types in one response).",
            parameters: z.object({
              type: z.enum([
                "selection", "form", "buttons", "card",
                "short_answer", "chart", "translation", "custom", "pages",
              ]).describe("UI component type"),
              title: z.string().optional().describe("Title displayed above the component"),
              description: z.string().optional().describe("Description text"),
              data: z.record(z.string(), z.unknown()).describe("Component-specific data object. See system prompt for schema details."),
              auto_submit: z.boolean().optional().describe("Auto-submit when all blocks complete (default true)"),
            }),
            execute: async ({ type, title, description, data, auto_submit }) => {
              // Validate required data fields per component type
              const requiredFields: Record<string, string[]> = {
                selection: ["mode", "options"],
                form: ["fields"],
                buttons: ["items"],
                card: ["title", "content"],
                short_answer: ["question"],
                chart: ["chartType", "data"],
                translation: ["sourceLang", "targetLang", "entries"],
                custom: ["html"],
                pages: ["pages"],
              };
              const fields = requiredFields[type];
              if (fields) {
                const missing = fields.filter((f) => data[f] === undefined || data[f] === null);
                if (missing.length > 0) {
                  return { error: `render_ui: "${type}" requires data fields: ${missing.join(", ")}. Please fix and retry.` };
                }
              }
              const ui_id = `ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const block = { type, title, description, data };
              const payload = { ui_id, blocks: [block], auto_submit: auto_submit ?? true };
              // Emit render event so ChatView can render the UI
              onToolCall?.({
                toolName: "render_ui",
                status: "render",
                args: { type, title, description },
                result: payload,
              });
              return { pending: true, ui_id, message: "UI rendered. Waiting for user interaction. Do not continue until user responds." };
            },
          }),
        }
      : {}),
  };
}
