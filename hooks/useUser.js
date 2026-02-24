'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const UserContext = createContext();
const CACHE_KEY = 'stylarx_user';

function getCachedUser() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { user, ts } = JSON.parse(raw);
    // Cache valid for 30 minutes
    if (Date.now() - ts > 30 * 60 * 1000) { localStorage.removeItem(CACHE_KEY); return null; }
    return user;
  } catch { return null; }
}

function setCachedUser(user) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
    else localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export function UserProvider({ children }) {
  // Start with cached user immediately — no loading flash for returning visitors
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getCachedUser();
  });
  // Only show loading spinner if there's no cache
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return getCachedUser() === null;
  });
  const router = useRouter();

  const formatUser = useCallback((outsetaUser) => {
    if (!outsetaUser) return null;
    let renewalDate = null;
    const dateStr = outsetaUser?.Account?.CurrentSubscription?.RenewalDate
      || outsetaUser?.Account?.CurrentSubscription?.BillingRenewalDate;
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d)) renewalDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      } catch {}
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

    // Poll for Outseta SDK — every 100ms, max 2 seconds total
    let attempts = 0;
    while (!window.Outseta && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.Outseta) {
      // SDK never loaded = not logged in
      setUser(null);
      setCachedUser(null);
      setLoading(false);
      return;
    }

    try {
      const outsetaUser = await window.Outseta.getUser();
      const formatted = formatUser(outsetaUser);
      setUser(formatted);
      setCachedUser(formatted);
    } catch {
      setUser(null);
      setCachedUser(null);
    } finally {
      setLoading(false);
    }
  }, [formatUser]);

  useEffect(() => {
    // Always verify in background even when cache exists
    tryGetUser();

    const handleUpdate = (e) => {
      const formatted = formatUser(e.detail);
      setUser(formatted);
      setCachedUser(formatted);
      setLoading(false);
    };
    const handleLogout = () => {
      setUser(null);
      setCachedUser(null);
      setLoading(false);
    };

    window.addEventListener('outseta.set_user', handleUpdate);
    window.addEventListener('outseta.logout', handleLogout);
    return () => {
      window.removeEventListener('outseta.set_user', handleUpdate);
      window.removeEventListener('outseta.logout', handleLogout);
    };
  }, [tryGetUser, formatUser]);

  const logout = async () => {
    if (typeof window !== 'undefined' && window.Outseta) {
      await window.Outseta.logout();
    }
    setUser(null);
    setCachedUser(null);
    router.push('/');
    router.refresh();
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