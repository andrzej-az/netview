
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { CustomTitlebar } from '@/components/layout/custom-titlebar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NetView - Network Scanner',
  description: 'Discover active hosts on your network.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="netview-theme"
        >
          <div className="flex flex-col h-screen">
            <CustomTitlebar />
            {/* 
              This div is the main scrollable area for the application content.
              - flex-1: Takes up remaining vertical space in the flex column.
              - overflow-y-auto: Makes this div scrollable if its content exceeds its height.
              - flex flex-col: Ensures children (like Header, main, Footer from page.tsx) stack correctly.
              This setup ensures that the scrollbar for this area starts below the CustomTitlebar.
            */}
            <div className="flex flex-col flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

