# Hotel websites

One app that gives every small hotel its own website, plus a sales page for the service.

- **Sales page**: `/en`, `/pt`, `/es`. Hotel owners send their details on WhatsApp.
- **Each hotel's site**: `/en/h/<hotel>`, for example `/pt/h/pousada-mare`. Rooms, prices, a calendar of which rooms are free on which days, a WhatsApp button whose message is already written (room, dates, guests), and a link to the hotel's Booking.com or Airbnb page.
- **Each hotel's admin page**: `/en/h/<hotel>/admin`. The hotel signs in with its password and taps days to mark them booked (phone bookings, walk-ins).

Availability comes from two places, merged:
1. **Calendar links (iCal)** from Booking.com, Airbnb, Expedia, Vrbo or a channel manager, one or more per room. Refreshed every 15 minutes.
2. **Days marked by hand** on the admin page, stored in Postgres.

Visitors without a language in the address (`/`, `/h/pousada-mare`) are sent to the one their browser prefers.

## Add a hotel

1. Copy `data/hotels/pousada-mare.json` to `data/hotels/<new-slug>.json`. The file name must equal `"slug"` (a–z, 0–9, `-`).
2. Remove `"demo"` and `"order"`, then fill in the hotel's details. Any text can be one string or `{ "pt": "…", "en": "…", "es": "…" }`.
   - `"whatsapp"`: digits only, with the country code (`5524999990000`).
   - `"languages"`: the first one is the hotel's main language.
   - `"theme"`: the hotel's colours and its typeface (`"newsreader"`, `"bricolage"` or `"figtree"`).
3. Photos: put them in `public/hotels/<slug>/` and set `"photo": "/hotels/<slug>/front.jpg"` on the hotel and on each room. Without photos, a drawing in the hotel's colours is shown.
4. Calendar links, per room, in `"ical": ["https://…"]`:
   - **Booking.com**: Extranet → Rates & availability → Sync calendars → Export calendar.
   - **Airbnb**: Calendar → Availability → Connect to another website → copy the link.
   - **Expedia / Vrbo**: Calendar → Import/Export → Export.
5. Admin password: run `npm run hash-password -- "their password"` and paste the result into `"adminPasswordHash"`.
6. Commit and merge: Vercel puts it online.

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:3000. Hand-marked days are saved to `data/.local-blocks.json` when no database is set.

The sample hotels show made-up bookings so their calendars aren't empty. Their admin password is `demo-hotel-2026`.

## Put it online (Vercel)

1. Vercel → Add New → Project → pick this repository, and set **Root Directory** to `website`.
2. **Storage → Create → Postgres (Neon)** and connect it to the project. This sets `DATABASE_URL`, which the admin page needs to save days.
3. **Settings → Environment Variables**: add `SESSION_SECRET` with any long random text (for example from `openssl rand -hex 32`).
4. Deploy. Every merge to `main` goes live, and every pull request gets its own preview link.

Change your business name, WhatsApp number and email in `src/lib/site.ts`.

## Checks

```bash
npm test
npm run typecheck
npm run build
```
