const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

const unanswered = db.prepare(`
  SELECT q.text, dq.group_id, dq.day_number 
  FROM daily_questions dq 
  JOIN questions q ON dq.question_id = q.id 
  LEFT JOIN votes v ON dq.id = v.daily_question_id 
  LEFT JOIN answers a ON dq.id = a.daily_question_id 
  WHERE v.id IS NULL AND a.id IS NULL 
  GROUP BY dq.id
`).all();

console.log(JSON.stringify(unanswered, null, 2));
