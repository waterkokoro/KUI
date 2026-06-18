import type { ButtonsData, InteractiveResult } from "../types";

interface Props {
  data: ButtonsData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

export function ButtonsRenderer({ data, disabled, onSubmit }: Props) {
  if (!data || !Array.isArray(data.items)) {
    return <div className="kui-interactive-error">Buttons: invalid data</div>;
  }
  const layout = data.layout || "horizontal";
  return (
    <div className={`kui-interactive-buttons kui-interactive-buttons--${layout}`}>
      {data.items.map((btn) => (
        <button
          key={btn.id}
          className={`kui-interactive-btn kui-interactive-btn--${btn.style || "default"}`}
          disabled={disabled || btn.disabled}
          onClick={() => onSubmit({ type: "buttons", clicked: btn.id })}
        >
          {btn.emoji && <span className="kui-interactive-btn-emoji">{btn.emoji}</span>}
          {btn.label}
        </button>
      ))}
    </div>
  );
}
