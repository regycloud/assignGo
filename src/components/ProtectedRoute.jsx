// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, msg: "Please Login First!" }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;