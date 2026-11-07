/** Mirrors the API's ASSEMBLY_FEE for display before ordering; the order response carries the charged amount. */
export const ASSEMBLY_FEE = Number(process.env.NEXT_PUBLIC_ASSEMBLY_FEE ?? 200_000);

/** Mirrors the API's per-line cart limit. */
export const MAX_LINE_QTY = 20;
