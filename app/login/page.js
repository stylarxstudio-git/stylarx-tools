'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Open Outseta login with dynamic return URL
    const openLogin = () => {
      if (window.Outseta) {
        window.Outseta.auth.open({
          authenticationMode: 'login',
          authenticationCallbackUrl: window.location.origin
        });
      } else {
        // Retry after a short delay if Outseta not loaded yet
        setTimeout(openLogin, 500);
      }
    };

    openLogin();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-['Poppins',sans-serif] p-4">
      <div className="w-full max-w-md text-center">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-all mx-auto">
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="STYLARX" width={40} height={40} className="mb-2" />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Log in</h1>
        
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Opening login...</p>
      </div>
    </div>
  );
}