"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, destroySession, hashPassword, recordFailedAttempt, tooManyAttempts, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: boolean; message?: string };

const safeNext = (n: unknown, fallback: string) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : fallback);

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const scope = form.get("scope") === "staff" ? "staff" : "customer";
  const fields = { email };
  if (!email || !password) return { error: "Enter your email and password.", fields };
  if (await tooManyAttempts(email)) return { error: "Too many attempts. Wait 15 minutes and try again.", fields };

  const [u] = await sql<{ id: string; password_hash: string; role: string; active: boolean }[]>`
    select id, password_hash, role, active from users where email = ${email}`;
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, u?.password_hash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!u || !ok || !u.active) {
    await recordFailedAttempt(email);
    return { error: "That email and password don't match an account.", fields };
  }
  if (scope === "staff" && u.role === "customer") return { error: "This account is a customer account. Sign in from the store instead.", fields };
  await createSession(u.id);
  redirect(safeNext(form.get("next"), scope === "staff" ? "/admin" : "/account"));
}

const Register = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
});

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") };
  const parsed = Register.safeParse(raw);
  const fields = { name: raw.name, email: raw.email };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const hash = await hashPassword(parsed.data.password);
  const [u] = await sql<{ id: string }[]>`
    insert into users (email, name, password_hash) values (${parsed.data.email}, ${parsed.data.name}, ${hash})
    on conflict (email) do nothing returning id`;
  if (!u) return { error: "There's already an account with this email. Sign in instead.", fields };
  // Link earlier guest orders placed with this email to the new account.
  await sql`update orders set user_id = ${u.id} where email = ${parsed.data.email} and user_id is null`;
  await createSession(u.id);
  redirect(safeNext(form.get("next"), "/account"));
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
