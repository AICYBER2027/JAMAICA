"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Availability } from "@/lib/availability.ts";
import { bookedNights, bookingLink, clashes, formatDate, formatPrice, nightsLabel, whatsappLink, type Stay } from "@/lib/booking.ts";
import { addDays, diffDays, isISODate, parseISO, type ISODate } from "@/lib/dates.ts";
import type { Hotel } from "@/lib/hotels.ts";
import { fill, hotelDict, LANG_NAMES, LOCALES, t, type Lang } from "@/lib/i18n.ts";
import { PlaceScene, RoomScene } from "./Scenes.tsx";

type PublicHotel = Omit<Hotel, "adminPasswordHash">;

const FONTS = {
  bricolage: '"Bricolage Grotesque Variable", system-ui, sans-serif',
  newsreader: '"Newsreader Variable", Georgia, serif',
  figtree: '"Figtree Variable", system-ui, sans-serif',
} as const;

const BOARD_DAYS = 21;

function initialStay(a: Availability, init: { from?: string; to?: string; guests?: string }): Stay {
  const from = isISODate(init.from) && init.from >= a.today && init.from < a.to ? init.from : a.today;
  const to = isISODate(init.to) && init.to > from && diffDays(from, init.to) <= 30 ? init.to : addDays(from, 2);
  const guests = Math.min(Math.max(Number(init.guests) || 2, 1), 12);
  return { from, to, guests };
}

export function HotelView({
  hotel,
  availability,
  lang,
  brand,
  initial,
}: {
  hotel: PublicHotel;
  availability: Availability;
  lang: Lang;
  brand: string;
  initial: { from?: string; to?: string; guests?: string };
}) {
  const d = hotelDict(lang);
  const [stay, setStay] = useState<Stay>(() => initialStay(availability, initial));
  const [draft, setDraft] = useState<Stay>(stay);
  const [boardStart, setBoardStart] = useState<ISODate>(availability.today);
  const draftError = draft.to <= draft.from ? d.datesError : "";

  // Previews on the sales page open at a section. A #hash would scroll the parent page too, so scroll only this window.
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    const el = view ? document.getElementById(view) : null;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, []);

  const booked = useMemo(
    () => Object.fromEntries(hotel.rooms.map((r) => [r.id, bookedNights(availability.rooms[r.id])])),
    [hotel.rooms, availability.rooms],
  );
  const status = hotel.rooms.map((room) => {
    const taken = clashes(booked[room.id], stay);
    return { room, taken, fits: room.guests >= stay.guests, free: taken.length === 0 && room.guests >= stay.guests };
  });
  const freeCount = status.filter((s) => s.free).length;

  const theme = {
    "--bg": hotel.theme.ground,
    "--surface": hotel.theme.surface,
    "--ink": hotel.theme.ink,
    "--accent": hotel.theme.accent,
    "--accent-ink": hotel.theme.accentInk,
    "--focus": hotel.theme.accent,
    "--font": FONTS[hotel.theme.font] ?? FONTS.figtree,
    "--scene-sky": hotel.theme.surface,
    "--scene-a": hotel.theme.accent,
    "--scene-ink": hotel.theme.ink,
    "--scene-ground": hotel.theme.ground,
  } as CSSProperties;

  function apply(next: Stay) {
    if (next.to <= next.from) return;
    setStay(next);
    setDraft(next);
    const url = new URL(window.location.href);
    url.searchParams.set("from", next.from);
    url.searchParams.set("to", next.to);
    url.searchParams.set("guests", String(next.guests));
    window.history.replaceState(null, "", url);
  }

  function startOn(day: ISODate, roomId: string) {
    const length = Math.max(1, diffDays(stay.from, stay.to));
    apply({ ...stay, from: day, to: addDays(day, length) });
    document.getElementById(`room-${roomId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const wa = (room?: string) =>
    hotel.whatsapp ? whatsappLink({ number: hotel.whatsapp, hotel: hotel.name, room, stay, lang, d }) : undefined;
  const boardDays = Array.from({ length: BOARD_DAYS }, (_, i) => addDays(boardStart, i));
  const lastStart = addDays(availability.to, -BOARD_DAYS);
  const otherLangs = hotel.languages.filter((l) => l !== lang);
  const query = `?from=${stay.from}&to=${stay.to}&guests=${stay.guests}`;

  return (
    <div className="hotel" style={theme}>
      <header className="h-bar">
        <a className="h-wordmark" href={`/${lang}/h/${hotel.slug}`}>
          {hotel.name}
        </a>
        <nav className="h-nav" aria-label={hotel.name}>
          <a href="#rooms">{d.rooms}</a>
          <a href="#availability">{d.availability}</a>
          {hotel.gallery && hotel.gallery.length > 0 && <a href="#photos">{d.photos}</a>}
          <a href="#location">{d.location}</a>
        </nav>
        <div className="h-bar-end">
          {otherLangs.length > 0 && (
            <ul className="h-langs" aria-label={d.language}>
              {otherLangs.map((l) => (
                <li key={l}>
                  <a href={`/${l}/h/${hotel.slug}${query}`} hrefLang={l} lang={l}>
                    {LANG_NAMES[l]}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {wa() && (
            <a className="h-button" href={wa()} target="_blank" rel="noopener">
              {d.whatsapp}
            </a>
          )}
        </div>
      </header>

      <section className="h-hero" aria-labelledby="hotel-name">
        <div className="h-hero-text">
          <h1 id="hotel-name">{hotel.name}</h1>
          <p className="h-tagline">{t(hotel.tagline, lang)}</p>
          <p className="h-town">{t(hotel.town, lang)}</p>
        </div>
        <div className="h-hero-picture">
          {hotel.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.photo} alt={t(hotel.photoAlt, lang) || hotel.name} width={1200} height={1500} fetchPriority="high" />
          ) : (
            <PlaceScene name={hotel.scene ?? "sea"} title={`${hotel.name}, ${t(hotel.town, lang)}`} />
          )}
        </div>
        <form
          className="h-dates"
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft);
            document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <label>
            <span>{d.checkIn}</span>
            <input
              type="date"
              required
              min={availability.today}
              max={addDays(availability.to, -1)}
              value={draft.from}
              onChange={(e) => {
                const from = e.target.value;
                if (!isISODate(from)) return;
                const length = Math.max(1, diffDays(draft.from, draft.to));
                setDraft({ ...draft, from, to: draft.to > from ? draft.to : addDays(from, length) });
              }}
            />
          </label>
          <label>
            <span>{d.checkOut}</span>
            <input
              type="date"
              required
              min={addDays(draft.from, 1)}
              max={availability.to}
              value={draft.to}
              aria-describedby={draftError ? "dates-error" : undefined}
              onChange={(e) => isISODate(e.target.value) && setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <label>
            <span>{d.guests}</span>
            <select value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: Number(e.target.value) })}>
              {Array.from({ length: Math.max(...hotel.rooms.map((r) => r.guests), 4) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-button h-button-large" disabled={!!draftError}>
            {d.showFree}
          </button>
          {draftError && (
            <p id="dates-error" className="h-error" role="alert">
              {draftError}
            </p>
          )}
        </form>
      </section>

      <section id="rooms" className="h-rooms" aria-labelledby="rooms-title">
        <div className="h-section-head">
          <h2 id="rooms-title">{d.rooms}</h2>
          <p className="h-summary" aria-live="polite">
            {fill(d.freeCount, { free: freeCount, total: hotel.rooms.length, nights: nightsLabel(stay, d) })}
            {", "}
            {formatDate(stay.from, lang, true)} – {formatDate(stay.to, lang, true)}
          </p>
        </div>
        {freeCount === 0 && <p className="h-none">{d.noneFree}</p>}
        <ol className="h-room-list">
          {status.map(({ room, taken, fits, free }) => {
            const name = t(room.name, lang);
            const roomLabel = room.number ? `${fill(d.roomN, { n: room.number })}, ${name}` : name;
            const bookUrl = room.bookingUrl ?? hotel.bookingUrl;
            return (
              <li key={room.id} id={`room-${room.id}`} className={`h-room ${free ? "is-free" : "is-taken"}`}>
                <div className="h-room-picture">
                  {room.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.photo} alt={name} width={960} height={720} loading="lazy" />
                  ) : (
                    <RoomScene name={room.scene ?? "double"} title={name} />
                  )}
                  {room.number && (
                    <span className="h-room-number" aria-hidden="true">
                      {room.number}
                    </span>
                  )}
                </div>
                <div className="h-room-body">
                  <h3>
                    {room.number && <span className="visually-hidden">{fill(d.roomN, { n: room.number })}, </span>}
                    {name}
                  </h3>
                  <p className="h-room-facts">
                    {t(room.beds, lang)}, {fill(d.sleeps, { n: room.guests })}
                  </p>
                  <p>{t(room.description, lang)}</p>
                </div>
                <div className="h-room-side">
                  {room.price != null && (
                    <p className="h-price">
                      <strong>
                        {room.priceFrom
                          ? fill(d.fromPrice, { price: formatPrice(room.price, hotel.currency, lang) })
                          : formatPrice(room.price, hotel.currency, lang)}
                      </strong>{" "}
                      {d.perNight}
                    </p>
                  )}
                  <p className="h-status">
                    {!fits
                      ? fill(d.tooSmall, { n: room.guests })
                      : taken.length
                        ? fill(d.takenFor, { dates: taken.slice(0, 3).map((n) => formatDate(n, lang)).join(", ") + (taken.length > 3 ? "…" : "") })
                        : d.freeFor}
                  </p>
                  <div className="h-actions">
                    {hotel.whatsapp && (
                      <a className="h-button" href={wa(roomLabel)} target="_blank" rel="noopener">
                        {d.askWhatsapp}
                      </a>
                    )}
                    {bookUrl && (
                      <a className="h-link-button" href={bookingLink(bookUrl, stay)} target="_blank" rel="noopener">
                        {hotel.bookingSite ? fill(d.bookOn, { site: hotel.bookingSite }) : d.bookOnline}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {hotel.gallery && hotel.gallery.length > 0 && (
        <section id="photos" className="h-gallery" aria-labelledby="photos-title">
          <h2 id="photos-title">{d.photos}</h2>
          <ul>
            {hotel.gallery.map((g) => (
              <li key={g.src}>
                <a href={g.src} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt={t(g.alt, lang)} loading="lazy" width={1400} height={933} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="availability" className="h-board" aria-labelledby="board-title">
        <div className="h-section-head">
          <h2 id="board-title">{d.boardTitle}</h2>
          <p>{d.boardHelp}</p>
        </div>
        {availability.partial && <p className="h-note">{d.syncWarning}</p>}
        <div className="h-board-controls">
          <button type="button" className="h-link-button" disabled={boardStart <= availability.today} onClick={() => setBoardStart((s) => (addDays(s, -14) < availability.today ? availability.today : addDays(s, -14)))}>
            {d.earlier}
          </button>
          <p className="h-board-range">
            {new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", month: "long", year: "numeric" }).format(parseISO(boardStart))}
          </p>
          <button type="button" className="h-link-button" disabled={boardStart >= lastStart} onClick={() => setBoardStart((s) => (addDays(s, 14) > lastStart ? lastStart : addDays(s, 14)))}>
            {d.later}
          </button>
        </div>
        <div className="h-board-scroll" tabIndex={0} aria-label={d.boardTitle}>
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">{d.rooms}</span>
                </th>
                {boardDays.map((day) => {
                  const date = parseISO(day);
                  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                  return (
                    <th key={day} scope="col" className={weekend ? "is-weekend" : undefined}>
                      <span className="h-dow">{new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", weekday: "narrow" }).format(date)}</span>
                      <span className="h-dom">{date.getUTCDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hotel.rooms.map((room) => (
                <tr key={room.id}>
                  <th scope="row">
                    {room.number && <span className="h-board-number">{room.number}</span>}
                    <span className="h-board-name">{t(room.name, lang)}</span>
                  </th>
                  {boardDays.map((day) => {
                    const isTaken = booked[room.id].has(day);
                    const inStay = day >= stay.from && day < stay.to;
                    const label = `${t(room.name, lang)}, ${formatDate(day, lang, true)}: ${isTaken ? d.taken : d.free}`;
                    return (
                      <td key={day} className={`${isTaken ? "is-taken" : "is-free"}${inStay ? " in-stay" : ""}`}>
                        {isTaken ? (
                          <span className="h-cell" role="img" aria-label={label} />
                        ) : (
                          <button type="button" className="h-cell" aria-label={label} onClick={() => startOn(day, room.id)} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="h-legend">
          <li>
            <span className="h-key is-free" aria-hidden="true" /> {d.free}
          </li>
          <li>
            <span className="h-key is-taken" aria-hidden="true" /> {d.taken}
          </li>
          <li>
            <span className="h-key in-stay" aria-hidden="true" /> {d.stay}
          </li>
        </ul>
      </section>

      <section className="h-stay" aria-labelledby="stay-title">
        <h2 id="stay-title">{d.stay}</h2>
        <p className="h-about">{t(hotel.about, lang)}</p>
        <div className="h-stay-facts">
          {(hotel.checkIn || hotel.checkOut) && (
            <ul className="h-times">
              {hotel.checkIn && <li>{fill(d.arrive, { time: hotel.checkIn })}</li>}
              {hotel.checkOut && <li>{fill(d.leave, { time: hotel.checkOut })}</li>}
            </ul>
          )}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div>
              <h3>{d.included}</h3>
              <ul className="h-amenities">
                {hotel.amenities.map((a, i) => (
                  <li key={i}>{t(a, lang)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section id="location" className="h-location" aria-labelledby="location-title">
        <h2 id="location-title">{d.findUs}</h2>
        <div className="h-location-body">
          {hotel.address && <address>{hotel.address}</address>}
          <ul className="h-contact">
            {hotel.mapUrl && (
              <li>
                <a href={hotel.mapUrl} target="_blank" rel="noopener">
                  {d.openMap}
                </a>
              </li>
            )}
            {hotel.phone && (
              <li>
                <a href={`tel:${hotel.phone.replace(/[^\d+]/g, "")}`}>
                  {d.call}: {hotel.phone}
                </a>
              </li>
            )}
            {hotel.email && (
              <li>
                <a href={`mailto:${hotel.email}`}>
                  {d.email}: {hotel.email}
                </a>
              </li>
            )}
            {wa() && (
              <li>
                <a href={wa()} target="_blank" rel="noopener">
                  {d.askWhatsapp}
                </a>
              </li>
            )}
          </ul>
        </div>
      </section>

      <footer className="h-footer">
        <p className="h-footer-name">{hotel.name}</p>
        <p className="h-footer-by">
          <a href={`/${lang}`}>{fill(d.siteBy, { brand })}</a>
        </p>
      </footer>
    </div>
  );
}
