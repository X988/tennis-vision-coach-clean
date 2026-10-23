-- PostgreSQL schema (or compatible)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  role TEXT CHECK (role IN ('student','coach','admin')) NOT NULL,
  name TEXT,
  handed TEXT,
  backhand_type TEXT,
  height_cm INT,
  level TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name TEXT,
  status TEXT CHECK (status IN ('draft','pending','published')) DEFAULT 'draft',
  version INT DEFAULT 1,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenario_versions (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  version INT,
  data JSONB,
  changed_by UUID REFERENCES users(id),
  change_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  scenario_id UUID REFERENCES scenarios(id),
  chosen_stance TEXT,
  correct BOOLEAN,
  ts TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  state JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
