'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, LogIn, Search, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="flex min-h-screen bg-[#F8F9FB] font-['Poppins',sans-serif]">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`lg:hidden fixed top-1/2 -translate-y-1/2 z-50 transition-all ${
          sidebarOpen ? 'left-60' : 'left-0'
        }`}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-r-xl shadow-lg">
          <ChevronLeft 
            size={24} 
            className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
          />
        </div>
      </button>

      <aside className={`
        w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen z-40
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
          </h1>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
            <Home size={16} />
            Dashboard
          </a>
          <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
            <Wrench size={16} />
            Tools
          </a>
          <a href="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium">
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

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-60 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-3 sm:px-4 py-3 sm:py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
            />
          </div>
        </div>

        <main className="p-3 sm:p-4 lg:p-6 pb-32">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[200px]">
            <div className="flex items-center justify-center py-12 sm:py-16 px-4">
              <p className="text-sm sm:text-base text-gray-400 font-medium text-center">
                Subscribe to Pro or Founder to see your past generation
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}