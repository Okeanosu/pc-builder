'use client';

import { toast } from '@/components/ui/Toast';
import { API_URL, getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

async function fetchPdf(path: string, retried = false): Promise<Blob> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401 && token && !retried) {
    if (await useAuthStore.getState().refresh()) return fetchPdf(path, true);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/**
 * Opens an API-generated PDF that depends on who is asking (the cart quote). A plain link would not
 * carry the bearer token, so the file is fetched first; the tab is opened synchronously to dodge popup blockers.
 */
export async function openPersonalPdf(path: string, filename: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await fetchPdf(path));
    if (tab) {
      tab.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
    toast({
      title: 'Chưa xuất được báo giá',
      description: 'Máy chủ tạo PDF đang bận. Thử lại sau ít phút.',
      tone: 'error',
    });
  }
}
