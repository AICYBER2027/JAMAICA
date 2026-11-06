"use server";
import { revalidatePath } from "next/cache";
import { getUser, isStaff, requireStaff } from "@/lib/auth";
import { orderTokenMatches } from "@/lib/checkout";
import { cancelByCustomer, changeStatus, getOrder, markPaid } from "@/lib/orders";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export async function cancelOrderAction(orderId: string, token: string): Promise<{ error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { error: "Order not found." };
  const user = await getUser();
  if (!orderTokenMatches(order.access_token_hash, token) && user?.id !== order.user_id && !isStaff(user)) return { error: "Not allowed." };
  const ok = await cancelByCustomer(orderId);
  revalidatePath(`/order/${orderId}`);
  return ok ? {} : { error: "This order can’t be cancelled any more. Contact us if you need help." };
}

export async function staffSetStatus(orderId: string, to: OrderStatus, tracking?: string, note?: string): Promise<{ error?: string }> {
  const me = await requireStaff("orders");
  if (!(to in STATUS_LABEL)) return { error: "Unknown status." };
  try {
    if (to === "paid") {
      const ok = await markPaid(orderId, me.name, null, `Payment confirmed by ${me.name}${note ? `: ${note}` : ""}`);
      if (!ok) return { error: "Only orders awaiting payment can be marked as paid." };
    } else {
      await changeStatus(orderId, to, me.name, { tracking, note });
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}
