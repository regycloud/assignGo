// src/pages/NewTripForm.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function NewTripForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // prefill assigned_name dari users/{uid}.displayName jika ada
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getDoc(doc(db, "users", u.uid)).then((snap) => {
      if (snap.exists()) {
        const n = snap.data().displayName || "";
        setF((s) => ({ ...s, assigned_name: n || s.assigned_name }));
      }
    });
  }, []);

  const [f, setF] = useState({
    number: "",
    assigned_name: "",
    position: "",
    rank_position: "",
    base_location: "",
    assignment_destination: "",
    trip_type: "KDU",
    trip_category: "",
    depart_date: "",
    return_date: "",
    purpose: "",
    main_transport: "",
    local_transport: "",
    transport_to_departure_terminal: "",
    transport_to_arrival_terminal: "",
    daily_expense_type: "",
    authorizing_officer: "",
  });

  const onChange = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  // auto hitung trip_days
  const tripDays = useMemo(() => {
    if (!f.depart_date || !f.return_date) return 0;
    const a = new Date(f.depart_date);
    const b = new Date(f.return_date);
    if (isNaN(a) || isNaN(b) || b < a) return 0;
    const days = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
    return Math.max(1, days);
  }, [f.depart_date, f.return_date]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    // validasi minimal sesuai field wajib
    if (!f.number || !f.assigned_name || !f.assignment_destination) {
      setErr("Nomor, Nama yang ditugaskan, dan Tujuan wajib diisi.");
      return;
    }
    if (!f.depart_date || !f.return_date) {
      setErr("Tanggal berangkat & kembali wajib diisi.");
      return;
    }
    const d1 = new Date(f.depart_date);
    const d2 = new Date(f.return_date);
    if (d2 < d1) {
      setErr("Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.");
      return;
    }

    setSaving(true);
    try {
      // payload mengikuti koleksi trips yang kamu kirim
      const payload = {
        number: f.number.trim(),
        assigned_name: f.assigned_name.trim(),
        position: f.position.trim(),
        rank_position: f.rank_position.trim(),
        base_location: f.base_location.trim(),
        assignment_destination: f.assignment_destination.trim(),
        trip_type: f.trip_type || "",
        trip_category: f.trip_category || "",
        depart_date: new Date(f.depart_date), // Timestamp oleh SDK
        return_date: new Date(f.return_date),
        trip_days: tripDays,
        purpose: f.purpose.trim(),
        main_transport: f.main_transport || "",
        local_transport: f.local_transport || "",
        transport_to_departure_terminal: f.transport_to_departure_terminal || "",
        transport_to_arrival_terminal: f.transport_to_arrival_terminal || "",
        daily_expense_type: f.daily_expense_type || "",
        authorizing_officer: f.authorizing_officer.trim(),
        date: new Date(),            // untuk sorting di dashboard (field 'date' yg ada di data kamu)
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
      };

      const ref = await addDoc(collection(db, "trips"), payload);
      navigate(`/home/trips/${ref.id}`, { replace: true });
    } catch (e2) {
      console.error(e2);
      setErr("Gagal menyimpan. Cek koneksi / Auth / Firestore Rules.");
    } finally {
      setSaving(false);
    }
  };

  // styling kecil
  const section = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16, background: "#fff" };
  const label = { display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const header = { fontSize: 16, fontWeight: 800, marginBottom: 10 };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Penugasan Baru (Trips)</h1>
      <form onSubmit={submit}>
        <div style={section}>
          <div style={header}>Identitas</div>
          <div style={row2}>
            <div>
              <label style={label}>Nomor Dokumen</label>
              <input style={input} value={f.number} onChange={onChange("number")} placeholder="XXX" />
            </div>
            <div>
              <label style={label}>Nama yang Ditugaskan</label>
              <input style={input} value={f.assigned_name} onChange={onChange("assigned_name")} placeholder="Name" />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Jabatan (Position)</label>
              <input style={input} value={f.position} onChange={onChange("position")} placeholder="Finance Manager" />
            </div>
            <div>
              <label style={label}>Pangkat/Golongan (Rank)</label>
              <input style={input} value={f.rank_position} onChange={onChange("rank_position")} placeholder="-" />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Tempat Kedudukan (Base)</label>
              <input style={input} value={f.base_location} onChange={onChange("base_location")} placeholder="Jakarta" />
            </div>
            <div>
              <label style={label}>Tujuan Penugasan (Destination)</label>
              <input style={input} value={f.assignment_destination} onChange={onChange("assignment_destination")} placeholder="Bali" />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={header}>Kategori & Jadwal</div>
          <div style={row2}>
            <div>
              <label style={label}>Jenis Perjalanan (Trip Type)</label>
              <select style={input} value={f.trip_type} onChange={onChange("trip_type")}>
                <option value="KDU">KDU</option>
                <option value="RAPAT">RAPAT</option>
                <option value="DIKLAT">DIKLAT</option>
              </select>
            </div>
            <div>
              <label style={label}>Kategori (Trip Category)</label>
              <input style={input} value={f.trip_category} onChange={onChange("trip_category")} placeholder="3" />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Tanggal Berangkat</label>
              <input type="datetime-local" style={input} value={f.depart_date} onChange={onChange("depart_date")} />
            </div>
            <div>
              <label style={label}>Tanggal Kembali</label>
              <input type="datetime-local" style={input} value={f.return_date} onChange={onChange("return_date")} />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={{ maxWidth: 240 }}>
            <label style={label}>Lama Perjalanan (hari)</label>
            <input style={{ ...input, background: "#f3f4f6" }} value={tripDays} readOnly disabled />
          </div>
        </div>

        <div style={section}>
          <div style={header}>Transportasi & Biaya</div>
          <div style={row2}>
            <div>
              <label style={label}>Sarana Transportasi Utama</label>
              <select style={input} value={f.main_transport} onChange={onChange("main_transport")}>
                <option value="">- pilih -</option>
                <option value="Airplane">Airplane</option>
                <option value="KA">Kereta Api</option>
                <option value="TUD">Transport Umum Darat</option>
                <option value="KL">Kapal Laut</option>
              </select>
            </div>
            <div>
              <label style={label}>Transportasi Lokal</label>
              <select style={input} value={f.local_transport} onChange={onChange("local_transport")}>
                <option value="">- pilih -</option>
                <option value="Rent">Rent</option>
                <option value="Operasional">Operasional</option>
                <option value="Self">Self</option>
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Ke Terminal Keberangkatan</label>
              <select style={input} value={f.transport_to_departure_terminal} onChange={onChange("transport_to_departure_terminal")}>
                <option value="">- pilih -</option>
                <option value="Self">Self</option>
                <option value="Kendaraan Dinas/Operasional">Kendaraan Dinas/Operasional</option>
              </select>
            </div>
            <div>
              <label style={label}>Ke Terminal Kedatangan</label>
              <select style={input} value={f.transport_to_arrival_terminal} onChange={onChange("transport_to_arrival_terminal")}>
                <option value="">- pilih -</option>
                <option value="Self">Self</option>
                <option value="Kendaraan Dinas/Operasional">Kendaraan Dinas/Operasional</option>
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Jenis Biaya Harian</label>
              <select style={input} value={f.daily_expense_type} onChange={onChange("daily_expense_type")}>
                <option value="">- pilih -</option>
                <option value="Daily Allowance">Daily Allowance</option>
                <option value="Lumpsum">Lumpsum</option>
              </select>
            </div>
            <div>
              <label style={label}>Pejabat Pemberi Otorisasi</label>
              <input style={input} value={f.authorizing_officer} onChange={onChange("authorizing_officer")} placeholder="Adhi" />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={header}>Tujuan</div>
          <label style={label}>Deskripsi Tujuan</label>
          <textarea style={{ ...input, minHeight: 100 }} value={f.purpose} onChange={onChange("purpose")} placeholder="Rapat koordinasi ..." />
        </div>

        {err && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() =>
              setF({
                number: "", assigned_name: "", position: "", rank_position: "",
                base_location: "", assignment_destination: "",
                trip_type: "KDU", trip_category: "",
                depart_date: "", return_date: "", purpose: "",
                main_transport: "", local_transport: "",
                transport_to_departure_terminal: "", transport_to_arrival_terminal: "",
                daily_expense_type: "", authorizing_officer: "",
              })
            }
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff" }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}