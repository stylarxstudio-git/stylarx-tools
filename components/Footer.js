'use client';
import { Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-100 py-8 px-6 lg:px-8 lg:pl-64 font-['Poppins',sans-serif]">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-10 lg:gap-8 mb-12 lg:mb-20">

          <div className="flex flex-col w-full lg:w-auto lg:max-w-[260px]">
            <Link href="/" className="inline-block mb-4">
              <Image src="/logo.png" alt="STYLARX Logo" width={140} height={140} className="rounded" />
            </Link>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed font-normal">
              Professional AI-powered tools for 3D artists, game developers, and content creators.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-50 hover:bg-black text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-all">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-4 lg:mb-6">AI Utilities</h3>
            <ul className="space-y-3 lg:space-y-4 text-sm text-gray-500 font-normal">
              <li><Link href="/scene-stager" className="hover:text-black transition-colors">AI Scene Stager</Link></li>
              <li><Link href="/image-to-hdri" className="hover:text-black transition-colors">Image to HDRI</Link></li>
              <li><Link href="/pbr-generator" className="hover:text-black transition-colors">PBR Generator</Link></li>
              <li><Link href="/sfx-generator" className="hover:text-black transition-colors">SFX Generator</Link></li>
            </ul>
          </div>

          <div className="w-full lg:w-auto">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-4 lg:mb-6">Platform</h3>
            <ul className="space-y-3 lg:space-y-4 text-sm text-gray-500 font-normal">
              <li><Link href="/" className="hover:text-black transition-colors">Dashboard</Link></li>
              <li><Link href="/tools" className="hover:text-black transition-colors">All Tools</Link></li>
              <li>
                <a href="https://stylarx.com/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                  Pricing <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col w-full lg:w-auto lg:min-w-[280px]">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-4 lg:mb-6">Stay Updated</h3>
            <p className="text-sm text-gray-500 mb-4 font-normal">Get the latest on new AI features.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const email = e.target.email.value;
              try {
                const response = await fetch('https://formspree.io/f/xqedqkzv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, _subject: 'New Newsletter Subscription - STYLARX' }) });
                if (response.ok) { alert('Subscribed! Thanks!'); e.target.reset(); }
              } catch { alert('Failed to subscribe.'); }
            }}>
              <div className="flex flex-col gap-2">
                <input type="email" name="email" placeholder="email@example.com" required className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-black font-normal text-gray-900" />
                <button type="submit" className="w-full py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all">Subscribe</button>
              </div>
            </form>
          </div>

        </div>

        <div className="pt-6 lg:pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-semibold text-gray-900 uppercase tracking-widest text-center md:text-left">© {currentYear} STYLARX. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6 lg:gap-8 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}