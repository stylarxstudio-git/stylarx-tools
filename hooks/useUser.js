'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 1000);

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (window.Outseta) {
          const outsetaUser = await window.Outseta.getUser();
          if (outsetaUser) {
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
            
            setUser({
              email: outsetaUser.Email,
              name: `${outsetaUser.FirstName} ${outsetaUser.LastName}`,
              uid: outsetaUser.Uid,
              planUid: outsetaUser?.Account?.CurrentSubscription?.Plan?.Uid,
              renewalDate: renewalDate,
            });
            setLoading(false);
            clearTimeout(timeout);
          } else {
            // No user logged in
            setUser(null);
            setLoading(false);
            clearTimeout(timeout);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    loadUser();

    // SYNC FIX: Listen for Outseta login/logout events
    if (window.Outseta) {
      const handleAuthChange = () => {
        loadUser();
      };

      window.Outseta.on('auth.login', handleAuthChange);
      window.Outseta.on('auth.logout', () => {
        setUser(null);
      });

      // Cleanup
      return () => {
        window.Outseta.off('auth.login', handleAuthChange);
        window.Outseta.off('auth.logout', () => setUser(null));
      };
    }
  }, []);

  async function logout() {
    if (window.Outseta) {
      await window.Outseta.logout();
      setUser(null);
      window.location.href = '/';
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
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