const r = require('express').Router();
const { wrap } = require('../middleware/errorHandler');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const c = require('../controllers/attendanceController');
r.use(auth);
r.post('/mark', role('student'), wrap(c.mark));
r.get('/me', role('student'), wrap(c.mine));
r.put('/correct', role('teacher'), wrap(c.correct));
r.get('/', role('teacher'), wrap(c.list));
r.get('/student/:studentId', wrap(c.byStudent)); // students: own id only (checked in controller)
r.get('/class/:classId', role('teacher'), wrap(c.byClass));
module.exports = r;
