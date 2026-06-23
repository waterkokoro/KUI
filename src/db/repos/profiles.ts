import { nanoid } from "nanoid";
import { getDb } from "../sql";
import { deleteTopicDir } from "../../fs/mdRepo";
import type { Profile, ID } from "../../types";

export async function listProfiles(userId: ID): Promise<Profile[]> {
  const db = await getDb();
  return db.select<Profile[]>(
    "SELECT * FROM profiles WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
    [userId]
  );
}

export async function getProfile(id: ID): Promise<Profile | null> {
  const db = await getDb();
  const rows = await db.select<Profile[]>("SELECT * FROM profiles WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function createProfile(input: {
  user_id: ID;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<Profile> {
  const db = await getDb();
  const id = nanoid(10);
  const now = Date.now();
  const row: Profile = {
    id,
    user_id: input.user_id,
    name: input.name,
    icon: input.icon ?? null,
    color: input.color ?? null,
    sort_order: now,
    created_at: now,
  };
  await db.execute(
    `INSERT INTO profiles (id, user_id, name, icon, color, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.user_id, row.name, row.icon, row.color, row.sort_order, row.created_at]
  );
  return row;
}

export async function updateProfile(id: ID, patch: Partial<Pick<Profile, "name" | "icon" | "color" | "sort_order">>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const args: unknown[] = [];
  for (const k of ["name", "icon", "color", "sort_order"] as const) {
    if (k in patch) {
      fields.push(`${k} = ?`);
      args.push(patch[k] as unknown);
    }
  }
  if (!fields.length) return;
  args.push(id);
  await db.execute(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`, args);
}

export async function deleteProfile(id: ID): Promise<boolean> {
  const db = await getDb();
  // Prevent deleting the last profile
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM profiles WHERE user_id = (SELECT user_id FROM profiles WHERE id = ?)",
    [id]
  );
  if (rows[0] && rows[0].cnt <= 1) return false;

  // Collect topic IDs for file cleanup before deletion
  const topics = await db.select<{ id: string }[]>(
    "SELECT id FROM topics WHERE profile_id = ?",
    [id]
  );

  // Cascade delete all associated data (foreign_keys pragma is not enabled)
  await db.execute(
    "DELETE FROM messages WHERE topic_id IN (SELECT id FROM topics WHERE profile_id = ?)",
    [id]
  );
  await db.execute(
    "DELETE FROM topic_links WHERE from_id IN (SELECT id FROM topics WHERE profile_id = ?) OR to_id IN (SELECT id FROM topics WHERE profile_id = ?)",
    [id, id]
  );
  await db.execute(
    "DELETE FROM topic_tags WHERE topic_id IN (SELECT id FROM topics WHERE profile_id = ?)",
    [id]
  );
  // Delete tags that belong to this profile and are no longer referenced by any topic
  await db.execute(
    "DELETE FROM tags WHERE profile_id = ? AND id NOT IN (SELECT tag_id FROM topic_tags)",
    [id]
  );
  // Promote children from other profiles to root (prevent dangling parent_id references)
  await db.execute(
    "UPDATE topics SET parent_id = NULL WHERE parent_id IN (SELECT id FROM topics WHERE profile_id = ?) AND profile_id != ?",
    [id, id]
  );
  await db.execute("DELETE FROM topics WHERE profile_id = ?", [id]);
  await db.execute("DELETE FROM profiles WHERE id = ?", [id]);

  // Clean up markdown files on disk
  for (const t of topics) {
    await deleteTopicDir(t.id).catch(() => {});
  }

  return true;
}
