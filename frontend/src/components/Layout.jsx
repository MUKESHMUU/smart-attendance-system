import Sidebar from './Sidebar.jsx';
export default function Layout({ title, actions, children }) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-head"><h1>{title}</h1><div className="head-actions">{actions}</div></div>
        {children}
      </main>
    </div>
  );
}
