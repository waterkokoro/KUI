import { parse } from "twemoji-parser";

/**
 * 将 emoji 字符转为 Twemoji CDN SVG URL
 */
export function emojiToUrl(emoji: string): string | null {
  const entities = parse(emoji, { buildRecursive: true });
  if (!entities.length) return null;
  return entities[0].url;
}

interface TwemojiProps {
  emoji: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 用 Twitter 风格渲染单个 emoji 为 <img>
 * 如果解析失败则回退显示原文本
 */
export function Twemoji({ emoji, size = 18, className, style }: TwemojiProps) {
  const url = emojiToUrl(emoji);
  if (!url) {
    return <span className={className} style={{ fontSize: size, ...style }}>{emoji}</span>;
  }
  return (
    <img
      src={url}
      alt={emoji}
      className={className}
      draggable={false}
      style={{
        width: size,
        height: size,
        verticalAlign: "middle",
        display: "inline-block",
        ...style,
      }}
    />
  );
}
