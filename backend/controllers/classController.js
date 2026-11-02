const db = require('../utils/jsonDb');

function parse(b) {
  const className = String(b.className || '').trim();
  const subjects = [...new Set((Array.isArray(b.subjects) ? b.subjects : String(b.subjects || '').split(','))
    .map((s) => String(s).trim()).filter(Boolean))];
  if (className.length < 2) return { error: 'Class name must be at least 2 characters.' };
  if (!subjects.length) return { error: 'Add at least one subject.' };
  return { className, subjects };
}

exports.list = async (req, res) => {
  const [classes, students] = await Promise.all([db.getAll('classes'), db.getAll('students')]);
  res.json(classes.map((c) => ({ ...c, studentCount: students.filter((s) => s.classId === c.id).length })));
};

exports.create = async (req, res) => {
  const p = parse(req.body);
  if (p.error) return res.status(400).json({ message: p.error });
  if (await db.findOne('classes', (c) => c.className.toLowerCase() === p.className.toLowerCase()))
    return res.status(400).json({ message: 'A class with that name already exists.' });
  res.status(201).json(await db.add('classes', p));
};

exports.update = async (req, res) => {
  const p = parse(req.body);
  if (p.error) return res.status(400).json({ message: p.error });
  const dup = await db.findOne('classes', (c) => c.id !== req.params.id && c.className.toLowerCase() === p.className.toLowerCase());
  if (dup) return res.status(400).json({ message: 'A class with that name already exists.' });
  const out = await db.update('classes', req.params.id, p);
  out ? res.json(out) : res.status(404).json({ message: 'Class not found.' });
};

exports.remove = async (req, res) => {
  const inUse = await db.findOne('students', (s) => s.classId === req.params.id);
  if (inUse) return res.status(400).json({ message: 'Move or delete the students in this class first.' });
  const ok = await db.remove('classes', req.params.id);
  ok ? res.json({ message: 'Class deleted.' }) : res.status(404).json({ message: 'Class not found.' });
};
