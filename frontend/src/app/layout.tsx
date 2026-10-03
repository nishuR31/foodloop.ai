import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { ReduxProvider } from '@/components/ReduxProvider';
import { SocketProvider } from '@/components/SocketProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FoodLoop AI - Smart Food Waste Management',
  description: 'AI-powered platform to predict food demand, manage inventory, and redistribute surplus food.',
};

import { QueryProvider } from '@/components/QueryProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ReduxProvider>
          <QueryProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
            <Toaster position="bottom-right" richColors closeButton />
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
