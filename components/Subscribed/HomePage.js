'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, Copy, RotateCcw, Trash2, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

export default function SubscribedHomePage() {
  const [suggestion, setSuggestion] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const { user, logout } = useUser();
  
  const [userData, setUserData] = useState({
    creditsUsed: 0,
    creditsLeft: 100,
    renewalDate: 'Loading...',
    totalGenerations: 0,
    plan: 'Pro Plan'
  });

  const [recentHistory, setRecentHistory] = useState([]);

  const handleDelete = async (id) => {
    const { deleteGeneration } = await import('@/lib/generations');
    if (await deleteGeneration(id)) {
      setRecentHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleRegenerate = (item) => {
    const toolSlug = item.product.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/tools/${toolSlug}?prompt=${encodeURIComponent(item.fullPrompt)}`;
  };

  useEffect(() => {
   const loadUserData = async () => {
  if (window.Outseta) {
    try {
      const outsetaUser = await window.Outseta.getUser();
      console.log("👤 Outseta User Loaded:", outsetaUser.Email); // Debug Log

      if (outsetaUser?.Account?.CurrentSubscription) {
        const { getUserCredits, initializeUserCredits } = await import('@/lib/credits');
        const { getGenerationStats, getRecentActivity } = await import('@/lib/generations');
        
        // 1. Check Credits
        let credits = await getUserCredits(outsetaUser.Uid);
        if (!credits) {
          console.log("🆕 No credits found, initializing...");
          credits = await initializeUserCredits(
            outsetaUser.Uid, 
            outsetaUser.Email, 
            `${outsetaUser.FirstName} ${outsetaUser.LastName}`, 
            outsetaUser.Account.CurrentSubscription.Plan.Name
          );
        }
        console.log("💰 Current Credits:", credits); // This will show your credits in console

        // 2. Check Activity
        const stats = await getGenerationStats(outsetaUser.Uid);
        const activity = await getRecentActivity(outsetaUser.Uid);
        console.log("📊 Activity Found:", activity?.length || 0, "items"); // Debug Log
        
        if (activity) {
          setRecentHistory(activity.map(item => ({
            id: item.id,
            product: item.tool_name,
            date: new Date(item.created_at).toLocaleDateString(),
            time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: item.status || 'Successful',
            prompt: item.prompt?.length > 30 ? item.prompt.substring(0, 30) + '...' : item.prompt,
            fullPrompt: item.prompt
          })));
        }

        setUserData({
          creditsUsed: credits?.credits_used_this_month || 0,
          creditsLeft: credits?.credits_remaining || 0,
          renewalDate: new Date(outsetaUser.Account.CurrentSubscription.RenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          totalGenerations: stats?.totalGenerations || 0,
          plan: outsetaUser.Account.CurrentSubscription.Plan.Name || 'Pro Plan'
        });
      }
    } catch (error) { 
      console.error('❌ Error in loadUserData:', error); 
    }
  }
};
    loadUserData();
  }, []);

  return (
    <div className="flex min-h-screen bg-white font-['Poppins',sans-serif]">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`lg:hidden fixed top-1/2 -translate-y-1/2 z-50 transition-all ${sidebarOpen ? 'left-60' : 'left-0'}`}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-r-xl shadow-lg">
          <ChevronLeft size={24} className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </div>
      </button>

      <aside className={`w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium"><Home size={16} /> Dashboard</a>
          <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Wrench size={16} /> Tools</a>
          <a href="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Clock size={16} /> History</a>
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
          <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><HelpCircle size={16} /> Help / contact</a>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"><LogOut size={16} /> Log Out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 lg:ml-60 bg-white min-h-screen">
        <main className="p-3 sm:p-4 lg:p-6 space-y-4 pb-32">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Hey, {user?.name || 'User'}!</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Here is your statistics from last month</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Credits Used</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{userData.creditsUsed}</h3>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Credits Left</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{userData.creditsLeft}</h3>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Renewal</p>
              <h3 className="text-sm sm:text-lg font-bold text-gray-900">{userData.renewalDate}</h3>
              <p className="text-xs text-gray-500">{userData.plan}</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Generations</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{userData.totalGenerations}</h3>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
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
                e.preventDefault(); 
                setIsSubmittingSuggestion(true);
                try {
                  const response = await fetch('https://formspree.io/f/xqedqkzv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      suggestion,
                      userEmail: user?.email || 'Not provided',
                      userName: user?.name || 'Anonymous',
                      userPlan: userData.plan,
                      _subject: 'New AI Tool Suggestion - STYLARX (Subscribed User)',
                    }),
                  });
                  if (response.ok) { alert('Sent! Thanks!'); setSuggestion(''); }
                } catch (error) { alert('Failed to send.'); } finally { setIsSubmittingSuggestion(false); }
              }}>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Your idea..."
                  className="w-full h-20 sm:h-24 p-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  disabled={isSubmittingSuggestion}
                ></textarea>
                <button type="submit" disabled={isSubmittingSuggestion} className="mt-2 w-full py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 text-xs sm:text-sm disabled:opacity-50">
                  {isSubmittingSuggestion ? 'Sending...' : 'Submit'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Recent Activity</h3>
              <a href="/history" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</a>
            </div>
            
            {recentHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-4 italic text-gray-400 text-sm">No activity in the last 30 days.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Time</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Prompt</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">{item.product}</td>
                        <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">{item.date}</td>
                        <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">{item.time}</td>
                        <td className="px-3 sm:px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === 'Successful' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                           {item.prompt}
                           <button onClick={() => navigator.clipboard.writeText(item.fullPrompt)} className="p-1 hover:bg-gray-100 rounded" title="Copy"><Copy size={12} className="text-gray-400"/></button>
                        </td>
                        <td className="px-3 sm:px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleRegenerate(item)} className="p-1 hover:bg-gray-100 rounded" title="Regenerate"><RotateCcw size={14} className="text-gray-600" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-gray-100 rounded" title="Delete"><Trash2 size={14} className="text-gray-600" /></button>
                          </div>
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
  );
}