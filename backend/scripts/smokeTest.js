// End-to-end test. Usage: start the server on a TEST data folder, then `npm test`.
//   (the script starts its own server with a temporary data folder)
const { spawn } = require('child_process');
const os = require('os'); const fs = require('fs'); const path = require('path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'att-'));
const PORT = 5055, B = `http://localhost:${PORT}/api`;
const env = { ...process.env, PORT, DATA_DIR: dir, JWT_SECRET: 'test-secret-test-secret-123', CLIENT_URL: 'http://localhost:5173' };
let pass = 0, fail = 0;
const ok = (cond, name) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, url, body, token) {
  const r = await fetch(B + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
}
const start = () => spawn('node', ['server.js'], { env, stdio: 'ignore' });
async function waitUp() { for (let i = 0; i < 40; i++) { try { if ((await fetch(B + '/health')).ok) return; } catch {} await sleep(250); } throw new Error('server did not start'); }

(async () => {
  let srv = start(); await waitUp();
  try {
    require('child_process').execFileSync('node', ['scripts/createTeacher.js', 'Mr Test', 't@x.com', 'teacher1', 'Teach1234'], { env });
    let r = await call('POST', '/auth/login', { identifier: 'teacher1', password: 'wrong' }); ok(r.s === 401, 'bad password rejected');
    r = await call('POST', '/auth/login', { identifier: 't@x.com', password: 'Teach1234' }); ok(r.s === 200 && r.j.user.role === 'teacher', 'teacher login (email)');
    const T = r.j.token;
    r = await call('POST', '/classes', { className: 'CS-A', subjects: ['Math', 'Physics'] }, T); ok(r.s === 201, 'create class'); const cls = r.j;
    r = await call('POST', '/classes', { className: 'CS-B', subjects: ['Art'] }, T); const cls2 = r.j;
    r = await call('POST', '/students', { name: 'Asha', rollNumber: '101', email: 'a@x.com', classId: cls.id, password: 'pass1234' }, T); ok(r.s === 201, 'add student 1'); const s1 = r.j;
    r = await call('POST', '/students', { name: 'Ben', rollNumber: '102', email: 'b@x.com', classId: cls.id, password: 'pass1234' }, T); const s2 = r.j;
    r = await call('POST', '/students', { name: 'Cy', rollNumber: '201', email: 'c@x.com', classId: cls2.id, password: 'pass1234' }, T); ok(r.s === 201, 'add student other class');
    r = await call('POST', '/students', { name: 'Dup', rollNumber: '101', email: 'd@x.com', classId: cls.id, password: 'pass1234' }, T); ok(r.s === 400, 'duplicate roll rejected');
    r = await call('POST', '/students', { name: 'Dup', rollNumber: '999', email: 'A@x.com', classId: cls.id, password: 'pass1234' }, T); ok(r.s === 400, 'duplicate email rejected');
    r = await call('PUT', `/students/${s2.id}`, { name: 'Ben K', rollNumber: '102', email: 'b@x.com', classId: cls.id }, T); ok(r.s === 200 && r.j.name === 'Ben K', 'edit student');
    r = await call('GET', '/students?search=asha', null, T); ok(r.j.length === 1, 'search students');

    const login = async (id) => (await call('POST', '/auth/login', { identifier: id, password: 'pass1234' })).j.token;
    const S1 = await login('101'), S2 = await login('102'), S3 = await login('201');
    r = await call('GET', '/students', null, S1); ok(r.s === 403, 'student blocked from teacher API');
    r = await call('GET', '/students'); ok(r.s === 401, 'no token blocked');
    r = await call('POST', '/sessions/start', { classId: cls.id, subject: 'Math', durationMinutes: 5 }, S1); ok(r.s === 403, 'student cannot start session');
    r = await call('POST', '/sessions/start', { classId: cls.id, subject: 'Math', durationMinutes: 5 }, T); ok(r.s === 201 && r.j.token.length >= 32, 'start session'); const sess = r.j;
    r = await call('POST', '/sessions/start', { classId: cls.id, subject: 'Math', durationMinutes: 5 }, T); ok(r.s === 409, 'second concurrent session blocked');
    r = await call('POST', '/attendance/mark', { token: 'bogus' }, S1); ok(r.s === 400, 'invalid QR rejected');
    r = await call('POST', '/attendance/mark', { token: sess.token }, S3); ok(r.s === 403, 'wrong-class student rejected');
    const both = await Promise.all([call('POST', '/attendance/mark', { token: sess.token }, S1), call('POST', '/attendance/mark', { token: sess.token }, S1)]);
    ok(both.filter((x) => x.s === 201).length === 1 && both.filter((x) => x.s === 409).length === 1, 'simultaneous duplicate scans -> exactly one record');
    r = await call('POST', `/sessions/${sess.id}/close`, null, T); ok(r.j.status === 'closed', 'close session');
    r = await call('POST', '/attendance/mark', { token: sess.token }, S2); ok(r.s === 400, 'closed session rejects scan');
    // short-lived second session for expiry test
    r = await call('POST', '/sessions/start', { classId: cls.id, subject: 'Physics', durationMinutes: 1 }, T); const s2sess = r.j;
    r = await call('POST', '/attendance/mark', { token: s2sess.token }, S2); ok(r.s === 201, 'Ben marks Physics');
    r = await call('POST', `/sessions/${s2sess.id}/close`, null, T);
    r = await call('GET', `/attendance/student/${s1.id}`, null, S1); ok(r.s === 200 && r.j.stats.attended === 1 && r.j.stats.totalClasses === 2 && r.j.stats.percentage === 50, 'student % = 1/2 = 50');
    r = await call('GET', `/attendance/student/${s1.id}`, null, S2); ok(r.s === 403, "student cannot read another's attendance");
    r = await call('GET', '/attendance/me', null, S2); ok(r.j.stats.percentage === 50, 'Ben % = 50');
    r = await call('PUT', '/attendance/correct', { sessionId: sess.id, studentId: s2.id, status: 'present' }, T); ok(r.s === 200, 'teacher correction');
    r = await call('GET', '/attendance/me', null, S2); ok(r.j.stats.percentage === 100, 'Ben % after correction = 100');
    r = await call('GET', `/attendance?classId=${cls.id}&status=absent`, null, T); ok(r.j.length === 1 && r.j[0].studentName === 'Asha', 'absent list derived');
    r = await call('GET', '/reports/attendance', null, T); ok(r.j.length === 3, 'report rows');
    r = await call('GET', `/reports/attendance/export?classId=${cls.id}`, null, T); ok(typeof r.j === 'string' && r.j.includes('Attendance %') && r.j.includes('Asha'), 'CSV export');
    r = await call('GET', '/reports/dashboard', null, T); ok(r.j.totalStudents === 3 && r.j.todayPresent === 3, 'dashboard numbers');
    // Expiry: write an expired session directly then try to scan
    const f = path.join(dir, 'attendance-sessions.json'); const arr = JSON.parse(fs.readFileSync(f)); 
    arr.push({ id: 'old', classId: cls.id, subject: 'Math', token: 'expiredtoken', date: '2020-01-01', startedAt: '2020-01-01T00:00:00Z', expiresAt: '2020-01-01T00:05:00Z', status: 'active' }); fs.writeFileSync(f, JSON.stringify(arr));
    r = await call('POST', '/attendance/mark', { token: 'expiredtoken' }, S1); ok(r.s === 400 && /expired/i.test(r.j.message), 'expired QR rejected');
    r = await call('GET', '/data/users.json'); ok(r.s === 404, 'data folder not exposed');
    // Persistence across restart
    srv.kill(); await sleep(500); srv = start(); await waitUp();
    r = await call('POST', '/auth/login', { identifier: '101', password: 'pass1234' }); ok(r.s === 200, 'login works after restart');
    r = await call('GET', '/attendance/me', null, r.j.token); ok(r.j.stats.attended === 1, 'data persisted after restart');
  } catch (e) { console.error('ERROR', e); fail++; }
  srv.kill();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
