import { Outlet } from "react-router-dom";
import Sidebar from "../src/shared/Sidebar";
import Topbar from "../src/shared/Topbar";

export default function AppLayout() {
  const wrap = {
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gridTemplateRows: "56px 1fr",
    background: "#fafafa",
  };
  const sidebar = { gridColumn: "1 / 2", gridRow: "1 / 3", borderRight: "1px solid #e5e7eb", background: "#fff" };
  const topbar  = { gridColumn: "2 / 3", gridRow: "1 / 2", borderBottom: "1px solid #e5e7eb", background: "#fff" };
  const main    = { gridColumn: "2 / 3", gridRow: "2 / 3", overflowY: "auto", padding: 16 };

  return (
    <div style={wrap}>
      <aside style={sidebar}><Sidebar /></aside>
      <header style={topbar}><Topbar /></header>
      <main style={main}>
        <Outlet />
      </main>
    </div>
  );
}
