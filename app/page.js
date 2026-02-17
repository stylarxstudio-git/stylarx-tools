'use client';
import { useUser } from '@/hooks/useUser';
import UnsubscribedHome from '@/components/Unsubscribed/HomePage';
import SubscribedHome from '@/components/Subscribed/HomePage';

export default function Home() {
  const { user, loading } = useUser();
  
  // Don't show anything while loading (prevents flash)
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const PRO_UID = 'y9qbyNWA';
  const FOUNDER_UID = '7ma2MXQE';
  const hasAccess = user?.planUid === PRO_UID || user?.planUid === FOUNDER_UID;

  return hasAccess ? <SubscribedHome /> : <UnsubscribedHome />;
}