import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <div className="frame grid min-h-[70svh] place-items-center py-16">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[2.5rem]">Create an account</h1>
        <p className="mt-2 text-muted">Orders you placed as a guest with the same email appear in your account.</p>
        <RegisterForm next={safe} />
        <p className="mt-6">Already have one? <Link href={`/account/login?next=${encodeURIComponent(safe)}`} className="link font-semibold">Sign in</Link></p>
      </div>
    </div>
  );
}
