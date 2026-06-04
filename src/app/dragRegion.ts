import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * 全局拖动区域处理器。
 * 监听 mousedown 事件，当目标元素或其祖先元素带有 data-tauri-drag-region 属性时，
 * 调用 Tauri 的 startDragging() 来移动窗口。
 * 这比单纯依赖 data-tauri-drag-region 属性更可靠，因为后者在 macOS 上
 * 对子元素的点击事件支持不稳定。
 */
export function setupDragRegion() {
  // 不可拖动的交互元素标签
  const INTERACTIVE_TAGS = new Set([
    "BUTTON",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "A",
    "LABEL",
  ]);

  // 使用 capture 阶段监听，确保在所有其他 handler 之前拦截事件
  // 这样即使 react-resizable-panels 等库在 bubble 阶段 stopPropagation 也不影响
  document.addEventListener(
    "mousedown",
    (e) => {
      // 仅左键触发
      if (e.button !== 0) return;

      let el = e.target as HTMLElement | null;

      // 向上遍历 DOM 树，查找 data-tauri-drag-region
      while (el) {
        // 如果点到了交互元素或其内部，则不触发拖动
        if (INTERACTIVE_TAGS.has(el.tagName)) return;
        // 检查元素的 role 属性
        const role = el.getAttribute("role");
        if (role === "button" || role === "link" || role === "menuitem") return;
        // 检查是否是 ant-design 按钮类
        if (
          el.classList.contains("ant-btn") ||
          el.classList.contains("ant-dropdown-trigger") ||
          el.classList.contains("ant-popover-open")
        ) return;
        // 检查 resize handle（分割线拖拽）
        if (el.hasAttribute("data-panel-resize-handle-id")) return;

        if (el.hasAttribute("data-tauri-drag-region")) {
          e.preventDefault();
          e.stopPropagation();
          getCurrentWindow().startDragging();
          return;
        }
        el = el.parentElement;
      }
    },
    { capture: true }
  );
}
