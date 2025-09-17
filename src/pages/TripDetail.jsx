import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fmt = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  };

  useEffect(() => {
    setLoading(true);
    setErr("");

    const ref = doc(db, "trips", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setTrip(null);
        setErr("Dokumen tidak ditemukan.");
      } else {
        setTrip({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }, (e) => {
      console.error("trip detail:", e.code, e.message);
      setErr(`${e.code}: ${e.message}`);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const rows = useMemo(() => {
    if (!trip) return [];
    return [
      ["Number", trip.number],
      ["Assigned Name", trip.assigned_name],
      ["Position", trip.position],
      ["Rank Position", trip.rank_position],
      ["Base Location", trip.base_location],
      ["Destination", trip.assignment_destination],
      ["Trip Type", trip.trip_type],
      ["Trip Category", trip.trip_category],
      ["Depart", fmt(trip.depart_date)],
      ["Return", fmt(trip.return_date)],
      ["Trip Days", trip.trip_days],
      ["Main Transport", trip.main_transport],
      ["Local Transport", trip.local_transport],
      ["Transport to Departure Terminal", trip.transport_to_departure_terminal],
      ["Transport to Arrival Terminal", trip.transport_to_arrival_terminal],
      ["Daily Expense Type", trip.daily_expense_type],
      ["Authorizing Officer", trip.authorizing_officer],
      ["Date (Created)", fmt(trip.date)],
      ["Purpose", trip.purpose],
    ];
  }, [trip]);

  if (loading) return <div style={{ padding: 16 }}>Memuat detail…</div>;
  if (err) return (
    <div style={{ padding: 16, color: "#b91c1c" }}>
      Error: {err}{" "}
      <button onClick={() => navigate(-1)} style={btnOutline}>Kembali</button>
    </div>
  );
  if (!trip) return (
    <div style={{ padding: 16 }}>
      Data tidak ditemukan. <button onClick={() => navigate(-1)} style={btnOutline}>Kembali</button>
    </div>
  );

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} style={btnOutline}>⬅️ Kembali</button>
        <h1 style={{ margin: 0 }}>Trip #{trip.number || trip.id}</h1>
      </div>

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={cellLabel}>{label}</td>
                <td style={cellValue}>{value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* opsional: tombol edit kalau mau */}
      {/* <div style={{ marginTop: 12 }}>
        <button style={btnPrimary} onClick={() => navigate(`/home/trips/${id}/edit`)}>Edit</button>
      </div> */}
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
};
const cellLabel = { width: 260, padding: "10px 12px", fontWeight: 700, background: "#f9fafb", verticalAlign: "top" };
const cellValue = { padding: "10px 12px", verticalAlign: "top" };
const btnOutline = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
};
const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
};