import type { Metadata } from 'next';
import { Instrument_Sans, DM_Mono } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TrackZone — All your audio. Finally yours.',
    template: '%s · TrackZone',
  },
  description:
    'TrackZone brings every track, sample and idea from every platform into one place. Organize. Listen. Move. Backup. Yours.',
  icons: {
    icon: '/brand/favicon.png',
    apple: '/brand/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${dmMono.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
