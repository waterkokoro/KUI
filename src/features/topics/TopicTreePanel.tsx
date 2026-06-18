import { useEffect, useMemo, useRef, useState } from "react";
import { App, Tree, Input, Button, Modal, Menu, Tooltip, Space, Dropdown } from "antd";
import { PlusOutlined, MessageOutlined, ApartmentOutlined, SettingOutlined, DownOutlined, InteractionOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import mascotImg from "../../assets/kui/kui_def.png";
import { useAppStore } from "../../stores/appStore";
import {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  promoteToRoot,
} from "../../db/repos/topics";
import { setSetting } from "../../db/repos/settings";
import { deleteTopicDir } from "../../fs/mdRepo";
import { buildTree, getAncestorIds, type TreeNode } from "./topicTree";
import type { Topic } from "../../types";
import { EMOJI_PRESETS, DEFAULT_TOPIC_ICON } from "../../constants/emojiPresets";
import { Twemoji } from "../../components/Twemoji";

interface RawNode {
  key: string;
  title: React.ReactNode;
  raw: Topic;
  children?: RawNode[];
}

const DEFAULT_ICON = DEFAULT_TOPIC_ICON;

function toAntd(nodes: TreeNode[], untitled: string): RawNode[] {
  return nodes.map((n) => ({
    key: n.key,
    raw: n.topic,
    title: (
      <span style={{ display: "inline-flex", alignItems: "center", width: "100%" }}>
        {n.topic.type === "interactive" ? (
          <InteractionOutlined style={{ marginRight: 5, flexShrink: 0, fontSize: 14, color: "var(--primary-color, #6366f1)" }} />
        ) : (
          <Twemoji emoji={n.topic.icon || DEFAULT_ICON} size={16} style={{ marginRight: 5, flexShrink: 0 }} />
        )}
        {n.topic.title || untitled}
      </span>
    ),
    children: n.children.length ? toAntd(n.children, untitled) : undefined,
  }));
}

export function TopicTreePanel() {
  const { t } = useTranslation();
  const { modal, message } = App.useApp();
  const { currentTopicId, setCurrentTopic, treeReloadKey, reloadTree, setView, view, currentProfileId, setCurrentProfile, profiles, requestProfileCreate, locateTopicKey } =
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

  // 图标选择 Modal
  const [iconPicking, setIconPicking] = useState<{ topic: Topic; icon: string } | null>(
    null
  );

  // 受控展开状态
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listTopics(currentProfileId ?? undefined).then(setTopics);
  }, [treeReloadKey, currentProfileId]);

  // 当 topics 变化时，自动展开包含当前选中 topic 的路径
  useEffect(() => {
    if (!currentTopicId || topics.length === 0) return;
    const ancestors = getAncestorIds(topics, currentTopicId);
    setExpandedKeys((prev) => {
      const set = new Set(prev);
      ancestors.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }, [topics, currentTopicId]);

  // 定位到当前 topic：展开祖先 + 滚动到节点
  useEffect(() => {
    if (locateTopicKey === 0 || !currentTopicId || topics.length === 0) return;
    const ancestors = getAncestorIds(topics, currentTopicId);
    setExpandedKeys((prev) => {
      const set = new Set(prev);
      ancestors.forEach((id) => set.add(id));
      return Array.from(set);
    });
    // 延迟等待树渲染后滚动到节点
    setTimeout(() => {
      const container = treeContainerRef.current;
      if (!container) return;
      const node = container.querySelector(
        `.ant-tree-treenode[data-key="${currentTopicId}"], [data-key="${currentTopicId}"]`
      ) ?? container.querySelector(".ant-tree-node-selected")?.closest(".ant-tree-treenode");
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 100);
  }, [locateTopicKey]);

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
        profile_id: currentProfileId,
      });
      reloadTree();
      setCurrentTopic(created.id);
      setView("chat");
    } else if (key === "newInteractiveChild") {
      const created = await createTopic({
        title: t("topic.newInteractiveTitle"),
        parent_id: topic.id,
        profile_id: currentProfileId,
        type: "interactive",
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
    } else if (key === "setIcon") {
      setIconPicking({ topic, icon: topic.icon || "" });
    }
  };

  const newRoot = async () => {
    const created = await createTopic({
      title: t("topic.newTitle"),
      parent_id: null,
      profile_id: currentProfileId,
    });
    reloadTree();
    setCurrentTopic(created.id);
    setView("chat");
  };

  const newInteractiveRoot = async () => {
    const created = await createTopic({
      title: t("topic.newInteractiveTitle"),
      parent_id: null,
      profile_id: currentProfileId,
      type: "interactive",
    });
    reloadTree();
    setCurrentTopic(created.id);
    setView("chat");
  };

  // 右键菜单项
  const ctxItems = ctx
    ? [
        { key: "newChild", label: t("tree.menu.newChild") },
        { key: "newInteractiveChild", label: t("tree.menu.newInteractiveChild") },
        { key: "rename", label: t("tree.menu.rename") },
        { key: "setIcon", label: t("tree.menu.setIcon") },
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
      {/* 顶部拖动区域（交通灯安全区） */}
      <div className="kui-sidebar-drag" data-tauri-drag-region="true" />
      {/* Logo + 全局导航 */}
      <div className="kui-sidebar-brand">
        <div className="kui-brand-badge">
          <img src={mascotImg} alt="KUI mascot" className="kui-mascot" />
          <span className="kui-logo">KUI</span>
        </div>
      </div>
      <div className="kui-sidebar-header">
        <div className="kui-sidebar-header-row">
          {/* Profile Switcher */}
          {profiles.length > 0 && (
            <Dropdown
              trigger={["click"]}
              placement="bottomLeft"
              dropdownRender={() => (
                <div className="kui-profile-dropdown">
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      className={`kui-profile-item ${p.id === currentProfileId ? "active" : ""}`}
                      onClick={() => {
                        setCurrentProfile(p.id);
                        void setSetting("last_profile_id", p.id);
                      }}
                    >
                      <span className="kui-profile-item-icon">{p.icon || "\u{1F4CB}"}</span>
                      <span className="kui-profile-item-name">{p.name}</span>
                    </div>
                  ))}
                  <div className="kui-profile-divider" />
                  <div
                    className="kui-profile-item kui-profile-add"
                    onClick={() => requestProfileCreate()}
                  >
                    <PlusOutlined style={{ fontSize: 12 }} />
                    <span className="kui-profile-item-name">{t("profile.add")}</span>
                  </div>
                </div>
              )}
            >
              <div className="kui-profile-trigger">
                <span className="kui-profile-trigger-name">
                  {profiles.find((p) => p.id === currentProfileId)?.name || ""}
                </span>
                <DownOutlined className="kui-profile-trigger-arrow" />
              </div>
            </Dropdown>
          )}
          <div style={{ flex: 1 }} />
          <Space size={2}>
            <Tooltip title={t("nav.chat")}>
              <Button
                size="small"
                type={view === "chat" ? "primary" : "text"}
                icon={<MessageOutlined />}
                onClick={() => setView("chat")}
              />
            </Tooltip>
            <Tooltip title={t("nav.graph")}>
              <Button
                size="small"
                type={view === "graph" ? "primary" : "text"}
                icon={<ApartmentOutlined />}
                onClick={() => setView("graph")}
              />
            </Tooltip>
            <Tooltip title={t("nav.settings")}>
              <Button
                size="small"
                type={view === "settings" ? "primary" : "text"}
                icon={<SettingOutlined />}
                onClick={() => setView("settings")}
              />
            </Tooltip>
          </Space>
        </div>
        <div className="kui-sidebar-header-row">
          <Input
            placeholder={t("tree.searchPlaceholder")}
            allowClear
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="small"
            style={{ flex: 1 }}
          />
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={newRoot}
            title={t("tree.newRoot")}
          />
          <Tooltip title={t("tree.newInteractiveRoot")}>
            <Button
              size="small"
              type="default"
              icon={<InteractionOutlined />}
              onClick={newInteractiveRoot}
            />
          </Tooltip>
        </div>
      </div>
      <div className="kui-sidebar-tree" ref={treeContainerRef}>
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
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
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
          onPressEnter={async (e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (!renaming) return;
            const next = renaming.name.trim() || t("topic.untitled");
            await updateTopic(renaming.topic.id, { title: next });
            setRenaming(null);
            reloadTree();
          }}
        />
      </Modal>

      {/* 图标选择 Modal */}
      <Modal
        title={t("tree.menu.setIcon")}
        open={!!iconPicking}
        onCancel={() => setIconPicking(null)}
        onOk={async () => {
          if (!iconPicking) return;
          const icon = iconPicking.icon.trim() || null;
          await updateTopic(iconPicking.topic.id, { icon });
          setIconPicking(null);
          reloadTree();
        }}
        destroyOnClose
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={400}
      >
        <div style={{ marginBottom: 12 }}>
          <Input
            value={iconPicking?.icon ?? ""}
            placeholder={t("tree.icon.inputPlaceholder")}
            autoFocus
            onChange={(e) =>
              setIconPicking((s) => (s ? { ...s, icon: e.target.value } : s))
            }
            suffix={
              iconPicking?.icon ? (
                <span
                  style={{ cursor: "pointer", opacity: 0.5 }}
                  onClick={() =>
                    setIconPicking((s) => (s ? { ...s, icon: "" } : s))
                  }
                >
                  {t("tree.icon.clear")}
                </span>
              ) : null
            }
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 4,
          }}
        >
          {EMOJI_PRESETS.map((emoji) => (
            <Button
              key={emoji}
              type={iconPicking?.icon === emoji ? "primary" : "text"}
              style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              onClick={() =>
                setIconPicking((s) => (s ? { ...s, icon: emoji } : s))
              }
            >
              <Twemoji emoji={emoji} size={20} />
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
