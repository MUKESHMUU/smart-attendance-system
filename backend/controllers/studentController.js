const bcrypt = require('bcryptjs');
const db = require('../utils/jsonDb');

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean = (v) => String(v ?? '').trim();

async function validate(b, { editing = false, ignoreId = null } = {}) {
  const name = clean(b.name), rollNumber = clean(b.rollNumber), email = clean(b.email).toLowerCase(), classId = clean(b.classId);
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (!rollNumber) return 'Roll number is required.';
  if (!emailOk(email)) return 'Enter a valid email address.';
  if (!editing && !b.password) return 'Set an initial password for the student.';
  if (b.password && String(b.password).length < 6) return 'Password must be at least 6 characters.';
  if (!classId || !(await db.findById('classes', classId))) return 'Choose a valid class.';
  const students = await db.getAll('students');
  if (students.some((s) => s.id !== ignoreId && s.rollNumber.toLowerCase() === rollNumber.toLowerCase())) return 'That roll number is already in use.';
  const users = await db.getAll('users');
  const own = students.find((s) => s.id === ignoreId);
  if (users.some((u) => u.id !== (own && own.userId) && (u.email.toLowerCase() === email || u.username.toLowerCase() === rollNumber.toLowerCase()))) return 'That email or roll number is already registered.';
  return null;
}

exports.list = async (req, res) => {
  const q = clean(req.query.search).toLowerCase();
  const [students, classes] = await Promise.all([db.getAll('students'), db.getAll('classes')]);
  res.json(students
    .filter((s) => !req.query.classId || s.classId === req.query.classId)
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q))
    .map((s) => ({ ...s, className: (classes.find((c) => c.id === s.classId) || {}).className || '-' })));
};

exports.get = async (req, res) => {
  const s = await db.findById('students', req.params.id);
  if (!s) return res.status(404).json({ message: 'Student not found.' });
  if (req.user.role === 'student' && s.userId !== req.user.id) return res.status(403).json({ message: 'You can only view your own details.' });
  res.json(s);
};

exports.create = async (req, res) => {
  const err = await validate(req.body);
  if (err) return res.status(400).json({ message: err });
  const b = req.body;
  const user = await db.add('users', {
    name: clean(b.name), username: clean(b.rollNumber), email: clean(b.email).toLowerCase(),
    passwordHash: await bcrypt.hash(String(b.password), 10), role: 'student',
  });
  const student = await db.add('students', {
    name: clean(b.name), rollNumber: clean(b.rollNumber), email: clean(b.email).toLowerCase(), classId: clean(b.classId), userId: user.id,
  });
  res.status(201).json(student);
};

exports.update = async (req, res) => {
  const existing = await db.findById('students', req.params.id);
  if (!existing) return res.status(404).json({ message: 'Student not found.' });
  const err = await validate(req.body, { editing: true, ignoreId: existing.id });
  if (err) return res.status(400).json({ message: err });
  const b = req.body;
  const changes = { name: clean(b.name), rollNumber: clean(b.rollNumber), email: clean(b.email).toLowerCase(), classId: clean(b.classId) };
  const userChanges = { name: changes.name, username: changes.rollNumber, email: changes.email };
  if (b.password) userChanges.passwordHash = await bcrypt.hash(String(b.password), 10);
  await db.update('users', existing.userId, userChanges);
  res.json(await db.update('students', existing.id, changes));
};

exports.remove = async (req, res) => {
  const s = await db.findById('students', req.params.id);
  if (!s) return res.status(404).json({ message: 'Student not found.' });
  await db.remove('students', s.id);
  await db.remove('users', s.userId);
  await db.transaction('attendance-records', (d) => {
    const keep = d.filter((r) => r.studentId !== s.id);
    d.length = 0; d.push(...keep);
    return { save: true };
  });
  res.json({ message: 'Student deleted.' });
};
