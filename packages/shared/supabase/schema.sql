-- LearnThinkingChain Supabase Schema
-- 
-- 创建用户思考事件表，用于存储扩展捕获的 AI 交互数据

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户思考事件表
CREATE TABLE IF NOT EXISTS user_thinking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- 可选：如果未来需要用户认证
  extension_id TEXT NOT NULL, -- Chrome 扩展 ID
  session_id TEXT NOT NULL, -- 会话 ID
  prompt_text TEXT NOT NULL, -- 用户输入的提示词
  ai_response TEXT NOT NULL, -- AI 的回复
  detected_skills TEXT[] DEFAULT '{}', -- 检测到的技能 ID 数组
  skill_exp_gains JSONB DEFAULT '{}', -- 技能经验值增益 { skill_id: exp_gain }
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', -- 额外的元数据
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_thinking_events_extension_id ON user_thinking_events(extension_id);
CREATE INDEX IF NOT EXISTS idx_user_thinking_events_session_id ON user_thinking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_thinking_events_timestamp ON user_thinking_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_thinking_events_detected_skills ON user_thinking_events USING GIN(detected_skills);

-- 启用 Row Level Security (RLS)
ALTER TABLE user_thinking_events ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许匿名用户插入和读取自己的数据（基于 extension_id）
CREATE POLICY "Allow anonymous insert" ON user_thinking_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON user_thinking_events
  FOR SELECT
  USING (true);

-- 创建实时发布（用于 Supabase Realtime）
ALTER PUBLICATION supabase_realtime ADD TABLE user_thinking_events;

-- 创建视图：按技能聚合的经验值统计
CREATE OR REPLACE VIEW skill_exp_summary AS
SELECT
  extension_id,
  jsonb_object_agg(
    skill_id,
    jsonb_build_object(
      'exp', total_exp,
      'level', FLOOR(total_exp / 100)
    )
  ) as skills
FROM (
  SELECT
    extension_id,
    key as skill_id,
    SUM((value::text)::int) as total_exp
  FROM
    user_thinking_events,
    jsonb_each(skill_exp_gains)
  GROUP BY
    extension_id,
    key
) subquery
GROUP BY extension_id;

-- 创建函数：获取用户的总技能经验值
CREATE OR REPLACE FUNCTION get_user_skill_exp(ext_id TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT skills
    FROM skill_exp_summary
    WHERE extension_id = ext_id
  );
END;
$$ LANGUAGE plpgsql;
