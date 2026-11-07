import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys';

/** Per-user server data that must not survive the user: their orders, saved builds, order details and payments. */
export function dropPersonalQueries(qc: QueryClient): void {
  qc.removeQueries({ queryKey: queryKeys.myOrders });
  qc.removeQueries({ queryKey: queryKeys.myBuilds });
  qc.removeQueries({ queryKey: ['order'] });
  qc.removeQueries({ queryKey: ['payment'] });
}

/** True on the transition that ends a session: logout, or a refresh that failed and cleared the user. */
export const sessionEnded = (prev: { user: unknown }, next: { user: unknown }) =>
  Boolean(prev.user) && !next.user;
