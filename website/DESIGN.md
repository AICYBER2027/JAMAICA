# Design: hotel sites ("Postcard from the beach")

The hotel template (`src/components/HotelView.tsx`, `src/app/[lang]/h/[slug]/hotel.css`) is a holiday postcard the guest writes to the hotel. Direction brief: `.impeccable/surfaces/src-components-hotelview-tsx.md`.

## Colour
- **Field**: the hotel's `theme.accent` fills the whole page (`--field`, text `--field-ink`). Ilhasul: `#0A5F80`.
- **Paper**: white postcard stock `#FFFFFF` for every card; `--paper-2 #F2F5F7` only behind the stamp sheet.
- **Ink**: the hotel's `theme.ink` for text on paper. **Tint**: `theme.surface` for free stamps and unfilled letters.
- **Airmail red `#D42A32`**: only on what is selected or sent (stay nights, focus and selection, the airmail edging, the WhatsApp action). Never decoration.
- Stamp rim `#E4D9BD`, so the perforations read on white.

## Type
- **Bowlby One**: large-letter display (town name, headings, prices, wordmark).
- **Caveat**: the guest's handwriting (greeting, date fields, message lines, addresses). Never for labels.
- **Figtree**: everything else, 17–19px body.
- The town name is fitted to the full width by script, with a white keyline and an ink extrusion. On phones it splits over two lines at a syllable edge.

## Components
- **Postcard back** (`.pc-back`): message half and address half; stamp with price and photo, postmark with dates (re-stamped on change).
- **Buttons**: square, solid, equal weight, both with airmail edging. WhatsApp is red with the WhatsApp mark; booking is ink.
- **Rooms**: photo front (white printed border, 3:2, 4:3 on phone) overlapping a white back with an inset printed border.
- **Photos**: white-bordered prints, runs of eight (one 2×2, one wide, six small) so the grid always closes.
- **Availability**: a sheet of perforated stamps; taken nights carry the postmark's wavy cancellation under full-ink numerals.
- **Envelope**: address in handwriting with airmail edging.

## Motion
One moment on load: letters rise, the card is posted, the stamp sticks, the postmark lands. Exponential ease-out; nothing moves with reduced motion.
