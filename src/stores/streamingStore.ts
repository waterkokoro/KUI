import { create } from "zustand";
import type { InteractivePayload } from "../features/interactive/types";

export interface TopicStreamState {
  streaming: boolean;
  streamBuf: string;
  reasoningBuf: string;
  searchQuery: string;
  searchRefs: { title: string; url: string }[];
  toolCallingName: string;
  interactivePayload: InteractivePayload | null;
  stopped: boolean;
}

export const defaultStreamState: TopicStreamState = {
  streaming: false,
  streamBuf: "",
  reasoningBuf: "",
  searchQuery: "",
  searchRefs: [],
  toolCallingName: "",
  interactivePayload: null,
  stopped: false,
};

interface StreamingStore {
  states: Record<string, TopicStreamState>;
  getState: (topicId: string) => TopicStreamState;
  setState: (topicId: string, patch: Partial<TopicStreamState>) => void;
  removeState: (topicId: string) => void;
  isStreaming: (topicId: string) => boolean;
  getStreamingTopicIds: () => string[];
}

export const useStreamingStore = create<StreamingStore>((set, get) => ({
  states: {},

  getState: (topicId: string) =>
    get().states[topicId] ?? defaultStreamState,

  setState: (topicId: string, patch: Partial<TopicStreamState>) =>
    set((s) => ({
      states: {
        ...s.states,
        [topicId]: { ...(s.states[topicId] ?? defaultStreamState), ...patch },
      },
    })),

  removeState: (topicId: string) =>
    set((s) => {
      const next = { ...s.states };
      delete next[topicId];
      return { states: next };
    }),

  isStreaming: (topicId: string) =>
    get().states[topicId]?.streaming ?? false,

  getStreamingTopicIds: () =>
    Object.entries(get().states)
      .filter(([, v]) => v.streaming)
      .map(([k]) => k),
}));

// ── Module-level abort controller map (not in zustand since it's not serializable) ──
const abortControllers = new Map<string, AbortController>();

export function getAbortController(topicId: string): AbortController | null {
  return abortControllers.get(topicId) ?? null;
}

export function setAbortController(topicId: string, controller: AbortController): void {
  // Abort any existing controller for this topic first
  const existing = abortControllers.get(topicId);
  if (existing && !existing.signal.aborted) {
    console.warn(`[KUI-abort] setAbortController superseding existing controller for topic=${topicId}`, new Error().stack);
    existing.abort();
  }
  abortControllers.set(topicId, controller);
}

export function clearAbortController(topicId: string): void {
  abortControllers.delete(topicId);
}

export function abortTopic(topicId: string): void {
  const controller = abortControllers.get(topicId);
  if (controller && !controller.signal.aborted) {
    console.warn(`[KUI-abort] abortTopic topic=${topicId}`, new Error().stack);
    controller.abort();
  }
}

export function abortAllTopics(): void {
  for (const [id] of abortControllers) {
    abortTopic(id);
  }
  abortControllers.clear();
}
