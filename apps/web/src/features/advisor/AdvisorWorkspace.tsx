'use client';

import { MessagesSquare, PanelsTopLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { latestBuilds, useChatStore } from '@/stores/chat';
import { BuildCompare } from './BuildCompare';
import { ChatPanel } from './ChatPanel';
import { useHeaderOffset } from './useHeaderOffset';

const RECOMMEND_TOOLS = new Set(['recommend_builds', 'modify_build']);

function useCompareState() {
  const messages = useChatStore((s) => s.messages);
  const selectedBuildId = useChatStore((s) => s.selectedBuildId);
  const last = messages.at(-1);
  const pending =
    last?.role === 'assistant' &&
    last.streaming &&
    last.builds.length === 0 &&
    last.tools.some((t) => RECOMMEND_TOOLS.has(t.name) && t.status === 'running');
  return { builds: latestBuilds(messages), selectedBuildId, pending: Boolean(pending) };
}

/** Sends `?q=` once after history has loaded, then drops it from the URL so a reload does not resend. */
function useAutoSendQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sent = useRef(false);
  const q = params.get('q')?.trim();
  useEffect(() => {
    if (!q || sent.current) return;
    sent.current = true;
    const { init, send } = useChatStore.getState();
    void init().then(() => send(q));
    router.replace(pathname, { scroll: false });
  }, [q, router, pathname]);
}

export function AdvisorWorkspace() {
  useAutoSendQuery();
  const offset = useHeaderOffset();
  const [tab, setTab] = useState<'chat' | 'builds'>('chat');
  const { builds, selectedBuildId, pending } = useCompareState();
  const selectBuild = useChatStore((s) => s.selectBuild);

  return (
    <WorkshopSurface
      data-workshop-shell
      className="flex shrink-0 flex-col"
      style={{ height: `calc(100dvh - ${offset}px)`, minHeight: 520 }}
    >
      <h1 className="sr-only">AI tư vấn cấu hình PC</h1>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'chat' | 'builds')}
        className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:p-6"
      >
        <TabsList className="mx-4 mt-3 mb-3 grid w-auto shrink-0 grid-cols-2 lg:hidden">
          <TabsTrigger value="chat" className="justify-center">
            <MessagesSquare aria-hidden />
            Trò chuyện
          </TabsTrigger>
          <TabsTrigger value="builds" className="justify-center">
            <PanelsTopLeft aria-hidden />
            Cấu hình
            {builds.length > 0 && (
              <span className="rounded-full bg-accent px-1.5 font-mono text-xs text-accent-fg tabular-nums">
                {builds.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="chat"
          forceMount
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:max-lg:hidden lg:rounded-lg lg:border lg:border-border lg:bg-bg/85 lg:shadow-raised lg:backdrop-blur-sm"
        >
          <ChatPanel variant="page" onShowBuilds={() => setTab('builds')} className="flex-1" />
        </TabsContent>

        <TabsContent
          value="builds"
          forceMount
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:max-lg:hidden lg:px-1 lg:pb-2"
        >
          <BuildCompare
            builds={builds}
            selectedId={selectedBuildId}
            onSelect={selectBuild}
            pending={pending}
            className="lg:pt-1"
          />
        </TabsContent>
      </Tabs>
    </WorkshopSurface>
  );
}
