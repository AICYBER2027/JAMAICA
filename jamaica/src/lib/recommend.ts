/**
 * Outfit recommendations. Rule-based and explainable: palette harmony, who it's for, and price level.
 * Pure functions, so they can run in the browser and be unit-tested.
 */
export type Slot = "top" | "outerwear" | "bottom" | "one-piece" | "shoes" | "watch" | "eyewear" | "accessory";
export type Palette = "neutral" | "dark" | "blue" | "warm";
export type Piece = { id: string; slot: Slot; palette: Palette | string; gender: "women" | "men" | "unisex"; priceCents: number; featured?: boolean; inStock?: boolean };

export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "outerwear", label: "Jacket" },
  { slot: "top", label: "Top" },
  { slot: "bottom", label: "Bottoms" },
  { slot: "one-piece", label: "Dress or set" },
  { slot: "shoes", label: "Shoes" },
  { slot: "watch", label: "Watch" },
  { slot: "eyewear", label: "Sunglasses" },
  { slot: "accessory", label: "Accessory" },
];

// How well two palettes sit together, 0..1. Neutrals go with everything; two loud families clash.
const HARMONY: Record<string, Record<string, number>> = {
  neutral: { neutral: 0.9, dark: 1, blue: 1, warm: 1 },
  dark: { neutral: 1, dark: 0.85, blue: 0.8, warm: 0.75 },
  blue: { neutral: 1, dark: 0.8, blue: 0.6, warm: 0.45 },
  warm: { neutral: 1, dark: 0.75, blue: 0.45, warm: 0.55 },
};
export const harmony = (a: string, b: string) => HARMONY[a]?.[b] ?? 0.7;

/** Slots that can't be worn together: a dress replaces top and bottoms. */
export function conflicts(slot: Slot): Slot[] {
  if (slot === "one-piece") return ["top", "bottom"];
  if (slot === "top" || slot === "bottom") return ["one-piece"];
  return [];
}

export function score(candidate: Piece, chosen: Piece[], gender: "women" | "men" | "all"): number {
  if (candidate.inStock === false) return -1;
  let s = 0;
  if (gender !== "all") s += candidate.gender === gender ? 0.3 : candidate.gender === "unisex" ? 0.2 : -1;
  const others = chosen.filter((c) => c.id !== candidate.id && c.slot !== candidate.slot);
  if (others.length) {
    s += others.reduce((n, o) => n + harmony(String(candidate.palette), String(o.palette)), 0) / others.length;
    const avg = others.reduce((n, o) => n + o.priceCents, 0) / others.length;
    const ratio = Math.max(candidate.priceCents, avg) / Math.max(1, Math.min(candidate.priceCents, avg));
    s += ratio <= 2 ? 0.25 : ratio <= 4 ? 0.1 : -0.1; // similar price level reads as one look
  } else {
    s += 0.5;
  }
  if (candidate.featured) s += 0.05;
  return s;
}

export function rank<T extends Piece>(candidates: T[], chosen: Piece[], gender: "women" | "men" | "all"): T[] {
  return [...candidates].map((c) => ({ c, s: score(c, chosen, gender) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s).map((x) => x.c);
}

/** Fills empty slots with the best match for what's already chosen. Respects dress-vs-separates. */
export function completeLook<T extends Piece>(all: T[], chosen: Partial<Record<Slot, T>>, gender: "women" | "men" | "all", wanted: Slot[] = ["top", "bottom", "shoes", "watch", "eyewear"]): Partial<Record<Slot, T>> {
  const out = { ...chosen };
  for (const slot of wanted) {
    if (out[slot]) continue;
    if (conflicts(slot).some((c) => out[c])) continue;
    const best = rank(all.filter((p) => p.slot === slot), Object.values(out) as Piece[], gender)[0];
    if (best) out[slot] = best;
  }
  return out;
}

export function reason(candidate: Piece, chosen: Piece[]): string | null {
  const others = chosen.filter((c) => c.slot !== candidate.slot);
  if (!others.length) return null;
  const best = Math.max(...others.map((o) => harmony(String(candidate.palette), String(o.palette))));
  if (best >= 0.95) return candidate.palette === "neutral" ? "Neutral, goes with everything chosen" : "Balances the colours you’ve chosen";
  if (best >= 0.8) return "Works with your look";
  return null;
}
