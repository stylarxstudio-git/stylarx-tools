'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, LogIn, Lock, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

export default function GatedPage() {
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
    <div className="flex min-h-screen bg-white font-['Poppins',sans-serif]">
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

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-60 bg-white min-h-screen flex items-center justify-center p-4 pb-32">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Lock size={32} className="text-white sm:w-10 sm:h-10" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Upgrade to Access This Tool
          </h1>
          
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            This AI tool is available for Pro and Founder plan members. 
            Upgrade now to unlock all premium features and tools.
          </p>

          <a 
            href="https://stylarx.com/pricing" 
            className="inline-block px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-xl transition-all text-sm sm:text-base"
          >
            View Plans
          </a>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              Pro & Founder members get access to:
            </p>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-2 text-left max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>All AI generation tools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>100 credits per month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Generation history tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}