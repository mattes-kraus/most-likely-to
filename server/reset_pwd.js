const db = require('./db.js');
const bcrypt = require('bcrypt');

async function resetPassword() {
  const newPassword = 'Start123!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(newPassword, saltRounds);
  
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = 8');
  stmt.run(hash);
  console.log('Password reset successfully to: ' + newPassword);
}

resetPassword();
