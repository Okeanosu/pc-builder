import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import { themeInitScript } from '@/components/layout/theme-script';
import { Toaster } from '@/components/ui/Toast';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
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
    { media: '(prefers-color-scheme: light)', color: '#edf0f2' },
    { media: '(prefers-color-scheme: dark)', color: '#12161b' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      data-theme="light"
      suppressHydrationWarning
      className={`${beVietnam.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, contains no user input
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
