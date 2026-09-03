import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'GST Invoice Portal',
  description: 'View and download customer GST invoices.',
  openGraph: {
    title: 'GST Invoice Portal',
    description: 'View and download customer invoices.',
    images: [
      {
        url: 'https://raw.githubusercontent.com/parth-tfu/portal/main/site/public/og.png',
        width: 1200,
        height: 630,
        alt: 'GST Invoice Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GST Invoice Portal',
    description: 'View and download customer invoices.',
    images: ['https://raw.githubusercontent.com/parth-tfu/portal/main/site/public/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
