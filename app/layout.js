import localFont from 'next/font/local';
import './globals.css';
import Script from 'next/script';
import { UserProvider } from '@/hooks/useUser';

// Define Helvetica Now with your exact .ttf filenames
const helveticaNow = localFont({
  src: [
    {
      path: '../public/fonts/Helvetica Now Font Family/helveticanowtext-bold-demo.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Helvetica Now Font Family/helveticanowtext-bolditalic-demo.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../public/fonts/Helvetica Now Font Family/helveticanowtext-black-demo.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../public/fonts/Helvetica Now Font Family/helveticanowtext-blackitalic-demo.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-helvetica', // This links to your CSS
});

export const metadata = {
  title: 'STYLARX - AI Tools',
  description: 'Professional AI generation tools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={helveticaNow.variable}>
      <head>
        <Script id="outseta-options" strategy="beforeInteractive">
          {`
            var o_options = {
              domain: "stylarx.outseta.com",
              tokenStorage: "cookie",
              monitorDom: true,
              auth: {
                authenticationCallbackUrl: window.location.origin
              }
            };
          `}
        </Script>
        <Script 
          src="https://cdn.outseta.com/outseta.min.js" 
          data-options="o_options"
          strategy="beforeInteractive"
        />
      </head>
      {/* className={helveticaNow.className} makes it the default font for the whole app */}
      <body className={`${helveticaNow.className} antialiased`}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}