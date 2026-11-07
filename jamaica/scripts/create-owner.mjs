// Creates (or resets the password of) the store owner, who can then add employees from the dashboard.
// Usage: npm run create-owner -- owner@example.com "Owner Name" "a long password"
import { dbOptions } from "./env.mjs";
import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error('usage: npm run create-owner -- <email> "<name>" "<password>"');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use a password of at least 10 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const stored = ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");

const sql = postgres(process.env.DATABASE_URL, dbOptions(process.env.DATABASE_URL));
const [u] = await sql`
  insert into users (email, name, password_hash, role)
  values (${email.toLowerCase()}, ${name}, ${stored}, 'owner')
  on conflict (email) do update set password_hash = excluded.password_hash, role = 'owner', active = true
  returning id`;
await sql`delete from sessions where user_id = ${u.id}`;
console.log(`Owner ready: ${email}. Sign in at /admin/login`);
await sql.end();
