// Loads .env for scripts run outside Next.js (Node 20.12+ has process.loadEnvFile).
import { existsSync } from "node:fs";
if (existsSync(".env") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

/** Same connection options as the app: no prepared statements (pooler), SSL except on this computer. */
export function dbOptions(url) {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url);
  return { prepare: false, ssl: local ? false : "require", connect_timeout: 15, onnotice: () => {} };
}
