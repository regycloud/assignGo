// TripDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import {
  doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";

/** helper: format Timestamp/Date ke string tanggal lokal */
const fmt = (ts) => {
  if (!ts) return "-";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
};

/** helper: untuk <input type="datetime-local"> */
const toInputDT = (val) => {
  if (!val) return "";
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputDT = (s) => (s ? new Date(s) : null);

/** hitung jumlah hari dari dua Date */
const calcDays = (depart, ret) => {
  if (!depart || !ret) return 0;
  const a = depart instanceof Date ? depart : new Date(depart);
  const b = ret instanceof Date ? ret : new Date(ret);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  const days = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
};

/** tentukan employment type dari id karyawan */
const inferEmploymentType = (employeeId) => {
  if (!employeeId) return "Unknown";
  const first = String(employeeId)[0];
  if (first === "2") return "TAD";
  if (first === "0") return "Organik";
  return "Unknown";
};

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [hasAmount, setHasAmount] = useState(false);
  const [saving, setSaving] = useState(false);

  // role & akses
  const [role, setRole] = useState(""); // "admin" | "pic" | ""
  const canEdit = role === "admin" || role === "pic";

  // mode edit seluruh form
  const [editTrip, setEditTrip] = useState(false);

  // form state (mirror dari trip)
  const [form, setForm] = useState({});

  // status dokumen (edit terpisah, tetap inline di halaman)
  const [statusEdit, setStatusEdit] = useState(false);
  const [statusVal, setStatusVal] = useState("draft");

  // ambil role user dari users/{uid}.role
  useEffect(() => {
    const u = auth.currentUser;
    (async () => {
      try {
        if (!u) return;
        const usnap = await getDoc(doc(db, "users", u.uid));
        const r = usnap.exists() ? (usnap.data().role || "") : "";
        setRole(r);
      } catch {
        setRole("");
      }
    })();
  }, []);

  // load trip realtime
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErr("");

    const ref = doc(db, "trips", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setTrip(null);
          setErr("Dokumen tidak ditemukan.");
          setHasAmount(false);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setTrip({ id: snap.id, ...data });
        setHasAmount(Object.prototype.hasOwnProperty.call(data, "amount"));

        // sinkronkan status
        const st = data.status_trip_document || "draft";
        setStatusVal(st);

        // isi form saat pertama kali / saat tidak sedang edit
        if (!editTrip) {
          setForm({
            number: data.number || "",
            assigned_name: data.assigned_name || "",
            position: data.position || "",
            rank_position: data.rank_position || "",
            base_location: data.base_location || "",
            assignment_destination: data.assignment_destination || "",
            trip_type: data.trip_type || "",
            trip_category: data.trip_category || "",
            depart_date: data.depart_date || null,
            return_date: data.return_date || null,
            purpose: data.purpose || "",
            main_transport: data.main_transport || "",
            local_transport: data.local_transport || "",
            transport_to_departure_terminal: data.transport_to_departure_terminal || "",
            transport_to_arrival_terminal: data.transport_to_arrival_terminal || "",
            daily_expense_type: data.daily_expense_type || "",
            authorizing_officer: data.authorizing_officer || "",
            trip_scope: data.trip_scope || "",

            // ====== baru: field untuk responsible employee & employment type
            responsible_employee_id: data.responsible_employee?.id || "",
            responsible_employee_name: data.responsible_employee?.name || data.assigned_name || "",
            employment_type: data.employment_type || inferEmploymentType(data.responsible_employee?.id),
          });
        }

        setLoading(false);
      },
      (e) => {
        console.error("trip detail:", e.code, e.message);
        setErr(`${e.code}: ${e.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // auto perbarui employment_type di form jika ID bertukar
  useEffect(() => {
    if (!editTrip) return;
    setForm((s) => ({
      ...s,
      employment_type: inferEmploymentType(s.responsible_employee_id),
    }));
  }, [form.responsible_employee_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tripDays = useMemo(() => {
    const d1 = form?.depart_date?.toDate ? form.depart_date.toDate() : form?.depart_date;
    const d2 = form?.return_date?.toDate ? form.return_date.toDate() : form?.return_date;
    return calcDays(d1, d2);
  }, [form?.depart_date, form?.return_date]);

  const rows = useMemo(() => {
    if (!trip) return [];
    const employment =
      trip.employment_type ||
      inferEmploymentType(trip.responsible_employee?.id) ||
      "Unknown";
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
      ["Status Trip Document", trip.status_trip_document || "draft"],
      ...(trip.trip_scope ? [["Trip Scope", trip.trip_scope]] : []),
      // ===== tampilkan Employment Type & Responsible Employee
      ["Employment Type", employment],
    ];
  }, [trip]);

  const handleAmountAction = async () => {
    if (!id) return;
    if (hasAmount) {
      navigate(`/home/trips/${id}/amount`);
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const ref = doc(db, "trips", id);
      await setDoc(
        ref,
        {
          amount: { created_at: serverTimestamp() },
        },
        { merge: true }
      );
    } catch (e) {
      console.error("create amount error:", e);
      setErr(e.message || String(e));
      alert("Gagal membuat amount: " + (e.message || e.code || e));
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!id) return;
    setSaving(true);
    setErr("");
    try {
      const ref = doc(db, "trips", id);
      await setDoc(
        ref,
        {
          status_trip_document: statusVal, // "approved" | "draft"
          status_updated_at: serverTimestamp(),
          status_updated_by: auth.currentUser?.uid || null,
        },
        { merge: true }
      );
      setStatusEdit(false);
    } catch (e) {
      console.error("save status error:", e);
      setErr(e.message || String(e));
      alert("Gagal menyimpan status: " + (e.message || e.code || e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!trip) return;
    setForm((s) => ({
      ...s,
      // refresh dari trip (antisipasi ada perubahan di backend)
      number: trip.number || "",
      assigned_name: trip.assigned_name || "",
      position: trip.position || "",
      rank_position: trip.rank_position || "",
      base_location: trip.base_location || "",
      assignment_destination: trip.assignment_destination || "",
      trip_type: trip.trip_type || "",
      trip_category: trip.trip_category || "",
      depart_date: trip.depart_date || null,
      return_date: trip.return_date || null,
      purpose: trip.purpose || "",
      main_transport: trip.main_transport || "",
      local_transport: trip.local_transport || "",
      transport_to_departure_terminal: trip.transport_to_departure_terminal || "",
      transport_to_arrival_terminal: trip.transport_to_arrival_terminal || "",
      daily_expense_type: trip.daily_expense_type || "",
      authorizing_officer: trip.authorizing_officer || "",
      trip_scope: trip.trip_scope || "",
      responsible_employee_id: trip.responsible_employee?.id || "",
      responsible_employee_name: trip.responsible_employee?.name || trip.assigned_name || "",
      employment_type: trip.employment_type || inferEmploymentType(trip.responsible_employee?.id),
    }));
    setEditTrip(true);
  };

  const cancelEdit = () => {
    if (trip) {
      setForm({
        number: trip.number || "",
        assigned_name: trip.assigned_name || "",
        position: trip.position || "",
        rank_position: trip.rank_position || "",
        base_location: trip.base_location || "",
        assignment_destination: trip.assignment_destination || "",
        trip_type: trip.trip_type || "",
        trip_category: trip.trip_category || "",
        depart_date: trip.depart_date || null,
        return_date: trip.return_date || null,
        purpose: trip.purpose || "",
        main_transport: trip.main_transport || "",
        local_transport: trip.local_transport || "",
        transport_to_departure_terminal: trip.transport_to_departure_terminal || "",
        transport_to_arrival_terminal: trip.transport_to_arrival_terminal || "",
        daily_expense_type: trip.daily_expense_type || "",
        authorizing_officer: trip.authorizing_officer || "",
        trip_scope: trip.trip_scope || "",
        responsible_employee_id: trip.responsible_employee?.id || "",
        employment_type: trip.employment_type || inferEmploymentType(trip.responsible_employee?.id),
      });
    }
    setEditTrip(false);
  };

  const saveTrip = async () => {
    if (!id) return;
    const d1 = form.depart_date?.toDate ? form.depart_date.toDate() : form.depart_date;
    const d2 = form.return_date?.toDate ? form.return_date.toDate() : form.return_date;
    if (!d1 || !d2 || d2 < d1) {
      alert("Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      // siapkan responsible_employee (jika salah satu terisi, simpan sebagai map)
      let responsible_employee = null;
      if ((form.responsible_employee_id || "").trim() || (form.responsible_employee_name || "").trim()) {
        responsible_employee = {
          id: (form.responsible_employee_id || "").trim() || null,
          name: (form.responsible_employee_name || "").trim() || null,
        };
      }
      const employment_type = responsible_employee?.id
        ? inferEmploymentType(responsible_employee.id)
        : (form.employment_type || "Unknown");

      const payload = {
        number: (form.number || "").trim(),
        assigned_name: (form.assigned_name || "").trim(),
        position: (form.position || "").trim(),
        rank_position: (form.rank_position || "").trim(),
        base_location: (form.base_location || "").trim(),
        assignment_destination: (form.assignment_destination || "").trim(),
        trip_type: form.trip_type || "",
        trip_category: form.trip_category || "",
        depart_date: d1 instanceof Date ? d1 : new Date(d1),
        return_date: d2 instanceof Date ? d2 : new Date(d2),
        trip_days: calcDays(d1, d2),
        purpose: (form.purpose || "").trim(),
        main_transport: form.main_transport || "",
        local_transport: form.local_transport || "",
        transport_to_departure_terminal: form.transport_to_departure_terminal || "",
        transport_to_arrival_terminal: form.transport_to_arrival_terminal || "",
        daily_expense_type: form.daily_expense_type || "",
        authorizing_officer: (form.authorizing_officer || "").trim(),
        trip_scope: form.trip_scope || "",

        // ====== baru: simpan ke dokumen
        responsible_employee: responsible_employee,
        employment_type,

        updated_at: serverTimestamp(),
        updated_by: auth.currentUser?.uid || null,
      };

      await updateDoc(doc(db, "trips", id), payload);
      setEditTrip(false);
    } catch (e) {
      console.error("save trip error:", e);
      setErr(e.message || String(e));
      alert("Gagal menyimpan trip: " + (e.message || e.code || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Memuat detail…</div>;
  if (err)
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>
        Error: {err}{" "}
        <button onClick={() => navigate(-1)} style={btnOutline}>Kembali</button>
      </div>
    );
  if (!trip)
    return (
      <div style={{ padding: 16 }}>
        Data tidak ditemukan.{" "}
        <button onClick={() => navigate(-1)} style={btnOutline}>Kembali</button>
      </div>
    );

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} style={btnOutline}>⬅️ Kembali</button>
        <h1 style={{ margin: 0 }}>Trip #{trip.number || trip.id}</h1>

        {/* Aksi kanan */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {canEdit && !editTrip && (
            <button style={btnPrimary} onClick={startEdit} title="Edit seluruh data trip">
              Edit Trip
            </button>
          )}
          {canEdit && editTrip && (
            <>
              <button style={btnSuccess} disabled={saving} onClick={saveTrip}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button style={btnOutline} disabled={saving} onClick={cancelEdit}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card utama: readonly table atau full form */}
      <div style={card}>
        {!editTrip ? (
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
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {/* Identitas */}
            <Section title="Trip Info">
              {/* Scope */}
              <Gap />
              <div style={{ maxWidth: 360 }}>
                <div style={label}>Scope Perjalanan</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="trip_scope"
                      value="domestic"
                      checked={(form.trip_scope || "") === "domestic"}
                      onChange={(e) => setForm({ ...form, trip_scope: e.target.value })}
                    />
                    Domestic
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="trip_scope"
                      value="international"
                      checked={(form.trip_scope || "") === "international"}
                      onChange={(e) => setForm({ ...form, trip_scope: e.target.value })}
                    />
                    International
                  </label>
                </div>
              </div>

              <Gap />
              <Row2>
                <Field label="Nomor Dokumen">
                  <input style={input} value={form.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                </Field>
                <Field label="Nama yang Ditugaskan">
                  <input style={input} value={form.assigned_name || ""} onChange={(e) => setForm({ ...form, assigned_name: e.target.value })} />
                </Field>
              </Row2>

              <Gap />
              <Row2>
                <Field label="Jabatan (Position)">
                  <input style={input} value={form.position || ""} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </Field>
                <Field label="Pangkat/Golongan (Rank)">
                  <input style={input} value={form.rank_position || ""} onChange={(e) => setForm({ ...form, rank_position: e.target.value })} />
                </Field>
              </Row2>

              <Gap />
              <Row2>
                <Field label="Tempat Kedudukan (Base)">
                  <input style={input} value={form.base_location || ""} onChange={(e) => setForm({ ...form, base_location: e.target.value })} />
                </Field>
                <Field label="Tujuan Penugasan (Destination)">
                  <input style={input} value={form.assignment_destination || ""} onChange={(e) => setForm({ ...form, assignment_destination: e.target.value })} />
                </Field>
              </Row2>
            </Section>

            {/* Kategori & Jadwal */}
            <Section title="Kategori & Jadwal">
              <Row2>
                <Field label="Jenis Perjalanan (Trip Type)">
                  <select style={input} value={form.trip_type || ""} onChange={(e) => setForm({ ...form, trip_type: e.target.value })}>
                    <option value="">- pilih -</option>
                    <option value="KDU">KDU</option>
                    <option value="RAPAT">RAPAT</option>
                    <option value="DIKLAT">DIKLAT</option>
                  </select>
                </Field>
                <Field label="Kategori (Trip Category)">
                  <input style={input} value={form.trip_category || ""} onChange={(e) => setForm({ ...form, trip_category: e.target.value })} />
                </Field>
              </Row2>

              <Gap />
              <Row2>
                <Field label="Tanggal Berangkat">
                  <input
                    type="datetime-local"
                    style={input}
                    value={toInputDT(form.depart_date)}
                    onChange={(e) => setForm({ ...form, depart_date: fromInputDT(e.target.value) })}
                  />
                </Field>
                <Field label="Tanggal Kembali">
                  <input
                    type="datetime-local"
                    style={input}
                    value={toInputDT(form.return_date)}
                    onChange={(e) => setForm({ ...form, return_date: fromInputDT(e.target.value) })}
                  />
                </Field>
              </Row2>

              <Gap />
              <div style={{ maxWidth: 240 }}>
                <label style={label}>Lama Perjalanan (hari)</label>
                <input style={{ ...input, background: "#f3f4f6" }} value={tripDays} readOnly disabled />
              </div>
            </Section>

            {/* Transportasi & Biaya */}
            <Section title="Transportasi & Biaya">
              <Row2>
                <Field label="Sarana Transportasi Utama">
                  <select style={input} value={form.main_transport || ""} onChange={(e) => setForm({ ...form, main_transport: e.target.value })}>
                    <option value="">- pilih -</option>
                    <option value="Airplane">Airplane</option>
                    <option value="KA">Kereta Api</option>
                    <option value="TUD">Transport Umum Darat</option>
                    <option value="KL">Kapal Laut</option>
                  </select>
                </Field>
                <Field label="Transportasi Lokal">
                  <select style={input} value={form.local_transport || ""} onChange={(e) => setForm({ ...form, local_transport: e.target.value })}>
                    <option value="">- pilih -</option>
                    <option value="Rent">Rent</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Self">Self</option>
                  </select>
                </Field>
              </Row2>

              <Gap />
              <Row2>
                <Field label="Ke Terminal Keberangkatan">
                  <select
                    style={input}
                    value={form.transport_to_departure_terminal || ""}
                    onChange={(e) => setForm({ ...form, transport_to_departure_terminal: e.target.value })}
                  >
                    <option value="">- pilih -</option>
                    <option value="Self">Self</option>
                    <option value="Kendaraan Dinas/Operasional">Kendaraan Dinas/Operasional</option>
                  </select>
                </Field>
                <Field label="Ke Terminal Kedatangan">
                  <select
                    style={input}
                    value={form.transport_to_arrival_terminal || ""}
                    onChange={(e) => setForm({ ...form, transport_to_arrival_terminal: e.target.value })}
                  >
                    <option value="">- pilih -</option>
                    <option value="Self">Self</option>
                    <option value="Kendaraan Dinas/Operasional">Kendaraan Dinas/Operasional</option>
                  </select>
                </Field>
              </Row2>

              <Gap />
              <Row2>
                <Field label="Jenis Biaya Harian">
                  <select
                    style={input}
                    value={form.daily_expense_type || ""}
                    onChange={(e) => setForm({ ...form, daily_expense_type: e.target.value })}
                  >
                    <option value="">- pilih -</option>
                    <option value="Daily Allowance">Daily Allowance</option>
                    <option value="Lumpsum">Lumpsum</option>
                  </select>
                </Field>
                <Field label="Pejabat Pemberi Otorisasi">
                  <input
                    style={input}
                    value={form.authorizing_officer || ""}
                    onChange={(e) => setForm({ ...form, authorizing_officer: e.target.value })}
                  />
                </Field>
              </Row2>
            </Section>

            {/* Responsible Employee & Employment Type */}
            <Section title="Responsible Employee">
              <Row2>
                <Field label="Employee ID">
                  <input
                    style={input}
                    value={form.responsible_employee_id || ""}
                    onChange={(e) => setForm({ ...form, responsible_employee_id: e.target.value })}
                    placeholder="mis. 2120940277"
                  />
                </Field>
              </Row2>

              <Gap />
              <div>
                <div style={{ ...label, marginBottom: 8 }}>Employment Type (Auto)</div>
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input type="radio" name="empType" checked={(form.employment_type || "Unknown") === "TAD"} readOnly disabled />
                    <span>TAD</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input type="radio" name="empType" checked={(form.employment_type || "Unknown") === "Organik"} readOnly disabled />
                    <span>Organik</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input type="radio" name="empType" checked={(form.employment_type || "Unknown") === "Unknown"} readOnly disabled />
                    <span>Unknown</span>
                  </label>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                  Ditentukan otomatis dari ID: awalan <b>2 → TAD</b>, awalan <b>0 → Organik</b>.
                </div>
              </div>
            </Section>

            {/* Tujuan */}
            <Section title="Tujuan">
              <label style={label}>Deskripsi Tujuan</label>
              <textarea
                style={{ ...input, minHeight: 100 }}
                value={form.purpose || ""}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Rapat koordinasi …"
              />
            </Section>
          </div>
        )}
      </div>

      {/* EDIT STATUS — hanya admin/pic */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Status Trip Document</div>
            {!statusEdit ? (
              <div><b>{(trip.status_trip_document || "draft").toUpperCase()}</b></div>
            ) : (
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="status_trip_document"
                    value="draft"
                    checked={statusVal === "draft"}
                    onChange={(e) => setStatusVal(e.target.value)}
                  />
                  Draft
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="status_trip_document"
                    value="approved"
                    checked={statusVal === "approved"}
                    onChange={(e) => setStatusVal(e.target.value)}
                  />
                  Approved
                </label>
              </div>
            )}
          </div>

          {canEdit && (
            !statusEdit ? (
              <button style={btnOutline} onClick={() => setStatusEdit(true)}>Edit Status</button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnSuccess} disabled={saving} onClick={saveStatus}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  style={btnOutline}
                  disabled={saving}
                  onClick={() => { setStatusEdit(false); setStatusVal(trip.status_trip_document || "draft"); }}
                >
                  Cancel
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Aksi Amount */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          style={hasAmount ? btnInfo : btnSuccess}
          onClick={handleAmountAction}
          disabled={saving}
          title={hasAmount ? "Amount sudah ada. Klik untuk membuka/lanjut." : "Belum ada amount. Klik untuk membuat sekarang."}
        >
          {saving ? "Processing…" : hasAmount ? "Open Amount" : "Create Amount Now"}
        </button>

        <span style={{ fontSize: 12, color: "#4b5563" }}>
          Status:{" "}
          <b style={{ color: hasAmount ? "#0ea5e9" : "#059669" }}>
            {hasAmount ? "Amount ready" : "Amount not created"}
          </b>
        </span>
      </div>
    </div>
  );
}

/* ====== kecilkan style & komponen util ====== */
const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
const cellLabel = { width: 260, padding: "10px 12px", fontWeight: 700, background: "#f9fafb", verticalAlign: "top" };
const cellValue = { padding: "10px 12px", verticalAlign: "top" };
const btnOutline = { padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
const btnPrimary = { padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" };
const btnSuccess = { padding: "8px 12px", borderRadius: 10, border: "1px solid #059669", background: "#059669", color: "#fff", cursor: "pointer" };
const btnInfo = { padding: "10px 14px", borderRadius: 10, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff", cursor: "pointer" };
const label = { display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
const section = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" };
const header = { fontSize: 16, fontWeight: 800, marginBottom: 10 };
const Row2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;
const Field = ({ label: text, children }) => (
  <div>
    <label style={label}>{text}</label>
    {children}
  </div>
);
const Gap = () => <div style={{ height: 12 }} />;
const Section = ({ title, children }) => (
  <div style={section}>
    <div style={header}>{title}</div>
    {children}
  </div>
);