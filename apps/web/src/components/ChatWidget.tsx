'use client';

import { Maximize2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { ThemeScope } from '@/components/ui/ThemeScope';
import { ChatPanel } from '@/features/advisor/ChatPanel';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/stores/chat';

function ChatWidgetInner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const streaming = useChatStore((s) => s.status === 'streaming');
  if (pathname === '/advisor' || pathname.startsWith('/advisor/')) return null;
  const aboveSummaryBar = pathname === '/builder';

  return (
    <ThemeScope className="contents">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="workshop"
            size="lg"
            className={cn(
              'fixed end-4 z-40 h-12 rounded-full px-4 shadow-overlay sm:end-6',
              aboveSummaryBar ? 'bottom-24 lg:bottom-6' : 'bottom-4 sm:bottom-6',
            )}
            aria-label="Mở trợ lý AI tư vấn cấu hình"
          >
            {/* While an answer is still arriving the icon becomes a spinner; the label says why. */}
            {streaming ? <Spinner size="md" label={null} /> : <MessageCircle aria-hidden />}
            <span className="max-sm:sr-only">{streaming ? 'Đang trả lời…' : 'AI tư vấn'}</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent
          title="AI tư vấn cấu hình"
          description="Cấu hình chọn từ hàng có sẵn, đã kiểm tra tương thích"
          className="h-[88dvh] sm:h-full sm:w-[min(520px,100vw)]"
        >
          {open && (
            <div
              className="flex min-h-0 flex-1 flex-col"
              onClickCapture={(e) => {
                // Following a link from the chat (Customizer, product, full screen) should reveal the page.
                if ((e.target as HTMLElement).closest('a[href]')) setOpen(false);
              }}
            >
              <ChatPanel
                variant="widget"
                className="flex-1"
                actions={
                  <Button asChild size="sm" variant="ghost" className="text-muted hover:text-fg">
                    <Link href="/advisor">
                      <Maximize2 aria-hidden />
                      <span className="max-sm:sr-only">Mở toàn màn hình</span>
                    </Link>
                  </Button>
                }
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </ThemeScope>
  );
}

/** Floating advisor entry on every storefront page; the same chat store as /advisor, hidden there. */
export function ChatWidget() {
  return (
    <Suspense fallback={null}>
      <ChatWidgetInner />
    </Suspense>
  );
}
