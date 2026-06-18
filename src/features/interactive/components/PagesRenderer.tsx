import { useState, useCallback } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { PagesData, InteractiveResult } from "../types";
import { InteractiveBlock } from "./InteractiveBlock";

interface Props {
  data: PagesData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

export function PagesRenderer({ data, disabled, onSubmit }: Props) {
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<InteractiveResult[]>([]);

  const isValid = data && Array.isArray(data.pages) && data.pages.length > 0;
  const total = isValid ? data.pages.length : 0;

  // Hooks MUST be called unconditionally (before any early return)
  const tryFinish = useCallback(
    (nextResults: InteractiveResult[]) => {
      if (nextResults.length >= total && nextResults[total - 1] !== undefined) {
        onSubmit({ type: "pages", pageResults: nextResults });
      }
    },
    [onSubmit, total],
  );

  if (!isValid) {
    return <div className="kui-interactive-error">Pages: invalid data</div>;
  }

  /** A page explicitly submitted a result (user clicked/typed) */
  const handlePageSubmit = (result: InteractiveResult) => {
    const next = [...results];
    next[page] = result;
    setResults(next);

    if (page < total - 1) {
      // Auto-advance to next page
      setPage(page + 1);
    } else {
      // Last page submitted — finish
      onSubmit({ type: "pages", pageResults: next });
    }
  };

  /** Navigate forward — always allowed. If current page has no result, skip it. */
  const goNext = () => {
    if (page >= total - 1) return;
    const nextPage = page + 1;
    setPage(nextPage);

    // If this was the last navigable step, check if we should finish
    if (nextPage === total - 1) {
      tryFinish(results);
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
          <div className="kui-interactive-error">Page {page + 1}: missing data</div>
        )}
      </div>
    </div>
  );
}
