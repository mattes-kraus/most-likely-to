const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

class BetterSqlite3Store extends session.Store {
  constructor(options = {}) {
    super();
    const dbPath = options.db || path.join(__dirname, 'sessions.sqlite');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expired INTEGER NOT NULL
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired)`);

    this._get = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?');
    this._set = this.db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)');
    this._destroy = this.db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._cleanup = this.db.prepare('DELETE FROM sessions WHERE expired < ?');

    // Clean up expired sessions every 15 minutes
    this._cleanupInterval = setInterval(() => {
      this._cleanup.run(Date.now());
    }, 15 * 60 * 1000);
    this._cleanup.run(Date.now());
  }

  get(sid, cb) {
    try {
      const row = this._get.get(sid, Date.now());
      if (!row) return cb(null, null);
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      const maxAge = sess.cookie?.maxAge || 86400000;
      const expired = Date.now() + maxAge;
      this._set.run(sid, JSON.stringify(sess), expired);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  destroy(sid, cb) {
    try {
      this._destroy.run(sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }
}

module.exports = BetterSqlite3Store;
