export type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s as OrderStatus] ?? s;
}

/** Which status changes staff may make from each status. Payment confirmation by a provider is separate. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "shipped", "refunded"],
  preparing: ["shipped", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canMove(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from]?.includes(to) ?? false;
}
