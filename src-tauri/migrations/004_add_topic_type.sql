-- 为 topics 增加类型字段，区分普通对话和交互对话
ALTER TABLE topics ADD COLUMN type TEXT NOT NULL DEFAULT 'chat';
