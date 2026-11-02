const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/jsonDb');

exports.login = async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ message: 'Enter your email or username and password.' });
  const id = String(identifier).trim().toLowerCase();
  const user = await db.findOne('users', (u) => u.email.toLowerCase() === id || u.username.toLowerCase() === id);
  // Same message for both failures so attackers cannot discover valid usernames
  const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Incorrect email/username or password.' });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } });
};

// JWTs are stateless: logout is completed by the browser deleting its token.
exports.logout = (req, res) => res.json({ message: 'Logged out.' });

exports.me = async (req, res) => {
  const out = { ...req.user };
  if (req.user.role === 'student') {
    const st = await db.findOne('students', (s) => s.userId === req.user.id);
    if (st) {
      const cls = await db.findById('classes', st.classId);
      out.student = { ...st, className: cls ? cls.className : '-' };
    }
  }
  res.json(out);
};
