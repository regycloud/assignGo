// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

   useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/maintenance", { replace: true });
    }, 5000); // 10000 ms = 10 detik

    return () => clearTimeout(timer); // bersihkan kalau user pindah halaman
  }, [navigate]);

  // state form sederhana (demo)
  const [tripType, setTripType] = useState("domestic");
  const [form, setForm] = useState({
    purpose: "",
    origin: "Jakarta",
    destination: "Bali",
    departDate: "",
    returnDate: "",
    notes: "",
  });
  const onChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  async function handleLogout() {
    try {
      await signOut(auth);
      // Redirect to /login WITHOUT banner; gunakan state
      navigate("/login", { replace: true, state: { reason: "logout" } });
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }

  const submit = (e) => {
    e.preventDefault();
    console.table({ ...form, tripType });
    alert("Saved (demo).");
  };

  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div>
          <div className="dash-brand">
            <img src="/airplane.png" />
            <span className="dash-brand-name">AssignGO</span>
          </div>
          <nav className="dash-nav">
            <a className="dash-nav-item active" href="#/dashboard">
              <span className="dash-nav-icon">📊</span> Dashboard
            </a>
            <a className="dash-nav-item" href="#/trips">
              <span className="dash-nav-icon">🧳</span> Business Trips
            </a>
            <a className="dash-nav-item" href="#/reimburse">
              <span className="dash-nav-icon">💳</span> Reimbursements
            </a>
            <a className="dash-nav-item" href="#/reports">
              <span className="dash-nav-icon">📈</span> Reports
            </a>
            <a className="dash-nav-item" href="#/settings">
              <span className="dash-nav-icon">⚙️</span> Settings
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
            <input className="dash-search-input" placeholder="Search…" />
          </div>
          <button className="dash-bell" title="Notifications">🔔</button>
          <button className="dash-bell" onClick={handleLogout} title="Logout">🚪</button>
        </header>

        <div className="dash-content">
          <h1 className="dash-page-title">Create New Business Trip Request</h1>
          <p className="dash-page-subtitle">
            Fill out the form below to submit a business trip request
          </p>

          {/* Stepper */}
          <ol className="dash-stepper">
            {["Trip Details", "Budget", "Supporting Docs", "Review"].map((s, i) => (
              <li key={s} className={`dash-step ${i === 0 ? "active" : ""}`}>
                <span className="dash-step-index">{i + 1}</span>
                <span className="dash-step-label">{s}</span>
              </li>
            ))}
          </ol>

          {/* Card: Trip Details */}
          <section className="dash-card">
            <h2 className="dash-card-title">Trip Details</h2>

            <form className="dash-grid" onSubmit={submit}>
              <div className="dash-col-7">
                <label className="dash-label">Trip Purpose</label>
                <input
                  className="dash-input"
                  placeholder="E.g. Meeting with XYZ Client"
                  value={form.purpose}
                  onChange={onChange("purpose")}
                />
              </div>

              <div className="dash-col-5">
                <label className="dash-label">Trip Type</label>
                <div className="dash-segmented">
                  <button
                    type="button"
                    className={`dash-segmented-btn ${tripType === "domestic" ? "active" : ""}`}
                    onClick={() => setTripType("domestic")}
                  >
                    ✈️ Domestic
                  </button>
                  <button
                    type="button"
                    className={`dash-segmented-btn ${tripType === "international" ? "active" : ""}`}
                    onClick={() => setTripType("international")}
                  >
                    🌐 International
                  </button>
                </div>
              </div>

              <div className="dash-col-6">
                <label className="dash-label">City of Origin</label>
                <select className="dash-input" value={form.origin} onChange={onChange("origin")}>
                  <option>Jakarta</option>
                  <option>Bandung</option>
                  <option>Surabaya</option>
                  <option>Medan</option>
                </select>
              </div>

              <div className="dash-col-6">
                <label className="dash-label">Destination City</label>
                <select className="dash-input" value={form.destination} onChange={onChange("destination")}>
                  <option>Bali</option>
                  <option>Singapore</option>
                  <option>Yogyakarta</option>
                  <option>Batam</option>
                </select>
              </div>

              <div className="dash-col-6">
                <label className="dash-label">Departure Date</label>
                <input
                  className="dash-input"
                  type="date"
                  value={form.departDate}
                  onChange={onChange("departDate")}
                />
              </div>

              <div className="dash-col-6">
                <label className="dash-label">Return Date</label>
                <input
                  className="dash-input"
                  type="date"
                  value={form.returnDate}
                  onChange={onChange("returnDate")}
                />
              </div>

              <div className="dash-col-12">
                <label className="dash-label">Additional Notes</label>
                <textarea
                  className="dash-input"
                  rows={4}
                  placeholder="Add any important notes or details…"
                  value={form.notes}
                  onChange={onChange("notes")}
                />
              </div>

              <div className="dash-actions">
                <button className="dash-btn" type="submit">Save & Continue</button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
