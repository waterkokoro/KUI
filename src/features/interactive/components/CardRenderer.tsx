import { Markdown } from "../../../components/Markdown";
import type { CardData } from "../types";

interface Props {
  data: CardData;
}

export function CardRenderer({ data }: Props) {
  if (!data) return <div className="kui-interactive-error">Card: invalid data</div>;
  // Ensure content is a string; fall back to title or empty if missing
  const rawContent = data.content;
  const content = typeof rawContent === "string"
    ? rawContent
    : (rawContent != null ? JSON.stringify(rawContent) : (data.title || ""));
  return (
    <div className="kui-interactive-card">
      {data.image && (
        <div className="kui-interactive-card-img-wrap">
          <img src={data.image} alt={data.title || ""} className="kui-interactive-card-img" />
        </div>
      )}
      <div className="kui-interactive-card-body">
        {data.title && <div className="kui-interactive-card-title">{data.title}</div>}
        <div className="kui-interactive-card-content">
          <Markdown content={content} />
        </div>
        {data.tags && data.tags.length > 0 && (
          <div className="kui-interactive-card-tags">
            {data.tags.map((tag, i) => (
              <span key={i} className="kui-interactive-card-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      {data.footer && (
        <div className="kui-interactive-card-footer">{data.footer}</div>
      )}
    </div>
  );
}
