import { CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CategoryNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState
        icon={<PackageSearch />}
        title="Không có danh mục này"
        description="Đường dẫn có thể đã cũ. Chọn một danh mục linh kiện bên dưới."
        actions={CATEGORY_KEYS.map((key) => (
          <Button key={key} asChild variant="secondary" size="sm">
            <Link href={`/c/${key}`}>{CATEGORY_LABELS[key]}</Link>
          </Button>
        ))}
      />
    </div>
  );
}
