"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Availability } from "@/lib/availability.ts";
import { bookedNights, bookingLink, clashes, formatDate, formatPrice, nightsLabel, whatsappLink, type Stay } from "@/lib/booking.ts";
import { addDays, diffDays, isISODate, parseISO, type ISODate } from "@/lib/dates.ts";
import type { Hotel } from "@/lib/hotels.ts";
import { fill, hotelDict, LANG_NAMES, LOCALES, t, type Lang } from "@/lib/i18n.ts";
import { PlaceScene, RoomScene } from "./Scenes.tsx";

type PublicHotel = Omit<Hotel, "adminPasswordHash">;

const BOARD_DAYS = 21;

function initialStay(a: Availability, init: { from?: string; to?: string; guests?: string }): Stay {
  const from = isISODate(init.from) && init.from >= a.today && init.from < a.to ? init.from : a.today;
  const to = isISODate(init.to) && init.to > from && diffDays(from, init.to) <= 30 ? init.to : addDays(from, 2);
  const guests = Math.min(Math.max(Number(init.guests) || 2, 1), 12);
  return { from, to, guests };
}

/** "Canasvieiras, Florianópolis" -> ["Canasvieiras", "Florianópolis"] */
function placeParts(town: string): [string, string] {
  const [first, ...rest] = town.split(",").map((s) => s.trim());
  return [first, rest.join(", ")];
}

/** Where to break a long place name over two lines on a phone: a space, or a syllable edge near the middle. */
function splitName(name: string): [string, string] {
  if (name.length <= 8) return [name, ""];
  const space = name.indexOf(" ");
  if (space > 0) return [name.slice(0, space), name.slice(space + 1)];
  const vowel = /[aeiouáéíóúâêôãõày]/i;
  const mid = name.length / 2;
  let best = Math.round(mid);
  let bestScore = Infinity;
  for (let i = 3; i <= name.length - 3; i++) {
    const edge = !vowel.test(name[i - 1]) && !vowel.test(name[i]) ? 0 : !vowel.test(name[i]) && vowel.test(name[i - 1]) ? 1 : 3;
    const score = edge * 2 + Math.abs(i - mid);
    if (score < bestScore) [best, bestScore] = [i, score];
  }
  return [name.slice(0, best), name.slice(best)];
}

function WhatsAppMark() {
  return (
    <svg className="pc-wa" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"
      />
    </svg>
  );
}

/** Round postmark: the town around the ring, the dates in the middle. Re-stamps when the dates change. */
function Postmark({ town, line1, line2, stampKey }: { town: string; line1: string; line2: string; stampKey: string }) {
  const id = `ring-${stampKey.replace(/\W/g, "")}`;
  return (
    <svg key={stampKey} className="pc-postmark" viewBox="0 0 260 160" aria-hidden="true">
      <defs>
        <path id={id} d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" />
      </defs>
      <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="80" cy="80" r="44" fill="none" stroke="currentColor" strokeWidth="2" />
      <text fontSize="13" fontWeight="700" letterSpacing="2.5" fill="currentColor">
        <textPath href={`#${id}`} startOffset="0">
          {`${town.toUpperCase()}   ${town.toUpperCase()}   `}
        </textPath>
      </text>
      <text x="80" y="77" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
        {line1}
      </text>
      <text x="80" y="96" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
        {line2}
      </text>
      {/* the wavy cancellation lines */}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M150 ${56 + i * 16} q 13 -8 26 0 t 26 0 t 26 0 t 26 0`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
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
  const [boardStart, setBoardStart] = useState<ISODate>(availability.today);
  const lettersRef = useRef<HTMLSpanElement>(null);

  // Fit the town's name exactly across the width, whatever its length and the face's real metrics.
  useLayoutEffect(() => {
    const box = lettersRef.current;
    const word = box?.querySelector<HTMLElement>(".pc-letters-fill");
    if (!box || !word) return;
    const fit = () => {
      box.style.fontSize = "100px";
      const lines = [...word.querySelectorAll<HTMLElement>(".pc-line")];
      const stacked = lines.length > 1 && getComputedStyle(lines[0]).display === "block";
      const widest = stacked ? Math.max(...lines.map((l) => l.getBoundingClientRect().width)) : word.getBoundingClientRect().width;
      const ratio = box.clientWidth / widest;
      box.style.fontSize = `${Math.min(100 * ratio * 0.97, 260)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

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
  const prices = hotel.rooms.map((r) => r.price).filter((p): p is number => typeof p === "number");
  const lowest = prices.length ? Math.min(...prices) : undefined;
  const maxGuests = Math.max(...hotel.rooms.map((r) => r.guests), 4);
  const [place, region] = placeParts(t(hotel.town, lang));
  const [nameA, nameB] = splitName(place);

  const theme = {
    "--field": hotel.theme.accent,
    "--field-ink": hotel.theme.accentInk,
    "--ink": hotel.theme.ink,
    "--tint": hotel.theme.surface,
    "--paper-tone": hotel.theme.ground,
    "--focus": "#d42a32",
    "--scene-sky": hotel.theme.surface,
    "--scene-a": hotel.theme.accent,
    "--scene-ink": hotel.theme.ink,
    "--scene-ground": hotel.theme.ground,
    "--hero-photo": hotel.photo ? `url("${hotel.photo}")` : "none",
    "--hero-focus": hotel.photoFocus ?? "50% 50%",
    "--letters": String(Math.max(place.length, 6)),
  } as CSSProperties;

  function apply(next: Stay) {
    if (next.to <= next.from) return;
    setStay(next);
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
  const book = (url?: string) => (url ? bookingLink(url, stay) : undefined);
  const bookLabel = hotel.bookingSite ? fill(d.bookOn, { site: hotel.bookingSite }) : d.bookOnline;
  const boardDays = Array.from({ length: BOARD_DAYS }, (_, i) => addDays(boardStart, i));
  const lastStart = addDays(availability.to, -BOARD_DAYS);
  const otherLangs = hotel.languages.filter((l) => l !== lang);
  const query = `?from=${stay.from}&to=${stay.to}&guests=${stay.guests}`;
  const shortDate = (day: ISODate) =>
    new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", day: "2-digit", month: "short" }).format(parseISO(day)).replace(".", "").toUpperCase();
  const stampKey = `${stay.from}-${stay.to}-${stay.guests}`;

  return (
    <div className="hotel" style={theme}>
      <header className="pc-bar">
        <a className="pc-wordmark" href={`/${lang}/h/${hotel.slug}`}>
          {hotel.name}
        </a>
        <nav className="pc-nav" aria-label={hotel.name}>
          <a href="#rooms">{d.rooms}</a>
          {hotel.gallery && hotel.gallery.length > 0 && <a href="#photos">{d.photos}</a>}
          <a href="#availability">{d.availability}</a>
          <a href="#location">{d.location}</a>
        </nav>
        {otherLangs.length > 0 && (
          <ul className="pc-langs" aria-label={d.language}>
            {otherLangs.map((l) => (
              <li key={l}>
                <a href={`/${l}/h/${hotel.slug}${query}`} hrefLang={l} lang={l}>
                  {LANG_NAMES[l]}
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section className="pc-hero" aria-labelledby="hotel-name">
        <h1 id="hotel-name" className="pc-greeting">
          <span className="pc-script">{d.greetings}</span>
          <span ref={lettersRef} className={`pc-letters${hotel.photo ? " has-photo" : ""}`} aria-label={place}>
            {[0, 1].map((layer) => (
              <span key={layer} className={layer ? "pc-letters-fill" : "pc-letters-keyline"} aria-hidden="true">
                <span className="pc-line">{nameA}</span>
                {nameB && <span className="pc-line">{nameB}</span>}
              </span>
            ))}
          </span>
          <span className="visually-hidden">{`, ${hotel.name}`}</span>
        </h1>
        <p className="pc-tagline">
          <strong>{hotel.name}</strong>
          {region ? `, ${region}. ` : ". "}
          {t(hotel.tagline, lang)}
        </p>

        <form className="pc-back" aria-label={d.yourDates} onSubmit={(e) => e.preventDefault()}>
          <div className="pc-edge" aria-hidden="true" />
          <p className="pc-back-title" aria-hidden="true">
            {d.postcard}
          </p>
          <div className="pc-message">
            <p className="pc-hello">{fill(d.waHello, { hotel: hotel.name })}</p>
            <div className="pc-fields">
              <label>
                <span>{d.checkIn}</span>
                <input
                  type="date"
                  required
                  min={availability.today}
                  max={addDays(availability.to, -1)}
                  value={stay.from}
                  onChange={(e) => {
                    const from = e.target.value;
                    if (!isISODate(from)) return;
                    const length = Math.max(1, diffDays(stay.from, stay.to));
                    apply({ ...stay, from, to: stay.to > from ? stay.to : addDays(from, length) });
                  }}
                />
              </label>
              <label>
                <span>{d.checkOut}</span>
                <input
                  type="date"
                  required
                  min={addDays(stay.from, 1)}
                  max={availability.to}
                  value={stay.to}
                  onChange={(e) => isISODate(e.target.value) && apply({ ...stay, to: e.target.value })}
                />
              </label>
              <label>
                <span>{d.guests}</span>
                <select value={stay.guests} onChange={(e) => apply({ ...stay, guests: Number(e.target.value) })}>
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="pc-lines" aria-label={d.waPreviewLabel}>
              <li>
                {fill(d.waDates, {
                  from: formatDate(stay.from, lang, true),
                  to: formatDate(stay.to, lang, true),
                  nights: nightsLabel(stay, d),
                })}
              </li>
              <li>{fill(d.waGuests, { n: stay.guests })}</li>
              <li>{d.waAsk}</li>
            </ul>
            <p className="pc-answer" aria-live="polite">
              <a href="#rooms">
                {fill(d.freeCount, { free: freeCount, total: hotel.rooms.length, nights: nightsLabel(stay, d) })}
              </a>
            </p>
          </div>
          <div className="pc-address">
            <div className="pc-stamp-row">
              <Postmark town={place} line1={shortDate(stay.from)} line2={shortDate(stay.to)} stampKey={stampKey} />
              <div className="pc-stamp" aria-label={lowest != null ? `${d.priceStamp} ${formatPrice(lowest, hotel.currency, lang)} ${d.perNight}` : hotel.name}>
                <div className="pc-stamp-inner">
                  {hotel.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hotel.photo} alt="" width={160} height={120} />
                  )}
                  {lowest != null && (
                    <p>
                      <small>{d.priceStamp}</small>
                      <strong>{formatPrice(lowest, hotel.currency, lang)}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <address className="pc-to">
              <span className="pc-to-label">{d.to}</span>
              <span>{hotel.name}</span>
              {hotel.address && <span>{hotel.address}</span>}
            </address>
            <div className="pc-actions">
              {wa() && (
                <a className="pc-button is-send" href={wa()} target="_blank" rel="noopener">
                  <WhatsAppMark />
                  {d.sendWhatsapp}
                </a>
              )}
              {hotel.bookingUrl && (
                <a className="pc-button is-book" href={book(hotel.bookingUrl)} target="_blank" rel="noopener">
                  {bookLabel}
                </a>
              )}
            </div>
          </div>
        </form>
      </section>

      <section id="rooms" className="pc-rooms" aria-labelledby="rooms-title">
        <div className="pc-head">
          <h2 id="rooms-title">{d.rooms}</h2>
          <p>
            {formatDate(stay.from, lang, true)} – {formatDate(stay.to, lang, true)}, {nightsLabel(stay, d)},{" "}
            {fill(d.waGuests, { n: stay.guests }).toLowerCase()}
          </p>
        </div>
        {freeCount === 0 && <p className="pc-note">{d.noneFree}</p>}
        <ol className="pc-room-list">
          {status.map(({ room, taken, fits, free }, i) => {
            const name = t(room.name, lang);
            const roomLabel = room.number ? `${fill(d.roomN, { n: room.number })}, ${name}` : name;
            const bookUrl = room.bookingUrl ?? hotel.bookingUrl;
            return (
              <li key={room.id} id={`room-${room.id}`} className={`pc-room ${free ? "is-free" : "is-taken"} ${i % 2 ? "is-flipped" : ""}`}>
                <figure className="pc-front">
                  {room.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.photo} alt={name} width={1400} height={933} loading="lazy" />
                  ) : (
                    <RoomScene name={room.scene ?? "double"} title={name} />
                  )}
                  <figcaption>
                    {name}, {hotel.name}
                  </figcaption>
                </figure>
                <div className="pc-room-back">
                  <h3>
                    {room.number && <span className="visually-hidden">{fill(d.roomN, { n: room.number })}, </span>}
                    {name}
                  </h3>
                  <p className="pc-room-facts">
                    {t(room.beds, lang)}. {fill(d.sleeps, { n: room.guests })}.
                  </p>
                  <p className="pc-room-text">{t(room.description, lang)}</p>
                  <div className="pc-room-foot">
                    {room.price != null && (
                      <p className="pc-price">
                        <strong>
                          {room.priceFrom
                            ? fill(d.fromPrice, { price: formatPrice(room.price, hotel.currency, lang) })
                            : formatPrice(room.price, hotel.currency, lang)}
                        </strong>{" "}
                        {d.perNight}
                      </p>
                    )}
                    <p className={`pc-status ${free ? "is-free" : ""}`}>
                      {!fits
                        ? fill(d.tooSmall, { n: room.guests })
                        : taken.length
                          ? fill(d.takenFor, { dates: taken.slice(0, 3).map((n) => formatDate(n, lang)).join(", ") + (taken.length > 3 ? "…" : "") })
                          : d.freeFor}
                    </p>
                  </div>
                  <div className="pc-actions">
                    {hotel.whatsapp && (
                      <a className="pc-button is-send" href={wa(roomLabel)} target="_blank" rel="noopener">
                        <WhatsAppMark />
                        {d.askWhatsapp}
                      </a>
                    )}
                    {bookUrl && (
                      <a className="pc-button is-book" href={book(bookUrl)} target="_blank" rel="noopener">
                        {bookLabel}
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
        <section id="photos" className="pc-gallery" aria-labelledby="photos-title">
          <h2 id="photos-title">{d.photos}</h2>
          <ul>
            {hotel.gallery.map((g) => (
              <li key={g.src}>
                <figure>
                  <a href={g.src} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.src} alt={t(g.alt, lang)} loading="lazy" width={1400} height={933} />
                  </a>
                  <figcaption>{t(g.alt, lang)}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="availability" className="pc-board" aria-labelledby="board-title">
        <div className="pc-head">
          <h2 id="board-title">{d.boardTitle}</h2>
          <p>
            {d.stampSheet} {d.boardHelp}
          </p>
        </div>
        {availability.partial && <p className="pc-note">{d.syncWarning}</p>}
        <div className="pc-board-controls">
          <button
            type="button"
            className="pc-step"
            disabled={boardStart <= availability.today}
            onClick={() => setBoardStart((s) => (addDays(s, -14) < availability.today ? availability.today : addDays(s, -14)))}
          >
            {d.earlier}
          </button>
          <p className="pc-board-month">
            {new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", month: "long", year: "numeric" }).format(parseISO(boardStart))}
          </p>
          <button
            type="button"
            className="pc-step"
            disabled={boardStart >= lastStart}
            onClick={() => setBoardStart((s) => (addDays(s, 14) > lastStart ? lastStart : addDays(s, 14)))}
          >
            {d.later}
          </button>
        </div>
        <div className="pc-sheet" tabIndex={0} aria-label={d.boardTitle}>
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
                      <span className="pc-dow">{new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", weekday: "short" }).format(date).replace(".", "")}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hotel.rooms.map((room) => (
                <tr key={room.id}>
                  <th scope="row">{t(room.name, lang)}</th>
                  {boardDays.map((day) => {
                    const isTaken = booked[room.id].has(day);
                    const inStay = day >= stay.from && day < stay.to;
                    const label = `${t(room.name, lang)}, ${formatDate(day, lang, true)}: ${isTaken ? d.taken : d.free}`;
                    const face = <span className="pc-mini-date">{parseISO(day).getUTCDate()}</span>;
                    return (
                      <td key={day} className={`${isTaken ? "is-taken" : "is-free"}${inStay ? " in-stay" : ""}`}>
                        {isTaken ? (
                          <span className="pc-mini" role="img" aria-label={label}>
                            {face}
                          </span>
                        ) : (
                          <button type="button" className="pc-mini" aria-label={label} aria-pressed={inStay} onClick={() => startOn(day, room.id)}>
                            {face}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="pc-legend">
          <li>
            <span className="pc-key is-free" aria-hidden="true" /> {d.free}
          </li>
          <li>
            <span className="pc-key is-taken" aria-hidden="true" /> {d.taken}
          </li>
          <li>
            <span className="pc-key in-stay" aria-hidden="true" /> {d.stay}
          </li>
        </ul>
      </section>

      <section className="pc-stay" aria-labelledby="stay-title">
        <div className="pc-stay-card">
          <h2 id="stay-title">{d.stay}</h2>
          <p className="pc-about">{t(hotel.about, lang)}</p>
          {(hotel.checkIn || hotel.checkOut) && (
            <ul className="pc-times">
              {hotel.checkIn && <li>{fill(d.arrive, { time: hotel.checkIn })}</li>}
              {hotel.checkOut && <li>{fill(d.leave, { time: hotel.checkOut })}</li>}
            </ul>
          )}
        </div>
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="pc-included">
            <h3>{d.included}</h3>
            <ul>
              {hotel.amenities.map((a, i) => (
                <li key={i}>{t(a, lang)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="location" className="pc-location" aria-labelledby="location-title">
        <h2 id="location-title">{d.findUs}</h2>
        <div className="pc-envelope">
          <div className="pc-edge" aria-hidden="true" />
          {hotel.address && <address>{hotel.address}</address>}
          <ul className="pc-contact">
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
          </ul>
          <div className="pc-actions">
            {wa() && (
              <a className="pc-button is-send" href={wa()} target="_blank" rel="noopener">
                <WhatsAppMark />
                {d.sendWhatsapp}
              </a>
            )}
            {hotel.bookingUrl && (
              <a className="pc-button is-book" href={book(hotel.bookingUrl)} target="_blank" rel="noopener">
                {bookLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="pc-footer">
        <div className="pc-footer-picture">
          {hotel.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.photo} alt="" width={1400} height={933} loading="lazy" />
          ) : (
            <PlaceScene name={hotel.scene ?? "sea"} title="" />
          )}
        </div>
        <p className="pc-footer-name">{hotel.name}</p>
        <p className="pc-footer-by">
          <a href={`/${lang}`}>{fill(d.siteBy, { brand })}</a>
        </p>
      </footer>
    </div>
  );
}
