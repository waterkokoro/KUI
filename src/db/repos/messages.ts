import { nanoid } from "nanoid";
import { getDb } from "../sql";
import type { MessageRow, ID } from "../../types";

export async function listMessages(topicId: ID): Promise<MessageRow[]> {
  const db = await getDb();
  return db.select<MessageRow[]>(
    "SELECT * FROM messages WHERE topic_id = ? ORDER BY created_at ASC",
    [topicId]
  );
}

export async function insertMessage(input: {
  topic_id: ID;
  role: "user" | "assistant" | "system";
  content: string;
  interactive_data?: string | null;
  md_offset?: number | null;
  tokens?: number | null;
}): Promise<MessageRow> {
  const db = await getDb();
  const id = nanoid(12);
  const now = Date.now();
  await db.execute(
    `INSERT INTO messages (id, topic_id, role, content, interactive_data, md_offset, tokens, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.topic_id,
      input.role,
      input.content,
      input.interactive_data ?? null,
      input.md_offset ?? null,
      input.tokens ?? null,
      now,
    ]
  );
  return {
    id,
    topic_id: input.topic_id,
    role: input.role,
    content: input.content,
    interactive_data: input.interactive_data ?? null,
    md_offset: input.md_offset ?? null,
    tokens: input.tokens ?? null,
    created_at: now,
  };
}

export async function deleteMessagesByTopic(topicId: ID): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM messages WHERE topic_id = ?", [topicId]);
}
