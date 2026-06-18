// ─────────────────────────────────────────────────────────────────
// 交互组件类型定义
// ─────────────────────────────────────────────────────────────────

/** 选择项 */
export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
  emoji?: string;
  image?: string;
  disabled?: boolean;
}

/** selection 组件数据 */
export interface SelectionData {
  mode: "single" | "multiple";
  options: SelectionOption[];
  maxSelect?: number;
}

/** form 字段类型 */
export type FormFieldType = "input" | "textarea" | "select" | "checkbox" | "number" | "date";

/** form 字段 */
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | boolean | number;
  options?: { label: string; value: string }[]; // for select type
  min?: number;
  max?: number;
}

/** form 组件数据 */
export interface FormData {
  fields: FormField[];
  submitLabel?: string;
}

/** buttons 项 */
export interface ButtonItem {
  id: string;
  label: string;
  emoji?: string;
  style?: "primary" | "default" | "dashed" | "text" | "link";
  disabled?: boolean;
}

/** buttons 组件数据 */
export interface ButtonsData {
  items: ButtonItem[];
  layout?: "horizontal" | "vertical";
}

/** card 组件数据 */
export interface CardData {
  title: string;
  content: string; // markdown
  image?: string;
  footer?: string;
  tags?: string[];
}

/** short_answer 组件数据 */
export interface ShortAnswerData {
  question: string;
  placeholder?: string;
  maxLength?: number;
  inputType?: "text" | "number" | "email" | "url";
}

/** chart 数据点 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/** chart 组件数据 */
export interface ChartData {
  chartType: "bar" | "line" | "pie";
  data: ChartDataPoint[];
  title?: string;
  showLegend?: boolean;
}

/** translation 条目 */
export interface TranslationEntry {
  source: string;
  target: string;
  phonetic?: string;
  note?: string;
}

/** translation 组件数据 */
export interface TranslationData {
  sourceLang: string;
  targetLang: string;
  entries: TranslationEntry[];
}

/** custom 组件数据 */
export interface CustomData {
  html: string;
  css?: string;
  height?: number; // iframe 高度，默认 200
  eventKey?: string; // 自定义事件名，iframe 通过 postMessage 回传
}

/** pages 组件数据 */
export interface PagesData {
  pages: InteractiveBlockData[];
  showPageNumber?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// 统一块类型
// ─────────────────────────────────────────────────────────────────

export type InteractiveType =
  | "selection"
  | "form"
  | "buttons"
  | "card"
  | "short_answer"
  | "chart"
  | "translation"
  | "custom"
  | "pages";

export type InteractiveBlockData =
  | { type: "selection"; title?: string; description?: string; data: SelectionData }
  | { type: "form"; title?: string; description?: string; data: FormData }
  | { type: "buttons"; title?: string; description?: string; data: ButtonsData }
  | { type: "card"; title?: string; description?: string; data: CardData }
  | { type: "short_answer"; title?: string; description?: string; data: ShortAnswerData }
  | { type: "chart"; title?: string; description?: string; data: ChartData }
  | { type: "translation"; title?: string; description?: string; data: TranslationData }
  | { type: "custom"; title?: string; description?: string; data: CustomData }
  | { type: "pages"; title?: string; description?: string; data: PagesData };

/** 存储在 message.interactive_data 中的顶层结构 */
export interface InteractivePayload {
  ui_id: string;
  blocks: InteractiveBlockData[];
  auto_submit?: boolean;
}

/** 用户交互结果 */
export type InteractiveResult =
  | { type: "selection"; selected: string[] }
  | { type: "form"; values: Record<string, string | boolean | number> }
  | { type: "buttons"; clicked: string }
  | { type: "short_answer"; answer: string }
  | { type: "chart"; selected?: string }
  | { type: "translation"; selected?: string }
  | { type: "custom"; payload: unknown }
  | { type: "pages"; pageResults: InteractiveResult[] };

/** 序列化后的交互结果，存储为 user message content */
export interface InteractiveMessageResult {
  ui_id: string;
  results: InteractiveResult[];
}
