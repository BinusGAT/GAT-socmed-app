import Script from 'next/script';
import { headers } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <Script id="theme-html-initializer" nonce={nonce}>
          {`
            (function () {
              try {
                const localDark = localStorage.getItem('darkMode');
                let isDark = false;
                if (localDark === null) {
                  isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                } else {
                  isDark = localDark === 'true';
                }
                if (isDark) {
                  document.documentElement.classList.add('dark-mode', 'dark');
                } else {
                  document.documentElement.classList.remove('dark-mode', 'dark');
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
                let isDark = false;
                if (localDark === null) {
                  isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                } else {
                  isDark = localDark === 'true';
                }
                if (isDark) {
                  document.body.classList.add('dark-mode', 'dark');
                } else {
                  document.body.classList.remove('dark-mode', 'dark');
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
