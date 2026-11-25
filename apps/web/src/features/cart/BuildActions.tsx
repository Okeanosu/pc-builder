'use client';

import { Check, FileText, Link2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { API_URL } from '@/lib/api';
import { useAddBuildToCart } from './hooks';

/** "Mua cả bộ", the PDF quote and a share link for one saved build. */
export function BuildActions({ buildId, buyable }: { buildId: string; buyable: boolean }) {
  const router = useRouter();
  const addBuild = useAddBuildToCart();
  const [copied, setCopied] = useState(false);

  const buyAll = () =>
    addBuild.mutate(buildId, {
      onSuccess: () => {
        toast({ title: 'Đã thêm cả bộ vào giỏ hàng', tone: 'success' });
        router.push('/cart');
      },
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: 'Đã sao chép liên kết cấu hình', tone: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Trình duyệt chặn sao chép', description: window.location.href, tone: 'warning' });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={buyAll} loading={addBuild.isPending} disabled={!buyable}>
        {!addBuild.isPending && <ShoppingCart aria-hidden />}
        Mua cả bộ
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <a href={`${API_URL}/quotes/builds/${buildId}.pdf`} target="_blank" rel="noopener">
            <FileText aria-hidden />
            Xuất báo giá PDF
          </a>
        </Button>
        <Button variant="ghost" onClick={() => void copyLink()}>
          {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
          {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
        </Button>
      </div>
    </div>
  );
}
