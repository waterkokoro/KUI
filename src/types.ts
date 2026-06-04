export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string | null;
  avatar: string | null;
  auth_provider: string;
  external_id: string | null;
  created_at: number;
}

export interface Profile {
  id: ID;
  user_id: ID;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: number;
}

export interface Topic {
  id: ID;
  parent_id: ID | null;
  profile_id: ID | null;
  title: string;
  icon: string | null;
  agent_id: ID | null;
  model_ref: string | null; // "providerId:modelId"
  summary: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: ID;
  topic_id: ID;
  role: "user" | "assistant" | "system";
  content: string;
  md_offset: number | null;
  tokens: number | null;
  created_at: number;
}

export interface Agent {
  id: ID;
  name: string;
  system_prompt: string;
  default_model_ref: string | null;
  avatar: string | null;
  created_at: number;
}

export type ProviderKind = "openai" | "anthropic";
export interface Provider {
  id: ID;
  name: string;
  kind: ProviderKind;
  base_url: string;
  api_key: string;
  enabled: 0 | 1;
}

export interface ModelRow {
  id: ID;
  provider_id: ID;
  model_id: string;
  display_name: string;
}

export interface TopicLink {
  id: ID;
  from_id: ID;
  to_id: ID;
  note: string | null;
  created_at: number;
}

export interface Tag {
  id: ID;
  name: string;
}

export interface Settings {
  startup_mode: "last" | "new";
  last_topic_id: string | null;
  last_profile_id: string | null;
  theme: "dark" | "light";
  language: "zh-CN" | "en-US";
  default_agent_id: string | null;
  default_model_ref: string | null;
}
