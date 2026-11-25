import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { themeInitScript } from '@/components/layout/theme-script';
import { Toaster } from '@/components/ui/Toast';
import { Providers } from './providers';
import './globals.css';

/** Variable Archivo: the width axis gives the expanded display cut used for page titles. */
const archivo = Archivo({
  subsets: ['latin', 'vietnamese'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'PC Builder: linh kiện máy tính và AI tư vấn cấu hình', template: '%s | PC Builder' },
  description:
    'Mua linh kiện máy tính và để trợ lý AI chọn giúp cấu hình tương thích, đúng ngân sách, từ hàng có sẵn trong kho.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      data-theme="light"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, contains no user input
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
