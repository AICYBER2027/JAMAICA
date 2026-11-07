"use server";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, hashPassword, recordFailedAttempt, tooManyAttempts } from "@/lib/auth";
import type { FormState } from "./auth";

/** True while the store has no active owner. */
export async function needsOwner(): Promise<boolean> {
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from users where role = 'owner' and active`;
  return r.n === 0;
}

function codeMatches(given: string): boolean {
  const expected = process.env.OWNER_SETUP_CODE ?? "";
  if (expected.length < 12) return false;
  // Compare fixed-length digests so neither length nor content leaks through timing.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const Owner = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(12, "Use at least 12 characters for the owner password.").max(200),
});

/**
 * Creates the first owner. Only works while there is no owner and only with OWNER_SETUP_CODE,
 * which the store owner sets in Vercel and removes afterwards.
 */
export async function createFirstOwner(_prev: FormState, form: FormData): Promise<FormState> {
  const fields = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!process.env.OWNER_SETUP_CODE || process.env.OWNER_SETUP_CODE.length < 12) {
    return { error: "Setup is switched off. Add OWNER_SETUP_CODE (12+ characters) in Vercel, redeploy, then try again.", fields };
  }
  if (await tooManyAttempts("owner-setup")) return { error: "Too many attempts. Wait 15 minutes and try again.", fields };
  if (!codeMatches(String(form.get("code") ?? ""))) {
    await recordFailedAttempt("owner-setup");
    return { error: "That setup code doesn’t match OWNER_SETUP_CODE.", fields };
  }
  const parsed = Owner.safeParse({ ...fields, password: String(form.get("password") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  if (form.get("password") !== form.get("confirm")) return { error: "The two passwords don’t match.", fields };

  const hash = await hashPassword(parsed.data.password);
  const id = await sql.begin(async (tx) => {
    // One setup at a time, and never once an owner exists.
    await tx`select pg_advisory_xact_lock(4242001)`;
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from users where role = 'owner' and active`;
    if (n > 0) return null;
    const [u] = await tx<{ id: string }[]>`
      insert into users (email, name, password_hash, role, permissions)
      values (${parsed.data.email}, ${parsed.data.name}, ${hash}, 'owner', '{}')
      on conflict (email) do update set role = 'owner', password_hash = excluded.password_hash, name = excluded.name, active = true
      returning id`;
    return u.id;
  });
  if (!id) return { error: "An owner account already exists. Sign in instead.", fields };
  await sql`delete from sessions where user_id = ${id}`;
  await createSession(id);
  redirect("/admin?setup=done");
}
