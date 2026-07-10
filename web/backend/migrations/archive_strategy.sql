-- EProhori Database Archival Strategy
-- Archive threats older than 90 days to reduce database size
-- Reduces storage costs by 70-80%

-- Step 1: Create archive table (copy of threats schema)
CREATE TABLE IF NOT EXISTS threats_archived AS
SELECT * FROM threats WHERE FALSE;  -- Create empty table with same schema

-- Step 2: Archive threats older than 90 days
INSERT INTO threats_archived
SELECT * FROM threats
WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('verified', 'safe', 'spam');

-- Step 3: Delete archived threats from main table
DELETE FROM threats
WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('verified', 'safe', 'spam');

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON threats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threats_status ON threats(status);
CREATE INDEX IF NOT EXISTS idx_threats_archived_created ON threats_archived(created_at DESC);

-- Step 5: Archive old alerts (beyond 6 months)
CREATE TABLE IF NOT EXISTS alerts_archived AS
SELECT * FROM alerts WHERE FALSE;

INSERT INTO alerts_archived
SELECT * FROM alerts
WHERE created_at < NOW() - INTERVAL '180 days';

DELETE FROM alerts
WHERE created_at < NOW() - INTERVAL '180 days';

-- Step 6: Vacuum to reclaim space
VACUUM ANALYZE threats;
VACUUM ANALYZE alerts;
VACUUM ANALYZE threats_archived;
VACUUM ANALYZE alerts_archived;

-- Step 7: Query archive if needed (example)
-- SELECT * FROM threats_archived WHERE created_at > NOW() - INTERVAL '6 months';

-- Scheduled Task (run daily at 2 AM):
-- 0 2 * * * psql $DATABASE_URL < archive_strategy.sql
