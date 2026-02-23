'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const formatUser = useCallback((outsetaUser) => {
    if (!outsetaUser) return null;
    let renewalDate = null;
    if (outsetaUser?.Account?.CurrentSubscription?.RenewalDate) {
      try {
        const date = new Date(outsetaUser.Account.CurrentSubscription.RenewalDate);
        renewalDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      } catch (e) {}
    }
    return {
      email: outsetaUser.Email,
      name: `${outsetaUser.FirstName || ''} ${outsetaUser.LastName || ''}`.trim(),
      uid: outsetaUser.Uid,
      planUid: outsetaUser?.Account?.CurrentSubscription?.Plan?.Uid,
      renewalDate,
    };
  }, []);

  const tryGetUser = useCallback(async () => {
    if (typeof window === 'undefined') { setLoading(false); return; }
    if (!window.Outseta) { setLoading(false); return; } // no SDK = not logged in, not loading
    try {
      const outsetaUser = await window.Outseta.getUser();
      setUser(formatUser(outsetaUser));
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false); // ALWAYS resolve loading
    }
  }, [formatUser]);

  useEffect(() => {
    // Try immediately, then retry once after 1s in case Outseta loads slowly
    tryGetUser();
    const retry = setTimeout(tryGetUser, 1000);

    // Hard fallback — no matter what, stop loading after 3 seconds
    const fallback = setTimeout(() => setLoading(false), 3000);

    const handleUpdate = (e) => { setUser(formatUser(e.detail)); setLoading(false); };
    const handleLogout = () => { setUser(null); setLoading(false); };

    window.addEventListener('outseta.set_user', handleUpdate);
    window.addEventListener('outseta.logout', handleLogout);

    return () => {
      clearTimeout(retry);
      clearTimeout(fallback);
      window.removeEventListener('outseta.set_user', handleUpdate);
      window.removeEventListener('outseta.logout', handleLogout);
    };
  }, [tryGetUser, formatUser]);

  const logout = async () => {
    if (typeof window !== 'undefined' && window.Outseta) {
      await window.Outseta.logout();
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser: tryGetUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}