import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type Connection,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { App, Input, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { listTopics } from "../../db/repos/topics";
import { listLinks, createLink, updateLinkNote, deleteLink } from "../../db/repos/links";
import type { Topic } from "../../types";
import { useAppStore } from "../../stores/appStore";

function layoutTree(topics: Topic[]): Map<string, { x: number; y: number }> {
  const childrenOf = new Map<string | null, Topic[]>();
  for (const t of topics) {
    const k = t.parent_id;
    if (!childrenOf.has(k)) childrenOf.set(k, []);
    childrenOf.get(k)!.push(t);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let xCursor = 0;
  const dfs = (id: string | null, depth: number) => {
    const list = childrenOf.get(id) ?? [];
    for (const c of list) {
      dfs(c.id, depth + 1);
    }
    if (id !== null) {
      const kids = childrenOf.get(id) ?? [];
      if (kids.length === 0) {
        pos.set(id, { x: xCursor * 220, y: depth * 130 });
        xCursor += 1;
      } else {
        const xs = kids.map((c) => pos.get(c.id)!.x);
        const x = (Math.min(...xs) + Math.max(...xs)) / 2;
        pos.set(id, { x, y: depth * 130 });
      }
    }
  };
  // virtual root pass: walk roots
  const roots = childrenOf.get(null) ?? [];
  for (const r of roots) {
    dfs(r.id, 0);
  }
  return pos;
}

export function GraphView() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { currentTopicId, setCurrentTopic, setView } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reload = useCallback(async () => {
    const [topics, links] = await Promise.all([listTopics(), listLinks()]);
    const pos = layoutTree(topics);
    const ns: Node[] = topics.map((t) => ({
      id: t.id,
      data: { label: t.title || "untitled" },
      position: pos.get(t.id) ?? { x: 0, y: 0 },
      style: {
        border: t.id === currentTopicId ? "2px solid #1677ff" : "1px solid var(--ant-color-border)",
        borderRadius: 8,
        padding: 8,
        background: "var(--ant-color-bg-elevated)",
        color: "var(--ant-color-text)",
        minWidth: 140,
      },
    }));
    const es: Edge[] = [];
    for (const t of topics) {
      if (t.parent_id) {
        es.push({
          id: `p-${t.parent_id}-${t.id}`,
          source: t.parent_id,
          target: t.id,
          type: "default",
          style: { stroke: "var(--ant-color-text-secondary)" },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    }
    for (const l of links) {
      es.push({
        id: `l-${l.id}`,
        source: l.from_id,
        target: l.to_id,
        label: l.note ?? "",
        animated: false,
        style: { stroke: "#13c2c2", strokeDasharray: "6 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#13c2c2" },
        data: { linkId: l.id, kind: "manual" } as Record<string, unknown>,
      });
    }
    setNodes(ns);
    setEdges(es);
  }, [currentTopicId, setEdges, setNodes]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onConnect = useCallback(
    async (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const link = await createLink(c.source, c.target, "");
      setEdges((eds) =>
        addEdge(
          {
            id: `l-${link.id}`,
            source: link.from_id,
            target: link.to_id,
            label: "",
            style: { stroke: "#13c2c2", strokeDasharray: "6 4" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#13c2c2" },
            data: { linkId: link.id, kind: "manual" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const data = edge.data as { linkId?: string; kind?: string } | undefined;
      if (data?.kind !== "manual" || !data.linkId) return;
      let note = (edge.label as string) ?? "";
      let instance: { destroy: () => void } | null = null;
      instance = modal.confirm({
        title: t("graph.linkNote"),
        content: <Input.TextArea defaultValue={note} onChange={(e) => (note = e.target.value)} autoSize />,
        okText: t("common.save"),
        footer: (_, { OkBtn, CancelBtn }) => (
          <Space>
            <Button
              danger
              onClick={async () => {
                await deleteLink(data.linkId!);
                instance?.destroy();
                void reload();
              }}
            >
              {t("graph.deleteEdge")}
            </Button>
            <CancelBtn />
            <OkBtn />
          </Space>
        ),
        onOk: async () => {
          await updateLinkNote(data.linkId!, note);
          void reload();
        },
      });
    },
    [reload, t]
  );

  const initialNodes = useMemo(() => nodes, [nodes]);

  return (
    <>
      <div className="kui-chat-header">
        <span style={{ fontSize: 12, opacity: 0.7 }}>{t("graph.tip")}</span>
        <div style={{ flex: 1 }} />
        <Button size="small" onClick={() => void reload()}>
          {t("graph.layoutReset")}
        </Button>
      </div>
      <div className="kui-graph-canvas">
        <ReactFlow
          nodes={initialNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={(_, n) => {
            setCurrentTopic(n.id);
            setView("chat");
          }}
          fitView
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}
