'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to format the Outseta user object into your app's user object
  const formatUser = useCallback((outsetaUser) => {
    if (!outsetaUser) return null;

    let renewalDate = null;
    if (outsetaUser?.Account?.CurrentSubscription?.RenewalDate) {
      try {
        const date = new Date(outsetaUser.Account.CurrentSubscription.RenewalDate);
        renewalDate = date.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (e) {
        console.error('Error parsing renewal date:', e);
      }
    }

    return {
      email: outsetaUser.Email,
      name: `${outsetaUser.FirstName || ''} ${outsetaUser.LastName || ''}`.trim(),
      uid: outsetaUser.Uid,
      planUid: outsetaUser?.Account?.CurrentSubscription?.Plan?.Uid,
      renewalDate: renewalDate,
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (typeof window !== 'undefined' && window.Outseta) {
      try {
        const outsetaUser = await window.Outseta.getUser();
        setUser(formatUser(outsetaUser));
      } catch (err) {
        console.error('Outseta getUser error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  }, [formatUser]);

  useEffect(() => {
    // 1. Initial Load
    const timer = setTimeout(() => {
      refreshUser();
    }, 500); // Small delay to ensure Outseta SDK is ready

    // 2. Reactive Listeners
    // These events fire whenever the user logs in, updates profile, or logs out
    const handleUpdate = (outsetaUser) => {
      setUser(formatUser(outsetaUser));
      setLoading(false);
    };

    if (typeof window !== 'undefined') {
      // Listen for Outseta events
      window.addEventListener('outseta.set_user', (e) => handleUpdate(e.detail));
      window.addEventListener('outseta.logout', () => {
        setUser(null);
        setLoading(false);
      });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('outseta.set_user', handleUpdate);
    };
  }, [refreshUser, formatUser]);

  async function logout() {
    if (window.Outseta) {
      await window.Outseta.logout();
      setUser(null);
      router.push('/');
      router.refresh(); // Forces Next.js to clear route cache
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}