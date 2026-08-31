const db = require('./db.js');
const bcrypt = require('bcrypt');

const row = db.prepare(`
  SELECT u.id, u.username, u.email, g.name AS group_name 
  FROM users u 
  JOIN group_members gm ON u.id = gm.user_id 
  JOIN groups g ON gm.group_id = g.id 
  WHERE u.username LIKE '%ebi%' OR g.name LIKE '%KK8%'
`).all();

console.log(row);
