import { getDb } from "../sql";
import type { User } from "../../types";

const LOCAL_USER_ID = "local";

export async function getOrCreateLocalUser(): Promise<User> {
  const db = await getDb();
  const rows = await db.select<User[]>("SELECT * FROM users WHERE id = ?", [LOCAL_USER_ID]);
  if (rows[0]) return rows[0];

  const now = Date.now();
  const user: User = {
    id: LOCAL_USER_ID,
    name: "Local User",
    email: null,
    avatar: null,
    auth_provider: "local",
    external_id: null,
    created_at: now,
  };
  await db.execute(
    `INSERT INTO users (id, name, email, avatar, auth_provider, external_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.email, user.avatar, user.auth_provider, user.external_id, user.created_at]
  );
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  const db = await getDb();
  const rows = await db.select<User[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "name" | "avatar">>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const args: unknown[] = [];
  if ("name" in patch) {
    fields.push("name = ?");
    args.push(patch.name);
  }
  if ("avatar" in patch) {
    fields.push("avatar = ?");
    args.push(patch.avatar);
  }
  if (!fields.length) return;
  args.push(id);
  await db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, args);
}
