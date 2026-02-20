import './globals.css';
import Script from 'next/script';
import { UserProvider } from '@/hooks/useUser';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'STYLARX - AI Tools',
  description: 'Professional AI generation tools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
        <Script id="outseta-options" strategy="afterInteractive">
          {`
            var o_options = {
              domain: "stylarx.outseta.com",
              tokenStorage: "cookie",
              monitorDom: false
            };
          `}
        </Script>
        <Script 
          src="https://cdn.outseta.com/outseta.min.js" 
          data-options="o_options"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased font-['Poppins',sans-serif]">
        <UserProvider>
          {children}
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}