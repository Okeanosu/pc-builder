import type { BuildDTO, CartItemDTO } from '@pc/shared';

export interface BuildGroup {
  buildId: string;
  items: CartItemDTO[];
  subtotal: number;
}

export interface GroupedCart {
  /** Parts added on their own. */
  retail: CartItemDTO[];
  /** Parts added through "Mua cả bộ", one group per build, in cart order. */
  builds: BuildGroup[];
}

export function groupCartLines(items: readonly CartItemDTO[]): GroupedCart {
  const retail: CartItemDTO[] = [];
  const byBuild = new Map<string, BuildGroup>();
  for (const item of items) {
    if (!item.buildId) {
      retail.push(item);
      continue;
    }
    const group = byBuild.get(item.buildId) ?? { buildId: item.buildId, items: [], subtotal: 0 };
    group.items.push(item);
    group.subtotal += item.lineTotal;
    byBuild.set(item.buildId, group);
  }
  return { retail, builds: [...byBuild.values()] };
}

/** True when every part of the build is still in the group with at least the build's quantity. */
export function isBuildComplete(build: Pick<BuildDTO, 'items'>, group: BuildGroup): boolean {
  if (build.items.length === 0) return false;
  const need = new Map<string, number>();
  for (const item of build.items) need.set(item.product.id, (need.get(item.product.id) ?? 0) + 1);
  const have = new Map<string, number>();
  for (const line of group.items) have.set(line.product.id, (have.get(line.product.id) ?? 0) + line.qty);
  for (const [productId, qty] of need) if ((have.get(productId) ?? 0) < qty) return false;
  return true;
}

/**
 * The single build that can be ordered as an assembled PC: offered only when the cart holds exactly one
 * build group and that group is complete. Returns its id, or null.
 */
export function assemblableBuildId(
  grouped: GroupedCart,
  buildsById: ReadonlyMap<string, Pick<BuildDTO, 'items'>>,
): string | null {
  if (grouped.builds.length !== 1) return null;
  const group = grouped.builds[0] as BuildGroup;
  const build = buildsById.get(group.buildId);
  return build && isBuildComplete(build, group) ? group.buildId : null;
}
