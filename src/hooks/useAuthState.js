import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setUser(null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}