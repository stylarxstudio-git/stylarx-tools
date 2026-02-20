'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, LogIn } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import MobileHeader from '@/components/MobileHeader';

export default function HomePage() {
  const [suggestion, setSuggestion] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const { user, loading, logout } = useUser();

  const handleGetStarted = () => {
    if (window.Outseta) {
      window.Outseta.auth.open({
        authenticationMode: 'register',
        authenticationCallbackUrl: window.location.origin
      });
    }
  };

  return (
    <>
      <MobileHeader />
      <div className="flex min-h-screen bg-white font-['Poppins',sans-serif] overflow-x-hidden">
        <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col fixed h-screen z-40">
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
            </h1>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium">
              <Home size={16} />
              Dashboard
            </a>
            <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
              <Wrench size={16} />
              Tools
            </a>
            <a href="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
              <Clock size={16} />
              History
            </a>
          </nav>

          <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
            <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
              <HelpCircle size={16} />
              Help / contact
            </a>
            
            {loading ? (
              <div className="flex items-center justify-center px-3 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              </div>
            ) : user ? (
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"
              >
                <LogOut size={16} />
                Log Out
              </button>
            ) : (
              <button
                onClick={handleGetStarted}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"
              >
                <LogIn size={16} />
                Get Started
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 lg:ml-60 bg-white min-h-screen overflow-x-hidden pt-16 lg:pt-0">
          <main className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-full">
            
            {/* Upgrade Banner - BLACK BOX */}
            <div className="relative bg-[#161618] rounded-2xl overflow-hidden p-6 sm:p-8 min-h-[140px] flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-base sm:text-xl font-bold mb-2">Unlock the Professional Suite</h3>
                <p className="text-sm mb-4 opacity-90">
                  Upgrade to access all AI tools
                </p>
                <a 
                  href="https://stylarx.com/pricing" 
                  className="inline-block px-6 py-2.5 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all text-sm shadow-lg"
                >
                  Subscribe Now
                </a>
              </div>
            </div>

            {/* Stats Grid - Squares on mobile, rectangles on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto">
                <p className="text-xs text-gray-600 mb-1">Credits Used</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">0</h3>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto">
                <p className="text-xs text-gray-600 mb-1">Credits Left</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">0</h3>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto">
                <p className="text-xs text-gray-600 mb-1">Renewal</p>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900">--/--/----</h3>
                <p className="text-xs text-gray-500">&nbsp;</p>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 aspect-square sm:aspect-auto">
                <p className="text-xs text-gray-600 mb-1">Generations</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">0</h3>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
            </div>

            {/* Top AI Used + Tool Suggestion */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 border border-gray-200 flex items-center justify-center min-h-[150px]">
                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Top AI Used</h3>
                  <p className="text-sm sm:text-base text-gray-400 font-medium">
                    Subscribe to see your top used AI
                  </p>
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
                        suggestion: suggestion,
                        userEmail: user?.email || 'Not logged in',
                        userName: user?.name || 'Anonymous',
                        _subject: 'New AI Tool Suggestion - STYLARX',
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
                  <button type="submit" disabled={isSubmittingSuggestion} className="mt-2 w-full py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 text-xs sm:text-sm">
                    {isSubmittingSuggestion ? 'Sending...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto w-full">
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
                  <tbody>
                     <tr><td colSpan="6" className="py-8 text-center text-gray-400 text-xs italic">Your activity will show here</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}