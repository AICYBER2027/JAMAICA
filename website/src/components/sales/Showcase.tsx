"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Availability } from "@/lib/availability.ts";
import { bookedNights, formatDate, whatsappLink } from "@/lib/booking.ts";
import { addDays, parseISO, type ISODate } from "@/lib/dates.ts";
import { fill, LOCALES, type HotelDict, type Lang } from "@/lib/i18n.ts";
import type { SalesCopy } from "@/lib/sales-copy.ts";
import { Portrait } from "./Portrait.tsx";

const DAYS = 14;

type Room = { id: string; number?: string; name: string; guests: number };

// One frame stays in the middle of the screen while the reader scrolls through three stages:
// the hotel's rooms, its live calendar (which the visitor can tap), and the WhatsApp message that tap writes.
export function Showcase({
  lang,
  copy,
  hotel,
  availability,
  dict,
}: {
  lang: Lang;
  copy: SalesCopy;
  hotel: { name: string; slug: string; whatsapp: string; rooms: Room[] };
  availability: Availability;
  dict: HotelDict;
}) {
  const [stage, setStage] = useState(0);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(availability.today, i));
  const booked = useMemo(
    () => Object.fromEntries(hotel.rooms.map((r) => [r.id, bookedNights(availability.rooms[r.id])])),
    [hotel.rooms, availability.rooms],
  );
  const firstFree = useMemo(() => {
    for (const day of days) for (const r of hotel.rooms) if (!booked[r.id].has(day)) return { room: r.id, day };
    return { room: hotel.rooms[0].id, day: days[0] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booked]);
  const [pick, setPick] = useState<{ room: string; day: ISODate }>(firstFree);
  const room = hotel.rooms.find((r) => r.id === pick.room) ?? hotel.rooms[0];
  const stay = { from: pick.day, to: addDays(pick.day, 2), guests: Math.min(2, room.guests) };
  const link = whatsappLink({
    number: hotel.whatsapp,
    hotel: hotel.name,
    room: room.number ? `${fill(dict.roomN, { n: room.number })}, ${room.name}` : room.name,
    stay,
    lang,
    d: dict,
  });
  const message = decodeURIComponent(link.split("text=")[1] ?? "");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, []);

  function choose(roomId: string, day: ISODate) {
    setPick({ room: roomId, day });
    markers.current[2]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const captions = [copy.showcaseStage1, copy.showcaseStage2, copy.showcaseStage3];
  const weekday = new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", weekday: "narrow" });

  return (
    <section className="s-show" data-stage={stage} aria-labelledby="show-title">
      <div className="s-show-stage">
        <h2 id="show-title" className="s-show-title">
          <span className="s-show-a">{copy.showcaseA}</span>{" "}
          <span className="s-show-b">{copy.showcaseB}</span>
        </h2>
        <div className="s-show-frame" data-ui>
          <div className="s-show-layer s-show-1" aria-hidden={stage !== 0}>
            <Portrait
              className="s-show-site"
              href={`/${lang}/h/${hotel.slug}`}
              src={`/${lang}/h/${hotel.slug}?from=${firstFree.day}&to=${addDays(firstFree.day, 2)}&guests=2&view=rooms`}
              label={fill(copy.seeSite, { hotel: hotel.name })}
              ratio={1.25}
            />
          </div>
          <div className="s-show-layer s-show-2" aria-hidden={stage !== 1}>
            <p className="s-show-try">{copy.tryIt}</p>
            <table className="s-mini-board">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">{dict.rooms}</span>
                  </th>
                  {days.map((d) => (
                    <th key={d} scope="col">
                      <span>{weekday.format(parseISO(d))}</span>
                      {parseISO(d).getUTCDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hotel.rooms.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.number ?? r.name.slice(0, 2)}</th>
                    {days.map((d) => {
                      const taken = booked[r.id].has(d);
                      const chosen = pick.room === r.id && d >= pick.day && d < stay.to;
                      const label = `${r.number ? fill(dict.roomN, { n: r.number }) : r.name}, ${formatDate(d, lang, true)}: ${taken ? dict.taken : dict.free}`;
                      return (
                        <td key={d} className={taken ? "is-taken" : chosen ? "is-chosen" : "is-free"}>
                          {taken ? (
                            <span role="img" aria-label={label} />
                          ) : (
                            <button type="button" aria-label={label} tabIndex={stage === 1 ? 0 : -1} onClick={() => choose(r.id, d)} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="s-show-layer s-show-3" aria-hidden={stage !== 2}>
            <p className="s-chat-head">
              {hotel.name}
              <small>WhatsApp</small>
            </p>
            <div className="s-chat">
              <p className="s-show-try">{copy.waPreview}</p>
              <p className="s-bubble">{message}</p>
            </div>
          </div>
        </div>
        <p className="s-show-caption" aria-live="polite">
          {captions[stage]}
        </p>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => {
            markers.current[i] = el;
          }}
          className="s-show-marker"
          data-stage={i}
          aria-hidden="true"
        />
      ))}
    </section>
  );
}
