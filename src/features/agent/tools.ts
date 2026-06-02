import { tool } from "ai";
import { z } from "zod";
import { listTopics, getTopic, updateTopic } from "../../db/repos/topics";
import { setTopicTags } from "../../db/repos/tags";
import { grepTopics } from "../../ipc";
import { topicsRoot } from "../../fs/mdRepo";

export async function buildTools(currentTopicId: string | null) {
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
  };
}
