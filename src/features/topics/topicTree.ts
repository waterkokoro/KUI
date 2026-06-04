import type { Topic } from "../../types";

export interface TreeNode {
  key: string;
  title: string;
  topic: Topic;
  children: TreeNode[];
}

export function buildTree(flat: Topic[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const t of flat) {
    map.set(t.id, { key: t.id, title: t.title, topic: t, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const t of flat) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.topic.sort_order - b.topic.sort_order);
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function collectDescendantIds(roots: TreeNode[], id: string): string[] {
  const ids: string[] = [];
  const find = (arr: TreeNode[]): TreeNode | null => {
    for (const n of arr) {
      if (n.key === id) return n;
      const r = find(n.children);
      if (r) return r;
    }
    return null;
  };
  const walk = (n: TreeNode) => {
    ids.push(n.key);
    n.children.forEach(walk);
  };
  const target = find(roots);
  if (target) walk(target);
  return ids;
}

/** 给定扁平 topic 列表和目标 id，返回其所有祖先节点的 id 数组（不包含自身） */
export function getAncestorIds(flat: Topic[], targetId: string): string[] {
  const parentMap = new Map<string, string | null>();
  for (const t of flat) {
    parentMap.set(t.id, t.parent_id);
  }
  const ancestors: string[] = [];
  let current = parentMap.get(targetId) ?? null;
  while (current) {
    ancestors.push(current);
    current = parentMap.get(current) ?? null;
  }
  return ancestors;
}
