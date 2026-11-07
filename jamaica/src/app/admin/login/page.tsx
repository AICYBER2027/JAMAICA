import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, isStaff } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "@/components/auth/LoginForm";
import { signIn } from "@/app/actions/auth";
import { needsOwner } from "@/app/actions/setup";
import Link from "next/link";

export const metadata: Metadata = { title: "Team sign-in", robots: { index: false } };

export default async function AdminLogin() {
  if (isStaff(await getUser())) redirect("/admin");
  const noOwner = await needsOwner().catch(() => false);
  return (
    <main className="grid min-h-svh bg-black text-white md:grid-cols-2">
      <div className="frame flex flex-col justify-between py-8">
        <Wordmark animate className="text-[1.4rem]" />
        <p className="hidden max-w-[36ch] text-mist md:block">The JAMAICA dashboard: products, stock, orders, customers and promotions.</p>
      </div>
      <div className="frame flex items-center bg-paper py-16 text-ink">
        <div className="mx-auto w-full max-w-[400px]">
          <h1 className="text-[2.25rem]">Team sign-in</h1>
          <p className="mt-2 text-muted">For JAMAICA employees. Customers sign in from the store.</p>
          {noOwner && (
            <p className="mt-5 bg-jade px-4 py-3 text-white">This store has no owner yet. <Link href="/admin/setup" className="link font-semibold">Set up the owner account</Link></p>
          )}
          <LoginForm action={signIn} scope="staff" next="/admin" />
        </div>
      </div>
    </main>
  );
}
