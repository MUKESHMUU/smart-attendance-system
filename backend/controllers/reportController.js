const db = require('../utils/jsonDb');
const { buildStats, isEnded } = require('../utils/attendanceCalc');

const load = () => Promise.all(['students', 'classes', 'attendance-sessions', 'attendance-records'].map((n) => db.getAll(n)));

async function rows(q) {
  const [students, classes, sessions, records] = await load();
  return buildStats({ students, classes, sessions, records, filters: { classId: q.classId, studentId: q.studentId, subject: q.subject, from: q.from, to: q.to } });
}

// Quote fields and neutralise spreadsheet formula injection (=,+,-,@)
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

exports.report = async (req, res) => res.json(await rows(req.query));

exports.exportCsv = async (req, res) => {
  const data = await rows(req.query);
  const head = ['Student Name', 'Roll Number', 'Class', 'Total Classes', 'Classes Attended', 'Classes Missed', 'Attendance %'];
  const lines = [head.map(cell).join(',')].concat(
    data.map((r) => [r.name, r.rollNumber, r.className, r.totalClasses, r.attended, r.missed, r.percentage].map(cell).join(','))
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
  res.send('\uFEFF' + lines.join('\r\n'));
};

exports.dashboard = async (req, res) => {
  const [students, classes, sessions, records] = await load();
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.date === today);
  let present = 0, expected = 0;
  for (const s of todaySessions) {
    const roster = students.filter((st) => st.classId === s.classId);
    expected += roster.length;
    present += roster.filter((st) => records.some((r) => r.sessionId === s.id && r.studentId === st.id && r.status === 'present')).length;
  }
  const stats = buildStats({ students, classes, sessions, records });
  const byClass = classes.map((c) => {
    const rs = stats.filter((r) => r.classId === c.id && r.totalClasses > 0);
    return { className: c.className, percentage: rs.length ? Math.round((rs.reduce((a, r) => a + r.percentage, 0) / rs.length) * 10) / 10 : 0 };
  });
  res.json({
    totalStudents: students.length, totalClasses: classes.length, totalSessions: sessions.length,
    todaySessions: todaySessions.length, todayPresent: present, todayAbsent: Math.max(expected - present, 0),
    todayPercentage: expected ? Math.round((present / expected) * 1000) / 10 : 0,
    activeSessions: sessions.filter((s) => !isEnded(s)).length,
    byClass,
    lowAttendance: stats.filter((r) => r.totalClasses > 0 && r.percentage < 75).sort((a, b) => a.percentage - b.percentage).slice(0, 5),
  });
};
