"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { destroySession, hashPassword, requireCustomer, verifyPassword } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";
import type { FormState } from "./auth";

export async function updateProfile(_p: FormState, f: FormData): Promise<FormState> {
  const u = await requireCustomer();
  const name = String(f.get("name") ?? "").trim();
  const phone = String(f.get("phone") ?? "").replace(/\D/g, "");
  if (name.length < 2) return { error: "Enter your name." };
  if (phone && !/^\d{10,11}$/.test(phone)) return { error: "Enter a phone number with area code." };
  await sql`update users set name = ${name}, phone = ${phone} where id = ${u.id}`;
  return { ok: true, message: "Saved." };
}

export async function changePassword(_p: FormState, f: FormData): Promise<FormState> {
  const u = await requireCustomer();
  const current = String(f.get("current") ?? "");
  const next = String(f.get("next") ?? "");
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${u.id}`;
  if (!(await verifyPassword(current, row.password_hash))) return { error: "Your current password isn’t right." };
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${u.id}`;
  return { ok: true, message: "Password changed." };
}

export async function deleteAccount(password: string): Promise<{ error?: string }> {
  const u = await requireCustomer();
  if (u.role === "owner") return { error: "Owners can’t delete their account from here. Hand ownership to someone else first." };
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${u.id}`;
  if (!(await verifyPassword(password, row.password_hash))) return { error: "That password isn’t right." };
  const photos = await sql<{ storage_path: string }[]>`select storage_path from tryon_photos where user_id = ${u.id}`;
  for (const p of photos) await deleteObject("private", p.storage_path).catch(() => {});
  await sql`delete from tryon_photos where user_id = ${u.id}`;
  await destroySession();
  await sql`delete from users where id = ${u.id}`;
  redirect("/?account=deleted");
}
