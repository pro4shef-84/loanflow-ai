-- ============================================================
-- 007 — Test Infrastructure
-- Stores E2E test run results and AI self-heal actions.
-- ============================================================

-- Test run sessions (one row per cron execution or manual trigger)
CREATE TABLE IF NOT EXISTS test_runs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total          INTEGER     NOT NULL DEFAULT 0,
  passed         INTEGER     NOT NULL DEFAULT 0,
  failed         INTEGER     NOT NULL DEFAULT 0,
  duration_ms    INTEGER,
  triggered_by   TEXT        NOT NULL DEFAULT 'cron', -- 'cron' | 'manual'
  base_url       TEXT,
  status         TEXT        NOT NULL DEFAULT 'running'
                             CHECK (status IN ('running','completed','failed'))
);

-- Individual test case results
CREATE TABLE IF NOT EXISTS test_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID        NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  test_name       TEXT        NOT NULL,
  endpoint        TEXT        NOT NULL,
  method          TEXT        NOT NULL DEFAULT 'GET',
  expected_status INTEGER     NOT NULL,
  actual_status   INTEGER,
  passed          BOOLEAN     NOT NULL DEFAULT false,
  response_body   TEXT,
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI self-heal analysis actions
CREATE TABLE IF NOT EXISTS heal_actions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID        REFERENCES test_runs(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  failures_analyzed  INTEGER     NOT NULL DEFAULT 0,
  root_cause         TEXT,
  severity           TEXT        CHECK (severity IN ('low','medium','high','critical')),
  suggested_fix      TEXT,
  affected_files     TEXT[],
  patch_diff         TEXT,       -- optional code diff the agent generated
  telemetry_summary  TEXT,       -- summary of telemetry signals ingested
  auto_applied       BOOLEAN     NOT NULL DEFAULT false,
  status             TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','applied','dismissed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_results_run_id    ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_passed    ON test_results(passed);
CREATE INDEX IF NOT EXISTS idx_heal_actions_run_id    ON heal_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_run_at       ON test_runs(run_at DESC);

-- No RLS needed — these tables are service-role only (cron writes, LO reads via API)
