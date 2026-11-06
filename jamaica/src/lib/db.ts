import "server-only";
import postgres from "postgres";

declare global {
  var __jamaicaSql: postgres.Sql | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See jamaica/.env.example.");
  // prepare:false keeps us compatible with Supabase's transaction pooler (pgbouncer).
  return postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10, idle_timeout: 20, onnotice: () => {} });
}

/** Shared connection pool (reused across hot reloads in dev). */
export const sql: postgres.Sql = globalThis.__jamaicaSql ?? (globalThis.__jamaicaSql = connect());
