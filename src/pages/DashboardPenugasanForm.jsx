// src/pages/DashboardPenugasanForm.jsx
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPenugasanForm() {
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, [])
  const [form, setForm] = useState({
    pekerjaPenempatan: "",
    proyek: "",
    satuanKerja: "",
    nip: "",
    namaPekerja: "",
    golonganPerjalanan: "",
    tglBerangkat: "",
    tglKembali: "",
    jumlahHari: 0, // auto
    tempatKedudukan: "",
    lokasiPenugasan: "",
    deskripsiTujuan: "",
    kategoriPerjalanan: "", // "Dalam Negeri" | "Khusus" | "Luar Negeri"
    jenisUmum: "", // untuk kategori "Dalam Negeri" atau "Luar Negeri" jika dianggap umum
    jenisKhusus: "", // untuk kategori "Khusus"
    transportKeBandaraKeberangkatan: "", // "Sendiri" | "Kendaraan Dinas/Operasional"
    transportKeBandaraKedatangan: "",
    saranaTransportasi: "", // "PU" | "KA" | "TUD" | "KL"
    saranaTransportasiTujuan: "", // "Penugasan = Penginapan" | "Mengatur Sendiri" | "Kendaraan Dinas / Operasional" | "Sewa Kendaraan"
  });

  const [error, setError] = useState("");


  // Hitung jumlah hari otomatis saat tanggal berubah
  useEffect(() => {
    if (!form.tglBerangkat || !form.tglKembali) return;
    const start = new Date(form.tglBerangkat);
    const end = new Date(form.tglKembali);

    if (end < start) {
      setError("Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.");
      setForm((f) => ({ ...f, jumlahHari: 0 }));
      return;
    }
    setError("");

    const ms = end - start; // selisih milidetik
    // Konversi ke hari dibulatkan ke atas (minimal 1 jika punya selisih > 0)
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) || 1);
    setForm((f) => ({ ...f, jumlahHari: days }));
  }, [form.tglBerangkat, form.tglKembali]);

  // Helpers
  const disabledUmum = useMemo(
    () => form.kategoriPerjalanan !== "Dalam Negeri" && form.kategoriPerjalanan !== "Luar Negeri",
    [form.kategoriPerjalanan]
  );
  const disabledKhusus = useMemo(
    () => form.kategoriPerjalanan !== "Khusus",
    [form.kategoriPerjalanan]
  );

  const onChange = (key) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((f) => ({ ...f, [key]: value }));
  };

    const onSubmit = async (e) => {
    e.preventDefault();

    // Validasi minimum
    if (!form.nip || !form.namaPekerja || !form.kategoriPerjalanan) {
      setError("Mohon lengkapi NIP, Nama Pekerja, dan Kategori Perjalanan.");
      return;
    }
    if (!form.tglBerangkat || !form.tglKembali) {
      setError("Mohon isi Tanggal Berangkat dan Tanggal Kembali.");
      return;
    }
    if (new Date(form.tglKembali) < new Date(form.tglBerangkat)) {
      setError("Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = {
        // --- field sesuai form ---
        pekerjaPenempatan: form.pekerjaPenempatan?.trim() || "",
        proyek: form.proyek?.trim() || "",
        satuanKerja: form.satuanKerja?.trim() || "",
        nip: form.nip?.trim() || "",
        namaPekerja: form.namaPekerja?.trim() || "",
        golonganPerjalanan: form.golonganPerjalanan?.trim() || "",
        // Simpan sebagai Date (SDK akan konversi ke Timestamp Firestore)
        tglBerangkat: new Date(form.tglBerangkat),
        tglKembali: new Date(form.tglKembali),
        jumlahHari: form.jumlahHari || 0,
        tempatKedudukan: form.tempatKedudukan?.trim() || "",
        lokasiPenugasan: form.lokasiPenugasan?.trim() || "",
        deskripsiTujuan: form.deskripsiTujuan?.trim() || "",
        kategoriPerjalanan: form.kategoriPerjalanan || "",
        jenisPerjalananUmum: form.kategoriPerjalanan !== "Khusus" ? (form.jenisUmum || "") : "",
        jenisPerjalananKhusus: form.kategoriPerjalanan === "Khusus" ? (form.jenisKhusus || "") : "",
        transportKeBandara: {
          keberangkatan: form.transportKeBandaraKeberangkatan || "",
          kedatangan: form.transportKeBandaraKedatangan || "",
        },
        saranaTransportasi: form.saranaTransportasi || "",
        saranaTransportasiTujuan: form.saranaTransportasiTujuan || "",

        // --- meta ---
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || null,
        status: "draft", // kamu bisa ganti ke 'submitted' kalau mau
      };

      const ref = await addDoc(collection(db, "penugasan"), payload);
      setSavedId(ref.id);

      // reset form (opsional)
      // setForm({ ...defaultState });

      alert(`Berhasil disimpan! ID: ${ref.id}`);
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan ke Firestore. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  // UI kecil & rapi tanpa lib eksternal
  const section = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 };
  const label = { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
  const radioWrap = { display: "flex", gap: 16, flexWrap: "wrap" };
  const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const header = { fontSize: 18, fontWeight: 700, margin: "8px 0 12px" };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
        Form Penugasan / Perjalanan Dinas
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        Isi data berikut. <i>Jumlah Hari</i> dihitung otomatis dari rentang tanggal.
      </p>

      <form onSubmit={onSubmit}>
        {/* Identitas & Penempatan */}
        <div style={section}>
          <div style={header}>Identitas & Penempatan</div>
          <div style={row}>
            <div>
              <label style={label}>Pekerja Penempatan</label>
              <input style={input} value={form.pekerjaPenempatan} onChange={onChange("pekerjaPenempatan")} placeholder="Contoh: Divisi Operasional" />
            </div>
            <div>
              <label style={label}>Proyek</label>
              <input style={input} value={form.proyek} onChange={onChange("proyek")} placeholder="Contoh: Proyek A" />
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={row}>
            <div>
              <label style={label}>Satuan Kerja</label>
              <input style={input} value={form.satuanKerja} onChange={onChange("satuanKerja")} placeholder="Satuan Kerja" />
            </div>
            <div>
              <label style={label}>NIP</label>
              <input style={input} value={form.nip} onChange={onChange("nip")} placeholder="Nomor Induk Pegawai" />
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={row}>
            <div>
              <label style={label}>Nama Pekerja yang diperintah</label>
              <input style={input} value={form.namaPekerja} onChange={onChange("namaPekerja")} placeholder="Nama lengkap" />
            </div>
            <div>
              <label style={label}>Golongan Perjalanan Dinas</label>
              <input style={input} value={form.golonganPerjalanan} onChange={onChange("golonganPerjalanan")} placeholder="Golongan/Grade" />
            </div>
          </div>
        </div>

        {/* Jadwal */}
        <div style={section}>
          <div style={header}>Jadwal Perjalanan</div>
          <div style={row}>
            <div>
              <label style={label}>Tanggal Berangkat</label>
              <input type="datetime-local" style={input} value={form.tglBerangkat} onChange={onChange("tglBerangkat")} />
            </div>
            <div>
              <label style={label}>Tanggal Kembali</label>
              <input type="datetime-local" style={input} value={form.tglKembali} onChange={onChange("tglKembali")} />
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ maxWidth: 240 }}>
            <label style={label}>Jumlah Hari (auto)</label>
            <input style={{ ...input, background: "#f3f4f6" }} value={form.jumlahHari} readOnly disabled />
          </div>

          {error && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Lokasi & Tujuan */}
        <div style={section}>
          <div style={header}>Lokasi & Tujuan</div>
          <div style={row}>
            <div>
              <label style={label}>Tempat Kedudukan</label>
              <input style={input} value={form.tempatKedudukan} onChange={onChange("tempatKedudukan")} placeholder="Kota/Unit asal" />
            </div>
            <div>
              <label style={label}>Lokasi Penugasan</label>
              <input style={input} value={form.lokasiPenugasan} onChange={onChange("lokasiPenugasan")} placeholder="Kota/Unit tujuan" />
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div>
            <label style={label}>Deskripsi Tujuan Penugasan</label>
            <textarea style={{ ...input, minHeight: 90 }} value={form.deskripsiTujuan} onChange={onChange("deskripsiTujuan")} placeholder="Ringkas tujuan penugasan..." />
          </div>
        </div>

        {/* Kategori Perjalanan */}
        <div style={section}>
          <div style={header}>Kategori Perjalanan Dinas</div>
          <div style={radioWrap}>
            {["Dalam Negeri", "Khusus", "Luar Negeri"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="kategoriPerjalanan"
                  value={opt}
                  checked={form.kategoriPerjalanan === opt}
                  onChange={onChange("kategoriPerjalanan")}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Jenis Perjalanan Dinas - Umum */}
        <div style={{ ...section, opacity: disabledUmum ? 0.5 : 1 }}>
          <div style={header}>Jenis Perjalanan Dinas (Umum)</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>
            Aktif bila kategori = Dalam Negeri / Luar Negeri
          </div>
          <div style={radioWrap}>
            {[
              "Kunjungan Dinas Umum/Rapat Dinas/Dinas Surver",
              "Pemindahan Permanan/Penugasan Sementara",
              "Pendidikan dan Pelatihan",
            ].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="jenisUmum"
                  value={opt}
                  disabled={disabledUmum}
                  checked={form.jenisUmum === opt}
                  onChange={onChange("jenisUmum")}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Jenis Perjalanan Dinas - Khusus */}
        <div style={{ ...section, opacity: disabledKhusus ? 0.5 : 1 }}>
          <div style={header}>Jenis Perjalanan Dinas (Khusus)</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>
            Aktif bila kategori = Khusus
          </div>
          <div style={radioWrap}>
            {[
              ">= 80km dan menginap",
              ">= 80km dan tidak menginap",
              "<= 80 km dan menginap",
              "<= 80 km dan tidak menginap",
            ].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="jenisKhusus"
                  value={opt}
                  disabled={disabledKhusus}
                  checked={form.jenisKhusus === opt}
                  onChange={onChange("jenisKhusus")}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Transportasi ke/di bandara/stasiun/pelabuhan */}
        <div style={section}>
          <div style={header}>Transportasi ke Bandara/Stasiun/Terminal/Pelabuhan</div>

          <div style={{ marginBottom: 10, fontWeight: 600 }}>Di tempat keberangkatan:</div>
          <div style={radioWrap}>
            {["Sendiri", "Kendaraan Dinas/Operasional"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="transportKeBandaraKeberangkatan"
                  value={opt}
                  checked={form.transportKeBandaraKeberangkatan === opt}
                  onChange={onChange("transportKeBandaraKeberangkatan")}
                />
                {opt}
              </label>
            ))}
          </div>

          <div style={{ height: 12 }} />

          <div style={{ marginBottom: 10, fontWeight: 600 }}>Di tempat kedatangan:</div>
          <div style={radioWrap}>
            {["Sendiri", "Kendaraan Dinas/Operasional"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="transportKeBandaraKedatangan"
                  value={opt}
                  checked={form.transportKeBandaraKedatangan === opt}
                  onChange={onChange("transportKeBandaraKedatangan")}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Sarana Transportasi */}
        <div style={section}>
          <div style={header}>Sarana Transportasi</div>
          <div style={radioWrap}>
            {["PU", "KA", "TUD", "KL"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="saranaTransportasi"
                  value={opt}
                  checked={form.saranaTransportasi === opt}
                  onChange={onChange("saranaTransportasi")}
                />
                {opt}
              </label>
            ))}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
            Keterangan singkat: PU=Pesawat Udara, KA=Kereta Api, TUD=Transport Umum Darat, KL=Kapal Laut.
          </div>
        </div>

        {/* Sarana Transportasi di Tujuan */}
        <div style={section}>
          <div style={header}>Sarana Transportasi di Tujuan</div>
          <div style={radioWrap}>
            {[
              "Penugasan = Penginapan",
              "Mengatur Sendiri",
              "Kendaraan Dinas / Operasional",
              "Sewa Kendaraan",
            ].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="saranaTransportasiTujuan"
                  value={opt}
                  checked={form.saranaTransportasiTujuan === opt}
                  onChange={onChange("saranaTransportasiTujuan")}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => {
              setForm({
                pekerjaPenempatan: "",
                proyek: "",
                satuanKerja: "",
                nip: "",
                namaPekerja: "",
                golonganPerjalanan: "",
                tglBerangkat: "",
                tglKembali: "",
                jumlahHari: 0,
                tempatKedudukan: "",
                lokasiPenugasan: "",
                deskripsiTujuan: "",
                kategoriPerjalanan: "",
                jenisUmum: "",
                jenisKhusus: "",
                transportKeBandaraKeberangkatan: "",
                transportKeBandaraKedatangan: "",
                saranaTransportasi: "",
                saranaTransportasiTujuan: "",
              });
              setError("");
            }}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff" }}
          >
            Reset
          </button>
          <button
            type="submit"
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}