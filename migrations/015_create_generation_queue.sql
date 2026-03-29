-- Migration 015: Create generation_queue table for multi-level content tracking
-- Purpose: Track progress of multi-level lesson generation with specialized agents
-- Each skill gets 5 levels (Intro, Examples, Practice, Projects, Challenges)

CREATE TABLE IF NOT EXISTS generation_queue (
  id BIGSERIAL PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  generation_type TEXT NOT NULL CHECK (generation_type IN ('intro', 'practical', 'projects', 'challenges', 'custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP DEFAULT NULL,
  completed_at TIMESTAMP DEFAULT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0.0,
  error_message TEXT DEFAULT NULL,
  batch_config JSONB DEFAULT '{"mode": "skill_first", "levels_selected": [1,2,3,4,5]}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_generation_queue_skill_level ON generation_queue(skill_id, level);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status_module ON generation_queue(status, module_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_created_at ON generation_queue(created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generation_queue_updated_at ON generation_queue;

CREATE TRIGGER trigger_generation_queue_updated_at
BEFORE UPDATE ON generation_queue
FOR EACH ROW
EXECUTE FUNCTION update_generation_queue_updated_at();

-- Enable RLS (Row Level Security) if needed in production
-- ALTER TABLE generation_queue ENABLE ROW LEVEL SECURITY;

-- Seed initial queue entries for all published Python skills (optional - for testing)
-- These will be marked as 'pending' and processed during generation
INSERT INTO generation_queue (skill_id, module_id, level, generation_type, status, batch_config)
SELECT 
  s.id,
  1 as module_id,
  level.num,
  CASE 
    WHEN level.num = 1 THEN 'intro'
    WHEN level.num IN (2, 3) THEN 'practical'
    WHEN level.num = 4 THEN 'projects'
    WHEN level.num = 5 THEN 'challenges'
  END as generation_type,
  'pending' as status,
  '{"mode": "skill_first", "levels_selected": [1,2,3,4,5]}'::jsonb as batch_config
FROM skills s
CROSS JOIN (SELECT 1 as num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS level
WHERE s.domain = 'python'
  AND s.is_published = true
  AND NOT EXISTS (
    SELECT 1 FROM generation_queue gq
    WHERE gq.skill_id = s.id
      AND gq.module_id = 1
      AND gq.level = level.num
  )
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT COUNT(*) as total_queue_entries FROM generation_queue;
