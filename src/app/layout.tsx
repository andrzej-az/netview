
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
          <CustomTitlebar />
          <div className="flex flex-col min-h-screen pt-8"> {/* Added pt-8 for CustomTitlebar height */}
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

