import Script from 'next/script';
import "./globals.css";

export const metadata = {
  title: "GAT ContentManager",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (localStorage.getItem('darkMode') === 'true') {
                    document.documentElement.classList.add('dark-mode');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (localStorage.getItem('darkMode') === 'true') {
                    document.body.classList.add('dark-mode');
                  }
                  if (sessionStorage.getItem('cud_unlocked') !== 'true') {
                    document.body.classList.add('cud-locked');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
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
