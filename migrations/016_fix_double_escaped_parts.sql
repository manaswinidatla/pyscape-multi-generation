-- Migration 016: Fix double-escaped JSON in lessons.parts column
-- This migration corrects the parts column for lessons where parts was double-stringified
-- Problem: parts column stored as a JSON STRING "\"[...]\""  instead of actual array [...]
-- Solution: Use JSONB operators to extract the string content and re-parse as JSONB
-- Created: 2026-03-29

BEGIN;

-- Fix double-escaped parts by extracting string value and re-parsing as JSONB
-- When parts is a JSONB string, #>> '{}' extracts the text content
UPDATE lessons
SET parts = (parts #>> '{}')::jsonb
WHERE jsonb_typeof(parts) = 'string' AND parts IS NOT NULL;

-- Alternative for any remaining escaped format (just in case)
UPDATE lessons
SET parts = (parts::text::jsonb #>> '{}')::jsonb
WHERE jsonb_typeof(parts) = 'string' AND parts IS NOT NULL;

-- Verify the fix by checking samples
SELECT 
  id,
  title,
  jsonb_typeof(parts) as parts_type,
  CASE 
    WHEN jsonb_typeof(parts) = 'array' THEN jsonb_array_length(parts)
    ELSE 0
  END as level_count,
  CASE 
    WHEN jsonb_typeof(parts) = 'array' AND jsonb_array_length(parts) > 0 THEN parts -> 0 ->> 'level'
    ELSE 'N/A'
  END as first_level_num,
  CASE
    WHEN jsonb_typeof(parts) = 'array' AND jsonb_array_length(parts) > 0 THEN parts -> 0 ->> 'type'
    ELSE 'N/A'
  END as first_level_type
FROM lessons
WHERE parts IS NOT NULL
ORDER BY id DESC
LIMIT 10;

COMMIT;
