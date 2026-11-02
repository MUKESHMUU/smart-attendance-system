import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const teacherLinks = [
  ['/teacher', 'Dashboard', true], ['/teacher/students', 'Students'], ['/teacher/classes', 'Classes'],
  ['/teacher/attendance', 'Start attendance'], ['/teacher/records', 'Attendance records'], ['/teacher/reports', 'Reports'], ['/profile', 'Profile'],
];
const studentLinks = [['/student', 'My dashboard', true], ['/student/scan', 'Scan attendance'], ['/profile', 'Profile']];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const links = user.role === 'teacher' ? teacherLinks : studentLinks;
  const out = async () => { await signOut(); nav('/login'); };
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" aria-label="Open menu" onClick={() => setOpen(!open)}>☰</button>
        <strong>Smart Attendance</strong>
      </header>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">Smart<br />Attendance</div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <div>{user.name}</div>
          <small>{user.role}</small>
          <button className="btn ghost" onClick={out}>Log out</button>
        </div>
      </aside>
    </>
  );
}
