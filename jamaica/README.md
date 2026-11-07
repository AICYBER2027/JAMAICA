# JAMAICA

A fashion store for Brazil: clothing, accessories and footwear with real 3D and 360° product views, an outfit builder, virtual try-on, PIX and card payments, and a dashboard for the store team.

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion (Framer Motion) · Three.js / React Three Fiber · PostgreSQL (Supabase in production).

## What's in it

| Area | Where | Notes |
|---|---|---|
| Homepage | `/` | Live 3D sneaker in the hero (drag to turn, switch colourway), departments, lookbook, new arrivals / best sellers (ranked by real paid sales) / offers, turning 360° watch |
| Catalogue | `/shop/fashion`, `/shop/accessories`, `/shop/footwear`, `/shop/<dept>/<category>`, `/search` | 20 categories; filters for size in stock, colour, price, sale, 3D, gender; sorting. Filters work without JavaScript |
| Product page | `/p/<slug>` | Photos, **3D model** (GLB) and **360° photo sequence** tabs when they exist; otherwise the page says 3D isn't available. Colour and size with live stock, add to bag, buy now, related products, Product structured data |
| Outfit builder | `/outfits` | Pick pieces per slot, ranked by colour harmony, gender and price level with a stated reason; "complete the look"; total; add the whole look |
| Virtual try-on | `/try-on` | FASHN AI try-on on studio models or the customer's own photo (consent, private storage, delete any time, auto-deleted after 24 h). Off, and says so, without a key |
| Bag and checkout | `/bag`, `/checkout` | Prices and stock always re-read on the server; CEP lookup (ViaCEP); shipping by region or Melhor Envio; discount codes; CPF validation |
| Payment | | **PIX to the store's own key** (BR Code with amount and order number; staff confirm receipt) and/or **Mercado Pago** Checkout Pro (credit, debit, PIX; confirmed automatically by a signed webhook) |
| Orders | `/order/<id>` | Confirmation page with PIX QR / copy-and-paste, status, tracking, history; guest link or account |
| Accounts | `/account` | Order history, details, password, delete account (LGPD) |
| Dashboard | `/admin` | Overview, orders workflow, products (photos, colours/sizes/stock, 3D model, 360° upload), inventory, categories, customers, discount codes, sales report, settings (PIX, shipping table, try-on models, service status), team and permissions |

## Run it on your computer

Needs Node 20+ and PostgreSQL (local, Docker, or a free Supabase project).

```bash
npm install
cp .env.example .env    # set DATABASE_URL and SESSION_SECRET
npm run db:migrate
npm run db:seed
npm run create-owner -- you@example.com "Your Name" "a long password"
npm run dev
```

Store: http://localhost:3000 · Dashboard: http://localhost:3000/admin/login

To take orders locally, open **Dashboard → Settings** and add a PIX key (or set the Mercado Pago variables).

## Put it online (Vercel + Supabase)

1. **Supabase**: create a project.
   - **SQL Editor** → paste all of `db/supabase-setup.sql` → **Run** (once). This creates every table and loads the sample catalogue.
   - **Storage** → create a **public** bucket `media` and a **private** bucket `private`.
   - Note the **Project URL** (Project Settings → API) and the **secret key** `sb_secret_…` (Project Settings → API Keys).
   - **Connect** (top of the project) → **Transaction pooler** → copy the connection string and fill in your database password.
2. **Vercel**: Add New → Project → this repository, **Root Directory `jamaica`**. Environment Variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Transaction pooler string (port 6543) |
   | `SUPABASE_URL` | the Project URL |
   | `SUPABASE_SECRET_KEY` | the `sb_secret_…` key (older projects: `SUPABASE_SERVICE_ROLE_KEY` with the service_role key) |
   | `SESSION_SECRET` | 64 random characters (`openssl rand -hex 32`) |
   | `CRON_SECRET` | another random value |
   | `SITE_URL` | `https://<your-project>.vercel.app` (or your domain) |
   | `OWNER_SETUP_CODE` | any secret phrase, 12+ characters, only until the owner exists |

3. Deploy, open **`/admin/setup`**, enter the setup code and choose your owner email and password. Then **delete `OWNER_SETUP_CODE`** in Vercel.
4. Check **Dashboard → Settings → System check**: database, tables, catalogue, owner and both buckets should all say OK. `/api/health` answers `{"ok":true}` for uptime monitors.

The publishable key isn't needed: the store only reaches the database from the server, and Row Level Security blocks Supabase's public API from every table. Every merge to `main` goes live; every pull request gets a preview link. `vercel.json` runs `/api/cron/maintenance` hourly.

## External services: what they cost and what they need

| Service | Used for | Needed? | Cost | Variables |
|---|---|---|---|---|
| Supabase | Postgres + file storage | Yes, in production | Free tier, then from US$25/month | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` |
| Vercel | Hosting | Yes | Free hobby tier; Pro US$20/month for a business | — |
| PIX (your bank) | PIX to your own key | One of the two payment options | Free (bank-dependent) | Set in Dashboard → Settings |
| Mercado Pago | Credit/debit cards and PIX with automatic confirmation | Optional | Per-transaction fee set by Mercado Pago (varies by method and payout time) | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`; webhook URL `https://<domain>/api/webhooks/mercadopago`, topic "Payments" |
| ViaCEP | Address from CEP | Built in | Free, no key | — |
| Melhor Envio | Live Correios/Jadlog prices | Optional | Free account; you pay per label | `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_FROM_CEP` |
| FASHN | AI virtual try-on | Optional | Prepaid credits per generated image (see fashn.ai pricing) | `FASHN_API_KEY`, `FASHN_MODEL` |

## Honest notes

- **3D and 360°** are real: the three 3D products use CC-BY glTF models (credited at `/credits`), and their 360° sequences and studio shots were rendered from those models (`scripts/render-model.mjs`). Everything else shows photos and says 3D isn't available. Staff can upload their own GLB files and turntable photo sets.
- **Virtual try-on** is an AI-generated image from FASHN, not a physical cloth simulation; the page says fit is approximate. A full 3D avatar that wears garments would need 3D garment files (for example from CLO 3D) for every product; that is not built.
- **Direct PIX** uses a static BR Code, so payment is confirmed by staff after checking the bank. Use Mercado Pago (or a PSP with PIX webhooks) for automatic confirmation.
- The sample photography is from Unsplash; replace it with your own as the collection grows. The try-on studio models are Unsplash portraits: before launch, replace them with photos of models whose release covers AI try-on.
- Not built yet: transactional emails (order confirmation by email), Portuguese/Spanish translations, nota fiscal (NF-e) issuing, shipping label purchase.

## Checks

```bash
npm test          # unit tests: PIX BR Code + CRC, CPF/CNPJ, CEP regions, money parsing, recommendations, upload sniffing, webhook signatures
npm run typecheck
npm run build
```
