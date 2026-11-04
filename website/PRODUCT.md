# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Guests** (primary for hotel sites): people choosing where to stay, mostly on a phone. For a beach hotel such as Ilhasul (Canasvieiras, Florianópolis): Brazilian families, Argentine and Uruguayan visitors (Spanish first for them), and couples. Their job: see what the place looks like, whether a room is free for their dates, what it costs, and then ask or book.
- **Hotel owners** (primary for the sales page): owners of small independent hotels and pousadas whose website is missing or outdated. Their job: decide whether to hire this service.

## Product Purpose

One app that gives every small hotel a site that shows its rooms, which ones are free on which days, prices, and lets the guest act straight away. Success: guests contact or book directly, and hotel owners sign up after seeing their own hotel's site.

## Positioning

Live availability (from the hotel's booking-site calendars plus days marked by hand) shown on the hotel's own site, with a WhatsApp message that arrives already written (room, dates, guests). Direct, no commission.

## Operating Context

- Hotels already sell on Booking.com, Airbnb, Expedia or a booking engine such as Omnibees; the site links there with dates filled in.
- In Brazil, small hotels are booked over WhatsApp.
- Languages: Portuguese (Brazil), Spanish, English; the hotel's first language leads.
- Sites are often shown to an owner as a sales pitch before they are a client (hidden, `unlisted`).

## Capabilities and Constraints

- Every hotel is one JSON file in `data/hotels/`; the same template must work for any hotel, with or without photos, with 2 or 40 rooms, with room types or numbered rooms.
- Two equal primary actions on hotel sites: WhatsApp and the hotel's online booking.
- No invented reviews, ratings, awards or prices.

## Evidence on Hand

- Hotel Ilhasul: 18 own photos in `public/hotels/ilhasul/` (from hotelilhasul.com.br), real room types and prices from its Omnibees engine, real contacts. Its booked days are sample data.
- The three other sample hotels are fictional and have drawings, not photos.
- No guest reviews or testimonials on hand.

## Product Principles

1. The place sells itself: real photographs lead, interface recedes.
2. Answer "is it free, what does it cost" before anything else.
3. Every path ends in a message or a booking, in the guest's language.
4. One template, many hotels: each hotel's photos and colours make it its own.
