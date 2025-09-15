import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function NoRolePage() {
  const wrap = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg,#fff,#fef3f2)",
    padding: 24,
  };
  const card = {
    width: "min(560px, 94vw)",
    background: "#fff",
    border: "1px solid #fee2e2",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(190,24,93,0.08)",
    padding: 28,
    textAlign: "center",
  };
  const pill = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontSize: 12,
    marginBottom: 10,
  };
  const btn = (bg, bd, color="#fff") => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${bd}`,
    background: bg,
    color,
    cursor: "pointer",
  });

  const handleLogout = async () => {
    await signOut(auth);
    // biarkan router global mengarahkan ke /login
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }}>🧸</div>
        <div style={pill}>Belum ada role</div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 26, fontWeight: 800 }}>
          Akunmu belum ditetapkan role-nya
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Kamu sudah login, tapi belum ada data <b>users/&lt;uid&gt;</b> atau <i>roleDisplay</i>-nya kosong.
          <br />Hubungi admin agar menambahkan role: <i>admin / pic / staff</i>.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/dashboard" style={btn("#2563eb", "#2563eb")}>🔄 Coba ke Dashboard</Link>
          <button onClick={handleLogout} style={btn("#ef4444", "#ef4444")}>🚪 Log out</button>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "#9ca3af" }}>
          Admin hint: buat dokumen <code>users/UID</code> dengan{" "}
          <code>{`{ roleDisplay: "pic", assignedProjects: [] }`}</code> (contoh).
        </div>
      </div>
    </div>
  );
}