import { nanoid } from "nanoid";
import { getDb } from "../sql";
import { getAllSettings, setSetting } from "./settings";
import type { Agent, ID } from "../../types";

export async function listAgents(): Promise<Agent[]> {
  const db = await getDb();
  return db.select<Agent[]>("SELECT * FROM agents ORDER BY created_at ASC");
}

export async function getAgent(id: ID): Promise<Agent | null> {
  const db = await getDb();
  const rows = await db.select<Agent[]>("SELECT * FROM agents WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function upsertAgent(a: Partial<Agent> & { name: string }): Promise<Agent> {
  const db = await getDb();
  const now = Date.now();
  if (a.id) {
    await db.execute(
      `UPDATE agents SET name=?, system_prompt=?, default_model_ref=?, avatar=? WHERE id=?`,
      [a.name, a.system_prompt ?? "", a.default_model_ref ?? null, a.avatar ?? null, a.id]
    );
    return (await getAgent(a.id))!;
  }
  const id = nanoid(10);
  const row: Agent = {
    id,
    name: a.name,
    system_prompt: a.system_prompt ?? "",
    default_model_ref: a.default_model_ref ?? null,
    avatar: a.avatar ?? null,
    created_at: now,
  };
  await db.execute(
    `INSERT INTO agents (id, name, system_prompt, default_model_ref, avatar, created_at) VALUES (?,?,?,?,?,?)`,
    [row.id, row.name, row.system_prompt, row.default_model_ref, row.avatar, row.created_at]
  );
  return row;
}

export async function deleteAgent(id: ID): Promise<void> {
  const db = await getDb();
  // Clear agent_id references in topics (foreign_keys pragma is not enabled)
  await db.execute("UPDATE topics SET agent_id = NULL WHERE agent_id = ?", [id]);
  // Clear default_agent_id in settings if it references this agent
  const settings = await getAllSettings();
  if (settings.default_agent_id === id) {
    await setSetting("default_agent_id", null);
  }
  await db.execute("DELETE FROM agents WHERE id = ?", [id]);
}
