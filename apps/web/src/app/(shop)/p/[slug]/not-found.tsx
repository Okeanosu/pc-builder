import { PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProductNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState
        icon={<PackageSearch />}
        title="Sản phẩm này không còn bán"
        description="Có thể sản phẩm đã ngừng kinh doanh hoặc đường dẫn bị sai. Tìm mẫu tương tự hoặc để AI gợi ý."
        actions={
          <>
            <Button asChild>
              <Link href="/search">Tìm sản phẩm khác</Link>
            </Button>
            <Button asChild variant="workshop">
              <Link href="/advisor">Hỏi AI tư vấn</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
