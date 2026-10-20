CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'planejamento'
    CHECK (status IN ('planejamento', 'em_andamento', 'concluido', 'arquivado')),
  priority VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'a_fazer'
    CHECK (status IN ('a_fazer', 'em_andamento', 'em_revisao', 'concluida')),
  priority VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_updated_idx ON projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (due_date) WHERE status <> 'concluida';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'projects'::regclass
      AND tgname = 'projects_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER projects_set_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'tasks'::regclass
      AND tgname = 'tasks_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER tasks_set_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
