'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // useRouter is safe here since UserProvider is 'use client'
  // but we guard all window/Outseta access with typeof window checks
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

  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.Outseta) {
      setLoading(false);
      return;
    }
    try {
      const outsetaUser = await window.Outseta.getUser();
      setUser(formatUser(outsetaUser));
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [formatUser]);

  useEffect(() => {
    // Wait for Outseta SDK to be ready
    const timer = setTimeout(() => { refreshUser(); }, 500);

    const handleUpdate = (e) => {
      setUser(formatUser(e.detail));
      setLoading(false);
    };
    const handleLogout = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('outseta.set_user', handleUpdate);
    window.addEventListener('outseta.logout', handleLogout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('outseta.set_user', handleUpdate);
      window.removeEventListener('outseta.logout', handleLogout);
    };
  }, [refreshUser, formatUser]);

  const logout = async () => {
    if (typeof window !== 'undefined' && window.Outseta) {
      await window.Outseta.logout();
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}