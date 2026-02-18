'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, LogIn, Search, Lightbulb, Lock, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useUser();
  const router = useRouter();

  const PRO_PLAN_UID = 'y9qbyNWA';
  const FOUNDER_PLAN_UID = '7ma2MXQE';

  // --- COLOR CONTROL CENTER ---
  const tools = [
    { 
      id: 'gobo', 
      name: 'Gobo Generator', 
      description: 'Studio-quality lighting stencils.', 
      credits: 1, 
      thumbnail: '/Gobo-Generator-Thumbnail1.jpg',
      path: '/gobo-generator',
      themeColor: '#ff0000' 
    },
    { 
      id: 'scene-stager', 
      name: 'AI Scene Stager', 
      description: 'Stage 3D models in photorealistic scenes.', 
      credits: 1, 
      thumbnail: '/Scene-Gen-Thumbnail.jpg',
      path: '/scene-stager',
      themeColor: '#7000FF' 
    },
    { 
      id: 'hdri-gen', 
      name: 'AI HDRI Generator', 
      description: 'Create immersive 360° lighting environments.', 
      credits: 1, 
      thumbnail: '/hdri-generator-thumbnail.jpg',
      path: '/hdri-generator',
      themeColor: '#00D1FF'
    },
    { 
      id: 'image-to-hdri', 
      name: 'Image to HDRI', 
      description: 'Convert any image into a 360° HDRI environment.', 
      credits: 1, 
      thumbnail: '/Image-to-HDRI-Thumbnail.jpg',
      path: '/image-to-hdri',
      themeColor: '#10B981' // Green
    }
  ];

  const handleGetStarted = () => {
    if (window.Outseta) {
      window.Outseta.auth.open({
        authenticationMode: 'register',
        authenticationCallbackUrl: window.location.origin
      });
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-['Poppins',sans-serif]">
      
      {/* MOBILE SIDEBAR TOGGLE */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`lg:hidden fixed top-1/2 -translate-y-1/2 z-50 transition-all ${sidebarOpen ? 'left-60' : 'left-0'}`}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-r-xl shadow-lg">
          <ChevronLeft size={24} className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {/* SIDEBAR */}
      <aside className={`w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 border-b border-gray-100">
           <Image src="/logo.png" alt="STYLARX Logo" width={160} height={160} className="rounded" priority />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Home size={16} /> Dashboard</a>
          <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-semibold"><Wrench size={16} /> Tools</a>
          <a href="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Clock size={16} /> History</a>
        </nav>
        
        <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
          <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
            <HelpCircle size={16} /> Help / contact
          </a>
          
          {loading ? (
            <div className="px-3 py-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div></div>
          ) : user ? (
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left">
              <LogOut size={16} /> Log Out
            </button>
          ) : (
            <button onClick={handleGetStarted} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left">
              <LogIn size={16} /> Get Started
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}
      
      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ml-60 overflow-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 sticky top-0 z-30">
          <div className="relative w-full max-w-sm text-black">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search engines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
            />
          </div>
        </header>

        <main className="p-6 lg:p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTools.map((tool) => {
              const hasAccess = user && (user.planUid === PRO_PLAN_UID || user.planUid === FOUNDER_PLAN_UID);

              return (
                <div 
                  key={tool.id}
                  onClick={() => hasAccess ? router.push(tool.path) : router.push('/gated')}
                  className="group relative aspect-square rounded-[1rem] overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer bg-[#121212]"
                >
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <img 
                      src={tool.thumbnail} 
                      alt={tool.name} 
                      className="w-full h-full object-cover opacity-100 group-hover:opacity-30 transition-opacity" 
                    />
                  </div>

                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                    {!hasAccess && (
                      <div className="bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-xl">
                        <Lock size={16} className="text-white" />
                      </div>
                    )}
                    <span className="ml-auto px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-black rounded-full border border-white/10 uppercase tracking-widest shadow-xl">
                      {tool.credits} Credit
                    </span>
                  </div>

                  <div 
                    className="absolute inset-x-0 bottom-0 p-6 pt-32 flex flex-col justify-end z-10"
                    style={{
                      background: `linear-gradient(to top, ${tool.themeColor} 0%, ${tool.themeColor}33 60%, transparent 100%)`
                    }}
                  >
                    <h3 className="font-bold text-white text-base sm:text-lg transition-transform duration-300 transform translate-y-12 group-hover:translate-y-0">
                      {tool.name}
                    </h3>
                    
                    <p className="text-white/80 text-[10px] sm:text-xs mt-1 line-clamp-1 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75 transform translate-y-4 group-hover:translate-y-0">
                      {tool.description}
                    </p>

                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100 transform translate-y-4 group-hover:translate-y-0">
                      <button className="w-full py-2.5 bg-white text-black text-[10px] sm:text-xs font-black rounded-xl uppercase tracking-tighter shadow-xl hover:bg-gray-200 transition-all">
                        {hasAccess ? 'Generate' : 'Unlock Access'}
                      </button>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 group-hover:opacity-0 transition-opacity duration-300 z-0">
                     <h3 className="font-bold text-white/90 text-base sm:text-lg tracking-tight uppercase italic opacity-60">
                      {tool.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}