-- Migration: Add anchor_color and timing to user preferences
-- This migration adds new preference fields for the dynamic accent color feature
-- and adaptive word timing settings.
--
-- NOTE: This migration has already been applied to the production database.
-- This file exists for version control purposes.

-- Add anchor_color and timing to user preferences for existing users
UPDATE users
SET preferences = preferences || jsonb_build_object(
  'anchor_color', COALESCE(preferences->>'anchor_color', '#E53E3E'),
  'timing', COALESCE(
    preferences->'timing',
    jsonb_build_object(
      'longWordThreshold', 6,
      'msPerExtraChar', 20,
      'sentencePauseMs', 150,
      'clausePauseMs', 75
    )
  )
)
WHERE preferences IS NOT NULL;

-- Set defaults for users with null preferences
UPDATE users
SET preferences = jsonb_build_object(
  'anchor_position', 0.35,
  'default_speed', 300,
  'theme', 'dark',
  'font_size', 48,
  'anchor_color', '#E53E3E',
  'timing', jsonb_build_object(
    'longWordThreshold', 6,
    'msPerExtraChar', 20,
    'sentencePauseMs', 150,
    'clausePauseMs', 75
  ),
  'free_summary_credits', 10
)
WHERE preferences IS NULL;
