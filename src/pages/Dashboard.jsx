// src/pages/Dashboard.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut(auth);
      // Redirect to /login WITHOUT a banner message
      navigate("/login", { replace: true, msg:""});
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16
    }}>
      <h2>Welcome 👋</h2>
      <button onClick={handleLogout} style={{
        padding: "10px 16px",
        borderRadius: 8,
        border: "none",
        background: "#3498db",
        color: "#fff",
        cursor: "pointer"
      }}>
        Logout
      </button>
    </div>
  );
}