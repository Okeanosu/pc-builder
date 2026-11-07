'use client';

import type { ProductDTO } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PriceTag } from '@/components/domain/PriceTag';
import { stockState } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AddToCartButton } from '../cart/AddToCartButton';
import { QtyStepper } from '../cart/QtyStepper';
import { MAX_LINE_QTY } from '../checkout/constants';

/** Price, live stock and purchase actions. The page is cached, so stock is refetched on mount. */
export function BuyBox({ product: initial }: { product: ProductDTO }) {
  const { data: product = initial } = useQuery({
    queryKey: queryKeys.product(initial.slug),
    queryFn: () => api<ProductDTO>(`/products/${encodeURIComponent(initial.slug)}`),
    initialData: initial,
    initialDataUpdatedAt: 0,
  });
  const [qty, setQty] = useState(1);
  const state = stockState(product.stock);
  const maxQty = Math.max(1, Math.min(product.stock, MAX_LINE_QTY));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />
        <p
          className={cn(
            'inline-flex items-center gap-2 text-sm font-semibold',
            state === 'in' && 'text-ok-ink',
            state === 'low' && 'text-warn-ink',
            state === 'out' && 'text-muted',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'size-2 rounded-full',
              state === 'in' && 'bg-ok',
              state === 'low' && 'bg-warn',
              state === 'out' && 'bg-border-strong',
            )}
          />
          {state === 'in' && 'Còn hàng'}
          {state === 'low' && `Chỉ còn ${product.stock} sản phẩm`}
          {state === 'out' && 'Tạm hết hàng'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {state !== 'out' && (
          <QtyStepper
            label={`Số lượng ${product.name}`}
            value={Math.min(qty, maxQty)}
            max={maxQty}
            onChange={setQty}
          />
        )}
        <AddToCartButton
          product={product}
          qty={Math.min(qty, maxQty)}
          size="lg"
          className="flex-1 sm:flex-none"
        />
        <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-none">
          <Link href={`/builder?add=${product.id}`}>
            <Wrench aria-hidden />
            Thêm vào cấu hình
          </Link>
        </Button>
      </div>
      {state === 'out' && (
        <p className="text-sm text-muted">
          Sản phẩm đang tạm hết. Bạn vẫn có thể thêm vào cấu hình để kiểm tra tương thích, hoặc hỏi AI gợi ý
          mẫu tương đương còn hàng.
        </p>
      )}
    </div>
  );
}
