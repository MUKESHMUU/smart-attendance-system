const crypto = require('crypto');
const db = require('../utils/jsonDb');
const { isEnded, buildStats } = require('../utils/attendanceCalc');

// Student scans QR -> sends only the random token. Identity comes from the JWT.
exports.mark = async (req, res) => {
  const token = String((req.body && req.body.token) || '').trim();
  if (!token) return res.status(400).json({ message: 'No QR token received.' });
  const student = await db.findOne('students', (s) => s.userId === req.user.id);
  if (!student) return res.status(403).json({ message: 'No student profile is linked to this account.' });
  const session = await db.findOne('attendance-sessions', (s) => s.token === token);
  if (!session) return res.status(400).json({ message: 'Invalid QR code.' });
  if (session.status === 'closed') return res.status(400).json({ message: 'This attendance session is closed.' });
  if (isEnded(session)) return res.status(400).json({ message: 'This QR code has expired.' });
  if (student.classId !== session.classId) return res.status(403).json({ message: 'You do not belong to this class.' });

  const now = new Date();
  // Check + insert in ONE locked transaction so two simultaneous scans cannot both succeed.
  const out = await db.transaction('attendance-records', (d) => {
    const dup = d.find((r) => r.sessionId === session.id && r.studentId === student.id);
    if (dup && dup.status === 'present') return { result: { duplicate: true } };
    const rec = {
      id: dup ? dup.id : crypto.randomUUID(), sessionId: session.id, studentId: student.id,
      classId: session.classId, subject: session.subject, date: session.date,
      time: now.toISOString().slice(11, 19), timestamp: now.toISOString(), status: 'present', method: 'qr',
    };
    if (dup) Object.assign(dup, rec); else d.push(rec);
    return { save: true, result: { record: rec } };
  });
  if (out.duplicate) return res.status(409).json({ message: 'Attendance already marked for this session.' });
  res.status(201).json({ message: `Attendance marked for ${session.subject}.`, record: out.record });
};

async function enrich(records) {
  const [students, classes] = await Promise.all([db.getAll('students'), db.getAll('classes')]);
  return records.map((r) => {
    const st = students.find((s) => s.id === r.studentId) || {};
    const cl = classes.find((c) => c.id === r.classId) || {};
    return { ...r, studentName: st.name || 'Deleted', rollNumber: st.rollNumber || '-', className: cl.className || '-' };
  });
}

// Teacher: filter by classId, date, subject, status, search. "absent" is derived for ended sessions.
exports.list = async (req, res) => {
  const { classId, date, subject, status, search } = req.query;
  const [sessions, records, students] = await Promise.all([db.getAll('attendance-sessions'), db.getAll('attendance-records'), db.getAll('students')]);
  let rows = [];
  for (const s of sessions) {
    if ((classId && s.classId !== classId) || (date && s.date !== date) || (subject && s.subject !== subject)) continue;
    const ended = isEnded(s);
    for (const st of students.filter((x) => x.classId === s.classId)) {
      const r = records.find((x) => x.sessionId === s.id && x.studentId === st.id);
      if (!r && !ended) continue;
      rows.push(r ? { ...r } : {
        id: null, sessionId: s.id, studentId: st.id, classId: s.classId, subject: s.subject,
        date: s.date, time: '-', status: 'absent',
      });
    }
  }
  rows = await enrich(rows);
  if (status) rows = rows.filter((r) => r.status === status);
  if (search) { const q = String(search).toLowerCase(); rows = rows.filter((r) => r.studentName.toLowerCase().includes(q) || r.rollNumber.toLowerCase().includes(q)); }
  rows.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  res.json(rows);
};

async function studentHistory(studentId) {
  const student = await db.findById('students', studentId);
  if (!student) return null;
  const [sessions, records, classes] = await Promise.all([db.getAll('attendance-sessions'), db.getAll('attendance-records'), db.getAll('classes')]);
  const stats = buildStats({ students: [student], classes, sessions, records })[0];
  const history = sessions.filter((s) => s.classId === student.classId && isEnded(s)).map((s) => {
    const r = records.find((x) => x.sessionId === s.id && x.studentId === student.id);
    const present = r && r.status === 'present';
    return { sessionId: s.id, subject: s.subject, date: s.date, time: present ? r.time : '-', status: present ? 'present' : 'absent' };
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const t = new Date().toISOString().slice(0, 10);
  const todays = history.filter((h) => h.date === t);
  const todayStatus = todays.length ? (todays.some((h) => h.status === 'present') ? 'present' : 'absent') : 'no-class';
  return { student: { ...student, className: stats.className }, stats, history, todayStatus };
}

exports.byStudent = async (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'student') {
    const me = await db.findOne('students', (s) => s.userId === req.user.id);
    if (!me || me.id !== studentId) return res.status(403).json({ message: 'You can only view your own attendance.' });
  }
  const out = await studentHistory(studentId);
  out ? res.json(out) : res.status(404).json({ message: 'Student not found.' });
};

exports.mine = async (req, res) => {
  const me = await db.findOne('students', (s) => s.userId === req.user.id);
  if (!me) return res.status(404).json({ message: 'No student profile linked to this account.' });
  res.json(await studentHistory(me.id));
};

exports.byClass = async (req, res) => {
  const [students, classes, sessions, records] = await Promise.all(['students', 'classes', 'attendance-sessions', 'attendance-records'].map((n) => db.getAll(n)));
  res.json(buildStats({ students, classes, sessions, records, filters: { classId: req.params.classId } }));
};

// Teacher correction: set a student's status for a session (present/absent)
exports.correct = async (req, res) => {
  const { sessionId, studentId, status } = req.body || {};
  if (!['present', 'absent'].includes(status)) return res.status(400).json({ message: 'Status must be present or absent.' });
  const session = await db.findById('attendance-sessions', sessionId);
  const student = await db.findById('students', studentId);
  if (!session || !student) return res.status(404).json({ message: 'Session or student not found.' });
  if (student.classId !== session.classId) return res.status(400).json({ message: "Student is not in this session's class." });
  const now = new Date();
  const rec = await db.transaction('attendance-records', (d) => {
    let r = d.find((x) => x.sessionId === sessionId && x.studentId === studentId);
    if (!r) {
      r = { id: crypto.randomUUID(), sessionId, studentId, classId: session.classId, subject: session.subject, date: session.date, time: now.toISOString().slice(11, 19), timestamp: now.toISOString() };
      d.push(r);
    }
    Object.assign(r, { status, method: 'teacher-correction', correctedBy: req.user.id, correctedAt: now.toISOString() });
    return { save: true, result: r };
  });
  res.json(rec);
};
