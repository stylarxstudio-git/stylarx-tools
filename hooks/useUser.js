'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      // Wait for Outseta with timeout
      const waitForOutseta = () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('Outseta timeout - proceeding without user');
            resolve(false);
          }, 3000); // 3 second timeout

          if (window.Outseta) {
            clearTimeout(timeout);
            resolve(true);
          } else {
            const checkInterval = setInterval(() => {
              if (window.Outseta) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve(true);
              }
            }, 100);
          }
        });
      };

      try {
        const outsetaLoaded = await waitForOutseta();
        
        if (!outsetaLoaded) {
          setLoading(false);
          return;
        }
        
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
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Listen for Outseta auth changes
    const handleLogin = () => loadUser();
    const handleLogout = () => setUser(null);

    if (window.Outseta) {
      window.Outseta.on('auth.login', handleLogin);
      window.Outseta.on('auth.logout', handleLogout);
    }

    return () => {
      if (window.Outseta) {
        window.Outseta.off('auth.login', handleLogin);
        window.Outseta.off('auth.logout', handleLogout);
      }
    };
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