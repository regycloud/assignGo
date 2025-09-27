import { useEffect, useState, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  doc, getDoc,
  collection, query, orderBy, limit, where,
  getDocs, startAfter
} from "firebase/firestore";

const PAGE_SIZE = 8;
const BUDGET_DEFAULT = 3_000_000_000; // Rp 3 Miliar

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState(null);
  const [role, setRole] = useState(null);

  // budget vs realisasi (approved amount tahun berjalan)
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [approvedSumYear, setApprovedSumYear] = useState(0);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumErr, setSumErr] = useState("");
  const [approvedSumYearTAD, setApprovedSumYearTAD] = useState(0);

  // helper format tanggal
  const fmt = (ts) => {
    if (!ts) return "-";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  };

  const toIDR = (n) => {
    const num = Number(n || 0);
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  // clamp helper for percentage
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // percentage of budget used (0..100)
  const pctUsed = useMemo(() => {
    if (!budget || budget <= 0) return 0;
    return clamp((approvedSumYear / budget) * 100, 0, 100);
  }, [approvedSumYear, budget]);
  const pctUsedTAD = useMemo(() => {
    if (!budget || budget <= 0) return 0;
    return clamp((approvedSumYearTAD / budget) * 100, 0, 100);
  }, [approvedSumYearTAD, budget]);

  // breakdown TAD vs Organik — share of total approved (year)
  const approvedSumYearOrganik = useMemo(() => {
    const v = Number(approvedSumYear) - Number(approvedSumYearTAD);
    return v < 0 ? 0 : v;
  }, [approvedSumYear, approvedSumYearTAD]);
  const pctTADofTotal = useMemo(() => {
    const total = Number(approvedSumYear) || 0;
    if (total <= 0) return 0;
    return clamp((Number(approvedSumYearTAD) / total) * 100, 0, 100);
  }, [approvedSumYearTAD, approvedSumYear]);
  const pctOrganikofTotal = useMemo(() => 100 - pctTADofTotal, [pctTADofTotal]);

  const remainingBudget = useMemo(() => {
  const b = Number(budget || 0);
  const r = Number(approvedSumYear || 0);
  return b > r ? (b - r) : 0;
}, [budget, approvedSumYear]);

  // user + role
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

  useEffect(() => {
    computeApprovedSumForYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computeApprovedSumForYear = async (year = new Date().getFullYear()) => {
    setSumLoading(true);
    setSumErr("");
    try {
      const start = new Date(year, 0, 1, 0, 0, 0, 0); // Jan 1
      const end = new Date(year + 1, 0, 1, 0, 0, 0, 0); // Jan 1 next year
      const col = collection(db, "trips");
      // NOTE: This query may require a composite index: status_trip_document + date
      const q = query(
        col,
        where("status_trip_document", "==", "approved"),
        where("date", ">=", start),
        where("date", "<", end)
      );
      const snap = await getDocs(q);
      let sumAll = 0;
      let sumTAD = 0;
      snap.forEach((d) => {
        const data = d.data() || {};
        const val = data?.amount?.total_approved_amount;
        const num = typeof val === "number" ? val : Number(val || 0);
        if (Number.isNaN(num)) return;
        sumAll += num;
        const empType = (data.employment_type || data.employee_type || "").toString().toUpperCase();
        if (empType === "TAD") sumTAD += num;
      });
      setApprovedSumYear(sumAll);
      setApprovedSumYearTAD(sumTAD);
    } catch (e) {
      console.error("computeApprovedSumForYear:", e);
      setSumErr(e?.message || String(e));
    } finally {
      setSumLoading(false);
    }
  };

  // debounce searchName → qName
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsErr, setTripsErr] = useState("");

  // search + pagination
  const [searchName, setSearchName] = useState("");        // input user
  const [qName, setQName] = useState("");                  // debounced query
  const [page, setPage] = useState(1);                     // 1-based
  const [cursors, setCursors] = useState([null]);          // array of lastDoc for each page start
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQName(searchName.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchName]);

  // core loader (dipanggil saat page atau qName berubah)
  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setTripsLoading(true);
      setTripsErr("");

      try {
        const col = collection(db, "trips");
        let q;

        if (qName) {
          // Search prefix: butuh field assigned_name_lc (lowercase)
          // orderBy 'assigned_name_lc' agar bisa startAfter
          q = query(
            col,
            where("assigned_name_lc", ">=", qName),
            where("assigned_name_lc", "<=", qName + "\uf8ff"),
            orderBy("assigned_name_lc"),
            limit(PAGE_SIZE + 1) // ambil 1 ekstra untuk tahu ada next
          );
        } else {
          q = query(
            col,
            orderBy("date", "desc"),
            limit(PAGE_SIZE + 1)
          );
        }

        // apply cursor untuk page>1
        const startCursor = cursors[page - 1] || null;
        if (startCursor) {
          if (qName) {
            // saat search, cursor harus sesuai orderBy 'assigned_name_lc'
            // gunakan dokumen terakhir dari halaman sebelumnya
            q = query(q, startAfter(startCursor));
          } else {
            q = query(q, startAfter(startCursor));
          }
        }

        const snap = await getDocs(q);
        if (isCancelled) return;

        const docs = snap.docs.slice(0, PAGE_SIZE); // 8 item saja
        setTrips(docs.map((d) => ({ id: d.id, ...d.data() })));

        // tentukan next
        setHasNext(snap.docs.length > PAGE_SIZE);

        // simpan cursor halaman berikutnya (dok terakhir dari halaman ini)
        const lastDoc = docs[docs.length - 1] || null;

        setCursors((prev) => {
          const arr = prev.slice(0, page); // buang cursor setelah posisi sekarang
          arr[page] = lastDoc;             // cursor untuk halaman berikutnya
          // untuk halaman 1, arr[0] tetap null (awal)
          return arr;
        });

      } catch (e) {
        console.error("load trips:", e);
        setTrips([]);
        setTripsErr(e?.message || String(e));
      } finally {
        if (!isCancelled) setTripsLoading(false);
      }
    };

    load();
    return () => { isCancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, qName]);

  // reset pagination saat query berubah
  useEffect(() => {
    setPage(1);
    setCursors([null]); // reset cursor stack
  }, [qName]);

  const roleLabel = role ? (role === "pic" ? "PIC" : role) : "no role assigned";

  const nextPage = () => {
    if (hasNext) setPage((p) => p + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

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

      {/* Budget vs Realisasi Approved Amount (tahun berjalan) */}
<div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div>
      <div style={{ fontWeight: 800 }}>Budget vs Realisasi (Approved) – {new Date().getFullYear()}</div>
    </div>

    {role === "admin" ? (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#374151" }}>Budget (admin only):</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value || 0))}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", width: 200 }}
          min={0}
        />
        <button
          onClick={() => computeApprovedSumForYear()}
          disabled={sumLoading}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer", opacity: sumLoading ? 0.7 : 1 }}
        >
          {sumLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    ) : (
      <div style={{ fontSize: 12, color: "#6b7280" }} title="Only admin can edit budget">
        🔒 {toIDR(budget)}
      </div>
    )}
  </div>

  {sumErr && <div style={{ color: "#b91c1c", marginBottom: 8 }}>Error: {sumErr}</div>}

  <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
    {/* Single Donut */}
    <div style={{ position: "relative", width: 180, height: 180 }}>
      {(() => {
        const r = 60;              // radius
        const stroke = 18;         // ketebalan
        const C = 2 * Math.PI * r; // keliling
        const offset = C * (1 - pctUsed / 100);
        return (
          <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`Realisasi ${pctUsed.toFixed(1)}% dari budget`}>
            <g transform="translate(90,90)">
              <circle r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
              <circle r={r} fill="none" stroke="#10b981" strokeWidth={stroke} strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90)" />
            </g>
          </svg>
        );
      })()}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{pctUsed.toFixed(1)}%</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>of Budget</div>
      </div>
    </div>

    {/* KPIs ringkas */}
   <div style={{ minWidth: 260, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 10, height: 10, background: "#2563eb", borderRadius: 2, display: "inline-block" }} />
    <span style={{ color: "#374151" }}>Budget</span>
    <b>{toIDR(budget)}</b>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 10, height: 10, background: "#10b981", borderRadius: 2, display: "inline-block" }} />
    <span style={{ color: "#374151" }}>Realisasi (Approved)</span>
    <b>{toIDR(approvedSumYear)}</b>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: 2, display: "inline-block" }} />
    <span style={{ color: "#374151" }}>Sisa Budget</span>
    <b>{toIDR(remainingBudget)}</b>
  </div>

  <div style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
    Terpakai {toIDR(approvedSumYear)} dari {toIDR(budget)}.
  </div>
</div>
  </div>
</div>

      {/* Breakdown Realisasi Approved: TAD vs Organik (share of TOTAL, bukan budget) */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Realisasi Approved – TAD vs Organik ({new Date().getFullYear()})</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Perbandingan porsi terhadap total realisasi approved tahun berjalan (tidak terkait budget).</div>
          </div>
          <button
            onClick={() => computeApprovedSumForYear()}
            disabled={sumLoading}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", opacity: sumLoading ? 0.7 : 1 }}
            title="Refresh angka realisasi"
          >
            {sumLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {sumErr && <div style={{ color: "#b91c1c", marginBottom: 8 }}>Error: {sumErr}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center", gap: 16 }}>
          {/* Horizontal 100% stacked bar */}
          <div>
            {(() => {
              const w = 220; const h = 22;
              const tadW = (w * pctTADofTotal) / 100;
              const orgW = w - tadW;
              return (
                <svg width={w} height={h} role="img" aria-label={`TAD ${pctTADofTotal.toFixed(1)}% • Organik ${pctOrganikofTotal.toFixed(1)}%`}>
                  <rect x="0" y="0" width={w} height={h} fill="#e5e7eb" rx="6" ry="6" />
                  <rect x="0" y="0" width={tadW} height={h} fill="#f59e0b" rx="6" ry="6" />
                </svg>
              );
            })()}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginTop: 6 }}>
              <span>TAD: <b>{pctTADofTotal.toFixed(1)}%</b></span>
              <span>Organik: <b>{pctOrganikofTotal.toFixed(1)}%</b></span>
            </div>
          </div>

          {/* KPIs */}
          <div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={kpi}>
                <span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", marginRight: 6, borderRadius: 2 }} />
                Total Realisasi: <b>{toIDR(approvedSumYear)}</b>
              </span>
              <span style={kpi}>
                <span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", marginRight: 6, borderRadius: 2 }} />
                TAD: <b>{toIDR(approvedSumYearTAD)}</b>
              </span>
              <span style={kpi}>
                <span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", marginRight: 6, borderRadius: 2 }} />
                Organik: <b>{toIDR(approvedSumYearOrganik)}</b>
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Dari total {toIDR(approvedSumYear)}: TAD {toIDR(approvedSumYearTAD)} ({pctTADofTotal.toFixed(1)}%) • Organik {toIDR(approvedSumYearOrganik)} ({pctOrganikofTotal.toFixed(1)}%).
            </div>
          </div>
        </div>
      </div>

      {/* Search + Pagination control */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="Cari nama (Assigned Name)…"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              minWidth: 260
            }}
            title="Cari berdasarkan awalan nama. Perlu field assigned_name_lc di Firestore."
          />
          {!!qName && (
            <button
              onClick={() => setSearchName("")}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={prevPage}
            disabled={tripsLoading || page === 1}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", opacity: (tripsLoading || page === 1) ? 0.6 : 1 }}
          >
            ◀ Prev
          </button>
          <span style={{ fontSize: 13, color: "#374151" }}>Page {page}</span>
          <button
            onClick={nextPage}
            disabled={tripsLoading || !hasNext}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer", opacity: (tripsLoading || !hasNext) ? 0.6 : 1 }}
          >
            Next ▶
          </button>
        </div>
      </div>

      {tripsErr && <div style={{ color:"#b91c1c", padding:8 }}>Error: {tripsErr}</div>}

      <div>
        <h2 style={{ margin: "8px 0" }}>Trip Lists (per {PAGE_SIZE})</h2>

        {tripsLoading ? (
          <div style={{ padding: 12 }}>Memuat data…</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280" }}>
            {qName ? "Tidak ada hasil untuk pencarian." : "Belum ada data trips."}
          </div>
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
                        <span title={t.purpose || ""}>{t.purpose || "-"}</span>
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

            {/* Footer pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Menampilkan {trips.length} data (page {page})
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={prevPage}
                  disabled={tripsLoading || page === 1}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", opacity: (tripsLoading || page === 1) ? 0.6 : 1 }}
                >
                  ◀ Prev
                </button>
                <button
                  onClick={nextPage}
                  disabled={tripsLoading || !hasNext}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer", opacity: (tripsLoading || !hasNext) ? 0.6 : 1 }}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info kecil tentang search */}
      <div style={{ color: "#6b7280", fontSize: 12 }}>
        Tip: simpan field <code>assigned_name_lc</code> (lowercase) pada setiap dokumen <code>trips</code> agar pencarian cepat & akurat.
        Jika muncul error “index required”, ikuti tautan yang diberikan Firestore untuk membuat index (orderBy/where sesuai query).
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const td = { padding: "10px 12px", fontSize: 13, verticalAlign: "top", whiteSpace: "nowrap" };

const kpi = { color: "#374151" };