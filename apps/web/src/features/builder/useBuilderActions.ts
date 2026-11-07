'use client';

import type { CompatibilityIssue } from '@pc/engine';
import { type BuildDTO, CATEGORY_KEYS } from '@pc/shared';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { quotePdfUrl, shareUrl, useAddBuildToCart } from '@/features/advisor/useBuildActions';
import { ApiError, api } from '@/lib/api';
import { buildSignature, describeBuildForAdvisor, useBuilderStore } from '@/stores/builder';

/** Saves the current slots once; later calls reuse the id while nothing has changed. */
async function ensureSaved(): Promise<string> {
  const s = useBuilderStore.getState();
  if (s.saved && s.saved.signature === buildSignature(s)) return s.saved.id;
  const productIds = CATEGORY_KEYS.flatMap((k) => (s.parts[k] ? [s.parts[k].id] : []));
  const build = await api<BuildDTO>('/builds', {
    method: 'POST',
    json: { purpose: s.purpose, budget: s.budget ?? undefined, productIds },
  });
  useBuilderStore.getState().markSaved(build.id);
  return build.id;
}

function reportSaveError(err: unknown) {
  if (err instanceof ApiError && err.code === 'INCOMPATIBLE' && Array.isArray(err.details)) {
    const issues = (err.details as CompatibilityIssue[]).filter((i) => i.severity === 'error');
    toast({
      tone: 'error',
      title: 'Cấu hình còn xung đột, chưa lưu được',
      description: issues
        .slice(0, 3)
        .map((i) => `${i.code}: ${i.message}`)
        .join(' · '),
    });
    return;
  }
  toast({
    tone: 'error',
    title: 'Chưa lưu được cấu hình',
    description:
      err instanceof ApiError && err.status < 500
        ? err.message
        : 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  });
}

export function useBuilderActions() {
  const router = useRouter();
  const addToCart = useAddBuildToCart();

  const save = useMutation({
    mutationFn: ensureSaved,
    onSuccess: async (id) => {
      const url = shareUrl(id);
      try {
        await navigator.clipboard.writeText(url);
        toast({
          tone: 'success',
          title: 'Đã lưu cấu hình',
          description: 'Liên kết chia sẻ đã được sao chép.',
        });
      } catch {
        toast({ tone: 'success', title: 'Đã lưu cấu hình', description: url });
      }
      router.push(`/builds/${encodeURIComponent(id)}`);
    },
    onError: reportSaveError,
  });

  const saveForCart = useMutation({
    mutationFn: ensureSaved,
    onSuccess: (id) => addToCart.mutate({ id }),
    onError: reportSaveError,
  });

  const quote = async () => {
    const s = useBuilderStore.getState();
    if (s.saved && s.saved.signature === buildSignature(s)) {
      window.open(quotePdfUrl(s.saved.id), '_blank', 'noopener');
      return;
    }
    // Open the tab inside the click so pop-up blockers allow it, then point it at the PDF once saved.
    const tab = window.open('about:blank', '_blank');
    try {
      const id = await ensureSaved();
      if (tab) {
        tab.opener = null;
        tab.location.href = quotePdfUrl(id);
      } else {
        window.location.href = quotePdfUrl(id);
      }
    } catch (err) {
      tab?.close();
      reportSaveError(err);
    }
  };

  const askAi = () => {
    const text = describeBuildForAdvisor(useBuilderStore.getState());
    router.push(`/advisor?q=${encodeURIComponent(text)}`);
  };

  return {
    save: () => save.mutate(),
    saving: save.isPending,
    addToCart: () => saveForCart.mutate(),
    addingToCart: saveForCart.isPending || addToCart.isPending,
    quote: () => void quote(),
    askAi,
  };
}
