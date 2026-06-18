import { useState } from "react";
import type { ShortAnswerData, InteractiveResult } from "../types";

interface Props {
  data: ShortAnswerData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

export function ShortAnswerRenderer({ data, disabled, onSubmit }: Props) {
  const [answer, setAnswer] = useState("");
  if (!data) return <div className="kui-interactive-error">ShortAnswer: invalid data</div>;

  const submit = () => {
    if (disabled || !answer.trim()) return;
    onSubmit({ type: "short_answer", answer: answer.trim() });
  };

  return (
    <div className="kui-interactive-short-answer">
      <div className="kui-interactive-short-answer-question">{data.question}</div>
      <textarea
        className="kui-interactive-short-answer-input"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={data.placeholder}
        maxLength={data.maxLength}
        rows={3}
        disabled={disabled}
      />
      {!disabled && (
        <button
          className="kui-interactive-btn kui-interactive-btn--primary"
          disabled={!answer.trim()}
          onClick={submit}
        >
          提交回答
        </button>
      )}
    </div>
  );
}
