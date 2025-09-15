import { NavLink } from "react-router-dom";

const item = { display: "block", padding: "10px 14px", borderRadius: 10, color: "#111827", textDecoration: "none" };
const active = { background: "#eef2ff", color: "#1e1b4b", fontWeight: 700 };

export default function Sidebar() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 18, margin: "8px 6px 16px" }}>AssignGO</div>

      <NavLink to="/home" end style={({ isActive }) => ({ ...item, ...(isActive ? active : {}) })}>
        Dashboard
      </NavLink>

      <NavLink to="/home/penugasan/new" style={({ isActive }) => ({ ...item, ...(isActive ? active : {}) })}>
        Buat Penugasan
      </NavLink>

      <div style={{ marginTop: "auto", fontSize: 12, color: "#6b7280", padding: "8px 6px" }}>
        v1.0
      </div>
    </div>
  );
}
