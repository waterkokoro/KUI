import { nanoid } from "nanoid";
import { getDb } from "../sql";
import type { Provider, ModelRow, ID, ProviderKind } from "../../types";

export async function listProviders(): Promise<Provider[]> {
  const db = await getDb();
  return db.select<Provider[]>("SELECT * FROM providers ORDER BY name");
}

export async function getProvider(id: ID): Promise<Provider | null> {
  const db = await getDb();
  const rows = await db.select<Provider[]>("SELECT * FROM providers WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function upsertProvider(p: {
  id?: ID;
  name: string;
  kind: ProviderKind;
  base_url: string;
  api_key: string;
  enabled?: 0 | 1;
}): Promise<Provider> {
  const db = await getDb();
  if (p.id) {
    await db.execute(
      `UPDATE providers SET name=?, kind=?, base_url=?, api_key=?, enabled=? WHERE id=?`,
      [p.name, p.kind, p.base_url, p.api_key, p.enabled ?? 1, p.id]
    );
    return (await getProvider(p.id))!;
  }
  const id = nanoid(10);
  const row: Provider = {
    id,
    name: p.name,
    kind: p.kind,
    base_url: p.base_url,
    api_key: p.api_key,
    enabled: p.enabled ?? 1,
  };
  await db.execute(
    `INSERT INTO providers (id, name, kind, base_url, api_key, enabled) VALUES (?,?,?,?,?,?)`,
    [row.id, row.name, row.kind, row.base_url, row.api_key, row.enabled]
  );
  return row;
}

export async function deleteProvider(id: ID): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM providers WHERE id = ?", [id]);
}

export async function listModels(providerId?: ID): Promise<ModelRow[]> {
  const db = await getDb();
  if (providerId) {
    return db.select<ModelRow[]>(
      "SELECT * FROM models WHERE provider_id = ? ORDER BY display_name",
      [providerId]
    );
  }
  return db.select<ModelRow[]>("SELECT * FROM models ORDER BY display_name");
}

export async function upsertModel(m: {
  id?: ID;
  provider_id: ID;
  model_id: string;
  display_name: string;
}): Promise<ModelRow> {
  const db = await getDb();
  if (m.id) {
    await db.execute(
      `UPDATE models SET provider_id=?, model_id=?, display_name=? WHERE id=?`,
      [m.provider_id, m.model_id, m.display_name, m.id]
    );
    return { id: m.id, provider_id: m.provider_id, model_id: m.model_id, display_name: m.display_name };
  }
  const id = nanoid(10);
  await db.execute(
    `INSERT INTO models (id, provider_id, model_id, display_name) VALUES (?,?,?,?)`,
    [id, m.provider_id, m.model_id, m.display_name]
  );
  return { id, provider_id: m.provider_id, model_id: m.model_id, display_name: m.display_name };
}

export async function deleteModel(id: ID): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM models WHERE id = ?", [id]);
}
