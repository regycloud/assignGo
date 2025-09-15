import { useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Topbar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q0 = params.get("q") || "";

  const onSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() || "";
    navigate(`/app/search?q=${encodeURIComponent(q)}`);
  };

  const onLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
      <form onSubmit={onSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
        <input
          name="q"
          defaultValue={q0}
          placeholder="Search…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 10, background: "#2563eb", color: "#fff", border: "1px solid #2563eb" }}>
          Search
        </button>
      </form>

      <button onClick={onLogout} style={{ padding: "10px 14px", borderRadius: 10, background: "#ef4444", color: "#fff", border: "1px solid #ef4444" }}>
        Log out
      </button>
    </div>
  );
}
