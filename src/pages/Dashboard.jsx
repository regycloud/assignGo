import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // coba dari Auth
        if (u.displayName) {
          setName(u.displayName);
        } else {
          // fallback dari Firestore
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            setName(snap.data().displayName || snap.data().namaPekerja || "(tidak ada nama)");
          }
        }
      } else {
        setName(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {user ? (
        <div>
          <p><b>Email:</b> {user.email}</p>
          <p><b>Nama:</b> {name || "-"}</p>
        </div>
      ) : (
        <p>Tidak ada user yang login.</p>
      )}
    </div>
  );
}
