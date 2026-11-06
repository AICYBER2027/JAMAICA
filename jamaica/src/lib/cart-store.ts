"use client";
import { useSyncExternalStore } from "react";

// The bag lives in the browser. It only holds what the customer chose; prices and stock are
// re-read from the database on the server at checkout, so nothing here can change what is charged.
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  color: string;
  image: string | null;
  unitCents: number;
  qty: number;
};

type State = { lines: CartLine[]; open: boolean; lastAdded: string | null };
const KEY = "jamaica.bag.v1";
const MAX_QTY = 10;
let state: State = { lines: [], open: false, lastAdded: null };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const lines = JSON.parse(raw) as CartLine[];
      if (Array.isArray(lines)) state = { ...state, lines: lines.filter((l) => l && l.variantId && l.qty > 0) };
    }
  } catch {
    // Private mode or corrupted storage: start with an empty bag.
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = { ...state, lines: e.newValue ? JSON.parse(e.newValue) : [] };
      emit();
    } catch {}
  });
}

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  if (next.lines) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.lines));
    } catch {}
  }
  emit();
}

const serverState: State = { lines: [], open: false, lastAdded: null };

export const cart = {
  subscribe(fn: () => void) {
    load();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => {
    load();
    return state;
  },
  add(line: Omit<CartLine, "qty">, qty = 1, { open = true } = {}) {
    const existing = state.lines.find((l) => l.variantId === line.variantId);
    const lines = existing
      ? state.lines.map((l) => (l.variantId === line.variantId ? { ...l, ...line, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
      : [...state.lines, { ...line, qty: Math.min(MAX_QTY, qty) }];
    set({ lines, open, lastAdded: line.variantId });
  },
  addMany(lines: Omit<CartLine, "qty">[]) {
    let next = state.lines;
    for (const line of lines) {
      const existing = next.find((l) => l.variantId === line.variantId);
      next = existing
        ? next.map((l) => (l.variantId === line.variantId ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l))
        : [...next, { ...line, qty: 1 }];
    }
    set({ lines: next, open: true, lastAdded: lines.at(-1)?.variantId ?? null });
  },
  setQty(variantId: string, qty: number) {
    const lines = qty <= 0
      ? state.lines.filter((l) => l.variantId !== variantId)
      : state.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
    set({ lines });
  },
  remove(variantId: string) {
    set({ lines: state.lines.filter((l) => l.variantId !== variantId) });
  },
  /** Replace prices/names with the server's current values after a quote. */
  refresh(updates: { variantId: string; unitCents: number; available: number }[]) {
    const byId = new Map(updates.map((u) => [u.variantId, u]));
    const lines = state.lines
      .filter((l) => (byId.get(l.variantId)?.available ?? 0) > 0)
      .map((l) => {
        const u = byId.get(l.variantId)!;
        return { ...l, unitCents: u.unitCents, qty: Math.min(l.qty, u.available, MAX_QTY) };
      });
    set({ lines });
  },
  clear() {
    set({ lines: [] });
  },
  setOpen(open: boolean) {
    set({ open });
  },
};

export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, () => serverState);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.qty * l.unitCents, 0);
}
