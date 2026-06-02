import { getDb } from "../sql";
import type { Settings } from "../../types";

const DEFAULTS: Settings = {
  startup_mode: "last",
  last_topic_id: null,
  theme: "dark",
  language: "zh-CN",
  default_agent_id: null,
  default_model_ref: null,
};

export async function getAllSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings"
  );
  const out: Settings = { ...DEFAULTS };
  for (const r of rows) {
    try {
      (out as unknown as Record<string, unknown>)[r.key] = JSON.parse(r.value);
    } catch {
      (out as unknown as Record<string, unknown>)[r.key] = r.value;
    }
  }
  return out;
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)]
  );
}
