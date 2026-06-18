-- 为 messages 增加交互数据字段，存储 render_ui 产生的 JSON 数据
ALTER TABLE messages ADD COLUMN interactive_data TEXT;
