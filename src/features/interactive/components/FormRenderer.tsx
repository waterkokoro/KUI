import { useState } from "react";
import type { FormData, InteractiveResult } from "../types";

interface Props {
  data: FormData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

export function FormRenderer({ data, disabled, onSubmit }: Props) {
  const fields = Array.isArray(data?.fields) ? data.fields : [];
  const [values, setValues] = useState<Record<string, string | boolean | number>>(() => {
    const init: Record<string, string | boolean | number> = {};
    for (const f of fields) {
      if (f.type === "checkbox") init[f.name] = (f.defaultValue as boolean) ?? false;
      else if (f.type === "number") init[f.name] = (f.defaultValue as number) ?? 0;
      else init[f.name] = (f.defaultValue as string) ?? "";
    }
    return init;
  });

  const set = (name: string, val: string | boolean | number) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  const submit = () => {
    if (disabled) return;
    onSubmit({ type: "form", values });
  };

  return (
    <div className="kui-interactive-form">
      {fields.map((f) => (
        <div key={f.name} className="kui-interactive-form-field">
          <label className="kui-interactive-form-label">
            {f.label}
            {f.required && <span className="kui-interactive-form-required">*</span>}
          </label>
          {f.type === "input" && (
            <input
              className="kui-interactive-form-input"
              value={(values[f.name] as string) ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
              disabled={disabled}
            />
          )}
          {f.type === "textarea" && (
            <textarea
              className="kui-interactive-form-textarea"
              value={(values[f.name] as string) ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
              rows={3}
              disabled={disabled}
            />
          )}
          {f.type === "number" && (
            <input
              className="kui-interactive-form-input"
              type="number"
              value={(values[f.name] as number) ?? 0}
              onChange={(e) => set(f.name, Number(e.target.value))}
              min={f.min}
              max={f.max}
              disabled={disabled}
            />
          )}
          {f.type === "date" && (
            <input
              className="kui-interactive-form-input"
              type="date"
              value={(values[f.name] as string) ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={disabled}
            />
          )}
          {f.type === "select" && (
            <select
              className="kui-interactive-form-select"
              value={(values[f.name] as string) ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={disabled}
            >
              <option value="">{f.placeholder || "--"}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {f.type === "checkbox" && (
            <label className="kui-interactive-form-checkbox-label">
              <input
                type="checkbox"
                checked={!!values[f.name]}
                onChange={(e) => set(f.name, e.target.checked)}
                disabled={disabled}
              />
              <span>{f.placeholder || f.label}</span>
            </label>
          )}
        </div>
      ))}
      {!disabled && (
        <button className="kui-interactive-btn kui-interactive-btn--primary" onClick={submit}>
          {data.submitLabel || "提交"}
        </button>
      )}
    </div>
  );
}
