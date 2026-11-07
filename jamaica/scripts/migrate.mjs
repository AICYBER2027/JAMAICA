// Applies db/migrations/*.sql in order, once each.
import { dbOptions } from "./env.mjs";
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";

const sql = postgres(process.env.DATABASE_URL, dbOptions(process.env.DATABASE_URL));
await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
await sql`alter table schema_migrations enable row level security`;
const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  if (done.has(file)) continue;
  const body = readFileSync(`db/migrations/${file}`, "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`insert into schema_migrations (name) values (${file})`;
  });
  console.log(`applied ${file}`);
}
console.log("database is up to date");
await sql.end();
