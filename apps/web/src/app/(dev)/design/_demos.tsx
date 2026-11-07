'use client';

import type { CategoryKey } from '@pc/shared';
import { RotateCcw, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { ProductCard } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerTrigger } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { BUILD_AMOUNTS, PICKER_PRODUCTS } from './_fixtures';

export function OverlayDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">
            <Trash2 aria-hidden />
            Mở hộp thoại xác nhận
          </Button>
        </DialogTrigger>
        <DialogContent
          size="sm"
          title="Xóa cấu hình đã lưu?"
          description="Cấu hình “Gaming 2K tầm 25 triệu” sẽ bị xóa khỏi tài khoản. Liên kết chia sẻ cũng ngừng hoạt động."
        >
          <DialogBody className="pt-4 pb-5">
            <p className="text-muted">Các sản phẩm trong giỏ hàng không bị ảnh hưởng.</p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Giữ lại</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="danger">Xóa cấu hình</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="secondary">Mở ngăn chọn linh kiện</Button>
        </DrawerTrigger>
        <DrawerContent title="Chọn card đồ họa" description="3 sản phẩm tương thích với cấu hình hiện tại">
          <DrawerBody className="grid content-start gap-3">
            <Input type="search" placeholder="Lọc theo tên, chipset…" aria-label="Lọc sản phẩm" />
            {PICKER_PRODUCTS.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                variant="list"
                action={
                  <Button size="sm" variant="secondary">
                    Chọn
                  </Button>
                }
              />
            ))}
          </DrawerBody>
          <DrawerFooter className="justify-between">
            <span className="text-sm text-muted">Sắp xếp theo hiệu năng</span>
            <Button variant="ghost" size="sm">
              Bỏ chọn linh kiện
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            tone: 'success',
            title: 'Đã thêm vào giỏ hàng',
            description: 'ASUS Dual RTX 5060 Ti 16GB OC',
            action: { label: 'Xem giỏ hàng', altText: 'Mở giỏ hàng', onClick: () => {} },
          })
        }
      >
        <ShoppingCart aria-hidden />
        Thành công
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            tone: 'warning',
            title: 'Đang dùng chế độ dự phòng',
            description: 'AI tạm hết lượt. Cấu hình vẫn được tính bằng bộ máy gợi ý.',
          })
        }
      >
        Cảnh báo
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            tone: 'error',
            title: 'Không đặt được hàng',
            description: 'Card đồ họa vừa hết hàng. Chọn sản phẩm khác rồi đặt lại.',
          })
        }
      >
        Lỗi
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast({ tone: 'info', title: 'Đã sao chép liên kết chia sẻ cấu hình' })}
      >
        Thông tin
      </Button>
    </div>
  );
}

const CHEAPER: Record<CategoryKey, number> = { ...BUILD_AMOUNTS, gpu: 7_990_000, storage: 1_190_000 };

/** Shows the two motions of the bar: the fill on mount and the re-proportioning after a change. */
export function AllocationPlayground() {
  const [cheaper, setCheaper] = useState(false);
  const [run, setRun] = useState(0);
  const amounts = cheaper ? CHEAPER : BUILD_AMOUNTS;
  const total = Object.values(amounts).reduce((a, b) => a + b, 0);
  const allocation = Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, v / total]));
  return (
    <div className="flex flex-col gap-4">
      <AllocationBar key={run} allocation={allocation} amounts={amounts} total={total} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setCheaper((v) => !v)}>
          {cheaper ? 'Khôi phục cấu hình' : 'Bớt 2,4 triệu'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw aria-hidden />
          Chạy lại hiệu ứng
        </Button>
      </div>
    </div>
  );
}
