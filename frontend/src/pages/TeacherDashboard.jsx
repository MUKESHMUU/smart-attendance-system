import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import Notice from '../components/Notice.jsx';
import { api } from '../services/api.js';

export default function TeacherDashboard() {
  const [d, setD] = useState(null);
  const [active, setActive] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard').then(setD).catch((e) => setError(e.message));
    api.get('/sessions/active').then(setActive).catch(() => {});
  }, []);

  return (
    <Layout title="Dashboard" actions={<Link className="btn primary" to="/teacher/attendance">Start attendance</Link>}>
      <Notice>{error}</Notice>
      {!d ? !error && <p className="muted">Loading…</p> : (
        <>
          <div className="grid stats">
            <DashboardCard label="Students" value={d.totalStudents} />
            <DashboardCard label="Classes" value={d.totalClasses} />
            <DashboardCard label="Present today" value={d.todayPresent} tone="good" />
            <DashboardCard label="Absent today" value={d.todayAbsent} tone="bad" />
            <DashboardCard label="Today's attendance" value={`${d.todayPercentage}%`} hint={`${d.todaySessions} session(s) today`} />
            <DashboardCard label="Active sessions" value={d.activeSessions} tone="warn" />
          </div>
          <div className="grid two">
            <section className="card">
              <h2>Average attendance by class</h2>
              {d.byClass.length === 0 && <p className="muted">Create a class to see this chart.</p>}
              {d.byClass.map((c) => (
                <div className="bar-row" key={c.className}>
                  <span className="bar-label">{c.className}</span>
                  <div className="bar"><div style={{ width: `${c.percentage}%` }} className={c.percentage < 75 ? 'low' : ''} /></div>
                  <span className="bar-val">{c.percentage}%</span>
                </div>
              ))}
            </section>
            <section className="card">
              <h2>Active sessions</h2>
              {active.length === 0 ? <p className="muted">No session is running.</p> : (
                <table><thead><tr><th>Class</th><th>Subject</th><th>Ends</th></tr></thead><tbody>
                  {active.map((s) => <tr key={s.id}><td>{s.className}</td><td>{s.subject}</td><td>{new Date(s.expiresAt).toLocaleTimeString()}</td></tr>)}
                </tbody></table>
              )}
            </section>
          </div>
          <section className="card">
            <h2>Students below 75%</h2>
            {d.lowAttendance.length === 0 ? <p className="muted">No student is below 75%.</p> : (
              <div className="table-wrap"><table><thead><tr><th>Name</th><th>Roll</th><th>Class</th><th>Attendance</th></tr></thead><tbody>
                {d.lowAttendance.map((s) => <tr key={s.studentId}><td>{s.name}</td><td>{s.rollNumber}</td><td>{s.className}</td><td><span className="pill bad">{s.percentage}%</span></td></tr>)}
              </tbody></table></div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
