const r = require('express').Router();
const { wrap } = require('../middleware/errorHandler');
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/authController');
r.post('/login', wrap(c.login));
r.post('/logout', auth, c.logout);
r.get('/me', auth, wrap(c.me));
module.exports = r;
