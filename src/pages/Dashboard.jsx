import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  doc, getDoc,
  collection, query, orderBy, limit, onSnapshot,
  where, getCountFromServer, getDocs
} from "firebase/firestore";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState(null);
  const [role, setRole] = useState(null);

  // data trips (tabel)
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsErr, setTripsErr] = useState("");

  // ==== SUMMARY state ====
  const [sumLoading, setSumLoading] = useState(false);
  const [sumErr, setSumErr] = useState("");
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalApprovedTrips, setTotalApprovedTrips] = useState(0);
  const [totalDraftTrips, setTotalDraftTrips] = useState(0);
  const [totalApprovedAmount, setTotalApprovedAmount] = useState(0);

  // ==== CHART: Approved vs Budget (2025) ====
  const YEARLY_BUDGET_2025 = 3_000_000_000; // Rp 3 Miliar
  const [approved2025, setApproved2025] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartErr, setChartErr] = useState("");

  const fmt = (ts) => {
    if (!ts) return "-";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  };

  // ambil user + nama + role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setName(null);
        setRole(null);
        return;
      }

      try {
        if (u.displayName) setName(u.displayName);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setName((prev) => prev || data.displayName || data.namaPekerja || "(tidak ada nama)");
          setRole((data.role || "").toLowerCase());
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  // ambil daftar trips (realtime)
  useEffect(() => {
    setTripsLoading(true);
    setTripsErr("");
    const qTrips = query(collection(db, "trips"), orderBy("date", "desc"), limit(8));
    const unsub = onSnapshot(qTrips,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTrips(rows);
        setTripsLoading(false);
      },
      (err) => {
        console.error("onSnapshot trips error:", err?.code, err?.message);
        setTrips([]);
        setTripsErr(`${err?.code || "error"}: ${err?.message || "unknown"}`);
        setTripsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ==== SUMMARY: counts + sum approved amount (semua tahun) ====
  const computeSummary = async () => {
    setSumLoading(true);
    setSumErr("");
    try {
      const tripsCol = collection(db, "trips");

      // total trips
      const totalSnap = await getCountFromServer(tripsCol);
      setTotalTrips(totalSnap.data().count || 0);

      // approved trips
      const qApproved = query(tripsCol, where("status_trip_document", "==", "approved"));
      const approvedCountSnap = await getCountFromServer(qApproved);
      const approvedCount = approvedCountSnap.data().count || 0;
      setTotalApprovedTrips(approvedCount);

      // draft trips
      const qDraft = query(tripsCol, where("status_trip_document", "==", "draft"));
      const draftCountSnap = await getCountFromServer(qDraft);
      setTotalDraftTrips(draftCountSnap.data().count || 0);

      // total approved amount (SEMUA tahun)
      let approvedAmountSum = 0;
      const approvedDocs = await getDocs(qApproved);
      approvedDocs.forEach((d) => {
        const val = d.data()?.amount?.total_approved_amount;
        const num = typeof val === "number" ? val : Number(val || 0);
        if (!Number.isNaN(num)) approvedAmountSum += num;
      });
      setTotalApprovedAmount(approvedAmountSum);

      // sekalian hitung grafik 2025
      await computeApprovedForYear(2025);
    } catch (e) {
      console.error("computeSummary error:", e);
      setSumErr(e?.message || String(e));
    } finally {
      setSumLoading(false);
    }
  };

  // ==== Approved Amount untuk tahun tertentu (dipakai chart 2025) ====
  const computeApprovedForYear = async (year) => {
    setChartLoading(true);
    setChartErr("");
    try {
      // gunakan field 'date' yang kamu simpan saat create trip
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
      const tripsCol = collection(db, "trips");
      const qYearApproved = query(
        tripsCol,
        where("status_trip_document", "==", "approved"),
        where("date", ">=", start),
        where("date", "<", end)
      );

      let sum = 0;
      const docs = await getDocs(qYearApproved);
      docs.forEach((d) => {
        const val = d.data()?.amount?.total_approved_amount;
        const num = typeof val === "number" ? val : Number(val || 0);
        if (!Number.isNaN(num)) sum += num;
      });
      setApproved2025(sum);
    } catch (e) {
      console.error("computeApprovedForYear error:", e);
      setChartErr(e?.message || String(e));
    } finally {
      setChartLoading(false);
    }
  };

  // hitung sekali saat mount
  useEffect(() => {
    computeSummary();
  }, []);

  const roleLabel = role ? (role === "pic" ? "PIC" : role) : "no role assigned";

  // nilai untuk chart
  const pct2025 = YEARLY_BUDGET_2025 > 0 ? Math.min(100, Math.round((approved2025 / YEARLY_BUDGET_2025) * 100)) : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
        {user ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
            <p><b>Welcome, {name || "user"}!</b></p>
            <p><b>Email:</b> {user.email}</p>
            <p style={{ marginTop: 4, color: "#374151" }}>
              <b>Role:</b> {roleLabel}
            </p>
          </div>
        ) : (
          <p>Tidak ada user yang login.</p>
        )}
      </div>

      {/* ==== SUMMARY ==== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <SummaryCard title="Total Trips" value={sumLoading ? "…" : totalTrips.toLocaleString("id-ID")} />
        <SummaryCard title="Approved Trips" value={sumLoading ? "…" : totalApprovedTrips.toLocaleString("id-ID")} />
        <SummaryCard title="Draft Trips" value={sumLoading ? "…" : totalDraftTrips.toLocaleString("id-ID")} />
        <SummaryCard title="Total Approved Amount" value={sumLoading ? "…" : `Rp ${totalApprovedAmount.toLocaleString("id-ID")}`} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={computeSummary}
          disabled={sumLoading || chartLoading}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" }}
        >
          {(sumLoading || chartLoading) ? "Refreshing…" : "Refresh Summary"}
        </button>
        {(sumErr || chartErr) && <span style={{ color: "#b91c1c" }}>Error: {sumErr || chartErr}</span>}
      </div>

      {/* ==== CHART: Approved vs Budget 2025 ==== */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
              Approved vs Budget (2025)
            </div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {chartLoading ? "…" : `Approved: Rp ${approved2025.toLocaleString("id-ID")}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Budget 2025</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Rp {YEARLY_BUDGET_2025.toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div style={{ height: 14, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              width: chartLoading ? "0%" : `${pct2025}%`,
              height: "100%",
              background: pct2025 < 90 ? "#10b981" : pct2025 < 100 ? "#f59e0b" : "#ef4444",
              transition: "width 300ms ease"
            }}
            title={`${pct2025}% of budget`}
          />
        </div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151" }}>
          <span>{pct2025}% of budget</span>
          <span>Sisa: Rp {(Math.max(0, YEARLY_BUDGET_2025 - approved2025)).toLocaleString("id-ID")}</span>
        </div>
      </div>

      {tripsErr && <div style={{ color:"#b91c1c", padding:8 }}>Error: {tripsErr}</div>}

      <div>
        <h2 style={{ margin: "8px 0" }}>Trip Lists (8 Latest)</h2>

        {tripsLoading ? (
          <div style={{ padding: 12 }}>Memuat data…</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280" }}>Belum ada data trips.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={th}>Number</th>
                  <th style={th}>Assigned Name</th>
                  <th style={th}>Position</th>
                  <th style={th}>Base Location</th>
                  <th style={th}>Destination</th>
                  <th style={th}>Depart</th>
                  <th style={th}>Return</th>
                  <th style={th}>Days</th>
                  <th style={th}>Status</th>
                  <th style={th}>Purpose</th>
                  <th style={th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const amountExists = Object.prototype.hasOwnProperty.call(t, "amount");
                  return (
                    <tr
                      key={t.id}
                      style={{ borderTop: "1px solid #e5e7eb", cursor: "pointer" }}
                      onClick={() => navigate(`/home/trips/${t.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      title="Klik untuk lihat detail"
                    >
                      <td style={td}>{t.number || "-"}</td>
                      <td style={td}>{t.assigned_name || "-"}</td>
                      <td style={td}>{t.position || "-"}</td>
                      <td style={td}>{t.base_location || "-"}</td>
                      <td style={td}>{t.assignment_destination || "-"}</td>
                      <td style={td}>{fmt(t.depart_date)}</td>
                      <td style={td}>{fmt(t.return_date)}</td>
                      <td style={td}>{t.trip_days ?? "-"}</td>
                      <td style={{ ...td }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              t.status_trip_document === "approved" ? "#065f46" :
                              t.status_trip_document === "draft" ? "#92400e" :
                              "#1f2937",
                            background:
                              t.status_trip_document === "approved" ? "#d1fae5" :
                              t.status_trip_document === "draft" ? "#fef3c7" :
                              "#e5e7eb",
                            border: `1px solid ${
                              t.status_trip_document === "approved" ? "#10b981" :
                              t.status_trip_document === "draft" ? "#f59e0b" :
                              "#9ca3af"
                            }`,
                            textTransform: "capitalize"
                          }}
                        >
                          {t.status_trip_document || "-"}
                        </span>
                      </td>
                      <td style={{ ...td, maxWidth: 260 }}>
                        <span title={t.purpose || ""}>
                          {t.purpose || "-"}
                        </span>
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            color: amountExists ? "#065f46" : "#92400e",
                            background: amountExists ? "#d1fae5" : "#fef3c7",
                            border: `1px solid ${amountExists ? "#10b981" : "#f59e0b"}`
                          }}
                        >
                          {amountExists ? "Available" : "Not Available"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const td = { padding: "10px 12px", fontSize: 13, verticalAlign: "top", whiteSpace: "nowrap" };