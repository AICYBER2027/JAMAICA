import "server-only";
import { sql } from "./db";
import { bucketStatus, storageMode } from "./storage";

export type Check = { name: string; ok: boolean; detail: string; fix?: string };

const REQUIRED_ENV = ["DATABASE_URL", "SESSION_SECRET", "SITE_URL", "CRON_SECRET"] as const;
const EXPECTED_MIGRATIONS = ["001_init.sql", "002_auth_attempts.sql", "003_tryon_steps.sql"];

/**
 * Everything the store needs to run, checked live. Reports setting NAMES only, never values.
 */
export async function systemChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.SUPABASE_URL && !secretKey) missing.push("SUPABASE_SECRET_KEY" as never);
  if (!process.env.SUPABASE_URL && secretKey) missing.push("SUPABASE_URL" as never);
  checks.push({
    name: "Settings",
    ok: missing.length === 0 && (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    detail: missing.length ? `Missing: ${missing.join(", ")}` : (process.env.SESSION_SECRET?.length ?? 0) < 32 ? "SESSION_SECRET is shorter than 32 characters" : "All required settings are present",
    fix: missing.length ? "Add them in Vercel → Project → Settings → Environment Variables, then redeploy." : undefined,
  });

  try {
    const started = Date.now();
    const [db] = await sql<{ version: string; host: string }[]>`select split_part(version(), ' ', 2) as version, current_database() as host`;
    checks.push({ name: "Database connection", ok: true, detail: `PostgreSQL ${db.version}, answered in ${Date.now() - started} ms` });

    const applied = (await sql<{ name: string }[]>`select name from schema_migrations`.catch(() => [])).map((r) => r.name);
    const notApplied = EXPECTED_MIGRATIONS.filter((m) => !applied.includes(m));
    checks.push({
      name: "Database tables",
      ok: notApplied.length === 0,
      detail: notApplied.length ? `Not set up: ${notApplied.join(", ")}` : `All ${EXPECTED_MIGRATIONS.length} schema steps applied`,
      fix: notApplied.length ? "Run jamaica/db/supabase-setup.sql once in Supabase → SQL Editor (new projects), or npm run db:migrate." : undefined,
    });

    const [c] = await sql<{ products: number; active: number; categories: number; owners: number }[]>`
      select (select count(*) from products)::int as products, (select count(*) from products where status = 'active')::int as active,
        (select count(*) from categories)::int as categories, (select count(*) from users where role = 'owner' and active)::int as owners`;
    checks.push({ name: "Catalogue", ok: c.active > 0, detail: `${c.active} products on sale (${c.products} in total), ${c.categories} categories`, fix: c.active ? undefined : "Add products in Dashboard → Products, or load the sample catalogue." });
    checks.push({ name: "Owner account", ok: c.owners > 0, detail: c.owners ? `${c.owners} owner account${c.owners > 1 ? "s" : ""}` : "No owner yet", fix: c.owners ? undefined : "Create it at /admin/setup." });
  } catch (e) {
    checks.push({
      name: "Database connection",
      ok: false,
      detail: describeDbError(e as Error & { code?: string }),
      fix: "Check DATABASE_URL: use Supabase's Transaction pooler string (port 6543) with your database password filled in.",
    });
  }

  if (storageMode() === "local") {
    checks.push({
      name: "File storage",
      ok: process.env.NODE_ENV !== "production",
      detail: "Uploads are saved on this server's disk",
      fix: process.env.NODE_ENV === "production" ? "Set SUPABASE_URL and SUPABASE_SECRET_KEY so uploads go to Supabase Storage (Vercel's disk is wiped on every deploy)." : undefined,
    });
  } else {
    for (const b of await bucketStatus()) {
      const wantPublic = b.role === "public";
      const ok = b.exists && b.public === wantPublic;
      checks.push({
        name: `Storage bucket “${b.name}”`,
        ok,
        detail: b.error ? `Couldn’t check: ${b.error}` : !b.exists ? "Doesn’t exist" : b.public === wantPublic ? (wantPublic ? "Exists and is public" : "Exists and is private") : wantPublic ? "Exists but is private, so product photos won’t show" : "Exists but is PUBLIC, so customers’ try-on photos would be visible",
        fix: ok ? undefined : `In Supabase → Storage, ${b.exists ? "edit" : "create"} the bucket “${b.name}” and set it to ${wantPublic ? "Public" : "Private"}.`,
      });
    }
  }
  return checks;
}

/** Turns driver errors into something a store owner can act on, without echoing the connection string. */
function describeDbError(e: Error & { code?: string }): string {
  const m = e.message || String(e);
  if (/DATABASE_URL is not set/.test(m)) return "DATABASE_URL is not set";
  if (e.code === "28P01" || /password authentication failed/i.test(m)) return "The database password in DATABASE_URL is wrong";
  if (e.code === "ENOTFOUND" || /getaddrinfo/i.test(m)) return "The database address in DATABASE_URL can’t be found";
  if (e.code === "ETIMEDOUT" || e.code === "CONNECT_TIMEOUT" || /timeout/i.test(m)) return "The database didn’t answer in time";
  if (/Tenant or user not found/i.test(m)) return "Supabase doesn’t recognise the user in DATABASE_URL (it should look like postgres.<project-ref>)";
  if (e.code === "42P01") return "The tables don’t exist yet";
  return `Connection failed (${e.code ?? "error"})`;
}
