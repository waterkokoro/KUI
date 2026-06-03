import { useEffect, useMemo, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button, Tooltip, message as antdMessage } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useAppStore } from "../stores/appStore";

/**
 * 统一 Markdown 渲染组件
 * - 表格、列表、blockquote、TODO list（remark-gfm 已内置）
 * - 代码块语法高亮（@uiw/react-md-editor 内置 rehype-prism）
 * - mermaid 代码块 → 渲染 SVG（流程图、树状图、时序图、类图等）
 * - 代码块右上角"复制"按钮
 * - 自动跟随暗/亮主题
 */
export function Markdown({ content }: { content: string }) {
  const theme = useAppStore((s) => s.settings.theme);
  return (
    <div className={`kui-md kui-md-${theme}`}>
      <MDEditor.Markdown
        source={content}
        style={{ background: "transparent", color: "inherit" }}
        components={{
          code: CodeRenderer as never,
        }}
      />
    </div>
  );
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeRenderer({ inline, className, children, ...rest }: CodeProps) {
  const lang = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
  const raw = String(children ?? "").replace(/\n$/, "");

  // 行内 code：显式 inline 标记，或者无语言标识且内容无换行（表格/正文内的反引号）
  if (inline || (!lang && !raw.includes("\n"))) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }

  // mermaid
  if (lang === "mermaid") {
    return <MermaidBlock code={raw} />;
  }

  // 普通代码块：包一层带"复制"按钮的容器
  return (
    <div className="kui-code-block">
      <div className="kui-code-bar">
        <span className="kui-code-lang">{lang || "text"}</span>
        <Tooltip title="Copy">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              void navigator.clipboard.writeText(raw);
              antdMessage.success("Copied");
            }}
          />
        </Tooltip>
      </div>
      <pre>
        <code className={className} {...rest}>
          {children}
        </code>
      </pre>
    </div>
  );
}

/* ================= Mermaid 渲染 ================= */

let mermaidLoader: Promise<typeof import("mermaid").default> | null = null;
let lastTheme: "dark" | "light" | null = null;

async function loadMermaid(theme: "dark" | "light") {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((m) => m.default);
  }
  const mermaid = await mermaidLoader;
  if (lastTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: theme === "dark" ? "dark" : "default",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    });
    lastTheme = theme;
  }
  return mermaid;
}

function MermaidBlock({ code }: { code: string }) {
  const theme = useAppStore((s) => s.settings.theme);
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const mermaid = await loadMermaid(theme);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme, id]);

  if (error) {
    return (
      <div className="kui-code-block">
        <div className="kui-code-bar">
          <span className="kui-code-lang">mermaid (error)</span>
        </div>
        <pre style={{ color: "var(--ant-color-error, #ff4d4f)" }}>
          <code>{error}</code>
        </pre>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }
  return <div className="kui-mermaid" ref={ref} />;
}
