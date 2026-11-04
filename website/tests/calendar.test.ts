import assert from "node:assert/strict";
import { test } from "node:test";
import { bookedNights, bookingLink, clashes, whatsappLink } from "../src/lib/booking.ts";
import { addDays, diffDays, nightsBetween } from "../src/lib/dates.ts";
import { hotelDict } from "../src/lib/i18n.ts";
import { parseIcsNights } from "../src/lib/ical.ts";

// A Booking.com-style export: all-day events, folded lines, CRLF endings.
const BOOKING_ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Booking.com//Availability//EN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261110",
  "DTEND;VALUE=DATE:20261113",
  "SUMMARY:CLOSED - Not avail",
  " able",
  "UID:a1@booking.com",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261130",
  "DTEND;VALUE=DATE:20261202",
  "UID:a2@booking.com",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261220",
  "DTEND;VALUE=DATE:20261222",
  "STATUS:CANCELLED",
  "UID:a3@booking.com",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("reads the booked nights from an iCal export", () => {
  const nights = [...parseIcsNights(BOOKING_ICS)].sort();
  // Departure day (DTEND) is not a booked night; months roll over; cancelled stays are ignored.
  assert.deepEqual(nights, ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-30", "2026-12-01"]);
});

test("handles Airbnb-style date-times and single-day blocks", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART:20270101T150000Z",
    "DTEND:20270103T110000Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20270110",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  assert.deepEqual([...parseIcsNights(ics)].sort(), ["2027-01-01", "2027-01-02", "2027-01-10"]);
});

test("ignores garbage without throwing", () => {
  assert.equal(parseIcsNights("<html>Not found</html>").size, 0);
});

test("date helpers cross months, years and daylight-saving changes", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(diffDays("2026-10-24", "2026-10-27"), 3);
  assert.deepEqual(nightsBetween("2026-02-27", "2026-03-02"), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("a stay clashes only on nights that are taken", () => {
  const booked = bookedNights({ synced: ["2026-11-10"], manual: ["2026-11-12"] });
  assert.deepEqual(clashes(booked, { from: "2026-11-08", to: "2026-11-10", guests: 2 }), []);
  assert.deepEqual(clashes(booked, { from: "2026-11-09", to: "2026-11-13", guests: 2 }), ["2026-11-10", "2026-11-12"]);
  // Checking out on a booked day is fine: that night belongs to the next guest.
  assert.deepEqual(clashes(booked, { from: "2026-11-11", to: "2026-11-12", guests: 2 }), []);
});

test("the WhatsApp link carries the whole request", () => {
  const url = whatsappLink({
    number: "+55 (24) 99999-0000",
    hotel: "Pousada Maré",
    room: "Quarto 3, Suíte da Maré",
    stay: { from: "2026-11-10", to: "2026-11-12", guests: 2 },
    lang: "pt",
    d: hotelDict("pt"),
  });
  assert.ok(url.startsWith("https://wa.me/5524999990000?text="));
  const text = decodeURIComponent(url.split("text=")[1]);
  assert.match(text, /Pousada Maré/);
  assert.match(text, /Quarto 3, Suíte da Maré/);
  assert.match(text, /2 noites/);
  assert.match(text, /Hóspedes: 2/);
});

test("booking links get the dates where the site understands them", () => {
  const stay = { from: "2026-11-10", to: "2026-11-12", guests: 3 };
  const b = new URL(bookingLink("https://www.booking.com/hotel/br/pousada-mare.html", stay));
  assert.equal(b.searchParams.get("checkin"), "2026-11-10");
  assert.equal(b.searchParams.get("checkout"), "2026-11-12");
  assert.equal(b.searchParams.get("group_adults"), "3");
  const a = new URL(bookingLink("https://www.airbnb.com/rooms/123", stay));
  assert.equal(a.searchParams.get("check_in"), "2026-11-10");
  assert.equal(bookingLink("https://example.com/book", stay), "https://example.com/book");
});
