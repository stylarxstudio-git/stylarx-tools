'use client';
import { Home, Wrench, HelpCircle, LogOut, Copy, Trash2, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import MobileHeader from '@/components/MobileHeader';

function formatLocalDate(utcString) {
  if (!utcString) return { date: '—', time: '—' };
  const normalized = utcString.endsWith('Z') || utcString.includes('+') ? utcString : utcString + 'Z';
  const d = new Date(normalized);
  if (isNaN(d)) return { date: '—', time: '—' };
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function SubscribedHomePage() {
  const [suggestion, setSuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useUser();

  const [userData, setUserData] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const handleDelete = async (id) => {
    const { deleteGeneration } = await import('@/lib/generations');
    if (await deleteGeneration(id)) setRecentHistory(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (!window.Outseta) { setDataLoading(false); return; }
      try {
        const outsetaUser = await window.Outseta.getUser();
        if (!outsetaUser?.Account?.CurrentSubscription) { setDataLoading(false); return; }

        const { getUserCredits, initializeUserCredits } = await import('@/lib/credits');
        const { getGenerationStats, getRecentActivity } = await import('@/lib/generations');

        let credits = await getUserCredits(outsetaUser.Uid);
        if (!credits) credits = await initializeUserCredits(
          outsetaUser.Uid, outsetaUser.Email,
          `${outsetaUser.FirstName} ${outsetaUser.LastName}`,
          outsetaUser.Account.CurrentSubscription.Plan.Name
        );

        const stats = await getGenerationStats(outsetaUser.Uid);
        const activity = await getRecentActivity(outsetaUser.Uid, 15);

        if (activity) {
          setRecentHistory(activity.map(item => {
            const { date, time } = formatLocalDate(item.created_at);
            return {
              id: item.id,
              product: item.tool_name,
              date,
              time,
              status: item.status || 'Successful',
              prompt: item.prompt?.length > 40 ? item.prompt.substring(0, 40) + '...' : item.prompt,
              fullPrompt: item.prompt,
            };
          }));
        }

        const sub = outsetaUser.Account.CurrentSubscription;
        const dateString = sub.RenewalDate || sub.BillingRenewalDate || sub.EndDate;
        let renewalDate = 'N/A';
        if (dateString) {
          try {
            const d = new Date(dateString);
            if (!isNaN(d)) renewalDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          } catch {}
        }

        setUserData({
          creditsUsed: credits?.credits_used_this_month || 0,
          creditsLeft: credits?.credits_remaining || 0,
          renewalDate,
          totalGenerations: stats?.totalGenerations || 0,
          plan: sub.Plan?.Name || 'Pro Plan',
        });
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    loadUserData();
  }, []);

  const filteredHistory = recentHistory.filter(item =>
    item.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fullPrompt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <MobileHeader />
      <div className="flex min-h-screen bg-white font-['Poppins',sans-serif]">
        <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col fixed h-screen z-40">
          <div className="p-4 border-b border-gray-100">
            <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium"><Home size={16} /> Dashboard</a>
            <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Wrench size={16} /> Tools</a>
          </nav>
          <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
            <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><HelpCircle size={16} /> Help / contact</a>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"><LogOut size={16} /> Log Out</button>
          </div>
        </aside>

        <div className="flex-1 lg:ml-60 bg-white min-h-screen pt-16 lg:pt-0">
          <main className="p-3 sm:p-4 lg:p-6 space-y-4">

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Hey, {user?.name || 'User'}!</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Here is your statistics from last month</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {dataLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto animate-pulse">
                    <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                    <div className="h-8 w-12 bg-gray-200 rounded mb-2" />
                    <div className="h-2 w-16 bg-gray-100 rounded" />
                  </div>
                ))
              ) : (
                [
                  ['Credits Used', userData?.creditsUsed ?? 0, 'This Month'],
                  ['Credits Left', userData?.creditsLeft ?? 0, 'This Month'],
                  ['Renewal', userData?.renewalDate ?? 'N/A', userData?.plan ?? ''],
                  ['Generations', userData?.totalGenerations ?? 0, 'This Month'],
                ].map(([label, val, sub]) => (
                  <div key={label} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto">
                    <p className="text-xs text-gray-600 mb-1">{label}</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{val}</h3>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">Top AI Used</h3>
                <div className="flex items-center justify-center min-h-[120px]">
                  <p className="text-sm text-gray-400 text-center">Use AI tools for your most used AI to show up here</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">What tool next?</h3>
                <p className="text-xs text-gray-600 mb-3">I wish there was an AI for...</p>
                <form onSubmit={async (e) => {
                  e.preventDefault(); setIsSubmittingSuggestion(true);
                  try {
                    const res = await fetch('https://formspree.io/f/xqedqkzv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion, userEmail: user?.email || 'Not provided', userName: user?.name || 'Anonymous', userPlan: userData?.plan, _subject: 'New AI Tool Suggestion - STYLARX (Subscribed User)' }) });
                    if (res.ok) { alert('Sent! Thanks!'); setSuggestion(''); }
                  } catch { alert('Failed to send.'); } finally { setIsSubmittingSuggestion(false); }
                }}>
                  <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="Your idea..." className="w-full h-20 sm:h-24 p-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500" disabled={isSubmittingSuggestion} />
                  <button type="submit" disabled={isSubmittingSuggestion} className="mt-2 w-full py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 text-xs sm:text-sm disabled:opacity-50">{isSubmittingSuggestion ? 'Sending...' : 'Submit'}</button>
                </form>
              </div>
            </div>

            {/* Activity — now shows 15 rows with search */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 shrink-0">Generation History</h3>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by tool or prompt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              {dataLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300" /></div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex items-center justify-center py-12 px-4 italic text-gray-400 text-sm">
                  {searchQuery ? 'No results found.' : 'No activity in the last 30 days.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Product','Date','Time','Status','Prompt','Action'].map(h => <th key={h} className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{item.product}</td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{item.time}</td>
                          <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === 'Successful' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[180px]">{item.prompt}</span>
                              <button onClick={() => navigator.clipboard.writeText(item.fullPrompt)} className="p-1 hover:bg-gray-100 rounded shrink-0"><Copy size={12} className="text-gray-400" /></button>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded group"><Trash2 size={14} className="text-gray-400 group-hover:text-red-500" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </main>
        </div>
      </div>
    </>
  );
}