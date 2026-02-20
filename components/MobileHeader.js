'use client';
import { useState } from 'react';
import { Menu, X, Home, Wrench, Clock, HelpCircle, LogOut, LogIn } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useUser();
  const router = useRouter();

  const handleGetStarted = () => {
    if (window.Outseta) {
      window.Outseta.auth.open({
        authenticationMode: 'register',
        authenticationCallbackUrl: window.location.origin
      });
    }
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header - Only visible on mobile/tablet */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 font-['Poppins',sans-serif]">
        <div className="flex items-center justify-between px-6 py-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="STYLARX Logo" 
              width={120} 
              height={120} 
              className="rounded"
            />
          </Link>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-900" />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Slide-in Menu */}
      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } font-['Poppins',sans-serif]`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <Image 
            src="/logo.png" 
            alt="STYLARX Logo" 
            width={120} 
            height={120} 
            className="rounded"
          />
          <button
            onClick={closeMenu}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Close menu"
          >
            <X size={24} className="text-gray-900" />
          </button>
        </div>

        {/* Menu Content */}
        <nav className="flex flex-col h-[calc(100%-80px)] justify-between">
          
          {/* Main Navigation */}
          <div className="p-4 space-y-1">
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all"
            >
              <Home size={20} />
              Dashboard
            </Link>
            <Link
              href="/tools"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all"
            >
              <Wrench size={20} />
              Tools
            </Link>
            <Link
              href="/history"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all"
            >
              <Clock size={20} />
              History
            </Link>
            <Link
              href="/contact"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all"
            >
              <HelpCircle size={20} />
              Help / Contact
            </Link>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : user ? (
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                <LogOut size={20} />
                Log Out
              </button>
            ) : (
              <button
                onClick={() => {
                  handleGetStarted();
                  closeMenu();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all"
              >
                <LogIn size={20} />
                Get Started
              </button>
            )}
          </div>

        </nav>
      </div>

      {/* Spacer - Prevents content from going under fixed header */}
      <div className="lg:hidden h-14" />
    </>
  );
}