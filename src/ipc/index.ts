import { invoke } from "@tauri-apps/api/core";

export async function getAppDataDir(): Promise<string> {
  return invoke<string>("app_data_dir");
}

export async function ensureDir(path: string): Promise<void> {
  return invoke("ensure_dir", { path });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function appendTextFile(path: string, content: string): Promise<number> {
  return invoke<number>("append_text_file", { path, content });
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  return invoke("write_text_file", { path, content });
}

export async function deletePath(path: string): Promise<void> {
  return invoke("delete_path", { path });
}

export interface GrepHit {
  topic_id: string;
  file: string;
  line: number;
  snippet: string;
}

export async function grepTopics(root: string, query: string, isRegex = false): Promise<GrepHit[]> {
  return invoke<GrepHit[]>("grep_topics", { root, query, isRegex });
}

export interface UpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  return invoke<UpdateInfo | null>("check_for_updates");
}

export async function downloadAndInstallUpdate(): Promise<void> {
  return invoke("download_and_install_update");
}
