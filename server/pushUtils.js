const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeysPath = path.join(__dirname, 'vapid_keys.json');

let vapidKeys;
if (fs.existsSync(vapidKeysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys, null, 2));
}

// In production, we'd want a real email or URL here.
webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidPublicKey: vapidKeys.publicKey
};
