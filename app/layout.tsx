import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Agency Command Center',
  description:
    'Production CRM and operations platform for web development agencies managing geographical lead targeting, outreachers, developers, website projects, and financial profitability.',
  openGraph: {
    title: 'Agency Command Center',
    description:
      'Production CRM and operations platform for web development agencies managing geographical lead targeting, outreachers, developers, website projects, and financial profitability.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agency Command Center',
    description:
      'Production CRM and operations platform for web development agencies managing geographical lead targeting, outreachers, developers, website projects, and financial profitability.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
