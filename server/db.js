const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER REFERENCES groups(id),
  user_id INTEGER REFERENCES users(id),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('vote', 'open', 'guess')),
  group_id INTEGER REFERENCES groups(id) DEFAULT NULL,
  created_by INTEGER REFERENCES users(id) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS daily_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES groups(id),
  question_id INTEGER REFERENCES questions(id),
  day_number INTEGER NOT NULL DEFAULT 1,
  featured_member_id INTEGER REFERENCES users(id) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_question_id INTEGER REFERENCES daily_questions(id),
  voter_id INTEGER REFERENCES users(id),
  voted_for_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(daily_question_id, voter_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_question_id INTEGER REFERENCES daily_questions(id),
  user_id INTEGER REFERENCES users(id),
  answer_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(daily_question_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_day_tracker (
  group_id INTEGER PRIMARY KEY REFERENCES groups(id),
  current_day INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_question_id INTEGER REFERENCES daily_questions(id),
  user_id INTEGER REFERENCES users(id),
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  subscription TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, subscription)
);
`);

// Migration: add columns to existing questions table if missing
try {
  db.exec(`ALTER TABLE questions ADD COLUMN group_id INTEGER REFERENCES groups(id) DEFAULT NULL`);
} catch (e) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE questions ADD COLUMN created_by INTEGER REFERENCES users(id) DEFAULT NULL`);
} catch (e) { /* column already exists */ }

// Migration: add avatar_url to users table
try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL`);
} catch (e) { /* column already exists */ }

// Migration: add featured_member_id to daily_questions table
try {
  db.exec(`ALTER TABLE daily_questions ADD COLUMN featured_member_id INTEGER REFERENCES users(id) DEFAULT NULL`);
} catch (e) { /* column already exists */ }


// Migration: allow 'guess' question type (SQLite can't alter CHECK constraints, so rebuild the table)
const questionsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'questions'").get();
if (questionsSchema && !questionsSchema.sql.includes("'guess'")) {
  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE questions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('vote', 'open', 'guess')),
        group_id INTEGER REFERENCES groups(id) DEFAULT NULL,
        created_by INTEGER REFERENCES users(id) DEFAULT NULL
      );
      INSERT INTO questions_new (id, text, type, group_id, created_by)
        SELECT id, text, type, group_id, created_by FROM questions;
      DROP TABLE questions;
      ALTER TABLE questions_new RENAME TO questions;
    `);
  })();
  db.pragma('foreign_keys = ON');
}

// Migration: guessed answers can be marked correct by the featured member
try {
  db.exec(`ALTER TABLE answers ADD COLUMN is_correct INTEGER NOT NULL DEFAULT 0`);
} catch (e) { /* column already exists */ }

module.exports = db;

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL
    );
  `);
} catch (e) { console.error(e); }
