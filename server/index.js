const express = require('express');
const cors = require('cors');
const session = require('express-session');
const BetterSqlite3Store = require('./sessionStore');
const path = require('path');
const fs = require('fs');
const seedData = require('./seed');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const allowedOrigins = ['http://localhost:5173', 'https://mostlikelyto.matteskraus.de'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use(session({
  store: new BetterSqlite3Store({
    db: path.join(__dirname, 'sessions.sqlite')
  }),
  secret: 'mostlikelyto-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const authRoutes = require('./routes/auth');
const groupsRoutes = require('./routes/groups');
const questionsRoutes = require('./routes/questions');
const pushRoutes = require('./routes/push');

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/groups/:id', questionsRoutes);
app.use('/api/push', pushRoutes);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

seedData();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
