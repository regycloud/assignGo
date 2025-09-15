import { Link } from "react-router-dom";

export default function NotFound404() {
  const wrap = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #fdf2f8, #e0f2fe)",
    padding: 24,
    textAlign: "center",
  };
  const emoji = {
    fontSize: 96,
    lineHeight: 1,
    marginBottom: 16,
    animation: "bounce 1.5s infinite",
  };
  const title = { fontSize: 36, fontWeight: 800, marginBottom: 8 };
  const subtitle = { color: "#6b7280", marginBottom: 20, maxWidth: 400 };
  const btn = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 12,
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <div style={wrap}>
      <div style={emoji}>🧐</div>
      <h1 style={title}>404 — Where do you want to go?</h1>
      <p style={subtitle}>
        I thought you were lost. 👷‍♂️
      </p>
      <Link to="/home" style={btn}>🏠 Back to home</Link>

      <style>
        {`@keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }`}
      </style>
    </div>
  );
}
