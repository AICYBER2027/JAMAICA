"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Availability } from "@/lib/availability.ts";
import { bookedNights, bookingLink, clashes, formatDate, formatPrice, nightsLabel, whatsappLink, type Stay } from "@/lib/booking.ts";
import { addDays, diffDays, isISODate, parseISO, type ISODate } from "@/lib/dates.ts";
import type { Hotel } from "@/lib/hotels.ts";
import { fill, hotelDict, LOCALES, t, type HotelDict, type Lang } from "@/lib/i18n.ts";
import { LangSwitch } from "./LangSwitch.tsx";
import { PlaceScene, RoomScene } from "./Scenes.tsx";

type PublicHotel = Omit<Hotel, "adminPasswordHash">;
type Photo = { src: string; alt: string };

const BOARD_DAYS = 21;

function initialStay(a: Availability, init: { from?: string; to?: string; guests?: string }): Stay {
  const from = isISODate(init.from) && init.from >= a.today && init.from < a.to ? init.from : a.today;
  const to = isISODate(init.to) && init.to > from && diffDays(from, init.to) <= 30 ? init.to : addDays(from, 2);
  const guests = Math.min(Math.max(Number(init.guests) || 2, 1), 12);
  return { from, to, guests };
}

/* Icons: one stroke family, 24px grid. */
function Icon({ name }: { name: "check" | "users" | "bed" | "area" | "left" | "right" | "pin" | "phone" | "mail" | "grid" | "close" | "calendar" }) {
  const paths: Record<string, ReactNode> = {
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 19.5c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.4c1.6.9 2.6 2.7 3 5.1" />
      </>
    ),
    bed: <path d="M3 18.5V6.5M3 14h18v4.5M21 14v-2.5a3 3 0 0 0-3-3h-7V14M6.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />,
    area: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
    left: <path d="M15 5l-7 7 7 7" />,
    right: <path d="M9 5l7 7-7 7" />,
    pin: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    phone: <path d="M5 3.5h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5.5a2 2 0 0 1 2-2Z" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3.5 6.5 12 13l8.5-6.5" />
      </>
    ),
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  };
  return (
    <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function WhatsAppMark() {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"
      />
    </svg>
  );
}

/** A room's photos as a slider: arrows, swipe (native scroll-snap) and a counter. */
function RoomPhotos({ photos, name, d, scene }: { photos: Photo[]; name: string; d: HotelDict; scene: PublicHotel["rooms"][number]["scene"] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (!photos.length) {
    return (
      <div className="hv-room-media">
        <RoomScene name={scene ?? "double"} title={name} />
      </div>
    );
  }
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="hv-room-media">
      <div
        ref={track}
        className="hv-slides"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.src} src={p.src} alt={p.alt} width={1400} height={933} loading={i === 0 ? "eager" : "lazy"} />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="hv-arrow is-left" aria-label={d.prevPhoto} onClick={() => go(index - 1)}>
            <Icon name="left" />
          </button>
          <button type="button" className="hv-arrow is-right" aria-label={d.nextPhoto} onClick={() => go(index + 1)}>
            <Icon name="right" />
          </button>
          <span className="hv-count" aria-live="polite">
            {fill(d.photoOf, { i: index + 1, n: photos.length })}
          </span>
        </>
      )}
    </div>
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [dockOn, setDockOn] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const bookbox = useRef<HTMLElement>(null);

  // On phones the price-and-buttons bar appears once the booking box has scrolled away.
  useEffect(() => {
    const el = bookbox.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setDockOn(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Previews on the sales page open at a section. A #hash would scroll the parent page too, so scroll only this window.
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    const el = view ? document.getElementById(view) : null;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (galleryOpen && !el.open) el.showModal();
    if (!galleryOpen && el.open) el.close();
  }, [galleryOpen]);

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
  const town = t(hotel.town, lang);
  const gallery: Photo[] = (hotel.gallery ?? []).map((g) => ({ src: g.src, alt: t(g.alt, lang) }));

  const theme = {
    "--accent": hotel.theme.accent,
    "--accent-ink": hotel.theme.accentInk,
    "--focus": hotel.theme.accent,
    "--scene-sky": hotel.theme.surface,
    "--scene-a": hotel.theme.accent,
    "--scene-ink": hotel.theme.ink,
    "--scene-ground": hotel.theme.ground,
    "--hero-focus": hotel.photoFocus ?? "50% 50%",
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
    document.getElementById(`room-${roomId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const wa = (room?: string) =>
    hotel.whatsapp ? whatsappLink({ number: hotel.whatsapp, hotel: hotel.name, room, stay, lang, d }) : undefined;
  const book = (url?: string) => (url ? bookingLink(url, stay) : undefined);
  const bookLabel = hotel.bookingSite ? fill(d.bookOn, { site: hotel.bookingSite }) : d.bookOnline;
  const boardDays = Array.from({ length: BOARD_DAYS }, (_, i) => addDays(boardStart, i));
  const lastStart = addDays(availability.to, -BOARD_DAYS);
  const query = `?from=${stay.from}&to=${stay.to}&guests=${stay.guests}`;
  const mapQuery = hotel.address ?? `${hotel.name}, ${town}`;

  const actions = (room?: string, bookUrl = hotel.bookingUrl) => (
    <div className="hv-actions">
      {hotel.whatsapp && (
        <a className="hv-btn is-wa" href={wa(room)} target="_blank" rel="noopener">
          <WhatsAppMark />
          {room ? d.askWhatsapp : d.sendWhatsapp}
        </a>
      )}
      {bookUrl && (
        <a className="hv-btn is-book" href={book(bookUrl)} target="_blank" rel="noopener">
          {bookLabel}
        </a>
      )}
    </div>
  );

  return (
    <div className="hv" style={theme}>
      {/* ---------- Hero ---------- */}
      <header className="hv-hero">
        <div className="hv-hero-media">
          {hotel.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.photo} alt={t(hotel.photoAlt, lang) || hotel.name} width={1400} height={933} fetchPriority="high" />
          ) : (
            <PlaceScene name={hotel.scene ?? "sea"} title={`${hotel.name}, ${town}`} />
          )}
        </div>
        <div className="hv-topbar">
          <a className="hv-brand" href={`/${lang}/h/${hotel.slug}`}>
            {hotel.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hotel.logo} alt={hotel.name} width={353} height={330} />
            ) : (
              <span>{hotel.name}</span>
            )}
          </a>
          <nav className="hv-nav" aria-label={hotel.name}>
            <a href="#rooms">{d.rooms}</a>
            {gallery.length > 0 && <a href="#photos">{d.photos}</a>}
            <a href="#availability">{d.availability}</a>
            <a href="#location">{d.location}</a>
          </nav>
          <LangSwitch current={lang} label={d.language} items={hotel.languages.map((l) => ({ lang: l, href: `/${l}/h/${hotel.slug}${query}` }))} />
        </div>
        <div className="hv-hero-copy">
          <p className="hv-place">
            <Icon name="pin" />
            {town}
          </p>
          <h1>{hotel.name}</h1>
          <p className="hv-tagline">{t(hotel.tagline, lang)}</p>
        </div>
      </header>

      {/* ---------- Booking box ---------- */}
      <section ref={bookbox} className="hv-bookbox" aria-label={d.yourDates}>
        <form
          className="hv-search"
          onSubmit={(e) => {
            e.preventDefault();
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
            <input type="date" required min={addDays(stay.from, 1)} max={availability.to} value={stay.to} onChange={(e) => isISODate(e.target.value) && apply({ ...stay, to: e.target.value })} />
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
          <button type="submit" className="hv-btn is-primary">
            {d.checkAvailability}
          </button>
        </form>
        <p className="hv-bookbox-answer" aria-live="polite">
          <strong>{fill(d.freeCount, { free: freeCount, total: hotel.rooms.length, nights: nightsLabel(stay, d) })}</strong>
          {lowest != null && (
            <span>
              {d.fromShort} <strong>{formatPrice(lowest, hotel.currency, lang)}</strong> / {d.night1}
            </span>
          )}
        </p>
      </section>

      {/* ---------- Highlights ---------- */}
      {hotel.highlights && hotel.highlights.length > 0 && (
        <section className="hv-highlights" aria-label={d.highlights}>
          <ul>
            {hotel.highlights.map((h, i) => (
              <li key={i}>
                <Icon name="check" />
                {t(h, lang)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Rooms ---------- */}
      <section id="rooms" className="hv-section" aria-labelledby="rooms-title">
        <div className="hv-head">
          <h2 id="rooms-title">{d.rooms}</h2>
          <p>
            {formatDate(stay.from, lang, true)} – {formatDate(stay.to, lang, true)}, {nightsLabel(stay, d)}, {fill(d.waGuests, { n: stay.guests }).toLowerCase()}
          </p>
        </div>
        {freeCount === 0 && <p className="hv-note">{d.noneFree}</p>}
        <ol className="hv-rooms">
          {status.map(({ room, taken, fits, free }) => {
            const name = t(room.name, lang);
            const label = room.number ? `${fill(d.roomN, { n: room.number })}, ${name}` : name;
            const photos: Photo[] = [...(room.photo ? [{ src: room.photo, alt: name }] : []), ...(room.photos ?? []).map((p) => ({ src: p.src, alt: t(p.alt, lang) }))];
            return (
              <li key={room.id} id={`room-${room.id}`} className="hv-room">
                <RoomPhotos photos={photos} name={name} d={d} scene={room.scene} />
                <div className="hv-room-body">
                  <div className="hv-room-top">
                    <h3>{name}</h3>
                    <span className={`hv-pill ${free ? "is-free" : "is-taken"}`}>{!fits ? fill(d.tooSmall, { n: room.guests }) : free ? d.freeFor : d.taken}</span>
                  </div>
                  <ul className="hv-facts">
                    <li>
                      <Icon name="users" />
                      {fill(d.sleeps, { n: room.guests })}
                    </li>
                    <li>
                      <Icon name="bed" />
                      {t(room.beds, lang)}
                    </li>
                    {room.size && (
                      <li>
                        <Icon name="area" />
                        {fill(d.size, { n: room.size })}
                      </li>
                    )}
                  </ul>
                  <p className="hv-room-text">{t(room.description, lang)}</p>
                  {fits && taken.length > 0 && (
                    <p className="hv-room-clash">{fill(d.takenFor, { dates: taken.slice(0, 3).map((n) => formatDate(n, lang)).join(", ") + (taken.length > 3 ? "…" : "") })}</p>
                  )}
                  <div className="hv-room-foot">
                    {room.price != null && (
                      <p className="hv-price">
                        {room.priceFrom && <span>{d.fromShort}</span>}
                        <strong>{formatPrice(room.price, hotel.currency, lang)}</strong>
                        <span>/ {d.night1}</span>
                      </p>
                    )}
                    {actions(label, room.bookingUrl ?? hotel.bookingUrl)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------- Photos ---------- */}
      {gallery.length > 0 && (
        <section id="photos" className="hv-section" aria-labelledby="photos-title">
          <div className="hv-head">
            <h2 id="photos-title">{d.photos}</h2>
          </div>
          <div className="hv-mosaic">
            {gallery.slice(0, 5).map((g, i) => (
              <button key={g.src} type="button" className={`hv-tile${i === 0 ? " is-lead" : ""}`} onClick={() => setGalleryOpen(true)} aria-label={g.alt}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt="" width={1400} height={933} loading="lazy" />
              </button>
            ))}
            <button type="button" className="hv-btn is-light hv-all-photos" onClick={() => setGalleryOpen(true)}>
              <Icon name="grid" />
              {fill(d.allPhotos, { n: gallery.length })}
            </button>
          </div>
          <dialog
            ref={dialog}
            className="hv-dialog"
            aria-label={d.photos}
            onClose={() => setGalleryOpen(false)}
            onClick={(e) => e.target === dialog.current && setGalleryOpen(false)}
          >
            <div className="hv-dialog-bar">
              <p>
                {hotel.name}: {d.photos}
              </p>
              <button type="button" className="hv-icon-btn" aria-label={d.close} onClick={() => setGalleryOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="hv-dialog-grid">
              {gallery.map((g) => (
                <figure key={g.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt={g.alt} width={1400} height={933} loading="lazy" />
                  <figcaption>{g.alt}</figcaption>
                </figure>
              ))}
            </div>
          </dialog>
        </section>
      )}

      {/* ---------- Availability ---------- */}
      <section id="availability" className="hv-section" aria-labelledby="board-title">
        <div className="hv-head">
          <h2 id="board-title">{d.boardTitle}</h2>
          <p>{d.boardHelp}</p>
        </div>
        {availability.partial && <p className="hv-note">{d.syncWarning}</p>}
        <div className="hv-cal">
          <div className="hv-cal-bar">
            <button
              type="button"
              className="hv-icon-btn"
              aria-label={d.earlier}
              disabled={boardStart <= availability.today}
              onClick={() => setBoardStart((s) => (addDays(s, -14) < availability.today ? availability.today : addDays(s, -14)))}
            >
              <Icon name="left" />
            </button>
            <p className="hv-cal-month">
              <Icon name="calendar" />
              {new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", month: "long", year: "numeric" }).format(parseISO(boardStart))}
            </p>
            <button
              type="button"
              className="hv-icon-btn"
              aria-label={d.later}
              disabled={boardStart >= lastStart}
              onClick={() => setBoardStart((s) => (addDays(s, 14) > lastStart ? lastStart : addDays(s, 14)))}
            >
              <Icon name="right" />
            </button>
          </div>
          <div className="hv-cal-scroll" tabIndex={0} aria-label={d.boardTitle}>
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
                        <span>{new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", weekday: "short" }).format(date).replace(".", "")}</span>
                        <strong>{date.getUTCDate()}</strong>
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
                      return (
                        <td key={day} className={`${isTaken ? "is-taken" : "is-free"}${inStay ? " in-stay" : ""}`}>
                          {isTaken ? (
                            <span className="hv-day" role="img" aria-label={label} />
                          ) : (
                            <button type="button" className="hv-day" aria-label={label} aria-pressed={inStay} onClick={() => startOn(day, room.id)} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="hv-legend">
            <li>
              <span className="hv-key is-free" aria-hidden="true" /> {d.free}
            </li>
            <li>
              <span className="hv-key is-taken" aria-hidden="true" /> {d.taken}
            </li>
            <li>
              <span className="hv-key in-stay" aria-hidden="true" /> {d.stay}
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- About and amenities ---------- */}
      <section className="hv-section hv-about" aria-labelledby="stay-title">
        <div>
          <h2 id="stay-title">{d.stay}</h2>
          <p className="hv-about-text">{t(hotel.about, lang)}</p>
          {(hotel.checkIn || hotel.checkOut) && (
            <dl className="hv-times">
              {hotel.checkIn && (
                <div>
                  <dt>{d.checkIn}</dt>
                  <dd>{hotel.checkIn}</dd>
                </div>
              )}
              {hotel.checkOut && (
                <div>
                  <dt>{d.checkOut}</dt>
                  <dd>{hotel.checkOut}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div>
            <h3>{d.amenitiesTitle}</h3>
            <ul className="hv-amenities">
              {hotel.amenities.map((a, i) => (
                <li key={i}>
                  <Icon name="check" />
                  {t(a, lang)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ---------- Location ---------- */}
      <section id="location" className="hv-section hv-location" aria-labelledby="location-title">
        <div className="hv-location-text">
          <h2 id="location-title">{d.findUs}</h2>
          {hotel.address && (
            <p className="hv-address">
              <Icon name="pin" />
              {hotel.address}
            </p>
          )}
          <ul className="hv-contact">
            {hotel.phone && (
              <li>
                <a href={`tel:${hotel.phone.replace(/[^\d+]/g, "")}`}>
                  <Icon name="phone" />
                  {hotel.phone}
                </a>
              </li>
            )}
            {hotel.email && (
              <li>
                <a href={`mailto:${hotel.email}`}>
                  <Icon name="mail" />
                  {hotel.email}
                </a>
              </li>
            )}
            {hotel.mapUrl && (
              <li>
                <a href={hotel.mapUrl} target="_blank" rel="noopener">
                  <Icon name="pin" />
                  {d.openMap}
                </a>
              </li>
            )}
          </ul>
          {actions()}
        </div>
        <div className="hv-map">
          <iframe
            title={`${d.findUs}: ${hotel.name}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="hv-footer">
        <div className="hv-footer-brand">
          {hotel.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.logo} alt="" width={353} height={330} loading="lazy" />
          )}
          <div>
            <p className="hv-footer-name">{hotel.name}</p>
            <p>{hotel.address ?? town}</p>
          </div>
        </div>
        <p className="hv-footer-by">
          <a href={`/${lang}`}>{fill(d.siteBy, { brand })}</a>
        </p>
      </footer>

      {/* ---------- Phone: price and actions always at hand ---------- */}
      <div className={`hv-dock${dockOn ? " is-on" : ""}`}>
        {lowest != null && (
          <p>
            <span>{d.fromShort}</span>
            <strong>{formatPrice(lowest, hotel.currency, lang)}</strong>
          </p>
        )}
        {actions()}
      </div>
    </div>
  );
}
