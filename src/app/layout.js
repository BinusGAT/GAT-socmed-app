import Script from 'next/script';
import "./globals.css";

export const metadata = {
  title: "GAT Content Suite - Media & Social Dashboard",
  description: "An independent internal content performance management tool for tracking publication metrics and team analytics.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        <Script id="theme-html-initializer">
          {`
            (function () {
              try {
                const localDark = localStorage.getItem('darkMode');
                if (localDark === null || localDark === 'true') {
                  document.documentElement.classList.add('dark-mode', 'dark');
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
                  document.body.classList.add('dark-mode', 'dark');
                }
                if (sessionStorage.getItem('cud_unlocked') !== 'true') {
                  document.body.classList.add('cud-locked');
                }
              } catch (e) {}
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
