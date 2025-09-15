import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './useAuth';

// role: 'admin' | 'pic' | 'staff' | null | 'unassigned'
export function useRole() {
  const { user, authLoading } = useAuth();
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;       // tunggu status login dulu
    if (!user) {                   // belum login
      setRole(null);
      setRoleLoading(false);
      return;
    }

    const ref = doc(db, 'users', user.uid);
    const unsubDoc = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setRole('unassigned');     // user login tapi belum punya doc users/{uid}
      } else {
        const data = snap.data();
        setRole(data.roleDisplay || 'unassigned');
      }
      setRoleLoading(false);
    }, () => {
      setRole('unassigned');
      setRoleLoading(false);
    });

    return () => unsubDoc();
  }, [user, authLoading]);

  return { user, role, loading: authLoading || roleLoading };
}