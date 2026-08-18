import Script from 'next/script';
import { headers } from 'next/headers';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken',
});

export const metadata = {
  title: "GAT App - Media & Social Dashboard",
  description: "An independent internal content performance management tool for tracking publication metrics and team analytics.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="en" className={`${inter.variable} ${hankenGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        <Script id="theme-html-initializer" nonce={nonce}>
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
        <Script id="theme-body-initializer" nonce={nonce}>
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
