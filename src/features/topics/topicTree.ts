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
