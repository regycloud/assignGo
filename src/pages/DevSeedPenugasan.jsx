// src/pages/DevSeedPenugasan.jsx
import { useState } from "react";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function DevSeedPenugasan() {
  // form state sederhana
  const [uid, setUid] = useState("UID_BARU_123");
  const [displayName, setDisplayName] = useState("Admin AssignGO");
  const [email, setEmail] = useState("assigngo@pgas-international.com");
  const [role, setRole] = useState("admin");
  const [assignedProjects, setAssignedProjects] = useState("Project A, Project B");
  const [responsibleRaw, setResponsibleRaw] = useState("2120940277, Arum\n2020940265, Izza");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // helper: parse textarea karyawan -> map { id: {name} }
  const parseResponsibleMap = () => {
    const map = {};
    for (const line of responsibleRaw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // format: id, name
      const [id, name] = trimmed.split(",").map((s) => (s || "").trim());
      if (!id) continue;
      map[String(id)] = { name: name || "" };
    }
    return map;
  };

  const handleSeedUser = async () => {
    setBusy(true);
    setMsg("");
    try {
      const ref = doc(db, "users", uid);
      const payload = {
        displayName: displayName || "",
        email: email || "",
        role: role || "pic",
        roleDisplay: role || "pic",
        assignedProjects: assignedProjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        responsible_employees: parseResponsibleMap(),
        createdAt: new Date(),
      };
      await setDoc(ref, payload, { merge: true });
      setMsg("✅ User disimpan/di-merge berhasil.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Gagal menyimpan user: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const handleAddProject = async () => {
    setBusy(true);
    setMsg("");
    try {
      const ref = doc(db, "users", uid);
      await updateDoc(ref, {
        assignedProjects: arrayUnion("Project C"),
      });
      setMsg("✅ Berhasil menambah Project C ke assignedProjects.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Gagal menambah project: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const handleUpsertOneEmployee = async () => {
    setBusy(true);
    setMsg("");
    try {
      const ref = doc(db, "users", uid);
      // contoh tambah 1 karyawan baru
      await updateDoc(ref, {
        ["responsible_employees.2120000001"]: { name: "Budi" },
      });
      setMsg("✅ Berhasil upsert 1 responsible employee (2120000001: Budi).");
    } catch (e) {
      console.error(e);
      setMsg("❌ Gagal upsert employee: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Dev Seed Penugasan (Users)</h1>
      <div style={card}>
        <div style={row2}>
          <div>
            <label style={label}>UID</label>
            <input style={input} value={uid} onChange={(e) => setUid(e.target.value)} />
          </div>
          <div>
            <label style={label}>Role</label>
            <select style={input} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">admin</option>
              <option value="bod">bod</option>
              <option value="pic">pic</option>
            </select>
          </div>
        </div>

        <div style={sp} />
        <div style={row2}>
          <div>
            <label style={label}>Display Name</label>
            <input style={input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label style={label}>Email</label>
            <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div style={sp} />
        <div>
          <label style={label}>Assigned Projects (pisahkan dengan koma)</label>
          <input
            style={input}
            value={assignedProjects}
            onChange={(e) => setAssignedProjects(e.target.value)}
            placeholder="Project A, Project B"
          />
        </div>

        <div style={sp} />
        <div>
          <label style={label}>Responsible Employees (satu baris: id, nama)</label>
          <textarea
            style={{ ...input, minHeight: 120 }}
            value={responsibleRaw}
            onChange={(e) => setResponsibleRaw(e.target.value)}
            placeholder={"2120940277, Arum\n2020940265, Izza"}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button disabled={busy} onClick={handleSeedUser} style={btnPrimary}>
            {busy ? "Processing…" : "Seed/Upsert User"}
          </button>
          <button disabled={busy} onClick={handleAddProject} style={btnOutline}>
            + Add Project C
          </button>
          <button disabled={busy} onClick={handleUpsertOneEmployee} style={btnOutline}>
            + Upsert Employee (contoh)
          </button>
        </div>

        {!!msg && <div style={{ marginTop: 10, color: msg.startsWith("✅") ? "#065f46" : "#991b1b" }}>{msg}</div>}
      </div>

      <p style={{ color: "#6b7280", marginTop: 12 }}>
        Catatan: pastikan Firestore Rules mengizinkan <b>admin</b> untuk menulis dokumen di koleksi <code>users</code>.
        Jika kamu bukan admin, operasi akan ditolak.
      </p>
    </div>
  );
}

/* mini styles */
const card = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" };
const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const sp = { height: 10 };
const label = { display: "block", fontWeight: 700, marginBottom: 6, fontSize: 13 };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
const btnPrimary = { padding: "10px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" };
const btnOutline = { padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };