import { CATEGORY_LABELS, PURPOSE_LABELS, type Purpose } from '@pc/shared';
import { eq } from 'drizzle-orm';
import { builds } from '../../db/schema';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import { effectivePrice, findProductsByIds } from '../../lib/products';
import { type CartOwner, createCartService, isGuid } from '../cart/cart.service';
import { type QuoteLine, renderQuotePdf } from './quote-pdf';

export function createQuotesService(deps: AppDeps) {
  const cart = createCartService(deps);

  return {
    /** Quotes a stored build at today's prices (falling back to the saved price for delisted parts). */
    async buildQuote(buildId: string): Promise<Buffer> {
      if (!isGuid(buildId)) throw notFound('Cấu hình');
      const [build] = await deps.db.select().from(builds).where(eq(builds.id, buildId));
      if (!build) throw notFound('Cấu hình');
      const current = new Map(
        (
          await findProductsByIds(
            deps.db,
            build.items.map((i) => i.productId),
          )
        ).map((r) => [r.product.id, r]),
      );
      const lines: QuoteLine[] = build.items.map((item) => {
        const row = current.get(item.productId);
        return {
          category: CATEGORY_LABELS[item.category] ?? item.category,
          name: row?.product.name ?? item.name,
          qty: 1,
          unitPrice: row ? effectivePrice(row.product) : item.price,
        };
      });
      const purpose = PURPOSE_LABELS[build.purpose as Purpose];
      const power = [
        build.estimatedWattage > 0 ? `Công suất ước tính: ${build.estimatedWattage} W` : null,
        build.recommendedPsuWattage > 0 ? `Nguồn đề xuất: ${build.recommendedPsuWattage} W` : null,
      ].filter((s): s is string => s !== null);
      return renderQuotePdf({
        subtitle: `Cấu hình: ${build.name}${purpose ? ` · Nhu cầu: ${purpose}` : ''}`,
        details: power.length > 0 ? [power.join(' · ')] : [],
        date: deps.now(),
        lines,
        assemblyFee: deps.env.ASSEMBLY_FEE,
      });
    },

    async cartQuote(owner: CartOwner): Promise<Buffer> {
      const lines = await cart.lines(owner);
      if (lines.length === 0) throw new AppError(400, 'EMPTY_CART', 'Giỏ hàng đang trống');
      return renderQuotePdf({
        subtitle: 'Báo giá giỏ hàng',
        date: deps.now(),
        lines: lines.map((l) => ({
          category: CATEGORY_LABELS[l.row.categoryKey],
          name: l.row.product.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
        assemblyFee: 0,
      });
    },
  };
}
