import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import Students from './pages/Students.jsx';
import Classes from './pages/Classes.jsx';
import StartAttendance from './pages/StartAttendance.jsx';
import ScanAttendance from './pages/ScanAttendance.jsx';
import AttendanceRecords from './pages/AttendanceRecords.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

const T = (el) => <ProtectedRoute role="teacher">{el}</ProtectedRoute>;
const S = (el) => <ProtectedRoute role="student">{el}</ProtectedRoute>;

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-note">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/teacher" element={T(<TeacherDashboard />)} />
      <Route path="/teacher/students" element={T(<Students />)} />
      <Route path="/teacher/classes" element={T(<Classes />)} />
      <Route path="/teacher/attendance" element={T(<StartAttendance />)} />
      <Route path="/teacher/records" element={T(<AttendanceRecords />)} />
      <Route path="/teacher/reports" element={T(<Reports />)} />
      <Route path="/student" element={S(<StudentDashboard />)} />
      <Route path="/student/scan" element={S(<ScanAttendance />)} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
