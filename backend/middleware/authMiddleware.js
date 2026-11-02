const jwt = require('jsonwebtoken');
const db = require('../utils/jsonDb');

module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.findById('users', payload.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    req.user = { id: user.id, role: user.role, username: user.username, email: user.email, name: user.name };
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
};
