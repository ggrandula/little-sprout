CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  child_name TEXT,
  child_age_note TEXT,
  source TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new' | 'contacted' | 'enrolled' | 'lost'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  class_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE,
  class_id TEXT,
  enroll_date DATE,
  stage TEXT DEFAULT 'seedling',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_parents (
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, parent_id)
);

CREATE TABLE IF NOT EXISTS fees (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  term TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  receipt_no TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  date DATE,
  present BOOLEAN DEFAULT true,
  note TEXT
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  type TEXT NOT NULL,        -- 'injury' | 'illness' | 'eating' | 'other'
  severity TEXT DEFAULT 'note', -- 'note' | 'concern' | 'urgent'
  description TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  staff TEXT,
  sent_to_parent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comms (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  date DATE,
  channel TEXT,
  note TEXT,
  staff TEXT
);
