import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { OwnerSetupForm } from "@/components/auth/OwnerSetupForm";
import { needsOwner } from "@/app/actions/setup";

export const metadata: Metadata = { title: "Set up the store owner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OwnerSetup() {
  const open = await needsOwner();
  const enabled = (process.env.OWNER_SETUP_CODE?.length ?? 0) >= 12;
  return (
    <main className="grid min-h-svh bg-black text-white md:grid-cols-2">
      <div className="frame flex flex-col justify-between py-8">
        <Wordmark animate className="text-[1.4rem]" />
        <p className="hidden max-w-[36ch] text-mist md:block">This page creates the first owner of the store. It closes for good once an owner exists.</p>
      </div>
      <div className="frame flex items-center bg-paper py-16 text-ink">
        <div className="mx-auto w-full max-w-[420px]">
          <h1 className="text-[2.25rem]">Set up the owner</h1>
          {!open ? (
            <>
              <p className="mt-3 text-muted">This store already has an owner, so setup is closed.</p>
              <Link href="/admin/login" className="btn btn-dark mt-6">Go to team sign-in</Link>
            </>
          ) : !enabled ? (
            <div className="mt-4 flex flex-col gap-3">
              <p>Setup is switched off until you choose a setup code:</p>
              <ol className="list-decimal pl-5 text-[0.95rem]">
                <li>In Vercel, open your project → Settings → Environment Variables.</li>
                <li>Add <strong>OWNER_SETUP_CODE</strong> with any secret phrase of 12 or more characters.</li>
                <li>Redeploy, then reload this page.</li>
              </ol>
              <p className="text-small text-muted">After you’ve created the owner, delete OWNER_SETUP_CODE again.</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-muted">Enter the setup code you put in Vercel, then choose your own sign-in details. Nobody else ever sees your password.</p>
              <OwnerSetupForm />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
