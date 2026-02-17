'use client';
import { useUser } from '@/hooks/useUser';
import UnsubscribedHistory from '@/components/Unsubscribed/HistoryPage';
import SubscribedHistory from '@/components/Subscribed/HistoryPage';

export default function History() {
  const { user, loading } = useUser();
  
  if (loading) {
    return <UnsubscribedHistory />;
  }

  const PRO_UID = 'y9qbyNWA';
  const FOUNDER_UID = '7ma2MXQE';
  const hasAccess = user?.planUid === PRO_UID || user?.planUid === FOUNDER_UID;

  return hasAccess ? <SubscribedHistory /> : <UnsubscribedHistory />;
}