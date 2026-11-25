import { type Build, checkCompatibility, type PartMap, scoreProduct } from '@pc/engine';
import {
  BUILD_LABEL_TEXT,
  type BuildDTO,
  type BuildLabel,
  type BuildSource,
  type CategoryKey,
  type CompatibilityIssueDTO,
  PURPOSE_LABELS,
  type Purpose,
} from '@pc/shared';
import { desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { builds } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { findProductsByIds } from '../../lib/products';
import type { Redis } from '../../lib/redis';
import { createCatalogService, isUuid } from '../catalog';
import { loadParts, referenceCatalog } from '../compatibility';
import { loadPurposeProfile } from '../recommendation/profile';
import { type BuildRow, storedItems, toBuildDTO } from './builds.mapper';

export interface SaveBuildMeta {
  userId?: string;
  source: BuildSource;
  purpose: Purpose;
  budget: number;
  /** Defaults to "<purpose> · <label>". */
  name?: string;
}

export interface CustomBuildInput {
  name?: string;
  purpose: Purpose;
  /** Enables the budget rule; the stored budget defaults to the total price. */
  budget?: number;
  productIds: string[];
}

type BuildDraft = Omit<Build, 'label'> & { label: BuildLabel | null };

const MY_BUILDS_LIMIT = 100;
const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;

const defaultName = (purpose: Purpose, label: BuildLabel | null) =>
  `${PURPOSE_LABELS[purpose]} · ${label ? BUILD_LABEL_TEXT[label] : 'Tự chọn'}`;

const toIssueDTO = (i: CompatibilityIssueDTO): CompatibilityIssueDTO => ({
  code: i.code,
  severity: i.severity,
  message: i.message,
  categories: i.categories,
});

export function createBuildsService(deps: { db: Db; redis: Redis }) {
  const { db } = deps;
  const catalog = createCatalogService(deps);

  async function hydrate(rows: BuildRow[]): Promise<BuildDTO[]> {
    const ids = [...new Set(rows.flatMap((r) => r.items.map((i) => i.productId)))].filter(isUuid);
    const products = await findProductsByIds(db, ids);
    const byId = new Map(products.map((p) => [p.product.id, p]));
    return rows.map((r) => toBuildDTO(r, byId));
  }

  async function insert(drafts: BuildDraft[], meta: SaveBuildMeta): Promise<BuildDTO[]> {
    if (drafts.length === 0) return [];
    const rows = await db
      .insert(builds)
      .values(
        drafts.map((d) => ({
          userId: meta.userId ?? null,
          name: meta.name ?? defaultName(meta.purpose, d.label),
          label: d.label,
          purpose: meta.purpose,
          budget: meta.budget,
          items: storedItems(d.parts),
          totalPrice: d.totalPrice,
          score: d.score,
          scoreBreakdown: d.scoreBreakdown,
          allocation: d.allocation,
          estimatedWattage: d.estimatedWattage,
          recommendedPsuWattage: d.recommendedPsuWattage,
          warnings: d.warnings.map(toIssueDTO),
          source: meta.source,
        })),
      )
      .returning();
    return hydrate(rows);
  }

  return {
    async get(id: string): Promise<BuildDTO | null> {
      if (!isUuid(id)) return null;
      const rows = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
      return (await hydrate(rows))[0] ?? null;
    },

    /** In the order of `ids`; unknown ids are skipped. */
    async getMany(ids: string[]): Promise<BuildDTO[]> {
      const valid = ids.filter(isUuid);
      if (valid.length === 0) return [];
      const rows = await db.select().from(builds).where(inArray(builds.id, valid));
      const byId = new Map((await hydrate(rows)).map((b) => [b.id, b]));
      return valid.flatMap((id) => byId.get(id) ?? []);
    },

    async listByUser(userId: string): Promise<BuildDTO[]> {
      const rows = await db
        .select()
        .from(builds)
        .where(eq(builds.userId, userId))
        .orderBy(desc(builds.createdAt), desc(builds.id))
        .limit(MY_BUILDS_LIMIT);
      return hydrate(rows);
    },

    async save(build: Build, meta: SaveBuildMeta): Promise<BuildDTO> {
      return (await insert([build], meta))[0] as BuildDTO;
    },

    async saveMany(list: Build[], meta: SaveBuildMeta): Promise<BuildDTO[]> {
      return insert(list, meta);
    },

    /** Customizer save: rejects hard rule violations with 422 INCOMPATIBLE, then scores the parts like the engine. */
    async createCustom(input: CustomBuildInput, userId?: string): Promise<BuildDTO> {
      const { parts } = await loadParts(db, input.productIds);
      const reference = referenceCatalog(await catalog.getEngineCatalog(), parts);
      const report = checkCompatibility(parts, {
        purpose: input.purpose,
        budget: input.budget,
        catalog: reference,
      });
      if (report.issues.some((i) => i.severity === 'error')) {
        throw new AppError(
          422,
          'INCOMPATIBLE',
          'Cấu hình có linh kiện không tương thích',
          report.issues.map(toIssueDTO),
        );
      }

      const profile = await loadPurposeProfile(db, input.purpose);
      const chosen = Object.entries(parts) as [CategoryKey, NonNullable<PartMap[CategoryKey]>][];
      const totalPrice = chosen.reduce((sum, [, p]) => sum + p.price, 0);
      const scoreBreakdown: BuildDraft['scoreBreakdown'] = {};
      const allocation: BuildDraft['allocation'] = {};
      let score = 0;
      for (const [category, p] of chosen) {
        const s = scoreProduct(p, input.purpose, reference);
        scoreBreakdown[category] = round(s, 1);
        allocation[category] = totalPrice > 0 ? round(p.price / totalPrice, 4) : 0;
        score += profile.weights[category] * s;
      }

      const [saved] = await insert(
        [
          {
            label: null,
            parts,
            totalPrice,
            score: round(score, 2),
            scoreBreakdown,
            allocation,
            estimatedWattage: report.estimatedWattage,
            recommendedPsuWattage: report.recommendedPsuWattage,
            warnings: report.issues,
          },
        ],
        {
          userId,
          source: 'CUSTOM',
          purpose: input.purpose,
          budget: input.budget ?? totalPrice,
          name: input.name,
        },
      );
      return saved as BuildDTO;
    },
  };
}

export type BuildsService = ReturnType<typeof createBuildsService>;
