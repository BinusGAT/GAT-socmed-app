import Script from 'next/script';
import "./globals.css";

export const metadata = {
  title: "Content suite",
  description: "An independent internal content performance management tool for tracking publication metrics and team analytics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet" />
        <Script id="theme-html-initializer">
          {`
            (function () {
              try {
                const localDark = localStorage.getItem('darkMode');
                if (localDark === null || localDark === 'true') {
                  document.documentElement.classList.add('dark-mode');
                }
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <Script id="theme-body-initializer">
          {`
            (function () {
              try {
                const localDark = localStorage.getItem('darkMode');
                if (localDark === null || localDark === 'true') {
                  document.body.classList.add('dark-mode');
                }
                if (sessionStorage.getItem('cud_unlocked') !== 'true') {
                  document.body.classList.add('cud-locked');
                }
              } catch (e) {}
            })();
          `}
        </Script>
        {children}
        
        {/* Load CDN Dependencies securely using Next.js Script component */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js"
          strategy="beforeInteractive"
        />
        <Script 
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
          strategy="beforeInteractive"
        />
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
          strategy="beforeInteractive"
        />
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
