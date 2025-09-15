import { Link, useNavigate } from "react-router-dom";

export default function Forbidden403() {
  const nav = useNavigate();

  const wrap = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg,#fff, #f7f8ff)",
    padding: 24,
  };
  const card = {
    width: "min(560px, 94vw)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    padding: 28,
    textAlign: "center",
  };
  const btn = (bg, bd, color="#fff") => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${bd}`,
    background: bg,
    color,
    cursor: "pointer",
  });

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }}>🔒</div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 800 }}>403 — Access Denied</h1>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => nav(-1)} style={btn("#111827", "#111827")}>⬅️ Kembali</button>
          <Link to="/dashboard" style={btn("#2563eb", "#2563eb")}>🏠 Ke Dashboard</Link>
          <Link to="/no-role" style={btn("#fff", "#d1d5db", "#111827")}>ℹ️ Info Role</Link>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "#9ca3af" }}>
          Tip: Kalau harusnya kamu punya akses, hubungi admin untuk update role.
        </div>
      </div>
    </div>
  );
}