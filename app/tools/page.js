'use client';
import { useUser } from '@/hooks/useUser';
import UnsubscribedTools from '@/components/Unsubscribed/ToolsPage';
import SubscribedTools from '@/components/Subscribed/ToolsPage';

export default function Tools() {
  const { user, loading } = useUser();
  
  if (loading) {
    return <UnsubscribedTools />;
  }

  const PRO_UID = 'y9qbyNWA';
  const FOUNDER_UID = '7ma2MXQE';
  const hasAccess = user?.planUid === PRO_UID || user?.planUid === FOUNDER_UID;

  return hasAccess ? <SubscribedTools /> : <UnsubscribedTools />;
}