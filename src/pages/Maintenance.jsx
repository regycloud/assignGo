import "../styles/Dashboard.css";
import { Link } from "react-router-dom";


export default function Maintenance() {
  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div>
          <div className="dash-brand">
            <img src="/airplane.png" alt="Logo" />
            <span className="dash-brand-name">AssignGO</span>
          </div>

          <nav className="dash-nav">
            <a className="dash-nav-item active" href="#/maintenance">
              <span className="dash-nav-icon">🛠️</span> System Status
            </a>
            <a className="dash-nav-item" href="#/dashboard">
                <Link className="dash-nav-item active" to="/dashboard">
    <span className="dash-nav-icon">📊</span> Dashboard
  </Link>
            </a>
          </nav>
        </div>

        <div className="dash-user">
          <img className="dash-user-avatar" src="https://i.pravatar.cc/60" alt="" />
          <div>
            <div className="dash-user-name">Administrator</div>
            <div className="dash-user-role">Administrator PTI</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-search">
            <span>🔎</span>
            <input className="dash-search-input" placeholder="Search…" disabled />
          </div>
          <button className="dash-bell" title="Notifications" disabled>🔔</button>
        </header>

        <div className="dash-content">
          <section className="dash-card dash-center">
            <div className="dash-spinner" aria-hidden="true" />
            <h1 className="dash-page-title" style={{ marginTop: 10 }}>
              System is under maintenance
            </h1>
            <p className="dash-page-subtitle" style={{ marginBottom: 16 }}>
              Backing up data...
            </p>

            <div className="dash-progress">
              <div className="dash-progress-bar" />
            </div>

            <p className="dash-muted-note">
              Please keep this page open. Some actions are temporarily disabled.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
