// A session counts as "conducted" once it is closed or its time has run out.
const isEnded = (s, now = Date.now()) => s.status === 'closed' || new Date(s.expiresAt).getTime() <= now;

// One stats row per student. Absent = no "present" record for an ended session.
function buildStats({ students, classes, sessions, records, filters = {} }) {
  const { classId, studentId, subject, from, to } = filters;
  const inRange = (s) => (!subject || s.subject === subject) && (!from || s.date >= from) && (!to || s.date <= to);
  const ended = sessions.filter((s) => isEnded(s) && inRange(s));
  const presentSet = new Set(records.filter((r) => r.status === 'present').map((r) => `${r.sessionId}|${r.studentId}`));
  return students
    .filter((st) => (!classId || st.classId === classId) && (!studentId || st.id === studentId))
    .map((st) => {
      const mine = ended.filter((s) => s.classId === st.classId);
      const attended = mine.filter((s) => presentSet.has(`${s.id}|${st.id}`)).length;
      const total = mine.length;
      const cls = classes.find((c) => c.id === st.classId);
      return {
        studentId: st.id, name: st.name, rollNumber: st.rollNumber,
        classId: st.classId, className: cls ? cls.className : '-',
        totalClasses: total, attended, missed: total - attended,
        percentage: total ? Math.round((attended / total) * 1000) / 10 : 0,
      };
    });
}

module.exports = { isEnded, buildStats };
