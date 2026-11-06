import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";
import { ActionForm } from "@/components/admin/ActionForm";
import { changePassword, updateProfile, deleteAccount } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { DeleteAccount } from "@/components/auth/DeleteAccount";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Account() {
  const user = await requireCustomer("/account");
  const orders = await sql<{ id: string; number: number; status: string; total_cents: number; created_at: Date; items: number }[]>`
    select id, number, status, total_cents, created_at, (select sum(quantity) from order_items i where i.order_id = o.id)::int as items
    from orders o where user_id = ${user.id} order by created_at desc`;
  return (
    <div className="frame pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(2.4rem,5vw,4.5rem)]">Hello, {user.name.split(" ")[0]}</h1>
        <form action={signOut}><button className="btn btn-ghost" type="submit">Sign out</button></form>
      </div>
      <section id="orders" aria-labelledby="orders-title" className="mt-12 scroll-mt-24">
        <h2 id="orders-title" className="text-[1.75rem]">Your orders</h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-muted">No orders yet. <Link href="/shop/fashion" className="link">Start shopping</Link></p>
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.id}`} className="grid grid-cols-2 items-center gap-2 bg-stone px-5 py-4 hover:bg-stone-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <span className="font-semibold">Order #{o.number}</span>
                  <span className="text-muted">{o.created_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {o.items} {o.items === 1 ? "item" : "items"}</span>
                  <span><span className={`status status-${o.status}`}>{statusLabel(o.status)}</span></span>
                  <span className="tabular text-right font-semibold">{formatBRL(o.total_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-[1.5rem]">Your details</h2>
          <ActionForm action={updateProfile} submit="Save details" className="mt-4 grid gap-4">
            <label><span className="label">Name</span><input name="name" defaultValue={user.name} className="field" /></label>
            <label><span className="label">Mobile</span><input name="phone" defaultValue={user.phone} inputMode="tel" className="field" /></label>
            <p className="text-small text-muted">Email: {user.email}</p>
          </ActionForm>
        </section>
        <section aria-labelledby="pw-title">
          <h2 id="pw-title" className="text-[1.5rem]">Password</h2>
          <ActionForm action={changePassword} submit="Change password" resetOnSuccess className="mt-4 grid gap-4">
            <label><span className="label">Current password</span><input name="current" type="password" autoComplete="current-password" className="field" /></label>
            <label><span className="label">New password</span><input name="next" type="password" autoComplete="new-password" className="field" aria-describedby="pw-hint" /><span id="pw-hint" className="hint block">At least 10 characters.</span></label>
          </ActionForm>
        </section>
      </div>
      <section aria-labelledby="del-title" className="mt-16 bg-stone p-6">
        <h2 id="del-title" className="text-[1.25rem]">Delete your account</h2>
        <p className="mt-2 max-w-[70ch] text-muted">Removes your account, saved details and any try-on photos. Records of past orders are kept without your account, because Brazilian tax law requires stores to keep them.</p>
        <DeleteAccount action={deleteAccount} />
      </section>
    </div>
  );
}
