'use client';
import { Twitter, Linkedin, Instagram, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    /* We use pl-64 (or pl-60) to push the CONTENT out from under the sidebar 
       while keeping the white background spanning the whole width */
    <footer className="w-full bg-white border-t border-gray-100 py-16 pr-8 lg:pl-64 font-['Poppins',sans-serif]">
      <div className="max-w-full mx-auto">
        
        {/* justify-between forces the sections to fill the available space evenly */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-20">
          
          {/* Section 1: Brand - Now starts exactly at the edge of the sidebar */}
          <div className="flex flex-col w-full lg:w-auto lg:max-w-[260px]">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-black mb-4">
               <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
               </div>
               STYLARX
            </div>
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

          {/* Section 2: AI Tools */}
          <div className="w-full lg:w-auto">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-6">
              AI Utilities
            </h3>
            <ul className="space-y-4 text-sm text-gray-500 font-normal">
              <li><Link href="/scene-stager" className="hover:text-black transition-colors">AI Scene Stager</Link></li>
              <li><Link href="/image-to-hdri" className="hover:text-black transition-colors">Image to HDRI</Link></li>
              <li><Link href="/pbr-generator" className="hover:text-black transition-colors">PBR Generator</Link></li>
              <li><Link href="/sfx-generator" className="hover:text-black transition-colors">SFX Generator</Link></li>
            </ul>
          </div>

          {/* Section 3: Quick Links */}
          <div className="w-full lg:w-auto">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-6">
              Platform
            </h3>
            <ul className="space-y-4 text-sm text-gray-500 font-normal">
              <li><Link href="/" className="hover:text-black transition-colors">Dashboard</Link></li>
              <li><Link href="/tools" className="hover:text-black transition-colors">All Tools</Link></li>
              <li><Link href="/history" className="hover:text-black transition-colors">History</Link></li>
              <li>
                <a href="https://stylarx.com/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                  Pricing <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Section 4: Newsletter - Anchored to the far right screen edge */}
          <div className="flex flex-col w-full lg:w-auto lg:min-w-[280px]">
            <h3 className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-6">
              Stay Updated
            </h3>
            <p className="text-sm text-gray-500 mb-4 font-normal">Get the latest on new AI features.</p>
            <div className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-black font-normal"
              />
              <button className="w-full py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all">
                Subscribe
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar - Also respects the sidebar padding */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            © {currentYear} STYLARX. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}