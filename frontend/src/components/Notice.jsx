export default function Notice({ type = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && <button className="icon-btn" aria-label="Dismiss" onClick={onClose}>×</button>}
    </div>
  );
}
