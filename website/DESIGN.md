# Design: hotel sites (modern, photo-led)

Replaces the earlier "postcard" world at the user's request ("make it look current and professional"). The category standard, done properly: the hotel's own photographs lead, the interface stays quiet.

## Colour
- Ground white `#FFFFFF`; soft panels `#F5F7FA`; hairlines `#E4E8EE`.
- Text `#0F1B2D`, secondary `#4A5668`.
- **Accent** = the hotel's `theme.accent` (Ilhasul: sea blue `#1F5FAF`): booking button, selected nights, links, check icons.
- WhatsApp button `#0E8A4E` (white text passes AA). Free nights `#E6F6EC` / `#0F6B39`; taken nights striped grey.

## Type
- **Instrument Serif** for the hotel name and section titles.
- **Figtree** for everything else, 17px body, 700 for labels and buttons.

## Layout
1. Full-bleed hero photo (86svh; 78svh on phones) with a soft top and bottom scrim; logo, nav and language switch over it; place, name and tagline bottom-left.
2. White booking card overlapping the hero: check-in, check-out, guests, "Ver disponibilidade"; free-room count and lowest price under it.
3. Highlight chips (up to four facts).
4. Room cards (two across on desktop): swipeable photo slider with arrows and counter, status pill, facts with icons, description, price, WhatsApp and booking buttons of equal size.
5. Photo mosaic (one large and four small) with "Ver as N fotos" opening a full-screen gallery dialog.
6. Availability calendar: rooms × 21 days, tap a free day to start the stay.
7. About and amenities (check icons), check-in and check-out times.
8. Address, contacts and an embedded Google map.
9. Footer with the logo. On phones, a bottom bar with the lowest price and both buttons slides in once the booking card has scrolled away.

## Components
Pill buttons (999px radius), 18px card radius, 12px for inner panels, one stroke icon family (24px grid, 1.8 stroke).

## Motion
On load the hero photo settles from a slight zoom and the hero text and booking card rise in once. Photo tiles zoom gently on hover, the gallery dialog fades up, and the phone bar slides in. Nothing moves with reduced motion.
