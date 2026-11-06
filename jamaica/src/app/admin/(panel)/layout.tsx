import type { Metadata } from "next";
import { requireStaff, can } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · JAMAICA dashboard" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const items = [
    { href: "/admin", label: "Overview", show: true },
    { href: "/admin/orders", label: "Orders", show: can(user, "orders") },
    { href: "/admin/products", label: "Products", show: can(user, "products") },
    { href: "/admin/inventory", label: "Inventory", show: can(user, "products") },
    { href: "/admin/categories", label: "Categories", show: can(user, "products") },
    { href: "/admin/customers", label: "Customers", show: can(user, "customers") },
    { href: "/admin/promotions", label: "Discount codes", show: can(user, "promotions") },
    { href: "/admin/reports", label: "Sales report", show: can(user, "reports") },
    { href: "/admin/settings", label: "Settings", show: can(user, "settings") },
    { href: "/admin/team", label: "Team", show: can(user, "team") },
  ].filter((i) => i.show);

  return (
    <div className="min-h-svh bg-paper lg:grid lg:grid-cols-[232px_1fr]">
      <AdminNav items={items} user={{ name: user.name, role: user.role }} signOut={signOut} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
