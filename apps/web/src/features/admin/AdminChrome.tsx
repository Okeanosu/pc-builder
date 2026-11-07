'use client';

import type { Role } from '@pc/shared';
import { createContext, type ReactNode, useContext } from 'react';
import { createPortal } from 'react-dom';

interface ChromeSlots {
  titleEl: HTMLElement | null;
  actionsEl: HTMLElement | null;
  role: Role;
}

const ChromeContext = createContext<ChromeSlots | null>(null);

export const AdminChromeProvider = ChromeContext.Provider;

/** Role of the signed-in staff member; the layout guard guarantees STAFF or ADMIN below it. */
export function useAdminRole(): { role: Role; isAdmin: boolean } {
  const ctx = useContext(ChromeContext);
  const role = ctx?.role ?? 'STAFF';
  return { role, isAdmin: role === 'ADMIN' };
}

/**
 * Pages render their title and top-bar actions into the shell owned by the layout. A portal keeps the
 * actions inside the page's React tree (state, queries, handlers) while they paint in the top bar.
 */
export function AdminPageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  const ctx = useContext(ChromeContext);
  return (
    <>
      {ctx?.titleEl && createPortal(title, ctx.titleEl)}
      {ctx?.actionsEl && actions ? createPortal(actions, ctx.actionsEl) : null}
    </>
  );
}
