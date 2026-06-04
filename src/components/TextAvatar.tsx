import { useMemo } from "react";

/** 预设的背景色调色板 */
export const AVATAR_PALETTE = [
  "#1677ff", "#36cfc9", "#ff7a45", "#9254de",
  "#f759ab", "#52c41a", "#faad14", "#13c2c2",
  "#2f54eb", "#eb2f96", "#722ed1", "#fa541c",
];

/** 文字排列布局 */
export type AvatarLayout = "auto" | "2x2" | "2x3" | "1x4";

/** 根据文本内容确定性地选取颜色 */
function pickColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

interface TextAvatarProps {
  text: string;
  size?: number;
  borderRadius?: number;
  color?: string; // override auto-color
  layout?: AvatarLayout; // character arrangement
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 解析头像存储格式：text:content|color|layout
 */
export function parseTextAvatar(raw: string): { text: string; color?: string; layout?: AvatarLayout } {
  // raw format: "text:<text>|<color>|<layout>" or legacy "text:<text>"
  const body = raw.startsWith("text:") ? raw.slice(5) : raw;
  const parts = body.split("|");
  return {
    text: parts[0] || "?",
    color: parts[1] || undefined,
    layout: (parts[2] as AvatarLayout) || undefined,
  };
}

/**
 * 生成头像存储字符串
 */
export function buildTextAvatarStr(text: string, color?: string, layout?: AvatarLayout): string {
  const parts = [text.slice(0, 6)];
  parts.push(color || "");
  parts.push(layout || "");
  // trim trailing empty parts
  while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
  return `text:${parts.join("|")}`;
}

/**
 * 文字头像组件：用文字+颜色背景+大圆角矩形遮罩生成头像
 * - text: 显示文本，最多6字符（超过会被截断）
 * - layout: 字符排列方式 auto/2x2/2x3/1x4
 * - 自动根据文本选择背景色，也可通过 color 属性覆盖
 */
export function TextAvatar({
  text,
  size = 36,
  borderRadius = 10,
  color,
  layout = "auto",
  className,
  style,
}: TextAvatarProps) {
  const displayText = useMemo(() => {
    const trimmed = text.trim();
    return trimmed.slice(0, 6) || "?";
  }, [text]);

  const bgColor = color || pickColor(displayText);

  // Compute effective layout
  const effectiveLayout = useMemo((): AvatarLayout => {
    if (layout !== "auto") return layout;
    const len = displayText.length;
    if (len <= 2) return "auto";
    if (len <= 4) return "2x2";
    return "2x3";
  }, [layout, displayText]);

  // For grid layouts, split characters into rows
  const renderContent = useMemo(() => {
    if (effectiveLayout === "auto" || displayText.length <= 2) {
      // Single-line rendering
      const len = displayText.length;
      let fontSize: number;
      if (len <= 1) fontSize = size * 0.48;
      else if (len <= 2) fontSize = size * 0.38;
      else if (len <= 4) fontSize = size * 0.28;
      else fontSize = size * 0.22;
      return (
        <span style={{ fontSize, letterSpacing: len > 2 ? "-0.5px" : "0px" }}>
          {displayText}
        </span>
      );
    }

    const chars = displayText.split("");

    if (effectiveLayout === "2x2") {
      // 2 columns × 2 rows
      const rows = [chars.slice(0, 2), chars.slice(2, 4)];
      const cellSize = size * 0.34;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, lineHeight: 1 }}>
          {rows.flat().map((ch, i) => (
            <span key={i} style={{ fontSize: cellSize, textAlign: "center" }}>{ch}</span>
          ))}
        </div>
      );
    }

    if (effectiveLayout === "2x3") {
      // 2 columns × 3 rows
      const rows = [chars.slice(0, 2), chars.slice(2, 4), chars.slice(4, 6)];
      const cellSize = size * 0.26;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, lineHeight: 1 }}>
          {rows.flat().map((ch, i) => (
            <span key={i} style={{ fontSize: cellSize, textAlign: "center" }}>{ch}</span>
          ))}
        </div>
      );
    }

    if (effectiveLayout === "1x4") {
      // 1 column × 4 rows (vertical)
      const cellSize = size * 0.22;
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, lineHeight: 1.1 }}>
          {chars.slice(0, 4).map((ch, i) => (
            <span key={i} style={{ fontSize: cellSize }}>{ch}</span>
          ))}
        </div>
      );
    }

    return <span>{displayText}</span>;
  }, [displayText, effectiveLayout, size]);

  return (
    <div
      className={`kui-text-avatar ${className || ""}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0,
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {renderContent}
    </div>
  );
}
