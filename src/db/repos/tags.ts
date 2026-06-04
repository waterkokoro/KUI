import { nanoid } from "nanoid";
import { getDb } from "../sql";
import type { Tag, ID } from "../../types";

export async function listTags(profileId?: ID): Promise<Tag[]> {
  const db = await getDb();
  if (profileId) {
    return db.select<Tag[]>("SELECT * FROM tags WHERE profile_id = ? ORDER BY name", [profileId]);
  }
  return db.select<Tag[]>("SELECT * FROM tags ORDER BY name");
}

export async function getTopicTags(topicId: ID): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>(
    `SELECT t.* FROM tags t INNER JOIN topic_tags tt ON tt.tag_id = t.id WHERE tt.topic_id = ? ORDER BY t.name`,
    [topicId]
  );
}

export async function setTopicTags(topicId: ID, tagNames: string[], profileId?: ID): Promise<void> {
  const db = await getDb();
  const cleanNames = Array.from(
    new Set(tagNames.map((s) => s.trim()).filter(Boolean))
  );
  await db.execute("DELETE FROM topic_tags WHERE topic_id = ?", [topicId]);
  for (const name of cleanNames) {
    const found = await db.select<Tag[]>("SELECT * FROM tags WHERE name = ?", [name]);
    let tagId: string;
    if (found[0]) {
      tagId = found[0].id;
    } else {
      tagId = nanoid(8);
      await db.execute("INSERT INTO tags (id, name, profile_id) VALUES (?, ?, ?)", [tagId, name, profileId ?? null]);
    }
    await db.execute(
      "INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?, ?)",
      [topicId, tagId]
    );
  }
}
