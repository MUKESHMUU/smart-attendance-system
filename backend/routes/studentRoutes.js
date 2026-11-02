const r = require('express').Router();
const { wrap } = require('../middleware/errorHandler');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const c = require('../controllers/studentController');
r.use(auth);
r.get('/', role('teacher'), wrap(c.list));
r.post('/', role('teacher'), wrap(c.create));
r.get('/:id', wrap(c.get)); // students may read only their own (checked in controller)
r.put('/:id', role('teacher'), wrap(c.update));
r.delete('/:id', role('teacher'), wrap(c.remove));
module.exports = r;
