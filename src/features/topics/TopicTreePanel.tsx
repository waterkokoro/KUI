import { useEffect, useMemo, useState } from "react";
import { App, Tree, Input, Button, Modal, Menu } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  promoteToRoot,
} from "../../db/repos/topics";
import { deleteTopicDir } from "../../fs/mdRepo";
import { buildTree, type TreeNode } from "./topicTree";
import type { Topic } from "../../types";

interface RawNode {
  key: string;
  title: React.ReactNode;
  raw: Topic;
  children?: RawNode[];
}

function toAntd(nodes: TreeNode[], untitled: string): RawNode[] {
  return nodes.map((n) => ({
    key: n.key,
    raw: n.topic,
    title: (
      <span style={{ display: "inline-block", width: "100%" }}>
        {n.topic.title || untitled}
      </span>
    ),
    children: n.children.length ? toAntd(n.children, untitled) : undefined,
  }));
}

export function TopicTreePanel() {
  const { t } = useTranslation();
  const { modal, message } = App.useApp();
  const { currentTopicId, setCurrentTopic, treeReloadKey, reloadTree, setView } =
    useAppStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filter, setFilter] = useState("");

  // 右键菜单状态
  const [ctx, setCtx] = useState<{ topic: Topic; x: number; y: number } | null>(
    null
  );

  // 重命名 Modal 受控 state（替代闭包式写法，避免不刷新）
  const [renaming, setRenaming] = useState<{ topic: Topic; name: string } | null>(
    null
  );

  useEffect(() => {
    void listTopics().then(setTopics);
  }, [treeReloadKey]);

  // 点击其他地方 / 滚动 / Esc 关闭右键菜单
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  const tree = useMemo(() => buildTree(topics), [topics]);
  const filtered = useMemo(() => {
    if (!filter.trim()) return tree;
    const lower = filter.toLowerCase();
    const filt = (nodes: TreeNode[]): TreeNode[] => {
      const out: TreeNode[] = [];
      for (const n of nodes) {
        const kids = filt(n.children);
        if (n.title.toLowerCase().includes(lower) || kids.length) {
          out.push({ ...n, children: kids });
        }
      }
      return out;
    };
    return filt(tree);
  }, [tree, filter]);

  const handleMenu = async (topic: Topic, key: string) => {
    if (key === "newChild") {
      const created = await createTopic({
        title: t("topic.newTitle"),
        parent_id: topic.id,
      });
      reloadTree();
      setCurrentTopic(created.id);
      setView("chat");
    } else if (key === "rename") {
      setRenaming({ topic, name: topic.title });
    } else if (key === "delete") {
      modal.confirm({
        title: t("tree.menu.delete"),
        content: t("tree.confirmDelete"),
        okButtonProps: { danger: true },
        okText: t("common.ok"),
        cancelText: t("common.cancel"),
        onOk: async () => {
          await deleteTopic(topic.id);
          await deleteTopicDir(topic.id).catch(() => {});
          if (currentTopicId === topic.id) setCurrentTopic(null);
          reloadTree();
        },
      });
    } else if (key === "promote") {
      await promoteToRoot(topic.id);
      reloadTree();
      message.success("OK");
    } else if (key === "openGraph") {
      setCurrentTopic(topic.id);
      setView("graph");
    }
  };

  const newRoot = async () => {
    const created = await createTopic({
      title: t("topic.newTitle"),
      parent_id: null,
    });
    reloadTree();
    setCurrentTopic(created.id);
    setView("chat");
  };

  // 右键菜单项
  const ctxItems = ctx
    ? [
        { key: "newChild", label: t("tree.menu.newChild") },
        { key: "rename", label: t("tree.menu.rename") },
        {
          key: "promote",
          label: t("tree.menu.promote"),
          disabled: ctx.topic.parent_id === null,
        },
        { key: "openGraph", label: t("tree.menu.openGraph") },
        { type: "divider" as const },
        { key: "delete", label: t("tree.menu.delete"), danger: true },
      ]
    : [];

  // 防止右键菜单超出屏幕
  const MENU_W = 180;
  const MENU_H = 220;
  const ctxX = ctx ? Math.min(ctx.x, window.innerWidth - MENU_W - 8) : 0;
  const ctxY = ctx ? Math.min(ctx.y, window.innerHeight - MENU_H - 8) : 0;

  return (
    <div className="kui-sidebar">
      <div className="kui-sidebar-header">
        <Input
          placeholder={t("tree.searchPlaceholder")}
          allowClear
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
        />
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={newRoot}
          title={t("tree.newRoot")}
        />
      </div>
      <div className="kui-sidebar-tree">
        {tree.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>
            {t("tree.empty")}
          </div>
        ) : (
          <Tree
            blockNode
            showLine
            treeData={toAntd(filtered, t("topic.untitled"))}
            selectedKeys={currentTopicId ? [currentTopicId] : []}
            onSelect={(keys) => {
              const k = keys[0] as string | undefined;
              if (k) {
                setCurrentTopic(k);
                setView("chat");
              }
            }}
            onRightClick={({ event, node }) => {
              event.preventDefault();
              event.stopPropagation();
              const raw = (node as unknown as RawNode).raw;
              if (!raw) return;
              setCtx({
                topic: raw,
                x: (event as unknown as MouseEvent).clientX,
                y: (event as unknown as MouseEvent).clientY,
              });
            }}
          />
        )}
      </div>

      {/* 自定义 Context Menu */}
      {ctx && (
        <div
          className="kui-tree-ctx-menu"
          style={{
            position: "fixed",
            left: ctxX,
            top: ctxY,
            zIndex: 1100,
            minWidth: MENU_W,
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)",
            borderRadius: 6,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Menu
            items={ctxItems}
            selectable={false}
            onClick={({ key, domEvent }) => {
              domEvent.stopPropagation();
              const target = ctx.topic;
              setCtx(null);
              void handleMenu(target, key);
            }}
          />
        </div>
      )}

      {/* 重命名 Modal（受控 state） */}
      <Modal
        title={t("tree.menu.rename")}
        open={!!renaming}
        onCancel={() => setRenaming(null)}
        onOk={async () => {
          if (!renaming) return;
          const next = renaming.name.trim() || t("topic.untitled");
          await updateTopic(renaming.topic.id, { title: next });
          setRenaming(null);
          reloadTree();
        }}
        destroyOnClose
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Input
          value={renaming?.name ?? ""}
          autoFocus
          onChange={(e) =>
            setRenaming((r) => (r ? { ...r, name: e.target.value } : r))
          }
          onPressEnter={async () => {
            if (!renaming) return;
            const next = renaming.name.trim() || t("topic.untitled");
            await updateTopic(renaming.topic.id, { title: next });
            setRenaming(null);
            reloadTree();
          }}
        />
      </Modal>
    </div>
  );
}
