import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import type { ISODate } from "./dates.ts";

// Days a hotel marks as booked by hand, per room.
// Production: Postgres (DATABASE_URL). Local development: a JSON file.

export class StoreUnavailableError extends Error {}

type Sql = ReturnType<typeof postgres>;
let sql: Sql | null = null;
let ready: Promise<unknown> | null = null;

function db(): Sql | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!sql) {
    sql = postgres(url, { max: 3, idle_timeout: 20, prepare: false });
    ready = sql`
      create table if not exists manual_blocks (
        hotel text not null,
        room  text not null,
        night date not null,
        primary key (hotel, room, night)
      )`;
  }
  return sql;
}

const FILE = path.join(process.cwd(), "data", ".local-blocks.json");
type FileData = Record<string, Record<string, ISODate[]>>; // hotel -> room -> nights

async function readFileData(): Promise<FileData> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as FileData;
  } catch {
    return {};
  }
}

function fileStoreAllowed(): boolean {
  // Vercel's file system is read-only and not shared between servers.
  return !process.env.VERCEL;
}

/** room id -> set of nights marked booked by hand, within [from, to). */
export async function getManualBlocks(hotel: string, from: ISODate, to: ISODate): Promise<Map<string, Set<ISODate>>> {
  const out = new Map<string, Set<ISODate>>();
  const add = (room: string, night: ISODate) => {
    if (!out.has(room)) out.set(room, new Set());
    out.get(room)!.add(night);
  };
  const s = db();
  if (s) {
    try {
      await ready;
      const rows = await s<{ room: string; night: string }[]>`
        select room, to_char(night, 'YYYY-MM-DD') as night from manual_blocks
        where hotel = ${hotel} and night >= ${from} and night < ${to}`;
      for (const r of rows) add(r.room, r.night);
    } catch (err) {
      console.error("manual_blocks read failed", err);
    }
    return out;
  }
  const data = (await readFileData())[hotel] ?? {};
  for (const [room, nights] of Object.entries(data)) for (const n of nights) if (n >= from && n < to) add(room, n);
  return out;
}

export async function setManualBlock(hotel: string, room: string, night: ISODate, booked: boolean): Promise<void> {
  const s = db();
  if (s) {
    await ready;
    if (booked) await s`insert into manual_blocks (hotel, room, night) values (${hotel}, ${room}, ${night}) on conflict do nothing`;
    else await s`delete from manual_blocks where hotel = ${hotel} and room = ${room} and night = ${night}`;
    return;
  }
  if (!fileStoreAllowed()) {
    throw new StoreUnavailableError("no database is connected. Add DATABASE_URL in Vercel (Storage → Postgres).");
  }
  const data = await readFileData();
  const nights = new Set(data[hotel]?.[room] ?? []);
  if (booked) nights.add(night);
  else nights.delete(night);
  data[hotel] = { ...(data[hotel] ?? {}), [room]: [...nights].sort() };
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(data, null, 2));
}
