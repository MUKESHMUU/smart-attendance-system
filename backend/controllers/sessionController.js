const crypto = require('crypto');
const db = require('../utils/jsonDb');
const { isEnded } = require('../utils/attendanceCalc');

const view = (s) => ({ ...s, ended: isEnded(s), active: !isEnded(s) });
const today = () => new Date().toISOString().slice(0, 10);

exports.start = async (req, res) => {
  const { classId, subject } = req.body || {};
  const minutes = Number(req.body && req.body.durationMinutes);
  const cls = classId && (await db.findById('classes', classId));
  if (!cls) return res.status(400).json({ message: 'Choose a valid class.' });
  if (!cls.subjects.includes(subject)) return res.status(400).json({ message: 'Choose a subject taught in this class.' });
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) return res.status(400).json({ message: 'Validity must be 1 to 120 minutes.' });
  const now = Date.now();
  const session = await db.transaction('attendance-sessions', (d) => {
    const running = d.find((s) => s.classId === classId && s.subject === subject && !isEnded(s, now));
    if (running) return { result: { conflict: true } };
    const rec = {
      id: crypto.randomUUID(), createdAt: new Date(now).toISOString(),
      classId, className: cls.className, subject, teacherId: req.user.id,
      token: crypto.randomBytes(24).toString('hex'), // unguessable; the only value placed in the QR code
      date: today(), startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + minutes * 60000).toISOString(), status: 'active',
    };
    d.push(rec);
    return { save: true, result: rec };
  });
  if (session.conflict) return res.status(409).json({ message: 'A session is already running for this class and subject. Close it first.' });
  res.status(201).json(view(session));
};

exports.active = async (req, res) => {
  const all = await db.getAll('attendance-sessions');
  res.json(all.filter((s) => !isEnded(s)).map(view));
};

exports.list = async (req, res) => {
  const all = await db.getAll('attendance-sessions');
  res.json(all.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(({ token, ...s }) => ({ ...s, ended: isEnded(s) })));
};

exports.get = async (req, res) => {
  const s = await db.findById('attendance-sessions', req.params.id);
  if (!s) return res.status(404).json({ message: 'Session not found.' });
  const records = await db.findWhere('attendance-records', (r) => r.sessionId === s.id && r.status === 'present');
  const roster = await db.findWhere('students', (st) => st.classId === s.classId);
  res.json({ ...view(s), presentCount: records.length, rosterCount: roster.length });
};

exports.close = async (req, res) => {
  const out = await db.transaction('attendance-sessions', (d) => {
    const s = d.find((x) => x.id === req.params.id);
    if (!s) return { result: null };
    if (s.status !== 'closed') { s.status = 'closed'; s.closedAt = new Date().toISOString(); }
    return { save: true, result: s };
  });
  out ? res.json(view(out)) : res.status(404).json({ message: 'Session not found.' });
};
