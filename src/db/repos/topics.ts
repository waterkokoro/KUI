import { nanoid } from "nanoid";
import { getDb } from "../sql";
import type { Topic, ID, TopicType } from "../../types";

export async function listTopics(profileId?: ID): Promise<Topic[]> {
  const db = await getDb();
  if (profileId) {
    return db.select<Topic[]>(
      "SELECT * FROM topics WHERE profile_id = ? ORDER BY parent_id IS NULL DESC, sort_order ASC, created_at ASC",
      [profileId]
    );
  }
  return db.select<Topic[]>(
    "SELECT * FROM topics ORDER BY parent_id IS NULL DESC, sort_order ASC, created_at ASC"
  );
}

export async function getTopic(id: ID): Promise<Topic | null> {
  const db = await getDb();
  const rows = await db.select<Topic[]>("SELECT * FROM topics WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function createTopic(input: {
  title: string;
  parent_id?: ID | null;
  profile_id?: ID | null;
  icon?: string | null;
  type?: TopicType;
  agent_id?: ID | null;
  model_ref?: string | null;
  summary?: string | null;
}): Promise<Topic> {
  const db = await getDb();
  const id = nanoid(12);
  const now = Date.now();
  const row: Topic = {
    id,
    parent_id: input.parent_id ?? null,
    profile_id: input.profile_id ?? null,
    title: input.title || "Untitled",
    icon: input.icon ?? null,
    type: input.type ?? "chat",
    agent_id: input.agent_id ?? null,
    model_ref: input.model_ref ?? null,
    summary: input.summary ?? null,
    sort_order: now,
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO topics (id, parent_id, profile_id, title, icon, type, agent_id, model_ref, summary, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.parent_id,
      row.profile_id,
      row.title,
      row.icon,
      row.type,
      row.agent_id,
      row.model_ref,
      row.summary,
      row.sort_order,
      row.created_at,
      row.updated_at,
    ]
  );
  return row;
}

export async function updateTopic(id: ID, patch: Partial<Topic>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const args: unknown[] = [];
  for (const k of [
    "parent_id",
    "title",
    "icon",
    "type",
    "agent_id",
    "model_ref",
    "summary",
    "sort_order",
    "profile_id",
  ] as (keyof Topic)[]) {
    if (k in patch) {
      fields.push(`${String(k)} = ?`);
      args.push(patch[k] as unknown);
    }
  }
  if (!fields.length) return;
  fields.push("updated_at = ?");
  args.push(Date.now());
  args.push(id);
  await db.execute(`UPDATE topics SET ${fields.join(", ")} WHERE id = ?`, args);
}

export async function deleteTopic(id: ID): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM topics WHERE id = ?", [id]);
}

export async function promoteToRoot(id: ID): Promise<void> {
  await updateTopic(id, { parent_id: null });
}
