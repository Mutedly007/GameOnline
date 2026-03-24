import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SettingsProvider } from '@/lib/SettingsContext';
import SettingsModal from '@/components/SettingsModal';

export const metadata: Metadata = {
  title: 'Bent Welad | بنت ولاد',
  description: 'Real-time multiplayer Tunisian category and letter game. Challenge your friends!',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <SettingsModal />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
