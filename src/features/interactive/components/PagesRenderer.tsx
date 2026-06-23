import { useState, useCallback, useEffect } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { PagesData, InteractiveBlockData, InteractiveResult } from "../types";
import { InteractiveBlock } from "./InteractiveBlock";

interface Props {
  data: PagesData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

/** 纯展示类型，不产生用户交互结果 */
const DISPLAY_ONLY_TYPES = new Set(["card", "translation"]);

function isDisplayOnlyPage(block: InteractiveBlockData): boolean {
  return DISPLAY_ONLY_TYPES.has(block.type);
}

/** 为展示型页面创建占位结果 */
function makePlaceholder(): InteractiveResult {
  // card and translation are display-only; use translation shape with undefined selected
  return { type: "translation", selected: undefined } as InteractiveResult;
}

export function PagesRenderer({ data, disabled, onSubmit }: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<InteractiveResult[]>([]);

  const isValid = data && Array.isArray(data.pages) && data.pages.length > 0;
  const total = isValid ? data.pages.length : 0;

  // Hooks MUST be called unconditionally (before any early return)
  const tryFinish = useCallback(
    (nextResults: InteractiveResult[]) => {
      if (disabled) return; // Don't submit when disabled (already submitted)
      // Fill placeholders for display-only pages that were skipped
      const filled = [...nextResults];
      for (let i = 0; i < total; i++) {
        if (filled[i] === undefined && isValid) {
          const block = data.pages[i];
          if (block && isDisplayOnlyPage(block)) {
            filled[i] = makePlaceholder();
          }
        }
      }
      if (filled.length >= total && filled[total - 1] !== undefined) {
        onSubmit({ type: "pages", pageResults: filled });
      }
    },
    [onSubmit, total, data, isValid, disabled],
  );

  // Auto-advance past display-only pages (card, translation)
  // These pages don't collect user input, so auto-fill placeholder and move on
  useEffect(() => {
    if (disabled || !isValid) return;
    const currentBlock = data.pages[page];
    if (!currentBlock || !isDisplayOnlyPage(currentBlock)) return;
    if (results[page]) return; // Already has result

    // Fill placeholder and advance or finish
    const next = [...results];
    next[page] = makePlaceholder();
    setResults(next);

    if (page < total - 1) {
      setPage(page + 1);
    } else {
      onSubmit({ type: "pages", pageResults: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!isValid) {
    return <div className="kui-interactive-error">Pages: invalid data</div>;
  }

  /** A page explicitly submitted a result (user clicked/typed) */
  const handlePageSubmit = (result: InteractiveResult) => {
    const next = [...results];
    next[page] = result;

    if (page < total - 1) {
      setResults(next);
      // Auto-advance to next page
      setPage(page + 1);
    } else {
      // Last page submitted — fill any remaining display-only holes before finishing
      for (let i = 0; i < total; i++) {
        if (next[i] === undefined) {
          const block = data.pages[i];
          if (block && isDisplayOnlyPage(block)) {
            next[i] = makePlaceholder();
          }
        }
      }
      setResults(next);
      onSubmit({ type: "pages", pageResults: next });
    }
  };

  /** Navigate forward — always allowed. If current page has no result, skip it. */
  const goNext = () => {
    if (page >= total - 1) return;
    const next = [...results];
    // Auto-fill placeholder for current page if it's display-only
    const currentBlock = data.pages[page];
    if (currentBlock && isDisplayOnlyPage(currentBlock) && next[page] === undefined) {
      next[page] = makePlaceholder();
      setResults(next);
    }
    const nextPage = page + 1;
    setPage(nextPage);

    // If this was the last navigable step, check if we should finish
    // (skip when disabled — prevents re-submission on remount)
    if (!disabled && nextPage === total - 1) {
      tryFinish(next);
    }
  };

  const goPrev = () => {
    if (page > 0) setPage(page - 1);
  };

  const canGoNext = page < total - 1;
  const canGoPrev = page > 0;

  return (
    <div className="kui-interactive-pages">
      <div className="kui-interactive-pages-nav">
        <button
          className="kui-interactive-btn kui-interactive-btn--text"
          disabled={!canGoPrev}
          onClick={goPrev}
        >
          <LeftOutlined />
        </button>
        {data.showPageNumber !== false && (
          <span className="kui-interactive-pages-indicator">{page + 1} / {total}</span>
        )}
        <button
          className="kui-interactive-btn kui-interactive-btn--text"
          disabled={!canGoNext}
          onClick={goNext}
        >
          <RightOutlined />
        </button>
      </div>
      <div className="kui-interactive-pages-content">
        {data.pages[page] ? (
          <InteractiveBlock
            block={data.pages[page]}
            disabled={disabled || !!results[page]}
            onSubmit={handlePageSubmit}
            hideHeader
          />
        ) : (
          <div className="kui-interactive-card">
            <div className="kui-interactive-card-body">
              <div className="kui-interactive-card-content" style={{ opacity: 0.5 }}>
                {t("interactive.pageUnavailable", { page: page + 1 })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
