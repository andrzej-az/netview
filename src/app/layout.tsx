
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
          {/* 
            This div is the main scrollable area for the application content.
            - h-screen: Sets its height to the full viewport height.
            - pt-8: Adds 2rem padding at the top to make space for the CustomTitlebar (which is h-8).
            - overflow-y-auto: Makes this div scrollable if its content exceeds its height.
            This setup ensures that `position: sticky` elements inside `children` 
            will stick relative to this div. For example, `sticky top-0` inside a child 
            will stick to the top of this div's content area, which is 2rem below the viewport top.
          */}
          <div className="flex flex-col h-screen pt-8 overflow-y-auto">
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

