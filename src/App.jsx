import { Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Navigate to="/home" replace />} />
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
        {/* index = /app */}
        <Route index element={<Dashboard />} />
        {/* nested pages */}
        <Route path="penugasan/new" element={<DashboardPenugasanForm />} />
        {/* contoh halaman khusus admin:
        <Route path="admin" element={
          <ProtectedRoute allow={["admin"]}><AdminPage/></ProtectedRoute>
        }/> */}
        <Route path="trips/:id" element={<TripDetail />} />
        <Route path="trips/:id/amount" element={<TripAmount />} />
      </Route>

      {/* fallbacks */}
      <Route path="/403" element={<Forbidden403 />} />
      <Route path="/no-role" element={<NoRolePage />} />
      <Route path="/home/dev/seed" element={<DevSeedPenugasan />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}
