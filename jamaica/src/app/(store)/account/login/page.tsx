import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { signIn } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  if (await getUser()) redirect(safe);
  return (
    <div className="frame grid min-h-[70svh] place-items-center py-16">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[2.5rem]">Sign in</h1>
        <p className="mt-2 text-muted">See your orders and check out faster.</p>
        <LoginForm action={signIn} scope="customer" next={safe} />
        <p className="mt-6">New here? <Link href={`/account/register?next=${encodeURIComponent(safe)}`} className="link font-semibold">Create an account</Link></p>
      </div>
    </div>
  );
}
