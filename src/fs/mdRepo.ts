import { appendTextFile, ensureDir, getAppDataDir, readTextFile, writeTextFile, deletePath } from "../ipc";

let _root: string | null = null;
async function rootDir(): Promise<string> {
  if (!_root) {
    const base = await getAppDataDir();
    _root = `${base}/topics`;
    await ensureDir(_root);
  }
  return _root;
}

export async function topicsRoot(): Promise<string> {
  return rootDir();
}

function topicMdPath(root: string, topicId: string): string {
  return `${root}/${topicId}/main.md`;
}

export async function appendMessageMd(
  topicId: string,
  role: "user" | "assistant" | "system",
  content: string
): Promise<number> {
  const root = await rootDir();
  const path = topicMdPath(root, topicId);
  const block = `\n\n---\n**${role}** · ${new Date().toISOString()}\n\n${content}\n`;
  return appendTextFile(path, block);
}

export async function readTopicMd(topicId: string): Promise<string> {
  const root = await rootDir();
  return readTextFile(topicMdPath(root, topicId));
}

export async function writeTopicMd(topicId: string, content: string): Promise<void> {
  const root = await rootDir();
  await writeTextFile(topicMdPath(root, topicId), content);
}

export async function deleteTopicDir(topicId: string): Promise<void> {
  const root = await rootDir();
  await deletePath(`${root}/${topicId}`);
}

export async function topicMdAbsPath(topicId: string): Promise<string> {
  const root = await rootDir();
  return topicMdPath(root, topicId);
}
