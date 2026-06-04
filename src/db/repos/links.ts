import { nanoid } from "nanoid";
import { getDb } from "../sql";
import type { TopicLink, ID } from "../../types";

export async function listLinks(profileId?: ID): Promise<TopicLink[]> {
  const db = await getDb();
  if (profileId) {
    return db.select<TopicLink[]>(
      `SELECT tl.* FROM topic_links tl
       INNER JOIN topics t ON tl.from_id = t.id
       WHERE t.profile_id = ?
       ORDER BY tl.created_at ASC`,
      [profileId]
    );
  }
  return db.select<TopicLink[]>("SELECT * FROM topic_links ORDER BY created_at ASC");
}

export async function createLink(from_id: ID, to_id: ID, note = ""): Promise<TopicLink> {
  const db = await getDb();
  const id = nanoid(10);
  const created_at = Date.now();
  await db.execute(
    `INSERT INTO topic_links (id, from_id, to_id, note, created_at) VALUES (?,?,?,?,?)`,
    [id, from_id, to_id, note, created_at]
  );
  return { id, from_id, to_id, note, created_at };
}

export async function updateLinkNote(id: ID, note: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE topic_links SET note = ? WHERE id = ?", [note, id]);
}

export async function deleteLink(id: ID): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM topic_links WHERE id = ?", [id]);
}
