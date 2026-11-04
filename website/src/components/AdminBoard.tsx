"use client";

import { useState } from "react";
import type { Availability } from "@/lib/availability.ts";
import { formatDate } from "@/lib/booking.ts";
import { addDays, parseISO, type ISODate } from "@/lib/dates.ts";
import { adminDict, fill, LOCALES, type Lang } from "@/lib/i18n.ts";

const WEEKS = 5;

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; reason: string };

export function AdminBoard({
  slug,
  lang,
  rooms,
  availability,
}: {
  slug: string;
  lang: Lang;
  rooms: { id: string; number?: string; name: string }[];
  availability: Availability;
}) {
  const d = adminDict(lang);
  const [manual, setManual] = useState<Record<string, Set<ISODate>>>(() =>
    Object.fromEntries(rooms.map((r) => [r.id, new Set(availability.rooms[r.id]?.manual ?? [])])),
  );
  const synced = Object.fromEntries(rooms.map((r) => [r.id, new Set(availability.rooms[r.id]?.synced ?? [])]));
  const [start, setStart] = useState<ISODate>(availability.today);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
  const last = addDays(availability.to, -WEEKS * 7);

  async function toggle(room: string, night: ISODate) {
    const booked = !manual[room].has(night);
    const flip = (on: boolean) =>
      setManual((m) => {
        const next = new Set(m[room]);
        if (on) next.add(night);
        else next.delete(night);
        return { ...m, [room]: next };
      });
    flip(booked);
    setStatus({ kind: "saving" });
    try {
      const res = await fetch(`/api/hotels/${slug}/blocks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, night, booked }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? res.statusText);
      }
      setStatus({ kind: "saved" });
    } catch (err) {
      flip(!booked);
      setStatus({ kind: "error", reason: err instanceof Error ? err.message : String(err) });
    }
  }

  const month = new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", month: "long", year: "numeric" });

  return (
    <section className="a-board" aria-label={d.title}>
      <div className="a-controls">
        <button type="button" className="a-step" disabled={start <= availability.today} onClick={() => setStart((s) => (addDays(s, -28) < availability.today ? availability.today : addDays(s, -28)))} aria-label={d.earlier}>
          ‹
        </button>
        <p className="a-month">{month.format(parseISO(start))}</p>
        <button type="button" className="a-step" disabled={start >= last} onClick={() => setStart((s) => (addDays(s, 28) > last ? last : addDays(s, 28)))} aria-label={d.later}>
          ›
        </button>
        <p className={`a-status is-${status.kind}`} role="status">
          {status.kind === "saving" ? d.saving : status.kind === "saved" ? d.saved : status.kind === "error" ? fill(d.saveFailed, { reason: status.reason }) : ""}
        </p>
      </div>

      <div className="a-rooms">
        {rooms.map((room) => (
          <div key={room.id} className="a-room">
            <h2>
              {room.number && <span className="a-number">{room.number}</span>} {room.name}
            </h2>
            <ol className="a-days">
              {days.map((day) => {
                const date = parseISO(day);
                const isSynced = synced[room.id].has(day);
                const isManual = manual[room.id].has(day);
                const state = isSynced ? d.synced : isManual ? d.manual : d.free;
                const firstOfMonth = date.getUTCDate() === 1 || day === start;
                return (
                  <li key={day}>
                    <button
                      type="button"
                      className={`a-day ${isSynced ? "is-synced" : isManual ? "is-manual" : "is-free"}`}
                      disabled={isSynced}
                      aria-pressed={isSynced ? undefined : isManual}
                      aria-label={`${room.name}, ${formatDate(day, lang, true)}: ${state}`}
                      onClick={() => toggle(room.id, day)}
                    >
                      <span className="a-dow">{new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", weekday: "short" }).format(date)}</span>
                      <span className="a-dom">{firstOfMonth ? formatDate(day, lang) : date.getUTCDate()}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <ul className="a-legend">
        <li>
          <span className="a-key is-free" aria-hidden="true" /> {d.free}
        </li>
        <li>
          <span className="a-key is-manual" aria-hidden="true" /> {d.manual}
        </li>
        <li>
          <span className="a-key is-synced" aria-hidden="true" /> {d.synced}
        </li>
      </ul>
    </section>
  );
}
