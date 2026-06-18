import { useState } from "react";
import { CheckCircleFilled, CheckOutlined } from "@ant-design/icons";
import type { SelectionData, InteractiveResult } from "../types";

interface Props {
  data: SelectionData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

export function SelectionRenderer({ data, disabled, onSubmit }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!data || !Array.isArray(data.options)) {
    return <div className="kui-interactive-error">Selection: invalid data</div>;
  }

  const toggle = (id: string) => {
    if (disabled) return;
    const opt = data.options.find((o) => o.id === id);
    if (opt?.disabled) return;

    if (data.mode === "single") {
      setSelected(new Set([id]));
      onSubmit({ type: "selection", selected: [id] });
    } else {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else {
        if (data.maxSelect && next.size >= data.maxSelect) return;
        next.add(id);
      }
      setSelected(next);
    }
  };

  const confirmMultiple = () => {
    if (selected.size === 0) return;
    onSubmit({ type: "selection", selected: Array.from(selected) });
  };

  return (
    <div className="kui-interactive-selection">
      <div className="kui-interactive-selection-options">
        {data.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <div
              key={opt.id}
              className={`kui-interactive-selection-option${isSelected ? " selected" : ""}${opt.disabled || disabled ? " disabled" : ""}`}
              onClick={() => toggle(opt.id)}
            >
              <div className="kui-interactive-selection-check">
                {data.mode === "single" ? (
                  isSelected && <CheckCircleFilled />
                ) : (
                  isSelected && <CheckOutlined />
                )}
              </div>
              {opt.emoji && <span className="kui-interactive-selection-emoji">{opt.emoji}</span>}
              {opt.image && <img src={opt.image} alt={opt.label} className="kui-interactive-selection-img" />}
              <div className="kui-interactive-selection-text">
                <div className="kui-interactive-selection-label">{opt.label}</div>
                {opt.description && (
                  <div className="kui-interactive-selection-desc">{opt.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {data.mode === "multiple" && !disabled && (
        <button
          className="kui-interactive-btn kui-interactive-btn--primary"
          disabled={selected.size === 0}
          onClick={confirmMultiple}
        >
          确认选择 ({selected.size})
        </button>
      )}
    </div>
  );
}
