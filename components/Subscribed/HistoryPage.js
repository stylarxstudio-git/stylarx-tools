'use client';
import { Home, Wrench, Clock, HelpCircle, LogOut, Search, Copy, RotateCcw, Trash2, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

export default function SubscribedHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useUser();
  const [history, setHistory] = useState([]);

  const handleDelete = async (id) => {
    const { deleteGeneration } = await import('@/lib/generations');
    if (await deleteGeneration(id)) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleRegenerate = (item) => {
    const toolSlug = item.product.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/tools/${toolSlug}?prompt=${encodeURIComponent(item.fullPrompt)}`;
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (window.Outseta) {
        try {
          const outsetaUser = await window.Outseta.getUser();
          const { getRecentActivity } = await import('@/lib/generations');
          const data = await getRecentActivity(outsetaUser.Uid, null); // Get all from 30 days
          
          setHistory(data.map(item => ({
            id: item.id,
            product: item.tool_name,
            date: new Date(item.created_at).toLocaleDateString(),
            time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: item.status || 'Successful',
            prompt: item.prompt?.length > 40 ? item.prompt.substring(0, 40) + '...' : item.prompt,
            fullPrompt: item.prompt
          })));
        } catch (err) { console.error('❌ Failed to load history:', err); }
      }
    };
    loadHistory();
  }, []);

  const filteredHistory = history.filter(item =>
    item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fullPrompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-['Poppins',sans-serif]">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`lg:hidden fixed top-1/2 -translate-y-1/2 z-50 transition-all ${sidebarOpen ? 'left-60' : 'left-0'}`}>
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
          <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Home size={16} /> Dashboard</a>
          <a href="/tools" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><Wrench size={16} /> Tools</a>
          <a href="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg font-medium"><Clock size={16} /> History</a>
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1 pb-28">
          <a href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"><HelpCircle size={16} /> Help / contact</a>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-left"><LogOut size={16} /> Log Out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 lg:ml-60 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-3 sm:px-4 py-3 sm:py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600" />
          </div>
        </div>

        <main className="p-3 sm:p-4 lg:p-6 pb-32">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[400px] flex flex-col">
            {filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="bg-gray-50 p-4 rounded-full mb-4"><Clock size={32} className="text-gray-300" /></div>
                <h3 className="text-gray-900 font-semibold text-lg">No generations in the last 30 days</h3>
                <a href="/tools" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">Start Generating</a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Time</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Prompt</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-4 py-4 text-xs sm:text-sm font-medium text-gray-900">{item.product}</td>
                        <td className="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-600">{item.date}</td>
                        <td className="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-600">{item.time}</td>
                        <td className="px-3 sm:px-4 py-4">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${item.status === 'Successful' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{item.status}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-600 max-w-[200px] truncate">{item.prompt}</td>
                        <td className="px-3 sm:px-4 py-4 flex items-center gap-2">
                            <button onClick={() => navigator.clipboard.writeText(item.fullPrompt)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Copy"><Copy size={14} className="text-gray-500" /></button>
                            <button onClick={() => handleRegenerate(item)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Regenerate"><RotateCcw size={14} className="text-gray-500" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded-md transition-colors group" title="Delete"><Trash2 size={14} className="text-gray-500 group-hover:text-red-500" /></button>
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