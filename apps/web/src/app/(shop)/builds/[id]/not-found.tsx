import { Cpu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BuildNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState
        icon={<Cpu />}
        title="Không tìm thấy cấu hình"
        description="Liên kết có thể bị thiếu ký tự. Hỏi AI để có cấu hình mới trong vài giây, hoặc tự lắp."
        actions={
          <>
            <Button asChild variant="workshop">
              <Link href="/advisor">Hỏi AI tư vấn</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/builder">Tự lắp cấu hình</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
