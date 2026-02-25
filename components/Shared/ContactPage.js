'use client';
import { Home, Wrench, HelpCircle, LogOut, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import MobileHeader from '@/components/MobileHeader';

export default function ContactPage() {
  const { user, loading, logout } = useUser();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGetStarted = () => {
    if (window.Outseta) {
      window.Outseta.auth.open({ authenticationMode: 'register', authenticationCallbackUrl: window.location.origin });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('https://formspree.io/f/xqedqkzv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${formData.firstName} ${formData.lastName}`, email: formData.email, phone: formData.phone || 'Not provided', message: formData.message, _subject: 'New Contact Form Submission - STYLARX' }),
      });
      if (response.ok) { alert('Thank you for contacting us! We will get back to you soon.'); setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' }); }
      else { alert('Something went wrong. Please try again.'); }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <>
      <MobileHeader />
      <div className="flex min-h-screen bg-[#F8F9FB] font-['Poppins',sans-serif]">
        <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col fixed h-screen z-40">
          <div className="p-4 border-b border-gray-100">
            <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Home size={16} /> Dashboard</a>
            <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Wrench size={16} /> Tools</a>
          </nav>
          <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
            <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium transition-all"><HelpCircle size={16} /> Help / contact</a>
            {loading ? (
              <div className="flex items-center justify-center px-3 py-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div></div>
            ) : user ? (
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"><LogOut size={16} /> Log Out</button>
            ) : (
              <button onClick={handleGetStarted} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"><LogIn size={16} /> Get Started</button>
            )}
          </div>
        </aside>

        <div className="flex-1 lg:ml-60 overflow-auto bg-white pt-16 lg:pt-0">
          <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 pb-32">
            <div className="w-full max-w-lg">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                  <Mail size={24} className="text-white" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">Get in touch</h2>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Name</label>
                    <input id="firstName" type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Your name" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" required disabled={isSubmitting} />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Last Name</label>
                    <input id="lastName" type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Last name" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" required disabled={isSubmitting} />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Email</label>
                  <input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your.email@example.com" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" required disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Phone <span className="text-gray-400 text-xs">(Optional)</span></label>
                  <input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Message</label>
                  <textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Tell us about your issue..." rows={4} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all resize-none" required disabled={isSubmitting} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-2.5 sm:py-3 bg-white text-gray-900 font-bold rounded-lg border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}