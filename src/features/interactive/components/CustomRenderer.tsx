import { useEffect, useMemo } from "react";
import type { CustomData, InteractiveResult } from "../types";

interface Props {
  data: CustomData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
  onError?: (errorMessage: string) => void;
}

const IFRAME_TEMPLATE = (html: string, css: string, eventKey: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 12px; }
  ${css}
</style>
</head>
<body>
${html}
<script>
  window.onerror = function(msg, src, line) {
    window.parent.postMessage({
      type: "kui-interactive-custom",
      eventKey: "${eventKey}",
      payload: { __error: true, message: String(msg), line: line }
    }, "*");
  };
  window.__sendEvent = function(payload) {
    window.parent.postMessage({ type: "kui-interactive-custom", eventKey: "${eventKey}", payload }, "*");
  };
  document.addEventListener("click", function(e) {
    var el = e.target.closest("[data-action]");
    if (el) window.__sendEvent({ action: el.getAttribute("data-action"), value: el.getAttribute("data-value") || el.textContent });
  });
  document.addEventListener("submit", function(e) {
    e.preventDefault();
    var form = e.target;
    var data = {};
    new FormData(form).forEach(function(v, k) { data[k] = v; });
    window.__sendEvent({ action: "form_submit", value: data });
  });
</script>
</body>
</html>`;

export function CustomRenderer({ data, disabled, onSubmit, onError }: Props) {
  const isValid = data && typeof data.html === "string";
  const height = (isValid && data.height) || 200;
  const eventKey = (isValid && data.eventKey) || "default";

  // Hooks MUST be called unconditionally (before any early return)
  const srcDoc = useMemo(
    () => (isValid ? IFRAME_TEMPLATE(data.html, data.css || "", eventKey) : ""),
    [isValid, data?.html, data?.css, eventKey],
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "kui-interactive-custom") return;
      if (e.data.payload?.__error) {
        console.error("[Custom iframe JS error]", e.data.payload.message, "line:", e.data.payload.line);
        onError?.(String(e.data.payload.message));
        return;
      }
      if (disabled) return;
      onSubmit({ type: "custom", payload: e.data.payload });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [disabled, onSubmit, onError]);

  if (!isValid) {
    return <div className="kui-interactive-error">Custom: invalid data</div>;
  }

  return (
    <div className="kui-interactive-custom">
      <iframe
        className="kui-interactive-custom-iframe"
        srcDoc={srcDoc}
        style={{ height, width: "100%", border: "none", borderRadius: 8 }}
        title="custom-ui"
      />
    </div>
  );
}
