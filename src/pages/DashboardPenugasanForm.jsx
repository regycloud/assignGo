// src/pages/NewTripForm.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function NewTripForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // opsi autocomplete dari users/{uid}.responsible_employees
  const [respOptions, setRespOptions] = useState([]); // [{id,name}]
  const [selectedRespId, setSelectedRespId] = useState(null); // id karyawan terpilih (jika cocok)

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
    scope: "Domestic",
  });

  // === UI helpers ===
  const onChange = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const onChangeAssignedName = (e) => {
    const val = e.target.value;
    setF((s) => ({ ...s, assigned_name: val }));
    const found = respOptions.find((o) => o.name.toLowerCase() === val.trim().toLowerCase());
    setSelectedRespId(found ? found.id : null);
  };

  // Hitung Employment Type berdasar ID terpilih
  const employmentType = useMemo(() => {
    if (!selectedRespId) return "Unknown";
    const first = String(selectedRespId)[0];
    if (first === "2") return "TAD";
    if (first === "0") return "Organik";
    return "Unknown";
  }, [selectedRespId]);

  // Prefill displayName & load responsible_employees
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const n = data.displayName || "";
        setF((s) => ({ ...s, assigned_name: s.assigned_name || n }));

        const map = data.responsible_employees || {};
        const opts = Object.entries(map)
          .map(([id, v]) => ({ id, name: (v?.name || "").trim() }))
          .filter((x) => x.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setRespOptions(opts);
      } catch (e) {
        console.error("load user/responsibles:", e);
      }
    })();
  }, []);

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
      const payload = {
        number: f.number.trim(),
        assigned_name: f.assigned_name.trim(),
        position: f.position.trim(),
        rank_position: f.rank_position.trim(),
        base_location: f.base_location.trim(),
        assignment_destination: f.assignment_destination.trim(),
        trip_type: f.trip_type || "",
        trip_category: f.trip_category || "",
        depart_date: new Date(f.depart_date),
        return_date: new Date(f.return_date),
        trip_days: tripDays,
        purpose: f.purpose.trim(),
        main_transport: f.main_transport || "",
        local_transport: f.local_transport || "",
        transport_to_departure_terminal: f.transport_to_departure_terminal || "",
        transport_to_arrival_terminal: f.transport_to_arrival_terminal || "",
        daily_expense_type: f.daily_expense_type || "",
        authorizing_officer: f.authorizing_officer.trim(),
        scope: f.scope, // "Domestic" | "International"
        is_international: f.scope === "International",

        // simpan info pegawai & employment type
        responsible_employee: selectedRespId
          ? { id: selectedRespId, name: f.assigned_name.trim() }
          : null,
        employment_type: employmentType, // "TAD" | "Organik" | "Unknown"

        date: new Date(),
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

  // ==== Styles (lebih rapi & interaktif) ====
  const section = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(16,24,40,.06)",
  };
  const label = { display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#111827" };
  const inputBase = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    outline: "none",
    transition: "border-color .15s ease, box-shadow .15s ease, transform .05s ease",
    background: "#fff",
  };
  const input = {
    ...inputBase,
  };
  const inputReadonly = {
    ...inputBase,
    background: "#f9fafb",
    cursor: "not-allowed",
  };
  const select = { ...inputBase, appearance: "none" };
  const textarea = { ...inputBase, minHeight: 100, resize: "vertical" };
  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const header = { fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#111827" };
  const formWrap = {
    maxWidth: 980,
    margin: "0 auto",
    padding: 16,
  };
  const help = { color: "#6b7280", fontSize: 12, marginTop: 6 };

  // hover/focus enhancements via inline handlers
  const focusProps = {
    onFocus: (e) => {
      e.currentTarget.style.borderColor = "#2563eb";
      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,.2)";
    },
    onBlur: (e) => {
      e.currentTarget.style.borderColor = "#d1d5db";
      e.currentTarget.style.boxShadow = "none";
    },
  };

  return (
    <div style={formWrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Penugasan Baru (Trips)</h1>
      <form onSubmit={submit} noValidate>
        <div style={section}>
          <div style={header}>Identitas</div>
          <div style={row2}>
            <div>
              <label style={label}>Nomor Dokumen</label>
              <input style={input} {...focusProps} value={f.number} onChange={onChange("number")} placeholder="XXX" />
            </div>
            <div>
              <label style={label}>Nama yang Ditugaskan</label>
              <input
                style={input}
                {...focusProps}
                onChange={onChangeAssignedName}
                placeholder="Ketik nama…"
                list="respNames"
              />
              <datalist id="respNames">
                {respOptions.map((o) => (
                  <option key={o.id} value={o.name} />
                ))}
              </datalist>
              <div style={help}>
                {selectedRespId ? `ID terpilih: ${selectedRespId}` : "Pilih dari daftar untuk mengisi ID otomatis (opsional)."}
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Jabatan (Position)</label>
              <input style={input} {...focusProps} value={f.position} onChange={onChange("position")} placeholder="Finance Manager" />
            </div>
            <div>
              <label style={label}>Pangkat/Golongan (Rank)</label>
              <input style={input} {...focusProps} value={f.rank_position} onChange={onChange("rank_position")} placeholder="-" />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Tempat Kedudukan (Base)</label>
              <input style={input} {...focusProps} value={f.base_location} onChange={onChange("base_location")} placeholder="Jakarta" />
            </div>
            <div>
              <label style={label}>Tujuan Penugasan (Destination)</label>
              <input style={input} {...focusProps} value={f.assignment_destination} onChange={onChange("assignment_destination")} placeholder="Bali" />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={header}>Kategori & Jadwal</div>
          <div style={row2}>
            <div>
              <label style={label}>Jenis Perjalanan (Trip Type)</label>
              <select style={select} {...focusProps} value={f.trip_type} onChange={onChange("trip_type")}>
                <option value="KDU">KDU</option>
                <option value="RAPAT">RAPAT</option>
                <option value="DIKLAT">DIKLAT</option>
              </select>
            </div>
            <div>
              <label style={label}>Kategori (Trip Category)</label>
              <input style={input} {...focusProps} value={f.trip_category} onChange={onChange("trip_category")} placeholder="3" />
            </div>
          </div>

          {/* Trip Scope */}
          <div style={{ height: 12 }} />
          <div>
            <div style={{ ...label, marginBottom: 8 }}>Trip Scope</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 18, cursor: "pointer" }}>
              <input
                type="radio"
                name="tripScope"
                value="Domestic"
                checked={f.scope === "Domestic"}
                onChange={() => setF((s) => ({ ...s, scope: "Domestic" }))}
                required
              />
              <span>Domestic</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="tripScope"
                value="International"
                checked={f.scope === "International"}
                onChange={() => setF((s) => ({ ...s, scope: "International" }))}
                required
              />
              <span>International</span>
            </label>
          </div>

          {/* Employment Type (auto/frozen) */}
          <div style={{ height: 12 }} />
          <div>
            <div style={{ ...label, marginBottom: 8 }}>Employment Type (Auto)</div>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="empType" checked={employmentType === "TAD"} readOnly disabled />
                <span>TAD</span>
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="empType" checked={employmentType === "Organik"} readOnly disabled />
                <span>Organik</span>
              </label>
            </div>
            <div style={help}>
              Ditentukan otomatis dari ID pegawai: awalan <b>2 → TAD</b>, awalan <b>0 → Organik</b>.
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={row2}>
            <div>
              <label style={label}>Tanggal Berangkat</label>
              <input type="datetime-local" style={input} {...focusProps} value={f.depart_date} onChange={onChange("depart_date")} />
            </div>
            <div>
              <label style={label}>Tanggal Kembali</label>
              <input type="datetime-local" style={input} {...focusProps} value={f.return_date} onChange={onChange("return_date")} />
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div style={{ maxWidth: 240 }}>
            <label style={label}>Lama Perjalanan (hari)</label>
            <input style={inputReadonly} value={tripDays} readOnly disabled />
          </div>
        </div>

        <div style={section}>
          <div style={header}>Transportasi & Biaya</div>
          <div style={row2}>
            <div>
              <label style={label}>Sarana Transportasi Utama</label>
              <select style={select} {...focusProps} value={f.main_transport} onChange={onChange("main_transport")}>
                <option value="">- pilih -</option>
                <option value="Airplane">Airplane</option>
                <option value="KA">Kereta Api</option>
                <option value="TUD">Transport Umum Darat</option>
                <option value="KL">Kapal Laut</option>
              </select>
            </div>
            <div>
              <label style={label}>Transportasi Lokal</label>
              <select style={select} {...focusProps} value={f.local_transport} onChange={onChange("local_transport")}>
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
              <select style={select} {...focusProps} value={f.transport_to_departure_terminal} onChange={onChange("transport_to_departure_terminal")}>
                <option value="">- pilih -</option>
                <option value="Self">Self</option>
                <option value="Kendaraan Dinas/Operasional">Kendaraan Dinas/Operasional</option>
              </select>
            </div>
            <div>
              <label style={label}>Ke Terminal Kedatangan</label>
              <select style={select} {...focusProps} value={f.transport_to_arrival_terminal} onChange={onChange("transport_to_arrival_terminal")}>
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
              <select style={select} {...focusProps} value={f.daily_expense_type} onChange={onChange("daily_expense_type")}>
                <option value="">- pilih -</option>
                <option value="Daily Allowance">Daily Allowance</option>
                <option value="Lumpsum">Lumpsum</option>
              </select>
            </div>
            <div>
              <label style={label}>Pejabat Pemberi Otorisasi</label>
              <input style={input} {...focusProps} value={f.authorizing_officer} onChange={onChange("authorizing_officer")} placeholder="Adhi" />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={header}>Tujuan</div>
          <label style={label}>Deskripsi Tujuan</label>
          <textarea style={textarea} {...focusProps} value={f.purpose} onChange={onChange("purpose")} placeholder="Rapat koordinasi ..." />
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
                scope: "Domestic",
              })
            }
            style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}