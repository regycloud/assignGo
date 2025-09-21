// src/pages/TripAmount.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

/**
 * === KONFIG API KURS ===
 * .env.local:
 *   VITE_KURS_API_BASE=https://kurs.regycloud.xyz
 *
 * Endpoint yang dipakai:
 *   GET {BASE}/api/usd-rate?date=YYYY-MM-DD
 * Contoh:
 *   https://kurs.regycloud.xyz/api/usd-rate?date=2025-09-18
 *
 * Catatan:
 * - Pair terkunci USD/IDR sesuai endpoint kamu.
 * - Parser dibuat toleran: cari mid/rate/value/usd_idr/data.rate.
 */
const KURS_API_BASE = import.meta.env.VITE_KURS_API_BASE || "";

export default function TripAmount() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [f, setF] = useState({
    // base fields
    transport_multiplier: "",
    local_transport_allowance: "",
    meal_allowance: "",
    meal_multiplier: "",
    meal_percentage: "",
    pocket_allowance: "",
    pocket_multiplier: "",
    local_transport_multiplier: "",
    local_transport_percentage: "",

    // FX fields
    fx_base: "USD",
    fx_quote: "IDR",
    fx_mid: "",
    fx_date: "",
    fx_source: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(false);

  const [fxLoading, setFxLoading] = useState(false);
  const [fxMsg, setFxMsg] = useState("");
  const abortRef = useRef(null);

  // ---------- helpers ----------
  const num = (v, d = 0) => {
    const n = parseFloat(String(v).toString().replace(",", "."));
    return Number.isFinite(n) ? n : d;
  };
  const pct = (v) => {
    const n = num(v, 0);
    if (n <= 0) return 0;
    return n > 1 ? n / 100 : n; // 80 -> 0.8
  };
  const currency = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

  const toISODate = (val) => {
    if (!val) return null;
    if (val?.toDate) return val.toDate().toISOString().slice(0, 10); // Firestore Timestamp
    if (typeof val === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      return isNaN(d) ? null : d.toISOString().slice(0, 10);
    }
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return null;
  };
  const tripDepartISO = (t) => {
    if (!t) return null;
    return toISODate(t.depart_date) || toISODate(t.start_date) || null;
  };

  // === API kurs khusus RegyCloud (USD/IDR fixed) ===
  const buildKursUrl = (date) => {
    const b = KURS_API_BASE.replace(/\/+$/, "");
    return `${b}/api/usd-rate?date=${encodeURIComponent(date)}`;
  };
  const parseKursResponse = async (res, fallbackDate) => {
    const j = await res.json();
    // Cari field rate yang tersedia
    const mid =
      (typeof j.mid === "number" && j.mid) ||
      (typeof j.rate === "number" && j.rate) ||
      (typeof j.value === "number" && j.value) ||
      (typeof j.usd_idr === "number" && j.usd_idr) ||
      (typeof j?.data?.rate === "number" && j.data.rate);

    if (!mid) throw new Error("Respon API kurs tidak mengandung angka rate.");

    return {
      date: j.date || j?.data?.date || fallbackDate,
      base: "USD",
      quote: "IDR",
      mid,
      source: j.source || "RegyCloud Kurs API",
    };
  };

  const fetchKursTengah = async ({ date, silent = false }) => {
    if (!KURS_API_BASE) {
      if (!silent) setFxMsg("VITE_KURS_API_BASE belum diset di .env.local");
      return null;
    }
    setFxLoading(true);
    setFxMsg("");
    setErr("");

    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = buildKursUrl(date);
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Gagal ambil kurs: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
      }
      const data = await parseKursResponse(res, date);

      setF((s) => ({
        ...s,
        fx_base: "USD",
        fx_quote: "IDR",
        fx_mid: String(data.mid),
        fx_date: data.date,
        fx_source: data.source,
      }));

      if (!silent) setFxMsg(`Kurs USD/IDR (${data.date}): ${data.mid.toLocaleString("id-ID")}`);
      return data;
    } catch (e) {
      console.error(e);
      const msg = e?.message || "Gagal mengambil kurs.";
      if (!silent) setFxMsg(msg);
      setErr((prev) => prev || msg);
      return null;
    } finally {
      setFxLoading(false);
    }
  };

  // ---------- load trip realtime ----------
  useEffect(() => {
    const ref = doc(db, "trips", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setTrip(null);
          setErr("Dokumen tidak ditemukan.");
          return;
        }
        const data = snap.data();
        setTrip({ id: snap.id, ...data });

        const amt = data.amount || {};
        setF((s) => ({
          ...s,
          transport_multiplier: amt.transport_multiplier ?? s.transport_multiplier ?? "",
          local_transport_allowance: amt.local_transport_allowance ?? s.local_transport_allowance ?? "",
          meal_allowance: amt.meal_allowance ?? s.meal_allowance ?? "",
          meal_multiplier: amt.meal_multiplier ?? s.meal_multiplier ?? "",
          meal_percentage: amt.meal_percentage ?? s.meal_percentage ?? "",
          pocket_allowance: amt.pocket_allowance ?? s.pocket_allowance ?? "",
          pocket_multiplier: amt.pocket_multiplier ?? s.pocket_multiplier ?? "",
          local_transport_multiplier: amt.local_transport_multiplier ?? s.local_transport_multiplier ?? "",
          local_transport_percentage: amt.local_transport_percentage ?? s.local_transport_percentage ?? "",

          // FX fields
          fx_base: amt.fx_base ?? s.fx_base ?? "USD",
          fx_quote: amt.fx_quote ?? s.fx_quote ?? "IDR",
          fx_mid: (amt.fx_mid ?? s.fx_mid ?? "").toString(),
          fx_date: amt.fx_date ?? s.fx_date ?? "",
          fx_source: amt.fx_source ?? s.fx_source ?? "",
        }));
      },
      (e) => {
        console.error(e);
        setErr(`${e.code}: ${e.message}`);
      }
    );
    return () => unsub();
  }, [id]);

  // ---------- auto-fetch kurs saat trip siap & belum ada fx ----------
  useEffect(() => {
    if (!trip) return;
    if (f.fx_mid) return; // sudah ada
    const d = tripDepartISO(trip) || new Date().toISOString().slice(0, 10);
    fetchKursTengah({ date: d, silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  // ---------- totals (live) ----------
  const totals = useMemo(() => {
    const transport_multiplier = num(f.transport_multiplier, 1);
    const local_transport_allowance = num(f.local_transport_allowance, 0);
    const meal_allowance = num(f.meal_allowance, 0);
    const meal_multiplier = num(f.meal_multiplier, 1);
    const meal_percentage = pct(f.meal_percentage);
    const pocket_allowance = num(f.pocket_allowance, 0);
    const pocket_multiplier = num(f.pocket_multiplier, 1);
    const local_transport_multiplier = num(f.local_transport_multiplier, 1);
    const local_transport_percentage = pct(f.local_transport_percentage);

    const total_transport_allowance = transport_multiplier * local_transport_allowance;
    const total_meal_allowance = meal_allowance * meal_multiplier * meal_percentage;
    const total_pocket_allowance = pocket_allowance * pocket_multiplier;
    const total_local_transport = local_transport_allowance * local_transport_multiplier * local_transport_percentage;

    const total_approved_amount =
      total_transport_allowance +
      total_meal_allowance +
      total_pocket_allowance +
      total_local_transport;

    return {
      total_transport_allowance,
      total_meal_allowance,
      total_pocket_allowance,
      total_local_transport,
      total_approved_amount,
    };
  }, [f]);

  const onChange = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const ref = doc(db, "trips", id);
      await setDoc(
        ref,
        {
          amount: {
            transport_multiplier: num(f.transport_multiplier, 1),
            local_transport_allowance: num(f.local_transport_allowance, 0),
            meal_allowance: num(f.meal_allowance, 0),
            meal_multiplier: num(f.meal_multiplier, 1),
            meal_percentage: pct(f.meal_percentage),
            pocket_allowance: num(f.pocket_allowance, 0),
            pocket_multiplier: num(f.pocket_multiplier, 1),
            local_transport_multiplier: num(f.local_transport_multiplier, 1),
            local_transport_percentage: pct(f.local_transport_percentage),

            // totals
            total_transport_allowance: Math.round(totals.total_transport_allowance),
            total_meal_allowance: Math.round(totals.total_meal_allowance),
            total_pocket_allowance: Math.round(totals.total_pocket_allowance),
            total_local_transport: Math.round(totals.total_local_transport),
            total_approved_amount: Math.round(totals.total_approved_amount),

            // FX fields
            fx_base: "USD",
            fx_quote: "IDR",
            fx_mid: num(f.fx_mid, 0),
            fx_date: f.fx_date || tripDepartISO(trip) || new Date().toISOString().slice(0, 10),
            fx_source: f.fx_source || "RegyCloud Kurs API",

            updated_at: serverTimestamp(),
          },
        },
        { merge: true }
      );
      setEdit(false);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal menyimpan amount.");
    } finally {
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <div style={{ padding: 16 }}>
        {err ? <div style={{ color: "#b91c1c" }}>{err}</div> : "Memuat…"}
        <div style={{ marginTop: 10 }}>
          <button onClick={() => navigate(-1)} style={btnOutline}>Kembali</button>
        </div>
      </div>
    );
  }

  const departISO = tripDepartISO(trip) || new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: 12, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} style={btnOutline}>⬅️ Kembali</button>
        <h1 style={{ margin: 0 }}>Amount — Trip #{trip.number || trip.id}</h1>
      </div>

      {err && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</div>}

      {/* ACTIONS */}
      <div style={{ marginBottom: 12 }}>
        {!edit ? (
          <button style={btnPrimary} onClick={() => setEdit(true)}>Edit</button>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btnSuccess} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button style={btnOutline} disabled={saving} onClick={() => setEdit(false)}>Cancel</button>
            <button
              style={btnOutline}
              disabled={fxLoading}
              onClick={() => fetchKursTengah({ date: departISO })}
              title={`Ambil kurs tengah USD/IDR untuk tanggal berangkat (${departISO})`}
            >
              {fxLoading ? "Mengambil kurs…" : `Ambil Kurs (${departISO})`}
            </button>
          </div>
        )}
        {fxMsg && <div style={{ marginTop: 6, fontSize: 12, color: "#374151" }}>{fxMsg}</div>}
      </div>

      {/* FORM (edit mode) */}
      {edit && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <h3 style={h3}>Kurs Tengah (otomatis sesuai tanggal berangkat)</h3>
            <div style={row3}>
              <Field label="Base Currency">
                <input style={{ ...input, background: "#f9fafb" }} value="USD" readOnly />
              </Field>
              <Field label="Quote Currency">
                <input style={{ ...input, background: "#f9fafb" }} value="IDR" readOnly />
              </Field>
              <Field label="Tanggal Kurs (auto)">
                <input style={{ ...input, background: "#f9fafb" }} value={f.fx_date || departISO} onChange={onChange("fx_date")} />
              </Field>
            </div>
            <div style={row3}>
              <Field label="Mid Rate (auto)">
                <input style={{ ...input, background: "#f9fafb" }} value={f.fx_mid} onChange={onChange("fx_mid")} placeholder="—" />
              </Field>
              <Field label="Source (auto)">
                <input style={{ ...input, background: "#f9fafb" }} value={f.fx_source || "Ortax"} onChange={onChange("fx_source")} />
              </Field>
              <div style={{ display: "grid", alignItems: "end" }}>
                <button
                  style={btnOutline}
                  disabled={fxLoading}
                  onClick={() => fetchKursTengah({ date: departISO })}
                >
                  {fxLoading ? "Mengambil kurs…" : "Refresh Kurs"}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              *Tanggal kurs mengikuti <b>tanggal berangkat</b> trip: <code>{departISO}</code>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>Base Values</h3>
            <div style={row3}>
              <Field label="Transport Multiplier">
                <input style={input} value={f.transport_multiplier} onChange={onChange("transport_multiplier")} placeholder="contoh: 1.0" />
              </Field>
              <Field label="Local Transport Allowance (Rp)">
                <input style={input} value={f.local_transport_allowance} onChange={onChange("local_transport_allowance")} placeholder="contoh: 150000" />
              </Field>
              <div />
            </div>

            <div style={row3}>
              <Field label="Meal Allowance (Rp)">
                <input style={input} value={f.meal_allowance} onChange={onChange("meal_allowance")} placeholder="contoh: 200000" />
              </Field>
              <Field label="Meal Multiplier">
                <input style={input} value={f.meal_multiplier} onChange={onChange("meal_multiplier")} placeholder="contoh: 1.0" />
              </Field>
              <Field label="Meal Percentage (0–1 atau 0–100)">
                <input style={input} value={f.meal_percentage} onChange={onChange("meal_percentage")} placeholder="contoh: 80" />
              </Field>
            </div>

            <div style={row3}>
              <Field label="Pocket Allowance (Rp)">
                <input style={input} value={f.pocket_allowance} onChange={onChange("pocket_allowance")} placeholder="contoh: 100000" />
              </Field>
              <Field label="Pocket Multiplier">
                <input style={input} value={f.pocket_multiplier} onChange={onChange("pocket_multiplier")} placeholder="contoh: 1.0" />
              </Field>
              <div />
            </div>

            <div style={row3}>
              <Field label="Local Transport Multiplier">
                <input style={input} value={f.local_transport_multiplier} onChange={onChange("local_transport_multiplier")} placeholder="contoh: 1.0" />
              </Field>
              <Field label="Local Transport Percentage (0–1 atau 0–100)">
                <input style={input} value={f.local_transport_percentage} onChange={onChange("local_transport_percentage")} placeholder="contoh: 100" />
              </Field>
              <div />
            </div>
          </div>
        </div>
      )}

      {/* DISPLAY (selalu tampil) */}
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <div style={card}>
          <h3 style={h3}>FX Snapshot</h3>
          <Grid2>
            <KV k="Pair" v="USD/IDR" />
            <KV k="Mid Rate" v={f.fx_mid ? Number(f.fx_mid).toLocaleString("id-ID") : "—"} />
            <KV k="Tanggal Kurs" v={f.fx_date || "—"} />
            <KV k="Source" v={f.fx_source || "RegyCloud Kurs API"} />
          </Grid2>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            *Kurs disimpan saat menekan <b>Save</b>. Gunakan <b>Ambil/Refresh Kurs</b> saat Edit bila perlu update.
          </div>
        </div>

        <div style={card}>
          <h3 style={h3}>Base Values</h3>
          <Grid2>
            <KV k="Transport Multiplier" v={f.transport_multiplier || "-"} />
            <KV k="Local Transport Allowance" v={currency(num(f.local_transport_allowance))} />

            <KV k="Meal Allowance" v={currency(num(f.meal_allowance))} />
            <KV k="Meal Multiplier" v={f.meal_multiplier || "-"} />
            <KV k="Meal Percentage" v={`${(pct(f.meal_percentage) * 100).toFixed(0)}%`} />

            <KV k="Pocket Allowance" v={currency(num(f.pocket_allowance))} />
            <KV k="Pocket Multiplier" v={f.pocket_multiplier || "-"} />

            <KV k="Local Transport Multiplier" v={f.local_transport_multiplier || "-"} />
            <KV k="Local Transport Percentage" v={`${(pct(f.local_transport_percentage) * 100).toFixed(0)}%`} />
          </Grid2>
        </div>

        <div style={card}>
          <h3 style={h3}>Totals</h3>
          <Grid2>
            <KV k="Total Transport Allowance" v={currency(totals.total_transport_allowance)} />
            <KV k="Total Meal Allowance" v={currency(totals.total_meal_allowance)} />
            <KV k="Total Pocket Allowance" v={currency(totals.total_pocket_allowance)} />
            <KV k="Total Local Transport" v={currency(totals.total_local_transport)} />
          </Grid2>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Total Approved Amount</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{currency(totals.total_approved_amount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
      {children}
    </label>
  );
}
function KV({ k, v }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{k}</div>
      <div style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const h3 = { margin: "4px 0 12px", fontSize: 14, fontWeight: 800 };
const btnOutline = { padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
const btnPrimary = { padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" };
const btnSuccess = { padding: "8px 12px", borderRadius: 10, border: "1px solid #059669", background: "#059669", color: "#fff", cursor: "pointer" };