'use client';

import { ListChecks, MessagesSquare, PanelsTopLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { attachChatView, latestBuilds, useChatStore } from '@/stores/chat';
import { BuildCompare } from './BuildCompare';
import { ChatPanel } from './ChatPanel';
import { CacheChip, QuickRecommendForm, useQuickRecommend } from './QuickRecommendForm';
import { QUICK_FORM_DEFAULTS, type QuickFormValues } from './quick-form';
import { useHeaderOffset } from './useHeaderOffset';

type AdviceMode = 'chat' | 'form';

const FORM_EMPTY = {
  title: 'Cấu hình sẽ hiện ở đây',
  description:
    'Chọn ngân sách và mục đích ở biểu mẫu bên cạnh rồi bấm “Gợi ý cấu hình”. Ba phương án tương thích từ hàng trong kho sẽ xếp cạnh nhau.',
};

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

/** The `?q=` being handled; module-level so a remount before the URL update lands cannot send it twice. */
let handledQuery: string | null = null;

/** Drops `?q=` from the URL first, then sends it once history has loaded, so neither a reload nor a remount resends. */
function useAutoSendQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get('q')?.trim();
  useEffect(() => {
    if (!q) {
      handledQuery = null;
      return;
    }
    if (handledQuery === q) return;
    handledQuery = q;
    router.replace(pathname, { scroll: false });
    const { init, send } = useChatStore.getState();
    void init().then(() => send(q));
  }, [q, router, pathname]);
}

export function AdvisorWorkspace() {
  useAutoSendQuery();
  // Leaving the page stops a running answer; arriving from the widget keeps it (see attachChatView).
  useEffect(() => attachChatView(), []);
  const offset = useHeaderOffset();
  const params = useSearchParams();
  const [tab, setTab] = useState<'chat' | 'builds'>('chat');
  const [mode, setMode] = useState<AdviceMode>(() =>
    params.get('mode') === 'form' && !params.get('q') ? 'form' : 'chat',
  );
  const [formValues, setFormValues] = useState<QuickFormValues>(QUICK_FORM_DEFAULTS);
  const chat = useCompareState();
  const selectChatBuild = useChatStore((s) => s.selectBuild);
  const quick = useQuickRecommend(({ result }) => {
    if (result.builds.length > 0) setTab('builds');
  });

  const compare =
    mode === 'chat'
      ? {
          builds: chat.builds,
          selectedId: chat.selectedBuildId,
          onSelect: selectChatBuild,
          pending: chat.pending,
        }
      : {
          builds: quick.outcome?.result.builds ?? [],
          selectedId: quick.selectedId,
          onSelect: quick.select,
          pending: quick.pending,
        };
  const builds = compare.builds;

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
            {mode === 'chat' ? <MessagesSquare aria-hidden /> : <ListChecks aria-hidden />}
            Tư vấn
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
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as AdviceMode)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="flex shrink-0 items-center border-b border-border px-4 py-2">
              <TabsList aria-label="Cách nhận gợi ý cấu hình">
                <TabsTrigger value="chat">
                  <MessagesSquare aria-hidden />
                  Trò chuyện
                </TabsTrigger>
                <TabsTrigger value="form">
                  <ListChecks aria-hidden />
                  Biểu mẫu
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="chat"
              forceMount
              className="flex min-h-0 flex-1 flex-col rounded-none data-[state=inactive]:hidden"
            >
              <ChatPanel variant="page" onShowBuilds={() => setTab('builds')} className="flex-1" />
            </TabsContent>
            <TabsContent
              value="form"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-none"
            >
              <QuickRecommendForm quick={quick} values={formValues} onChange={setFormValues} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent
          value="builds"
          forceMount
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:max-lg:hidden lg:px-1 lg:pb-2"
        >
          <BuildCompare
            builds={compare.builds}
            selectedId={compare.selectedId}
            onSelect={compare.onSelect}
            pending={compare.pending}
            badge={
              mode === 'form' && quick.outcome?.cacheHit && builds.length > 0 ? <CacheChip /> : undefined
            }
            empty={mode === 'form' ? FORM_EMPTY : undefined}
            className="lg:pt-1"
          />
        </TabsContent>
      </Tabs>
    </WorkshopSurface>
  );
}
