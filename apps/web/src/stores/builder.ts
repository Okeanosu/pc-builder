'use client';

import {
  type BuildDTO,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
  formatVnd,
  type ProductDTO,
  type Purpose,
} from '@pc/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BuilderParts } from '@/features/builder/compat';
import { api } from '@/lib/api';

export const BUILDER_STORAGE_KEY = 'pcb.builder';

const safeLocalStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Quota or privacy mode: keep working in memory.
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

interface BuildShape {
  parts: BuilderParts;
  purpose: Purpose;
  budget: number | null;
}

/** Identity of what would be saved; a saved build is reusable while this is unchanged. */
export function buildSignature({ parts, purpose, budget }: BuildShape): string {
  const ids = CATEGORY_KEYS.flatMap((k) => (parts[k] ? [parts[k].id] : []));
  return `${purpose}|${budget ?? ''}|${ids.join(',')}`;
}

const PURPOSE_PHRASE: Record<Purpose, string> = {
  gaming: 'chơi game',
  graphics: 'làm đồ họa, dựng phim',
  ai: 'lập trình và chạy AI',
  office: 'làm văn phòng, học tập',
};

const MAX_CHAT_MESSAGE = 1000;

/** Pre-filled message for "Hỏi AI tối ưu": purpose, budget and the parts chosen so far. */
export function describeBuildForAdvisor({ parts, purpose, budget }: BuildShape): string {
  const chosen = CATEGORY_KEYS.flatMap((k) => (parts[k] ? [`${CATEGORY_LABELS[k]}: ${parts[k].name}`] : []));
  const missing = CATEGORY_KEYS.filter((k) => !parts[k]).map((k) => CATEGORY_LABELS[k]);
  const lines = [
    `Mình đang tự build PC để ${PURPOSE_PHRASE[purpose]}${budget ? `, ngân sách ${formatVnd(budget)}` : ''}.`,
    chosen.length > 0 ? `Cấu hình hiện tại: ${chosen.join('; ')}.` : 'Mình chưa chọn linh kiện nào.',
    missing.length > 0 && chosen.length > 0 ? `Còn thiếu: ${missing.join(', ')}.` : '',
    'Nhờ bạn tư vấn tối ưu giúp: nên đổi linh kiện nào để mạnh hơn hoặc tiết kiệm hơn?',
  ].filter(Boolean);
  const text = lines.join(' ');
  return text.length > MAX_CHAT_MESSAGE ? `${text.slice(0, MAX_CHAT_MESSAGE - 1)}…` : text;
}

interface BuilderState extends BuildShape {
  /** Last build saved from (or loaded into) the Customizer, valid while `signature` matches. */
  saved: { id: string; signature: string } | null;
  loadingBuild: boolean;
  setPart: (product: ProductDTO) => void;
  remove: (category: CategoryKey) => void;
  clear: () => void;
  setPurpose: (purpose: Purpose) => void;
  setBudget: (budget: number | null) => void;
  markSaved: (id: string) => void;
  add: (productId: string) => Promise<ProductDTO>;
  loadBuild: (buildId: string) => Promise<BuildDTO>;
  /** Re-reads persisted parts so prices and stock are current; drops parts that no longer exist. */
  refreshParts: () => Promise<void>;
}

const fetchProduct = (id: string) => api<ProductDTO>(`/products/${encodeURIComponent(id)}`);

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      parts: {},
      purpose: 'gaming',
      budget: null,
      saved: null,
      loadingBuild: false,

      setPart(product) {
        set((s) => ({ parts: { ...s.parts, [product.category]: product } }));
      },
      remove(category) {
        set((s) => {
          const parts = { ...s.parts };
          delete parts[category];
          return { parts };
        });
      },
      clear() {
        set({ parts: {}, saved: null });
      },
      setPurpose(purpose) {
        set({ purpose });
      },
      setBudget(budget) {
        set({ budget: budget && budget > 0 ? Math.round(budget) : null });
      },
      markSaved(id) {
        set({ saved: { id, signature: buildSignature(get()) } });
      },

      async add(productId) {
        const product = await fetchProduct(productId);
        get().setPart(product);
        return product;
      },

      async loadBuild(buildId) {
        set({ loadingBuild: true });
        try {
          const build = await api<BuildDTO>(`/builds/${encodeURIComponent(buildId)}`);
          const products = await Promise.all(build.items.map((item) => fetchProduct(item.product.id)));
          const parts: BuilderParts = {};
          for (const p of products) parts[p.category] = p;
          // A Customizer save without a budget stores its own total as the budget; do not show that back.
          const budget = build.source === 'CUSTOM' && build.budget === build.totalPrice ? null : build.budget;
          set({ parts, purpose: build.purpose, budget });
          set({ saved: { id: build.id, signature: buildSignature(get()) } });
          return build;
        } finally {
          set({ loadingBuild: false });
        }
      },

      async refreshParts() {
        const current = Object.values(get().parts).filter((p): p is ProductDTO => Boolean(p));
        if (current.length === 0) return;
        const results = await Promise.allSettled(current.map((p) => fetchProduct(p.id)));
        set((s) => {
          const parts = { ...s.parts };
          results.forEach((r, i) => {
            const old = current[i]!;
            if (parts[old.category]?.id !== old.id) return;
            if (r.status === 'fulfilled') parts[old.category] = r.value;
            else if ((r.reason as { status?: number })?.status === 404) delete parts[old.category];
          });
          return { parts };
        });
      },
    }),
    {
      name: BUILDER_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ parts, purpose, budget, saved }) => ({ parts, purpose, budget, saved }),
      // Hydrated from the page after mount, so the server render and the first client render agree.
      skipHydration: true,
    },
  ),
);
