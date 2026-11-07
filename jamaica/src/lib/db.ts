import "server-only";
import postgres from "postgres";

declare global {
  var __jamaicaSql: postgres.Sql | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See jamaica/.env.example.");
  return postgres(url, dbOptions(url));
}

/**
 * prepare:false keeps us compatible with Supabase's transaction pooler (Supavisor, port 6543).
 * Connections to anything but this computer are encrypted (Supabase requires SSL).
 */
export function dbOptions(url: string): postgres.Options<Record<string, never>> {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url);
  return {
    prepare: false,
    ssl: local ? false : "require",
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  };
}

/** Shared connection pool (reused across hot reloads in dev). */
export const sql: postgres.Sql = globalThis.__jamaicaSql ?? (globalThis.__jamaicaSql = connect());
