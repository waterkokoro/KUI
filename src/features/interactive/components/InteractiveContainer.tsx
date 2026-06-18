import { useState, useEffect } from "react";
import { Modal, Tooltip } from "antd";
import { FullscreenOutlined, ExpandOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { InteractivePayload, InteractiveBlockData, InteractiveResult } from "../types";
import { InteractiveBlock } from "./InteractiveBlock";

interface Props {
  payload: InteractivePayload;
  /** 整个 payload 是否已提交（用户操作后） */
  submitted: boolean;
  /** 所有 block 的交互结果汇总 */
  onSubmit: (results: InteractiveResult[]) => void;
  /** custom 组件 iframe 报错时回调，触发 AI 重试 */
  onRetry?: (errorMessage: string) => void;
}

type ViewMode = "normal" | "modal" | "fullscreen";

/** 纯展示类型，不产生用户交互结果 */
const DISPLAY_ONLY_TYPES = new Set(["card", "translation"]);

function isDisplayOnly(block: InteractiveBlockData): boolean {
  return DISPLAY_ONLY_TYPES.has(block.type);
}

export function InteractiveContainer({ payload, submitted, onSubmit, onRetry }: Props) {
  const { t } = useTranslation();
  const [results, setResults] = useState<Map<number, InteractiveResult>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  const blocks = payload && Array.isArray(payload.blocks) ? payload.blocks : [];

  // Auto-fill placeholder results for display-only blocks on mount
  useEffect(() => {
    if (submitted || blocks.length === 0) return;
    const displayOnlyIndices: number[] = [];
    blocks.forEach((block, i) => {
      if (block && isDisplayOnly(block) && !results.has(i)) {
        displayOnlyIndices.push(i);
      }
    });
    if (displayOnlyIndices.length === 0) return;

    setResults((prev) => {
      const next = new Map(prev);
      for (const i of displayOnlyIndices) {
        const block = blocks[i];
        next.set(i, { type: block.type as "translation", selected: undefined });
      }
      // Check if all blocks now have results
      if (payload.auto_submit !== false && next.size === blocks.length) {
        const allResults = blocks.map((_, i) => next.get(i)!);
        // Defer onSubmit to avoid state update during render
        setTimeout(() => onSubmit(allResults), 0);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, submitted]);

  const handleBlockSubmit = (index: number, result: InteractiveResult) => {
    const next = new Map(results);
    next.set(index, result);
    setResults(next);

    // 当所有 block 都有结果时，自动提交
    if (payload.auto_submit !== false && next.size === blocks.length) {
      const allResults = blocks.map((_, i) => next.get(i)!);
      onSubmit(allResults);
    }
  };

  // Guard: payload must have valid blocks array
  if (blocks.length === 0) {
    return <div className="kui-interactive-error">Interactive UI: no blocks to render</div>;
  }

  const renderBlocks = (isExpanded: boolean) => (
    <div className={`kui-interactive-container${submitted ? " kui-interactive-container--submitted" : ""}${isExpanded ? " kui-interactive-container--expanded" : ""}`}>
      {blocks.map((block, i) => (
        block ? (
          <InteractiveBlock
            key={i}
            block={block}
            disabled={submitted || results.has(i)}
            onSubmit={(r) => handleBlockSubmit(i, r)}
            hideHeader={isExpanded}
            onError={onRetry}
          />
        ) : (
          <div key={i} className="kui-interactive-error">Block {i + 1}: missing data</div>
        )
      ))}
    </div>
  );

  const isOpen = viewMode !== "normal";
  const isFullscreen = viewMode === "fullscreen";

  return (
    <>
      <div className="kui-interactive-wrapper">
        <div className="kui-interactive-expand-group">
          <Tooltip title={t("interactive.expandView")}>
            <button
              className="kui-interactive-expand-btn"
              onClick={() => setViewMode("modal")}
              type="button"
            >
              <FullscreenOutlined />
            </button>
          </Tooltip>
          <Tooltip title={t("interactive.fullscreen")}>
            <button
              className="kui-interactive-expand-btn"
              onClick={() => setViewMode("fullscreen")}
              type="button"
            >
              <ExpandOutlined />
            </button>
          </Tooltip>
        </div>
        {renderBlocks(false)}
      </div>

      <Modal
        open={isOpen}
        onCancel={() => setViewMode("normal")}
        footer={null}
        width={isFullscreen ? "100vw" : "92vw"}
        style={isFullscreen
          ? { top: 0, maxWidth: "100vw", margin: 0, padding: 0 }
          : { top: 20, maxWidth: 1200 }
        }
        rootClassName={`kui-interactive-modal${isFullscreen ? " kui-interactive-modal--fullscreen" : ""}`}
        destroyOnClose={false}
        title={null}
        closable={false}
      >
        <div className="kui-interactive-modal-header">
          <span className="kui-interactive-modal-title">
            {payload.blocks[0]?.title || t("interactive.expandView")}
          </span>
          <div className="kui-interactive-modal-actions">
            <Tooltip title={t("interactive.exitExpand")}>
              <button
                className="kui-interactive-action-btn kui-interactive-action-btn--close"
                onClick={() => setViewMode("normal")}
                type="button"
              >
                <CloseOutlined />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="kui-interactive-modal-body">
          {renderBlocks(true)}
        </div>
      </Modal>
    </>
  );
}
