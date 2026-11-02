export default function DashboardCard({ label, value, tone = '', hint }) {
  return (
    <div className={`card stat ${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}
