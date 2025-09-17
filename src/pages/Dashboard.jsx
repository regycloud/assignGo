import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  doc, getDocs,
  collection, query, orderBy, limit, onSnapshot
} from "firebase/firestore";

export default function Dashboard() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState(null);

  // data trips
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [tripsErr, setTripsErr] = useState("");

useEffect(() => {
  setTripsLoading(true);
  setTripsErr("");

  // Coba paling sederhana dulu: TANPA orderBy untuk memastikan akses
  (async () => {
    try {
      const snap = await getDocs(collection(db, "trips"));
      // kalau ini berhasil, berarti akses ok → lanjut pakai onSnapshot + orderBy
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(rows);
      setTripsLoading(false);

      // Sekarang pasang realtime listener + orderBy 'date' (opsional)
      const q = query(collection(db, "trips"), orderBy("date", "desc"), limit(20));
      const unsub = onSnapshot(q, s => {
        setTrips(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }, err => {
        console.error("onSnapshot trips:", err.code, err.message);
        setTripsErr(`${err.code}: ${err.message}`);
      });
      // simpan unsub kalau mau dibersihkan di return
    } catch (err) {
      console.error("getDocs trips:", err.code, err.message);
      setTripsErr(`${err.code}: ${err.message}`);
      setTripsLoading(false);
    }
  })();
}, []);

  // helper format tanggal → lokal (Asia/Jakarta)
  const fmt = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  };

  // ambil user + nama
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.displayName) {
          setName(u.displayName);
        } else {
          const snap = await getDocs(doc(db, "users", u.uid));
          setName(snap.exists() ? (snap.data().displayName || snap.data().namaPekerja || "(tidak ada nama)") : null);
        }
      } else {
        setName(null);
      }
    });
    return () => unsub();
  }, []);

  // ambil daftar trips (realtime)
  useEffect(() => {
    // contoh: urut paling baru dan batasi 20 item
    const q = query(
      collection(db, "trips"),
      orderBy("date", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
      setTrips(rows);
      setTripsLoading(false);
    }, (err) => {
      console.error("onSnapshot trips error:", err);
      setTrips([]);
      setTripsLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
        {user ? (
          <div style={{
            border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff"
          }}>
            <p><b>Email:</b> {user.email}</p>
            <p><b>Nama:</b> {name || "-"}</p>
          </div>
        ) : (
          <p>Tidak ada user yang login.</p>
        )}
      </div>

      {tripsErr && <div style={{ color:"#b91c1c", padding:8 }}>Error: {tripsErr}</div>}

      <div>
        <h2 style={{ margin: "8px 0" }}>Daftar Trips (20 terbaru)</h2>

        {tripsLoading ? (
          <div style={{ padding: 12 }}>Memuat data…</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280" }}>Belum ada data trips.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={th}>No</th>
                  <th style={th}>Number</th>
                  <th style={th}>Assigned Name</th>
                  <th style={th}>Position</th>
                  <th style={th}>Base Location</th>
                  <th style={th}>Destination</th>
                  <th style={th}>Depart</th>
                  <th style={th}>Return</th>
                  <th style={th}>Days</th>
                  <th style={th}>Main Transport</th>
                  <th style={th}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: "1px solid #e5e7eb", cursor: "pointer" }}
                          onClick={() => navigate(`/home/trips/${t.id}`)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Klik untuk lihat detail">
                    <td style={td}>{i + 1}</td>
                    <td style={td}>{t.number || "-"}</td>
                    <td style={td}>{t.assigned_name || "-"}</td>
                    <td style={td}>{t.position || "-"}</td>
                    <td style={td}>{t.base_location || "-"}</td>
                    <td style={td}>{t.assignment_destination || "-"}</td>
                    <td style={td}>{fmt(t.depart_date)}</td>
                    <td style={td}>{fmt(t.return_date)}</td>
                    <td style={td}>{t.trip_days ?? "-"}</td>
                    <td style={td}>{t.main_transport || "-"}</td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      <span title={t.purpose || ""}>
                        {t.purpose || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// kecilkan kode style cell
const th = { textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const td = { padding: "10px 12px", fontSize: 13, verticalAlign: "top", whiteSpace: "nowrap" };