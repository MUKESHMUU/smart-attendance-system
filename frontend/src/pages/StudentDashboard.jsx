import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import Notice from '../components/Notice.jsx';
import { api } from '../services/api.js';

const todayLabel = { present: 'Present', absent: 'Absent', 'no-class': 'No class yet' };

export default function StudentDashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/attendance/me').then(setD).catch((e) => setError(e.message)); }, []);

  return (
    <Layout title="My dashboard" actions={<Link className="btn primary" to="/student/scan">Scan attendance</Link>}>
      <Notice>{error}</Notice>
      {d && (
        <>
          <section className="card profile-strip">
            <div><h2>{d.student.name}</h2><span className="muted">Roll {d.student.rollNumber} · {d.student.className}</span></div>
            <span className={`pill ${d.todayStatus === 'present' ? 'good' : d.todayStatus === 'absent' ? 'bad' : ''}`}>Today: {todayLabel[d.todayStatus]}</span>
          </section>
          <div className="grid stats">
            <DashboardCard label="Total classes" value={d.stats.totalClasses} />
            <DashboardCard label="Attended" value={d.stats.attended} tone="good" />
            <DashboardCard label="Missed" value={d.stats.missed} tone="bad" />
            <DashboardCard label="Attendance" value={`${d.stats.percentage}%`} tone={d.stats.percentage < 75 && d.stats.totalClasses ? 'bad' : 'good'} />
          </div>
          <section className="card">
            <h2>Recent attendance</h2>
            {d.history.length === 0 ? <p className="muted">No classes have been held yet.</p> : (
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Subject</th><th>Time</th><th>Status</th></tr></thead><tbody>
                {d.history.slice(0, 30).map((h) => <tr key={h.sessionId}><td>{h.date}</td><td>{h.subject}</td><td>{h.time}</td><td><span className={`pill ${h.status === 'present' ? 'good' : 'bad'}`}>{h.status}</span></td></tr>)}
              </tbody></table></div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
