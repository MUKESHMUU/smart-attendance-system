require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./utils/jsonDb');
const { notFound, errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET is missing or too short. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(null, false)) }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store'); next(); });

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
// NOTE: the data/ folder is intentionally NOT served statically.

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
db.init().then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT}\nData folder: ${db.DATA_DIR}`));
}).catch((e) => { console.error('Could not prepare data folder:', e); process.exit(1); });
