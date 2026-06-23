import { CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { InteractiveBlockData, InteractiveResult } from "../types";
import { SelectionRenderer } from "./SelectionRenderer";
import { FormRenderer } from "./FormRenderer";
import { ButtonsRenderer } from "./ButtonsRenderer";
import { CardRenderer } from "./CardRenderer";
import { ShortAnswerRenderer } from "./ShortAnswerRenderer";
import { ChartRenderer } from "./ChartRenderer";
import { TranslationRenderer } from "./TranslationRenderer";
import { CustomRenderer } from "./CustomRenderer";
import { PagesRenderer } from "./PagesRenderer";

interface Props {
  block: InteractiveBlockData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
  /** 放大视图中隐藏标题/描述，避免与 Modal 标题重复 */
  hideHeader?: boolean;
  onError?: (errorMessage: string) => void;
}

export function InteractiveBlock({ block, disabled, onSubmit, hideHeader, onError }: Props) {
  const { t } = useTranslation();
  // Guard: block must exist and have a valid type
  if (!block || !block.type) {
    return <div className="kui-interactive-error">Block: missing type</div>;
  }

  const renderBlock = () => {
    // Guard: data must exist for all block types — attempt recovery before giving up
    if (!block.data) {
      // Try to recover: if block has title/description, render as a simple card
      if (block.title || block.description) {
        return (
          <div className="kui-interactive-card">
            <div className="kui-interactive-card-body">
              {block.title && <div className="kui-interactive-card-title">{block.title}</div>}
              {block.description && (
                <div className="kui-interactive-card-content">{block.description}</div>
              )}
            </div>
          </div>
        );
      }
      return <div className="kui-interactive-error">{block.type}: missing data</div>;
    }
    switch (block.type) {
      case "selection":
        return <SelectionRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      case "form":
        return <FormRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      case "buttons":
        return <ButtonsRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      case "card":
        return <CardRenderer data={block.data} />;
      case "short_answer":
        return <ShortAnswerRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      case "chart":
        return <ChartRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      case "translation":
        return <TranslationRenderer data={block.data} />;
      case "custom":
        return <CustomRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} onError={onError} />;
      case "pages":
        return <PagesRenderer data={block.data} disabled={disabled} onSubmit={onSubmit} />;
      default:
        return <div className="kui-interactive-unknown">Unknown block type</div>;
    }
  };

  // Card renders its own title inside CardRenderer, so skip the block-level title
  // to avoid duplicate title display when AI sets both block.title and data.title
  const isCardType = block.type === "card";
  const showBlockTitle = !hideHeader && !isCardType && block.title;
  const showBlockDesc = !hideHeader && block.description;

  return (
    <div className={`kui-interactive-block kui-interactive-block--${block.type}${disabled ? " kui-interactive-block--disabled" : ""}`}>
      {(showBlockTitle || showBlockDesc) && (
        <div className="kui-interactive-block-header">
          {showBlockTitle && <div className="kui-interactive-block-title">{block.title}</div>}
          {showBlockDesc && <div className="kui-interactive-block-desc">{block.description}</div>}
        </div>
      )}
      <div className="kui-interactive-block-body">
        {renderBlock()}
      </div>
      {disabled && block.type !== "card" && block.type !== "translation" && block.type !== "pages" && (
        <div className="kui-interactive-submitted-badge">
          <CheckOutlined /> {t("interactive.submitted")}
        </div>
      )}
    </div>
  );
}
