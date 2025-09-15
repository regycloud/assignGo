// src/pages/DevSeedPenugasan.jsx (DEV ONLY)
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

const samples = [
  {
    pekerjaPenempatan: "Divisi Operasional",
    proyek: "Proyek FO-JKT-001",
    satuanKerja: "NOC",
    nip: "1987654321",
    namaPekerja: "Bagus Santoso",
    golonganPerjalanan: "C",
    tglBerangkat: new Date("2025-09-15T08:30:00"),
    tglKembali: new Date("2025-09-17T18:00:00"),
    jumlahHari: 3,
    tempatKedudukan: "Jakarta",
    lokasiPenugasan: "Bandung",
    deskripsiTujuan: "Koordinasi cutover backbone dan verifikasi trafik pelanggan.",
    kategoriPerjalanan: "Dalam Negeri",
    jenisPerjalananUmum: "Kunjungan Dinas Umum/Rapat Dinas/Dinas Surver",
    jenisPerjalananKhusus: "",
    transportKeBandara: { keberangkatan: "Sendiri", kedatangan: "Kendaraan Dinas/Operasional" },
    saranaTransportasi: "KA",
    saranaTransportasiTujuan: "Mengatur Sendiri",
    status: "draft",
  },
  {
    pekerjaPenempatan: "Divisi Project",
    proyek: "Metro-Core-Surabaya",
    satuanKerja: "Deployment",
    nip: "1976543210",
    namaPekerja: "Rani Prameswari",
    golonganPerjalanan: "B",
    tglBerangkat: new Date("2025-09-20T07:00:00"),
    tglKembali: new Date("2025-09-23T19:30:00"),
    jumlahHari: 4,
    tempatKedudukan: "Surabaya",
    lokasiPenugasan: "Malang",
    deskripsiTujuan: "Survey jalur FO & penentuan titik ODF.",
    kategoriPerjalanan: "Khusus",
    jenisPerjalananUmum: "",
    jenisPerjalananKhusus: ">= 80km dan menginap",
    transportKeBandara: { keberangkatan: "Kendaraan Dinas/Operasional", kedatangan: "Kendaraan Dinas/Operasional" },
    saranaTransportasi: "TUD",
    saranaTransportasiTujuan: "Sewa Kendaraan",
    status: "submitted",
  },
  {
    pekerjaPenempatan: "Divisi Engineering",
    proyek: "IX-SG-Peering",
    satuanKerja: "Core Network",
    nip: "1990012345",
    namaPekerja: "Andi Kurniawan",
    golonganPerjalanan: "A",
    tglBerangkat: new Date("2025-10-02T10:00:00"),
    tglKembali: new Date("2025-10-05T22:00:00"),
    jumlahHari: 4,
    tempatKedudukan: "Jakarta",
    lokasiPenugasan: "Singapore",
    deskripsiTujuan: "Rapat peering & capacity planning dengan IX.",
    kategoriPerjalanan: "Luar Negeri",
    jenisPerjalananUmum: "Rapat Dinas",
    jenisPerjalananKhusus: "",
    transportKeBandara: { keberangkatan: "Sendiri", kedatangan: "Mengatur Sendiri" },
    saranaTransportasi: "PU",
    saranaTransportasiTujuan: "Penugasan = Penginapan",
    status: "draft",
  },
];

export default function DevSeedPenugasan() {
  const seed = async () => {
    for (const s of samples) {
      await addDoc(collection(db, "penugasan"), {
        ...s,
        createdAt: serverTimestamp(),
      });
    }
    alert("Seed 3 dokumen penugasan: BERHASIL ✅");
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Dev Seed Penugasan</h1>
      <p>Menambahkan 3 dokumen contoh ke koleksi <code>penugasan</code>.</p>
      <button onClick={seed} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}>
        Jalankan Seed
      </button>
    </div>
  );
}
