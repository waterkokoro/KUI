CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    agent_id TEXT,
    model_ref TEXT,
    summary TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_id);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    md_offset INTEGER,
    tokens INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_topic ON messages(topic_id);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS topic_tags (
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, tag_id)
);

CREATE TABLE IF NOT EXISTS topic_links (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    to_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    note TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_from ON topic_links(from_id);
CREATE INDEX IF NOT EXISTS idx_links_to ON topic_links(to_id);

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL DEFAULT '',
    default_model_ref TEXT,
    avatar TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('openai','anthropic')),
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
