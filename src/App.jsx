// App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase"; // pastikan path sesuai lokasi auth

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPenugasanForm from "./pages/DashboardPenugasanForm";
import Forbidden403 from "./pages/Forbidden403";
import NoRolePage from "./pages/NoRolePage";
import AppLayout from "../layouts/AppLayout";
import NotFound404 from "./pages/NotFound404";
import DevSeedPenugasan from "./pages/DevSeedPenugasan";
import TripDetail from "./pages/TripDetail";
import TripAmount from "./pages/TripAmount";

/**
 * RootGate: saat user ke "/" tentukan redirect:
 *  - jika sudah login => /home
 *  - jika belum login => /login
 *  Menghindari kasus bisa mengintip halaman /home/* sebelum auth siap.
 */
function RootGate() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setLoggedIn(!!u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return null; // atau spinner kecil kalau mau
  return <Navigate to={loggedIn ? "/home" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<RootGate />} />
      <Route path="/login" element={<LoginPage />} />

      {/* protected area with layout */}
      <Route
        path="/home"
        element={
          <ProtectedRoute allow={["admin", "pic", "bod"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* admin only pages */}
        <Route
          path="penugasan/new"
          element={
            <ProtectedRoute allow={["admin"]}>
              <DashboardPenugasanForm />
            </ProtectedRoute>
          }
        />
        <Route path="trips/:id" element={<TripDetail />} />
        <Route path="trips/:id/amount" element={<TripAmount />} />

        {/* DEV SEED — admin only, terlindungi & berada di bawah /home */}
        <Route
          path="dev/seed"
          element={
            <ProtectedRoute allow={["admin"]}>
              <DevSeedPenugasan />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* fallbacks */}
      <Route path="/403" element={<Forbidden403 />} />
      <Route path="/no-role" element={<NoRolePage />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}