import { timingSafeEqual } from 'node:crypto';
import type { PaymentInfoDTO } from '@pc/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { orders, payments } from '../../db/schema';
import type { AppDeps } from '../../deps';
import {
  type AppliedTransition,
  afterTransitions,
  applyTransition,
  findOrderCode,
  type OrderRow,
} from '../orders';
import { buildVietQrUrl } from './vietqr';

/** SePay "transaction" webhook body; unknown extra fields are kept for the raw log. */
export const sepayWebhookSchema = z.looseObject({
  id: z.union([z.number(), z.string().min(1)]),
  gateway: z.string().nullish(),
  transactionDate: z.string().nullish(),
  accountNumber: z.string().nullish(),
  code: z.string().nullish(),
  content: z.string().nullish(),
  transferType: z.string(),
  transferAmount: z.coerce.number().int().nonnegative(),
  referenceCode: z.string().nullish(),
});
export type SepayWebhook = z.infer<typeof sepayWebhookSchema>;

export type PaymentOutcome =
  | 'PAID'
  | 'UNDERPAID'
  | 'MANUAL_REVIEW'
  | 'DUPLICATE'
  | 'IGNORED_OUTGOING'
  | 'NO_ORDER'
  | 'INVALID';

/** `Authorization: Apikey <key>` with a constant-time comparison. */
export function isValidSepayAuth(header: string | undefined, apiKey: string): boolean {
  const m = /^apikey\s+(.+)$/i.exec(header?.trim() ?? '');
  if (!m) return false;
  const given = Buffer.from(m[1]!.trim());
  const expected = Buffer.from(apiKey);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createPaymentsService(deps: AppDeps) {
  const { db, redis, env } = deps;

  return {
    paymentInfo(order: OrderRow): PaymentInfoDTO {
      return {
        orderCode: order.code,
        amount: order.total,
        qrImageUrl: buildVietQrUrl({
          bankBin: env.VIETQR_BANK_BIN,
          accountNo: env.VIETQR_ACCOUNT_NO,
          accountName: env.VIETQR_ACCOUNT_NAME,
          amount: order.total,
          addInfo: order.code,
        }),
        bankBin: env.VIETQR_BANK_BIN,
        accountNo: env.VIETQR_ACCOUNT_NO,
        accountName: env.VIETQR_ACCOUNT_NAME,
        transferContent: order.code,
        status: order.status,
        paymentStatus: order.paymentStatus,
        expiresAt: order.expiresAt?.toISOString() ?? null,
      };
    },

    /**
     * Applies one incoming bank transfer. Idempotent on provider_txn_id: the payments insert is the gate,
     * and it happens under the order's row lock, so replays and concurrent duplicates become no-ops.
     */
    async processTransfer(body: unknown, provider: 'SEPAY' | 'SIMULATOR'): Promise<PaymentOutcome> {
      const parsed = sepayWebhookSchema.safeParse(body);
      if (!parsed.success) return 'INVALID';
      const t = parsed.data;
      if (t.transferType !== 'in') return 'IGNORED_OUTGOING';
      const content = t.content ?? '';
      const code = findOrderCode(content) ?? findOrderCode(t.code ?? '');
      if (!code) return 'NO_ORDER';

      const { outcome, applied } = await db.transaction(
        async (
          tx,
        ): Promise<{
          outcome: PaymentOutcome;
          applied: AppliedTransition | null;
        }> => {
          const [order] = await tx.select().from(orders).where(eq(orders.code, code)).for('update');
          if (!order) return { outcome: 'NO_ORDER', applied: null };
          const status: PaymentOutcome =
            order.status !== 'PENDING_PAYMENT'
              ? 'MANUAL_REVIEW'
              : t.transferAmount >= order.total
                ? 'PAID'
                : 'UNDERPAID';
          const inserted = await tx
            .insert(payments)
            .values({
              orderId: order.id,
              provider,
              amount: t.transferAmount,
              transferContent: content,
              providerTxnId: String(t.id),
              raw: body as Record<string, unknown>,
              status: status === 'PAID' ? 'SUCCESS' : status,
            })
            .onConflictDoNothing({ target: payments.providerTxnId })
            .returning({ id: payments.id });
          if (inserted.length === 0) return { outcome: 'DUPLICATE', applied: null };
          const paid =
            status === 'PAID' ? await applyTransition(tx, order, 'PAID', { now: deps.now() }) : null;
          return { outcome: status, applied: paid };
        },
      );
      if (applied) await afterTransitions(redis, [applied]);
      return outcome;
    },
  };
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
