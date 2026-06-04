-- 用户表（预留登录层）
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Local User',
    email TEXT,
    avatar TEXT,
    auth_provider TEXT,
    external_id TEXT,
    created_at INTEGER NOT NULL
);

-- 角色模式表
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- 为 topics 添加 profile_id
ALTER TABLE topics ADD COLUMN profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_topics_profile ON topics(profile_id);

-- 为 tags 添加 profile_id
ALTER TABLE tags ADD COLUMN profile_id TEXT;
