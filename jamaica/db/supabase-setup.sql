-- JAMAICA: one-time setup for a new Supabase project.
-- Supabase → SQL Editor → New query → paste this whole file → Run. Run it only once.
begin;
create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;

-- ── 001_init.sql
-- JAMAICA store schema. Works on any Postgres 14+, including Supabase.
-- The app talks to the database only from the server (DATABASE_URL). Row Level Security is
-- enabled on every table with no policies for the anon/authenticated roles, so Supabase's
-- public REST API (anon key) can read nothing. Public catalog reads go through the app.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ── Catalog ──────────────────────────────────────────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  department text not null check (department in ('fashion', 'accessories', 'footwear')),
  description text not null default '',
  image text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  details text not null default '',
  category_id uuid not null references categories(id) on delete restrict,
  price_cents int not null check (price_cents >= 0),
  sale_price_cents int check (sale_price_cents >= 0),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  gender text not null default 'unisex' check (gender in ('women', 'men', 'unisex')),
  featured boolean not null default false,
  is_new boolean not null default false,
  -- Garment type used by virtual try-on: tops, bottoms, one-pieces, or null when not wearable on a model photo.
  tryon_category text check (tryon_category in ('tops', 'bottoms', 'one-pieces')),
  -- Outfit slot used by the outfit builder.
  outfit_slot text check (outfit_slot in ('top', 'outerwear', 'bottom', 'one-piece', 'shoes', 'watch', 'eyewear', 'accessory')),
  palette text not null default 'neutral',
  weight_grams int not null default 500 check (weight_grams > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_below_price check (sale_price_cents is null or sale_price_cents < price_cents)
);
create index products_category_idx on products(category_id) where status = 'active';
create index products_created_idx on products(created_at desc);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text not null default '',
  -- When set, the photo shows this colour and is shown when the customer picks it.
  color text,
  sort int not null default 0
);
create index product_images_product_idx on product_images(product_id, sort);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text not null,
  color text not null,
  color_hex text not null default '#000000' check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sku text not null unique,
  stock int not null default 0 check (stock >= 0),
  sort int not null default 0,
  unique (product_id, size, color)
);
create index product_variants_product_idx on product_variants(product_id);

-- Real 3D model (GLB/glTF) and/or a real 360° photo sequence for a product.
create table product_media3d (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  kind text not null check (kind in ('model', 'sequence')),
  model_url text,
  frames text[] not null default '{}',
  poster text,
  -- For models with KHR_materials_variants: product colour name → model variant name.
  variant_map jsonb not null default '{}',
  credit text not null default '',
  created_at timestamptz not null default now(),
  unique (product_id, kind),
  constraint media_has_content check (
    (kind = 'model' and model_url is not null) or (kind = 'sequence' and cardinality(frames) >= 8)
  )
);

-- ── People ──────────────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  name text not null,
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'staff', 'manager', 'owner')),
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions(user_id);

-- ── Promotions ──────────────────────────────────────────────────────────
create table discount_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  kind text not null check (kind in ('percent', 'fixed', 'free_shipping')),
  value int not null default 0 check (value >= 0),
  min_subtotal_cents int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint percent_range check (kind <> 'percent' or (value between 1 and 90))
);

-- ── Shipping ────────────────────────────────────────────────────────────
-- The store's own rate table, one row per Brazilian region.
create table shipping_rates (
  region text primary key check (region in ('SE', 'S', 'CO', 'NE', 'N')),
  label text not null,
  standard_cents int not null,
  standard_days int not null,
  express_cents int not null,
  express_days int not null,
  free_over_cents int
);

-- ── Orders ──────────────────────────────────────────────────────────────
create table orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 10001) unique,
  user_id uuid references users(id) on delete set null,
  email citext not null,
  name text not null,
  phone text not null,
  cpf text not null,
  address jsonb not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal_cents int not null,
  discount_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents int not null,
  discount_code text,
  shipping_method text not null,
  shipping_days int,
  payment_method text not null check (payment_method in ('pix_direct', 'mercadopago')),
  payment_ref text,
  payment_status text not null default 'pending',
  payment_url text,
  pix_code text,
  tracking_code text,
  access_token_hash text not null,
  expires_at timestamptz,
  paid_at timestamptz,
  stock_released boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders(user_id, created_at desc);
create index orders_status_idx on orders(status, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  name text not null,
  size text not null,
  color text not null,
  image text,
  unit_price_cents int not null,
  quantity int not null check (quantity between 1 and 20)
);
create index order_items_order_idx on order_items(order_id);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  kind text not null,
  message text not null,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events(order_id, created_at);

-- Payment provider notifications already processed (idempotency).
create table payment_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ── Virtual try-on ──────────────────────────────────────────────────────
-- Studio model photos the store has the rights to use for try-on.
create table tryon_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null check (gender in ('women', 'men')),
  body_type text not null default 'regular',
  view text not null default 'front' check (view in ('front', 'side', 'back')),
  pose text not null default 'standing',
  image_url text not null,
  active boolean not null default true,
  sort int not null default 0
);

-- Customer photos, uploaded only with explicit consent, kept in private storage, deleted on request or on expiry.
create table tryon_photos (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  user_id uuid references users(id) on delete cascade,
  storage_path text not null,
  consent_version text not null,
  consented_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index tryon_photos_owner_idx on tryon_photos(owner_key);

create table tryon_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  provider text not null,
  provider_job_id text,
  product_id uuid references products(id) on delete set null,
  model_id uuid references tryon_models(id) on delete set null,
  photo_id uuid references tryon_photos(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  result_url text,
  error text,
  created_at timestamptz not null default now()
);
create index tryon_jobs_owner_idx on tryon_jobs(owner_key, created_at desc);

-- ── Store settings (PIX key, store name, ...) ─────────────────────────────
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Security: lock every table away from Supabase's public API roles ───
do $$
declare t text;
begin
  foreach t in array array['categories','products','product_images','product_variants','product_media3d','users','sessions',
    'discount_codes','shipping_rates','orders','order_items','order_events','payment_events','tryon_models','tryon_photos',
    'tryon_jobs','settings']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
insert into schema_migrations (name) values ('001_init.sql');

-- ── 002_auth_attempts.sql
-- Failed sign-in attempts, used to slow down password guessing (works across serverless instances).
create table auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index auth_attempts_key_idx on auth_attempts(key, created_at desc);
alter table auth_attempts enable row level security;
insert into schema_migrations (name) values ('002_auth_attempts.sql');

-- ── 003_tryon_steps.sql
-- A try-on job can dress the model in several garments one after another (top, then bottoms).
alter table tryon_jobs add column steps jsonb not null default '[]';
alter table tryon_jobs add column step int not null default 0;
alter table tryon_jobs add column model_input text;
insert into schema_migrations (name) values ('003_tryon_steps.sql');

-- ── Catalogue
\restrict FWZRxguUOb6A7yLYjeg5IJHdVIrRgB5gR3FbCd8hbvxahmQ066CiRJaJcW1Jitp




INSERT INTO public.categories VALUES ('ec5c2cd4-f2ac-4930-82db-4c7a4e3234db', 't-shirts', 'T-shirts', 'fashion', 'Heavy cotton jersey, cut to sit right.', '/catalog/essential-tee-2.jpg', 0, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('701e548e-7afd-4d29-98f1-3c039e62362b', 'shirts', 'Shirts', 'fashion', 'Poplin, chambray and denim, pressed and ready.', '/catalog/poplin-shirt.jpg', 1, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('29ae221b-b9f7-4097-88c4-3eb138fd73b0', 'pants', 'Pants', 'fashion', 'Relaxed tailoring and workwear trousers.', '/catalog/rose-pant.jpg', 2, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('eac18dd8-3887-4ec0-9c09-5c3e0c4e9afe', 'jeans', 'Jeans', 'fashion', 'Rigid and stretch denim in straight and slim fits.', '/catalog/rip-straight-jean.jpg', 3, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('06490314-77ac-44ed-8698-8518044c496e', 'jackets', 'Jackets', 'fashion', 'Leather, denim, bombers and blazers.', '/catalog/moto-leather-jacket.jpg', 4, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('210dd6af-e9fc-4188-a7f4-d38b0e698cac', 'hoodies', 'Hoodies', 'fashion', 'Loopback fleece in quiet colours.', '/catalog/fog-hoodie.jpg', 5, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('6df87c41-cd36-4d96-a2f4-50472934c1bc', 'shorts', 'Shorts', 'fashion', 'For the coast and the city.', '/catalog/frayed-denim-short.jpg', 6, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('2b4e7d9d-3abb-48cb-8efd-714278499939', 'dresses', 'Dresses', 'fashion', 'From day wrap dresses to evening gowns.', '/catalog/carmim-dress.jpg', 7, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('386f5fd9-d242-4c8c-bf20-0389f7bdef60', 'outfits', 'Complete outfits', 'fashion', 'Head-to-toe looks, styled and sold together.', '/catalog/heritage-suit.jpg', 8, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('58f0cd28-0f7e-45ee-acf7-cf16a9d93af2', 'watches', 'Watches', 'accessories', 'Chronographs and minimalist dials.', '/catalog/chrono-watch-1.jpg', 9, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('755a907c-c3fd-4653-bb9d-bf60b7d04516', 'sunglasses', 'Sunglasses', 'accessories', 'Polarised lenses in metal and acetate frames.', '/catalog/aurora-sunglasses.jpg', 10, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('563c0168-bf5d-4b13-9a1f-a4fdb6c74c7e', 'belts', 'Belts', 'accessories', 'Vegetable-tanned leather with solid buckles.', '/catalog/cognac-belt.jpg', 11, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('ee1a77a6-51b9-4e4d-b7ba-0f13cf130530', 'bags', 'Bags', 'accessories', 'Daypacks, satchels and top handles.', '/catalog/rouge-handbag.jpg', 12, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('42f9059b-d535-4a69-b7a5-43ef6d36a154', 'jewelry', 'Jewelry', 'accessories', 'Pearls, pendants and sculpted gold.', '/catalog/sculpt-earrings.jpg', 13, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('e9b8cf37-13f5-4ef0-8ed4-6093a27b822c', 'other-accessories', 'Other accessories', 'accessories', 'Caps and the small things that finish a look.', '/catalog/canvas-cap.jpg', 14, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('44ecdad2-0ceb-446e-abbb-8f6ef87751b4', 'sneakers', 'Sneakers', 'footwear', 'Knit runners and statement trainers.', '/catalog/velocity-midnight-1.jpg', 15, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('37c5e4a7-6efc-4960-9264-9c3b4a4a539d', 'casual-shoes', 'Casual shoes', 'footwear', 'Espadrilles and easy slip-ons.', '/catalog/riviera-espadrille.jpg', 16, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('c2fcf381-e9a5-4e37-8495-144d1354442b', 'formal-shoes', 'Formal shoes', 'footwear', 'Oxfords, monk straps and pumps.', '/catalog/double-monk.jpg', 17, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('79e11243-34d6-48d2-8dc7-4c261a225974', 'boots', 'Boots', 'footwear', 'Lace-up leather boots with grip.', '/catalog/trail-boot.jpg', 18, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.categories VALUES ('cec0b7f5-7737-4c46-9527-49eef9c50c62', 'sandals', 'Sandals', 'footwear', 'Cork footbeds and soft straps.', '/catalog/cork-sandal.jpg', 19, '2026-11-06 19:06:11.541625+00');



INSERT INTO public.discount_codes VALUES ('FRETEGRATIS', 'free_shipping', 0, 29900, NULL, NULL, NULL, 0, true, '2026-11-06 19:06:11.541625+00');
INSERT INTO public.discount_codes VALUES ('BEMVINDO10', 'percent', 10, 0, NULL, NULL, NULL, 3, true, '2026-11-06 19:06:11.541625+00');



INSERT INTO public.products VALUES ('f610eae3-ba8a-4550-814a-541f078ae4d7', 'essential-tee', 'Essential tee', 'A 220 g/m² combed-cotton tee with a close neckline and a straight, slightly boxy body. Washed once before sewing so it keeps its shape.', '100% combed cotton · 220 g/m²
Regular fit, dropped shoulder
Machine wash cold, dry flat', 'ec5c2cd4-f2ac-4930-82db-4c7a4e3234db', 14900, NULL, 'active', 'unisex', true, false, 'tops', 'top', 'neutral', 500, '2026-11-06 19:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('25b264e6-83fb-445c-87bb-3e262aac6b69', 'crest-tee', 'Crest tee', 'Black heavyweight jersey with a small chest crest printed in water-based ink.', '100% cotton · 240 g/m²
Relaxed fit
Print: water-based, soft hand', 'ec5c2cd4-f2ac-4930-82db-4c7a4e3234db', 16900, NULL, 'active', 'unisex', false, true, 'tops', 'top', 'dark', 500, '2026-11-06 18:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('7170581d-5f35-4357-9b41-318d5606a135', 'coast-tee', 'Coast tee', 'A soft white tee with a hand-drawn coastline printed across the back.', '100% cotton · 200 g/m²
Regular fit
Back print', 'ec5c2cd4-f2ac-4930-82db-4c7a4e3234db', 17900, 13900, 'active', 'men', false, false, 'tops', 'top', 'neutral', 500, '2026-11-06 17:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('3c438932-05ab-45a3-a978-f66ac067bee1', 'atelier-tee', 'Atelier tee', 'Our lightest tee, in a fine 160 g/m² jersey that drapes rather than holds.', '100% Pima cotton · 160 g/m²
Slim fit', 'ec5c2cd4-f2ac-4930-82db-4c7a4e3234db', 15900, NULL, 'active', 'unisex', false, false, 'tops', 'top', 'neutral', 500, '2026-11-06 16:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('6ea53189-7479-4194-a6d2-de90d7d7c058', 'indigo-dot-shirt', 'Indigo dot shirt', 'Chambray with a tiny printed dot, finished with mother-of-pearl buttons and a soft collar.', '100% cotton chambray
Regular fit, button-down collar', '701e548e-7afd-4d29-98f1-3c039e62362b', 28900, NULL, 'active', 'men', false, true, 'tops', 'top', 'blue', 500, '2026-11-06 15:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'poplin-shirt', 'Poplin shirt', 'Crisp two-ply poplin in a deep plum, with a cutaway collar for wearing open or with a tie.', '100% cotton poplin, two-ply
Tailored fit', '701e548e-7afd-4d29-98f1-3c039e62362b', 25900, 21900, 'active', 'men', false, false, 'tops', 'top', 'warm', 500, '2026-11-06 14:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'rose-pant', 'Rosa cargo pant', 'High-rise cargo trousers in a fluid twill with an elastic cuff.', 'Viscose blend twill
High rise, tapered leg', '29ae221b-b9f7-4097-88c4-3eb138fd73b0', 24900, NULL, 'active', 'women', false, false, 'bottoms', 'bottom', 'warm', 500, '2026-11-06 13:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', 'indigo-work-pant', 'Indigo work pant', 'Straight-leg work trousers in rinsed indigo denim with reinforced knees.', '100% cotton denim, 13 oz
Straight leg', '29ae221b-b9f7-4097-88c4-3eb138fd73b0', 27900, NULL, 'active', 'men', false, false, 'bottoms', 'bottom', 'blue', 500, '2026-11-06 12:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('83a720e3-005d-4573-95d5-2fe8b9226608', 'rip-straight-jean', 'Ripped straight jean', 'A light-wash straight jean with hand-finished abrasions at the knee.', '99% cotton, 1% elastane
Straight leg, mid rise', 'eac18dd8-3887-4ec0-9c09-5c3e0c4e9afe', 32900, NULL, 'active', 'men', true, false, 'bottoms', 'bottom', 'blue', 500, '2026-11-06 11:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('d4dff2eb-3761-414a-8523-17e0d8006837', 'classic-slim-jean', 'Classic slim jean', 'Our everyday slim jean with just enough stretch for a full day out.', '98% cotton, 2% elastane
Slim fit', 'eac18dd8-3887-4ec0-9c09-5c3e0c4e9afe', 29900, NULL, 'active', 'men', false, false, 'bottoms', 'bottom', 'blue', 500, '2026-11-06 10:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'moto-leather-jacket', 'Moto leather jacket', 'Full-grain lambskin with an asymmetric zip, quilted shoulders and a satin lining.', 'Lambskin leather, satin lining
Regular fit
Specialist leather clean only', '06490314-77ac-44ed-8698-8518044c496e', 129000, 109000, 'active', 'unisex', true, false, 'tops', 'outerwear', 'dark', 500, '2026-11-06 09:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('03299bbf-88d2-44d3-b279-205efb0cc2c0', 'rust-bomber', 'Rust bomber', 'A lightweight nylon bomber in rust, with rib trims and a two-way zip.', '100% recycled nylon shell
Regular fit', '06490314-77ac-44ed-8698-8518044c496e', 54900, NULL, 'active', 'unisex', false, true, 'tops', 'outerwear', 'warm', 500, '2026-11-06 08:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('2919247c-0078-463e-8ae6-fc89d6c96b45', 'cord-denim-jacket', 'Cord-collar denim jacket', 'Rigid indigo denim with a tan corduroy collar and copper shanks.', '100% cotton denim, 14 oz
Boxy fit', '06490314-77ac-44ed-8698-8518044c496e', 45900, NULL, 'active', 'men', false, false, 'tops', 'outerwear', 'blue', 500, '2026-11-06 07:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'noir-blazer', 'Noir tailored blazer', 'A single-breasted wool-blend blazer with a soft shoulder and peak lapels.', '70% wool, 30% polyester
Half-canvas construction', '06490314-77ac-44ed-8698-8518044c496e', 89900, NULL, 'active', 'men', true, false, 'tops', 'outerwear', 'dark', 500, '2026-11-06 06:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('102d5a64-bfda-47ac-bf89-4e03d3784601', 'bleach-denim-jacket', 'Bleached denim jacket', 'A cropped trucker jacket washed down to a pale summer blue.', '100% cotton denim
Cropped fit', '06490314-77ac-44ed-8698-8518044c496e', 39900, 32900, 'active', 'women', false, false, 'tops', 'outerwear', 'blue', 500, '2026-11-06 05:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'fog-hoodie', 'Fog hoodie', 'Brushed loopback fleece with a double-layer hood and a kangaroo pocket.', '80% cotton, 20% polyester · 400 g/m²
Relaxed fit', '210dd6af-e9fc-4188-a7f4-d38b0e698cac', 34900, NULL, 'active', 'unisex', true, false, 'tops', 'top', 'neutral', 500, '2026-11-06 04:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('668af8fc-43d0-4262-a17c-34e977e96549', 'sol-tracksuit', 'Sol tracksuit set', 'A cropped hoodie and jogger set in a saturated sun yellow.', 'Cotton fleece
Sold as a set', '210dd6af-e9fc-4188-a7f4-d38b0e698cac', 49900, NULL, 'active', 'women', false, true, 'one-pieces', 'one-piece', 'warm', 500, '2026-11-06 03:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('e862487d-a951-49c2-9932-e842eeb3e2c7', 'cloud-crewneck', 'Cloud crewneck', 'A clean white crewneck sweatshirt in heavyweight French terry.', '100% cotton French terry
Regular fit', '210dd6af-e9fc-4188-a7f4-d38b0e698cac', 29900, NULL, 'active', 'unisex', false, false, 'tops', 'top', 'neutral', 500, '2026-11-06 02:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('15f676d7-ad50-44b5-b670-dc60f0495213', 'frayed-denim-short', 'Frayed denim short', 'High-rise denim shorts with a rolled, frayed hem.', '100% cotton denim
High rise', '6df87c41-cd36-4d96-a2f4-50472934c1bc', 19900, NULL, 'active', 'women', false, false, 'bottoms', 'bottom', 'blue', 500, '2026-11-06 01:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('c0a12d3b-099c-43fb-99cd-a864b03b08df', 'carmim-dress', 'Carmim dress', 'A fit-and-flare cotton dress in carmine with a small floral print and a self-tie belt.', '100% cotton
Fitted waist, full skirt', '2b4e7d9d-3abb-48cb-8efd-714278499939', 48900, NULL, 'active', 'women', true, false, 'one-pieces', 'one-piece', 'warm', 500, '2026-11-06 00:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('f7b514ec-ba5b-431c-a12a-edb1d913b362', 'scarlet-gown', 'Scarlet gown', 'A floor-length chiffon gown that moves with every step, with a fitted bodice.', 'Silk-feel chiffon, fully lined
Floor length', '2b4e7d9d-3abb-48cb-8efd-714278499939', 119000, NULL, 'active', 'women', false, false, 'one-pieces', 'one-piece', 'warm', 500, '2026-11-05 23:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('4123fbe7-9884-4332-a5d3-f69aa33834e8', 'jardim-wrap-dress', 'Jardim wrap dress', 'A lightweight floral wrap dress made for long lunches by the sea.', '100% viscose
Wrap front, midi length', '2b4e7d9d-3abb-48cb-8efd-714278499939', 42900, 35900, 'active', 'women', false, false, 'one-pieces', 'one-piece', 'neutral', 500, '2026-11-05 22:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'knit-sheath-dress', 'Knit sheath dress', 'A rib-knit sheath that skims the body, with short sleeves and a crew neck.', 'Viscose blend rib knit
Knee length', '2b4e7d9d-3abb-48cb-8efd-714278499939', 38900, NULL, 'active', 'women', false, false, 'one-pieces', 'one-piece', 'neutral', 500, '2026-11-05 21:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('87aec20b-66a8-42b8-a149-e4aeb512f407', 'rubi-slit-dress', 'Rubi slit dress', 'An evening dress with a high slit and a long train in ruby crepe.', 'Crepe, fully lined
Asymmetric hem', '2b4e7d9d-3abb-48cb-8efd-714278499939', 69000, NULL, 'active', 'women', false, true, 'one-pieces', 'one-piece', 'warm', 500, '2026-11-05 20:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'heritage-suit', 'Heritage navy suit', 'Jacket and trousers in a navy wool, styled with a white shirt and brown leather shoes. The suit is sold as two pieces; shirt and shoes are sold separately.', 'Super 110s wool
Two-piece suit', '386f5fd9-d242-4c8c-bf20-0389f7bdef60', 189000, NULL, 'active', 'men', true, false, NULL, NULL, 'blue', 500, '2026-11-05 19:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'midnight-suit', 'Midnight suit', 'A midnight two-piece suit with a narrow lapel for evening.', 'Wool blend
Two-piece suit', '386f5fd9-d242-4c8c-bf20-0389f7bdef60', 169000, 149000, 'active', 'men', false, false, NULL, NULL, 'dark', 500, '2026-11-05 18:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('a217c00d-f0b1-4079-8b13-40625287df2e', 'weekend-set', 'Weekend set', 'A complete look: slim jeans, a white shirt with a knit tie, a sand linen blazer and brown brogues.', 'Four pieces, sizes chosen per piece at checkout notes', '386f5fd9-d242-4c8c-bf20-0389f7bdef60', 149000, NULL, 'active', 'men', false, false, NULL, NULL, 'neutral', 500, '2026-11-05 17:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'camel-layer-look', 'Camel layer look', 'Camel overcoat, white tee and light trousers with white leather trainers.', 'Three pieces', '386f5fd9-d242-4c8c-bf20-0389f7bdef60', 129000, NULL, 'active', 'men', false, false, NULL, NULL, 'warm', 500, '2026-11-05 16:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('f2ce5092-eac0-4dbd-bde2-9bdb18093837', 'chrono-watch', 'Chronograph field watch', 'A shock-resistant chronograph with a sculpted gold-tone case, analogue-digital display and a textured strap.', 'Gold-tone case, resin strap
Water resistant to 200 m
Analogue + digital display', '58f0cd28-0f7e-45ee-acf7-cf16a9d93af2', 189000, NULL, 'active', 'unisex', true, true, NULL, 'watch', 'dark', 500, '2026-11-05 15:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('d16523c1-b1ed-4dd5-8691-582873091904', 'meridian-watch', 'Meridian leather watch', 'A clean white dial on a slim case with a tan calfskin strap.', '38 mm steel case
Italian calfskin strap', '58f0cd28-0f7e-45ee-acf7-cf16a9d93af2', 89000, NULL, 'active', 'unisex', false, false, NULL, 'watch', 'warm', 500, '2026-11-05 14:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('5545724c-6f89-4a26-b503-213bc7f69d65', 'halo-watch', 'Halo minimalist watch', 'An all-white minimalist watch with a black dial and a silicone strap.', '40 mm case
Silicone strap', '58f0cd28-0f7e-45ee-acf7-cf16a9d93af2', 69000, 59000, 'active', 'unisex', false, false, NULL, 'watch', 'neutral', 500, '2026-11-05 13:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('e2425ffd-ae1e-4740-8324-4231e5c95b64', 'aurora-sunglasses', 'Aurora round sunglasses', 'Thin gold-tone round frames with polarised bottle-green lenses.', 'Metal frame
Polarised lenses, UV400', '755a907c-c3fd-4653-bb9d-bf60b7d04516', 45900, NULL, 'active', 'unisex', true, false, NULL, 'eyewear', 'neutral', 500, '2026-11-05 12:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('31787ff9-f395-48a4-bba4-5376a1714b9f', 'lumen-sunglasses', 'Lumen aviator sunglasses', 'Silver aviators with blue mirrored lenses and black acetate temple tips.', 'Metal frame
Mirrored lenses, UV400', '755a907c-c3fd-4653-bb9d-bf60b7d04516', 52900, NULL, 'active', 'unisex', false, true, NULL, 'eyewear', 'blue', 500, '2026-11-05 11:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('49c9a39e-283e-4263-b433-6d5521c3331f', 'cognac-belt', 'Cognac leather belt', 'A 35 mm vegetable-tanned leather belt with a brushed steel buckle.', 'Full-grain leather
35 mm width', '563c0168-bf5d-4b13-9a1f-a4fdb6c74c7e', 22900, NULL, 'active', 'unisex', false, false, NULL, 'accessory', 'warm', 500, '2026-11-05 10:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('bbf42783-72b1-41dd-b2cf-66243d2e2146', 'navy-daypack', 'Navy daypack', 'A water-resistant daypack with a padded laptop sleeve.', 'Recycled polyester
Fits a 15" laptop', 'ee1a77a6-51b9-4e4d-b7ba-0f13cf130530', 38900, NULL, 'active', 'unisex', false, false, NULL, 'accessory', 'blue', 500, '2026-11-05 09:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('5c7fbeaa-3cd5-406d-88d5-8a917881170b', 'rouge-handbag', 'Rouge top-handle bag', 'Structured calfskin with a silver clasp and a detachable strap.', 'Smooth calfskin
Detachable shoulder strap', 'ee1a77a6-51b9-4e4d-b7ba-0f13cf130530', 129000, NULL, 'active', 'women', true, false, NULL, 'accessory', 'warm', 500, '2026-11-05 08:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('06705de0-d31e-4e35-8845-e37dee7f05b8', 'pearl-satchel', 'Pearl grey satchel', 'A compact satchel with gold-tone hardware.', 'Pebbled leather', 'ee1a77a6-51b9-4e4d-b7ba-0f13cf130530', 79000, 69000, 'active', 'women', false, false, NULL, 'accessory', 'neutral', 500, '2026-11-05 07:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('604eaf3b-a428-45e9-a6ed-c2d020f5484a', 'perola-necklace', 'Pérola necklace', 'A single strand of freshwater pearls with a gold-plated clasp.', 'Freshwater pearls, 45 cm', '42f9059b-d535-4a69-b7a5-43ef6d36a154', 69000, NULL, 'active', 'women', false, false, NULL, 'accessory', 'neutral', 500, '2026-11-05 06:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('466ca77d-be26-4f51-a58c-58f1d89b1c3c', 'crescent-pendant', 'Crescent pendant', 'Layered chains with a crescent moon and a faceted stone.', 'Gold-plated brass', '42f9059b-d535-4a69-b7a5-43ef6d36a154', 34900, NULL, 'active', 'women', false, false, NULL, 'accessory', 'warm', 500, '2026-11-05 05:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('f504cdef-7582-4df1-8bb7-9e69d5c27dea', 'sculpt-earrings', 'Sculpt earrings', 'Molten gold-plated hoops with an organic, hand-finished surface.', '18k gold-plated brass', '42f9059b-d535-4a69-b7a5-43ef6d36a154', 42900, NULL, 'active', 'women', false, true, NULL, 'accessory', 'warm', 500, '2026-11-05 04:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('c640cba5-69b2-493d-81ae-cd93d5736429', 'drop-necklace', 'Drop necklace', 'A fine chain with a single pearl drop.', 'Gold-plated silver, 42 cm', '42f9059b-d535-4a69-b7a5-43ef6d36a154', 28900, NULL, 'active', 'women', false, false, NULL, 'accessory', 'neutral', 500, '2026-11-05 03:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('d696f2c4-9516-470e-b49d-d778c0d5e3de', 'canvas-cap', 'Canvas cap', 'A six-panel cotton canvas cap with an adjustable strap.', '100% cotton canvas', 'e9b8cf37-13f5-4ef0-8ed4-6093a27b822c', 14900, NULL, 'active', 'unisex', false, false, NULL, 'accessory', 'neutral', 500, '2026-11-05 02:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('29f9b246-49db-436b-a004-a1c358e062d0', 'velocity-sneaker', 'Velocity knit sneaker', 'A breathable knit runner on a cushioned foam sole. Pick a colourway and the 3D model changes with it.', 'Engineered knit upper
EVA foam midsole
Removable insole', '44ecdad2-0ceb-446e-abbb-8f6ef87751b4', 79900, NULL, 'active', 'unisex', true, true, NULL, 'shoes', 'blue', 500, '2026-11-05 01:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('57d7b5cb-f0e6-4981-819e-ac7216c38655', 'prism-runner', 'Prism runner', 'Chunky layered panels in bold colour blocks on an ivory base.', 'Mesh and suede upper', '44ecdad2-0ceb-446e-abbb-8f6ef87751b4', 69900, 59900, 'active', 'unisex', false, false, NULL, 'shoes', 'neutral', 500, '2026-11-05 00:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('2986bc5f-23db-4447-b6ab-b024e2ad30d2', 'riviera-espadrille', 'Riviera espadrille', 'Canvas espadrilles on a braided jute sole, made for summer.', 'Cotton canvas, jute sole', '37c5e4a7-6efc-4960-9264-9c3b4a4a539d', 24900, NULL, 'active', 'unisex', false, false, NULL, 'shoes', 'warm', 500, '2026-11-04 23:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('b9580d8c-6611-4821-b4d7-8771ad1e6e7e', 'double-monk', 'Double monk strap', 'Burnished calf leather with two buckled straps on a Goodyear-welted sole.', 'Calf leather
Goodyear welt', 'c2fcf381-e9a5-4e37-8495-144d1354442b', 79000, NULL, 'active', 'men', false, false, NULL, 'shoes', 'warm', 500, '2026-11-04 22:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('8e9f99e6-965a-4420-868b-e8b882700bdf', 'oxford-cognac', 'Cognac oxford', 'A sleek cap-toe oxford in hand-polished cognac leather.', 'Calf leather
Leather sole', 'c2fcf381-e9a5-4e37-8495-144d1354442b', 69000, NULL, 'active', 'men', false, false, NULL, 'shoes', 'warm', 500, '2026-11-04 21:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('432e957b-2bb4-4515-a192-3bd68a89c7aa', 'floral-pump', 'Floral pump', 'A pointed stiletto pump in printed satin.', 'Satin upper, 10 cm heel', 'c2fcf381-e9a5-4e37-8495-144d1354442b', 59000, NULL, 'active', 'women', false, false, NULL, 'shoes', 'blue', 500, '2026-11-04 20:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('09bc2c62-c8e2-484a-bc56-1e9247a33fd3', 'trail-boot', 'Trail lace boot', 'Waxed leather lace-up boots with a lugged rubber sole.', 'Waxed leather
Rubber lug sole', '79e11243-34d6-48d2-8dc7-4c261a225974', 79000, NULL, 'active', 'men', false, false, NULL, 'shoes', 'warm', 500, '2026-11-04 19:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('52726473-334e-4c9f-ae4c-50a6f8bc6513', 'obsidian-boot', 'Obsidian boot', 'A dark brown leather boot with a clean toe and a stacked heel.', 'Leather upper, rubber sole', '79e11243-34d6-48d2-8dc7-4c261a225974', 84900, NULL, 'active', 'men', false, false, NULL, 'shoes', 'dark', 500, '2026-11-04 18:06:11.541625+00', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.products VALUES ('7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', 'cork-sandal', 'Cork sandal', 'Two-strap sandals on a contoured cork footbed.', 'Suede straps, cork footbed', 'cec0b7f5-7737-4c46-9527-49eef9c50c62', 29900, NULL, 'active', 'unisex', false, false, NULL, 'shoes', 'neutral', 500, '2026-11-04 17:06:11.541625+00', '2026-11-06 19:06:11.541625+00');



INSERT INTO public.product_images VALUES ('4e8da52b-521e-429d-b0d0-a90f905f5471', 'f610eae3-ba8a-4550-814a-541f078ae4d7', '/catalog/essential-tee.jpg', 'Essential tee', NULL, 0);
INSERT INTO public.product_images VALUES ('cb136745-7024-4a00-bcd0-d842774b7c67', 'f610eae3-ba8a-4550-814a-541f078ae4d7', '/catalog/essential-tee-2.jpg', 'Essential tee', NULL, 1);
INSERT INTO public.product_images VALUES ('253bbfe6-8a6e-4543-8859-cc48327981d1', '25b264e6-83fb-445c-87bb-3e262aac6b69', '/catalog/crest-tee.jpg', 'Crest tee', NULL, 0);
INSERT INTO public.product_images VALUES ('642c00ce-15ca-4a9d-b2ee-c7f6abd6f61b', '7170581d-5f35-4357-9b41-318d5606a135', '/catalog/coast-tee.jpg', 'Coast tee', NULL, 0);
INSERT INTO public.product_images VALUES ('1d5bcc86-88f7-4565-b173-4f74aa963a12', '3c438932-05ab-45a3-a978-f66ac067bee1', '/catalog/atelier-tee.jpg', 'Atelier tee', NULL, 0);
INSERT INTO public.product_images VALUES ('a53dc28e-0c9b-4177-acb6-3e96796d30bf', '6ea53189-7479-4194-a6d2-de90d7d7c058', '/catalog/indigo-dot-shirt.jpg', 'Indigo dot shirt', NULL, 0);
INSERT INTO public.product_images VALUES ('0939ea7c-2fff-4fcf-b1d8-bbf93cdac8a8', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', '/catalog/poplin-shirt.jpg', 'Poplin shirt', NULL, 0);
INSERT INTO public.product_images VALUES ('96af9c99-aa5c-47b6-895a-0da68f2f3737', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', '/catalog/rose-pant.jpg', 'Rosa cargo pant', NULL, 0);
INSERT INTO public.product_images VALUES ('5b32da65-af17-4fe6-ab09-44791ebac426', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '/catalog/indigo-work-pant.jpg', 'Indigo work pant', NULL, 0);
INSERT INTO public.product_images VALUES ('2e0a00c4-ba4b-4046-b0cd-ffd34c4d237c', '83a720e3-005d-4573-95d5-2fe8b9226608', '/catalog/rip-straight-jean.jpg', 'Ripped straight jean', NULL, 0);
INSERT INTO public.product_images VALUES ('e6e4b901-4137-45b4-9f46-851571ae3828', 'd4dff2eb-3761-414a-8523-17e0d8006837', '/catalog/classic-slim-jean.jpg', 'Classic slim jean', NULL, 0);
INSERT INTO public.product_images VALUES ('b4f30e0f-921e-499e-83fb-944dc9e7e596', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', '/catalog/moto-leather-jacket.jpg', 'Moto leather jacket', NULL, 0);
INSERT INTO public.product_images VALUES ('e3aecaee-725a-4ebc-a0d7-1b22c6e0aeed', '03299bbf-88d2-44d3-b279-205efb0cc2c0', '/catalog/rust-bomber.jpg', 'Rust bomber', NULL, 0);
INSERT INTO public.product_images VALUES ('bc85e6cb-077e-45e0-8698-fa808103a334', '2919247c-0078-463e-8ae6-fc89d6c96b45', '/catalog/cord-denim-jacket.jpg', 'Cord-collar denim jacket', NULL, 0);
INSERT INTO public.product_images VALUES ('fa667abe-6cae-4c48-aa80-00e9cd84e752', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', '/catalog/noir-blazer.jpg', 'Noir tailored blazer', NULL, 0);
INSERT INTO public.product_images VALUES ('358b7e89-c089-4cda-8114-81565a7b8f58', '102d5a64-bfda-47ac-bf89-4e03d3784601', '/catalog/bleach-denim-jacket.jpg', 'Bleached denim jacket', NULL, 0);
INSERT INTO public.product_images VALUES ('401af537-5816-4ea8-8a0b-d69d647ffad0', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', '/catalog/fog-hoodie.jpg', 'Fog hoodie', NULL, 0);
INSERT INTO public.product_images VALUES ('89054cec-88ff-4eec-9ba2-c73bb6d31d80', '668af8fc-43d0-4262-a17c-34e977e96549', '/catalog/sol-tracksuit.jpg', 'Sol tracksuit set', NULL, 0);
INSERT INTO public.product_images VALUES ('64831a87-7f88-464e-b4e2-4a6c2fa01f58', 'e862487d-a951-49c2-9932-e842eeb3e2c7', '/catalog/cloud-crewneck.jpg', 'Cloud crewneck', NULL, 0);
INSERT INTO public.product_images VALUES ('aa3dafdf-b237-4e2d-9aee-c6dd174e5a9d', '15f676d7-ad50-44b5-b670-dc60f0495213', '/catalog/frayed-denim-short.jpg', 'Frayed denim short', NULL, 0);
INSERT INTO public.product_images VALUES ('f747a653-14ba-4526-b21e-65de28fcb0c0', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', '/catalog/carmim-dress.jpg', 'Carmim dress', NULL, 0);
INSERT INTO public.product_images VALUES ('a82b2dfb-0c31-4d05-9ec7-b59d68bd58f5', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', '/catalog/scarlet-gown.jpg', 'Scarlet gown', NULL, 0);
INSERT INTO public.product_images VALUES ('3e0ba176-1e68-464b-9956-149240b77c43', '4123fbe7-9884-4332-a5d3-f69aa33834e8', '/catalog/jardim-wrap-dress.jpg', 'Jardim wrap dress', NULL, 0);
INSERT INTO public.product_images VALUES ('c6565699-0b05-48ae-8552-b1be42eb892c', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', '/catalog/knit-sheath-dress.jpg', 'Knit sheath dress', NULL, 0);
INSERT INTO public.product_images VALUES ('3316d6bc-6327-4ccf-99ec-0dad23fcd8a1', '87aec20b-66a8-42b8-a149-e4aeb512f407', '/catalog/rubi-slit-dress.jpg', 'Rubi slit dress', NULL, 0);
INSERT INTO public.product_images VALUES ('5a391497-dacf-4ea7-aba3-73eb5d109626', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', '/catalog/heritage-suit.jpg', 'Heritage navy suit', NULL, 0);
INSERT INTO public.product_images VALUES ('22cdbb97-aaf0-4ae5-857e-469ede98e95a', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', '/catalog/midnight-suit.jpg', 'Midnight suit', NULL, 0);
INSERT INTO public.product_images VALUES ('9898aac4-44bc-4329-a0b2-1a18c68f1b70', 'a217c00d-f0b1-4079-8b13-40625287df2e', '/catalog/weekend-set.jpg', 'Weekend set', NULL, 0);
INSERT INTO public.product_images VALUES ('d67afa6e-882c-440e-8d6d-c4b8918a0e8e', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', '/catalog/camel-layer-look.jpg', 'Camel layer look', NULL, 0);
INSERT INTO public.product_images VALUES ('44e93b20-94c6-4449-9ab9-120cb826d553', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', '/catalog/chrono-watch-1.jpg', 'Chronograph field watch', NULL, 0);
INSERT INTO public.product_images VALUES ('e608d02e-04cb-47f0-b95c-e920c3b4198a', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', '/catalog/chrono-watch-2.jpg', 'Chronograph field watch', NULL, 1);
INSERT INTO public.product_images VALUES ('f785819f-b7f6-468e-a12b-8e7342e63480', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', '/catalog/chrono-watch-3.jpg', 'Chronograph field watch', NULL, 2);
INSERT INTO public.product_images VALUES ('4b1b3ebb-5430-40f0-b8c9-e40f6a86d127', 'd16523c1-b1ed-4dd5-8691-582873091904', '/catalog/meridian-watch.jpg', 'Meridian leather watch', NULL, 0);
INSERT INTO public.product_images VALUES ('a0ff2a74-cfcc-4535-84ae-a75b4c7d4eca', '5545724c-6f89-4a26-b503-213bc7f69d65', '/catalog/halo-watch.jpg', 'Halo minimalist watch', NULL, 0);
INSERT INTO public.product_images VALUES ('06a7a4bf-e522-477e-bba0-1705cea599a0', 'e2425ffd-ae1e-4740-8324-4231e5c95b64', '/catalog/aurora-sunglasses.jpg', 'Aurora round sunglasses', NULL, 0);
INSERT INTO public.product_images VALUES ('4e61c51b-0eae-4d61-83fd-99bf97974c7a', '31787ff9-f395-48a4-bba4-5376a1714b9f', '/catalog/lumen-sunglasses-1.jpg', 'Lumen aviator sunglasses', NULL, 0);
INSERT INTO public.product_images VALUES ('99e01140-1f2f-4298-be3e-0dae142aaa26', '31787ff9-f395-48a4-bba4-5376a1714b9f', '/catalog/lumen-sunglasses-2.jpg', 'Lumen aviator sunglasses', NULL, 1);
INSERT INTO public.product_images VALUES ('16e6954b-bc4e-48ca-99a0-d5c3d8113349', '31787ff9-f395-48a4-bba4-5376a1714b9f', '/catalog/lumen-sunglasses-3.jpg', 'Lumen aviator sunglasses', NULL, 2);
INSERT INTO public.product_images VALUES ('d35f9ef8-747d-4305-b759-3266280f15af', '49c9a39e-283e-4263-b433-6d5521c3331f', '/catalog/cognac-belt.jpg', 'Cognac leather belt', NULL, 0);
INSERT INTO public.product_images VALUES ('9d883099-d900-423f-b4c9-1491661eaa5e', 'bbf42783-72b1-41dd-b2cf-66243d2e2146', '/catalog/navy-daypack.jpg', 'Navy daypack', NULL, 0);
INSERT INTO public.product_images VALUES ('e188a4d4-e42a-4c8c-aaf3-ec1a5b9208dd', '5c7fbeaa-3cd5-406d-88d5-8a917881170b', '/catalog/rouge-handbag.jpg', 'Rouge top-handle bag', NULL, 0);
INSERT INTO public.product_images VALUES ('fd322ee3-54ba-40b3-b0d2-acf851e2cae8', '06705de0-d31e-4e35-8845-e37dee7f05b8', '/catalog/pearl-satchel.jpg', 'Pearl grey satchel', NULL, 0);
INSERT INTO public.product_images VALUES ('f043360b-0244-4cb6-9358-ebd67287700e', '604eaf3b-a428-45e9-a6ed-c2d020f5484a', '/catalog/perola-necklace.jpg', 'Pérola necklace', NULL, 0);
INSERT INTO public.product_images VALUES ('bbbe2608-0394-4769-88e7-673b2f426b0d', '466ca77d-be26-4f51-a58c-58f1d89b1c3c', '/catalog/crescent-pendant.jpg', 'Crescent pendant', NULL, 0);
INSERT INTO public.product_images VALUES ('07b1bac4-947c-4cd3-95fe-facb37a8f64a', 'f504cdef-7582-4df1-8bb7-9e69d5c27dea', '/catalog/sculpt-earrings.jpg', 'Sculpt earrings', NULL, 0);
INSERT INTO public.product_images VALUES ('ffc6d322-6ce8-4a8b-800d-8ab99a0744f0', 'c640cba5-69b2-493d-81ae-cd93d5736429', '/catalog/drop-necklace.jpg', 'Drop necklace', NULL, 0);
INSERT INTO public.product_images VALUES ('55c856b5-b4ce-45b7-b3a3-008d8637acb5', 'd696f2c4-9516-470e-b49d-d778c0d5e3de', '/catalog/canvas-cap.jpg', 'Canvas cap', NULL, 0);
INSERT INTO public.product_images VALUES ('11927bac-21d4-43b6-8687-3466ad0367a8', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-midnight-1.jpg', 'Velocity knit sneaker, Midnight blue', 'Midnight blue', 0);
INSERT INTO public.product_images VALUES ('50d9ecca-90a5-4fb6-bd26-5e8903411fd6', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-midnight-2.jpg', 'Velocity knit sneaker, Midnight blue', 'Midnight blue', 1);
INSERT INTO public.product_images VALUES ('880bba32-915f-464b-b408-7cb39c519bc3', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-beach-1.jpg', 'Velocity knit sneaker, Beach rose', 'Beach rose', 2);
INSERT INTO public.product_images VALUES ('c34d2cef-9332-43c6-a7fb-324318994a24', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-beach-2.jpg', 'Velocity knit sneaker, Beach rose', 'Beach rose', 3);
INSERT INTO public.product_images VALUES ('65d14a6b-0397-4d20-b1d1-8caf51085404', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-street-1.jpg', 'Velocity knit sneaker, Street black', 'Street black', 4);
INSERT INTO public.product_images VALUES ('067925bf-de01-42ae-8ed0-1a4aaf223c26', '29f9b246-49db-436b-a004-a1c358e062d0', '/catalog/velocity-street-2.jpg', 'Velocity knit sneaker, Street black', 'Street black', 5);
INSERT INTO public.product_images VALUES ('39b58bdb-b7ec-44dc-9bb4-3d6da098d1c8', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '/catalog/prism-runner.jpg', 'Prism runner', NULL, 0);
INSERT INTO public.product_images VALUES ('04760798-7554-4795-9619-da62f9d95a13', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '/catalog/riviera-espadrille.jpg', 'Riviera espadrille', NULL, 0);
INSERT INTO public.product_images VALUES ('52a6c6b6-84ad-470e-a3e4-a06075004ebd', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '/catalog/double-monk.jpg', 'Double monk strap', NULL, 0);
INSERT INTO public.product_images VALUES ('e09d299a-6472-40cd-a1cd-d0dd261801c3', '8e9f99e6-965a-4420-868b-e8b882700bdf', '/catalog/oxford-cognac.jpg', 'Cognac oxford', NULL, 0);
INSERT INTO public.product_images VALUES ('60d4c6cd-e274-4635-82e0-9702af301eb7', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '/catalog/floral-pump.jpg', 'Floral pump', NULL, 0);
INSERT INTO public.product_images VALUES ('22c3da4a-f177-4ac4-ab36-cfef8f4fecf7', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '/catalog/trail-boot.jpg', 'Trail lace boot', NULL, 0);
INSERT INTO public.product_images VALUES ('9e736df2-88ba-4df6-8e1c-c2a88bac0501', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '/catalog/obsidian-boot.jpg', 'Obsidian boot', NULL, 0);
INSERT INTO public.product_images VALUES ('ef7c105b-9705-4903-8d85-6a75720b2e37', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '/catalog/cork-sandal.jpg', 'Cork sandal', NULL, 0);



INSERT INTO public.product_media3d VALUES ('6682941f-dbb8-4468-bb7a-8428118124e9', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', 'model', '/models/chrono-watch.glb', '{}', '/catalog/chrono-watch-1.jpg', '{}', '3D model: “Chronograph Watch” by Eric Chadwick / DGG, CC BY 4.0 (Khronos glTF Sample Assets).', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.product_media3d VALUES ('90e5895f-52c8-4188-8d2e-db2dc8d8b900', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', 'sequence', NULL, '{/catalog/360/chrono-watch/00.webp,/catalog/360/chrono-watch/01.webp,/catalog/360/chrono-watch/02.webp,/catalog/360/chrono-watch/03.webp,/catalog/360/chrono-watch/04.webp,/catalog/360/chrono-watch/05.webp,/catalog/360/chrono-watch/06.webp,/catalog/360/chrono-watch/07.webp,/catalog/360/chrono-watch/08.webp,/catalog/360/chrono-watch/09.webp,/catalog/360/chrono-watch/10.webp,/catalog/360/chrono-watch/11.webp,/catalog/360/chrono-watch/12.webp,/catalog/360/chrono-watch/13.webp,/catalog/360/chrono-watch/14.webp,/catalog/360/chrono-watch/15.webp,/catalog/360/chrono-watch/16.webp,/catalog/360/chrono-watch/17.webp,/catalog/360/chrono-watch/18.webp,/catalog/360/chrono-watch/19.webp,/catalog/360/chrono-watch/20.webp,/catalog/360/chrono-watch/21.webp,/catalog/360/chrono-watch/22.webp,/catalog/360/chrono-watch/23.webp,/catalog/360/chrono-watch/24.webp,/catalog/360/chrono-watch/25.webp,/catalog/360/chrono-watch/26.webp,/catalog/360/chrono-watch/27.webp,/catalog/360/chrono-watch/28.webp,/catalog/360/chrono-watch/29.webp,/catalog/360/chrono-watch/30.webp,/catalog/360/chrono-watch/31.webp,/catalog/360/chrono-watch/32.webp,/catalog/360/chrono-watch/33.webp,/catalog/360/chrono-watch/34.webp,/catalog/360/chrono-watch/35.webp}', '/catalog/chrono-watch-1.jpg', '{}', '3D model: “Chronograph Watch” by Eric Chadwick / DGG, CC BY 4.0 (Khronos glTF Sample Assets). 360° sequence rendered from the 3D model.', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.product_media3d VALUES ('b3761d12-eb53-4427-91e9-0f7e2306ee1b', '31787ff9-f395-48a4-bba4-5376a1714b9f', 'model', '/models/lumen-sunglasses.glb', '{}', '/catalog/lumen-sunglasses-1.jpg', '{}', '3D model: “Sunglasses Khronos” by Eric Chadwick / DGG, CC BY 4.0 (Khronos glTF Sample Assets).', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.product_media3d VALUES ('306122b4-b0a3-4da0-8335-b5b839ff1141', '29f9b246-49db-436b-a004-a1c358e062d0', 'model', '/models/velocity-sneaker.glb', '{}', '/catalog/velocity-midnight-1.jpg', '{"Beach rose": "beach", "Street black": "street", "Midnight blue": "midnight"}', '3D model: “Materials Variants Shoe” by Shopify, CC BY 4.0 (Khronos glTF Sample Assets).', '2026-11-06 19:06:11.541625+00');
INSERT INTO public.product_media3d VALUES ('009ad5fe-f84b-408d-877d-512759dd6765', '29f9b246-49db-436b-a004-a1c358e062d0', 'sequence', NULL, '{/catalog/360/velocity-sneaker/00.webp,/catalog/360/velocity-sneaker/01.webp,/catalog/360/velocity-sneaker/02.webp,/catalog/360/velocity-sneaker/03.webp,/catalog/360/velocity-sneaker/04.webp,/catalog/360/velocity-sneaker/05.webp,/catalog/360/velocity-sneaker/06.webp,/catalog/360/velocity-sneaker/07.webp,/catalog/360/velocity-sneaker/08.webp,/catalog/360/velocity-sneaker/09.webp,/catalog/360/velocity-sneaker/10.webp,/catalog/360/velocity-sneaker/11.webp,/catalog/360/velocity-sneaker/12.webp,/catalog/360/velocity-sneaker/13.webp,/catalog/360/velocity-sneaker/14.webp,/catalog/360/velocity-sneaker/15.webp,/catalog/360/velocity-sneaker/16.webp,/catalog/360/velocity-sneaker/17.webp,/catalog/360/velocity-sneaker/18.webp,/catalog/360/velocity-sneaker/19.webp,/catalog/360/velocity-sneaker/20.webp,/catalog/360/velocity-sneaker/21.webp,/catalog/360/velocity-sneaker/22.webp,/catalog/360/velocity-sneaker/23.webp,/catalog/360/velocity-sneaker/24.webp,/catalog/360/velocity-sneaker/25.webp,/catalog/360/velocity-sneaker/26.webp,/catalog/360/velocity-sneaker/27.webp,/catalog/360/velocity-sneaker/28.webp,/catalog/360/velocity-sneaker/29.webp,/catalog/360/velocity-sneaker/30.webp,/catalog/360/velocity-sneaker/31.webp,/catalog/360/velocity-sneaker/32.webp,/catalog/360/velocity-sneaker/33.webp,/catalog/360/velocity-sneaker/34.webp,/catalog/360/velocity-sneaker/35.webp}', '/catalog/velocity-midnight-1.jpg', '{}', '3D model: “Materials Variants Shoe” by Shopify, CC BY 4.0 (Khronos glTF Sample Assets). 360° sequence rendered from the 3D model.', '2026-11-06 19:06:11.541625+00');



INSERT INTO public.product_variants VALUES ('14de3116-ce8b-40d3-94cf-b073260ac99d', 'f610eae3-ba8a-4550-814a-541f078ae4d7', 'XS', 'Chalk white', '#f2f2ee', 'JM-ESSENTIAL-TEE-CHALK-WHITE-XS', 3, 0);
INSERT INTO public.product_variants VALUES ('16ae735b-7439-4beb-a2c7-15865013b8a9', 'f610eae3-ba8a-4550-814a-541f078ae4d7', 'S', 'Chalk white', '#f2f2ee', 'JM-ESSENTIAL-TEE-CHALK-WHITE-S', 3, 1);
INSERT INTO public.product_variants VALUES ('22c11c0d-5d8b-47e1-895d-83083a6baefd', 'f610eae3-ba8a-4550-814a-541f078ae4d7', 'M', 'Chalk white', '#f2f2ee', 'JM-ESSENTIAL-TEE-CHALK-WHITE-M', 11, 2);
INSERT INTO public.product_variants VALUES ('9559faa7-d1fe-46f0-b666-b5b7ef944d27', 'f610eae3-ba8a-4550-814a-541f078ae4d7', 'L', 'Chalk white', '#f2f2ee', 'JM-ESSENTIAL-TEE-CHALK-WHITE-L', 10, 3);
INSERT INTO public.product_variants VALUES ('06846bbd-ca68-42d7-84cf-7d0d411456c7', 'f610eae3-ba8a-4550-814a-541f078ae4d7', 'XL', 'Chalk white', '#f2f2ee', 'JM-ESSENTIAL-TEE-CHALK-WHITE-XL', 10, 4);
INSERT INTO public.product_variants VALUES ('4e5a804a-8cf4-4a9b-b244-15044444aa5e', '25b264e6-83fb-445c-87bb-3e262aac6b69', 'XS', 'Onyx', '#151515', 'JM-CREST-TEE-ONYX-XS', 9, 0);
INSERT INTO public.product_variants VALUES ('0a2eae43-7b7f-4a77-8e65-5558eb9e7718', '25b264e6-83fb-445c-87bb-3e262aac6b69', 'S', 'Onyx', '#151515', 'JM-CREST-TEE-ONYX-S', 3, 1);
INSERT INTO public.product_variants VALUES ('2ea073d8-c616-48f9-acda-5f7db2cab402', '25b264e6-83fb-445c-87bb-3e262aac6b69', 'M', 'Onyx', '#151515', 'JM-CREST-TEE-ONYX-M', 11, 2);
INSERT INTO public.product_variants VALUES ('0da6140f-4d7b-4437-a2c0-e6ccfbc445aa', '25b264e6-83fb-445c-87bb-3e262aac6b69', 'L', 'Onyx', '#151515', 'JM-CREST-TEE-ONYX-L', 10, 3);
INSERT INTO public.product_variants VALUES ('01f85ed7-70cb-472d-a967-6fb358887b53', '25b264e6-83fb-445c-87bb-3e262aac6b69', 'XL', 'Onyx', '#151515', 'JM-CREST-TEE-ONYX-XL', 2, 4);
INSERT INTO public.product_variants VALUES ('b214d9a8-087c-46ba-af63-d2d8a7110f27', '7170581d-5f35-4357-9b41-318d5606a135', 'XS', 'Salt white', '#ecebe6', 'JM-COAST-TEE-SALT-WHITE-XS', 10, 0);
INSERT INTO public.product_variants VALUES ('ff9347c9-a6c6-4e90-bb7c-7bf40f50bf32', '7170581d-5f35-4357-9b41-318d5606a135', 'S', 'Salt white', '#ecebe6', 'JM-COAST-TEE-SALT-WHITE-S', 4, 1);
INSERT INTO public.product_variants VALUES ('c02bc2a5-e2df-4e2b-b2b6-fcc3384dde71', '7170581d-5f35-4357-9b41-318d5606a135', 'M', 'Salt white', '#ecebe6', 'JM-COAST-TEE-SALT-WHITE-M', 12, 2);
INSERT INTO public.product_variants VALUES ('11c1c120-6b6f-4fe9-b5cf-b3140dd878b6', '7170581d-5f35-4357-9b41-318d5606a135', 'L', 'Salt white', '#ecebe6', 'JM-COAST-TEE-SALT-WHITE-L', 11, 3);
INSERT INTO public.product_variants VALUES ('745c2c05-8bd8-4266-8b3b-1497fc167dcf', '7170581d-5f35-4357-9b41-318d5606a135', 'XL', 'Salt white', '#ecebe6', 'JM-COAST-TEE-SALT-WHITE-XL', 3, 4);
INSERT INTO public.product_variants VALUES ('eb9d8151-4f38-4ec2-8efb-80969289d488', '3c438932-05ab-45a3-a978-f66ac067bee1', 'XS', 'Ivory', '#f4f1ea', 'JM-ATELIER-TEE-IVORY-XS', 15, 0);
INSERT INTO public.product_variants VALUES ('5438d268-440a-4720-abc9-34dbc96e48fd', '3c438932-05ab-45a3-a978-f66ac067bee1', 'S', 'Ivory', '#f4f1ea', 'JM-ATELIER-TEE-IVORY-S', 5, 1);
INSERT INTO public.product_variants VALUES ('bb9897ce-d5c2-4787-883b-4cdae962e14c', '3c438932-05ab-45a3-a978-f66ac067bee1', 'M', 'Ivory', '#f4f1ea', 'JM-ATELIER-TEE-IVORY-M', 13, 2);
INSERT INTO public.product_variants VALUES ('3e90c42a-0b9f-43b6-896d-2377f36d46df', '3c438932-05ab-45a3-a978-f66ac067bee1', 'L', 'Ivory', '#f4f1ea', 'JM-ATELIER-TEE-IVORY-L', 12, 3);
INSERT INTO public.product_variants VALUES ('0dee43a7-5b25-4890-9f81-95cb34591c1d', '3c438932-05ab-45a3-a978-f66ac067bee1', 'XL', 'Ivory', '#f4f1ea', 'JM-ATELIER-TEE-IVORY-XL', 8, 4);
INSERT INTO public.product_variants VALUES ('aca9bbb1-195c-4669-a486-819db259334c', '6ea53189-7479-4194-a6d2-de90d7d7c058', 'XS', 'Indigo', '#3d5878', 'JM-INDIGO-DOT-SHIRT-INDIGO-XS', 4, 0);
INSERT INTO public.product_variants VALUES ('cd74b86a-2cf0-4199-a6a6-99544f4ae151', '6ea53189-7479-4194-a6d2-de90d7d7c058', 'S', 'Indigo', '#3d5878', 'JM-INDIGO-DOT-SHIRT-INDIGO-S', 14, 1);
INSERT INTO public.product_variants VALUES ('da705528-d1f7-4f44-b278-0b1b79f8ea81', '6ea53189-7479-4194-a6d2-de90d7d7c058', 'M', 'Indigo', '#3d5878', 'JM-INDIGO-DOT-SHIRT-INDIGO-M', 8, 2);
INSERT INTO public.product_variants VALUES ('75cfe3d9-c252-4a9e-b606-af4036f33cd5', '6ea53189-7479-4194-a6d2-de90d7d7c058', 'L', 'Indigo', '#3d5878', 'JM-INDIGO-DOT-SHIRT-INDIGO-L', 0, 3);
INSERT INTO public.product_variants VALUES ('55352d1a-e7fb-4dbe-9774-5274206f8772', '6ea53189-7479-4194-a6d2-de90d7d7c058', 'XL', 'Indigo', '#3d5878', 'JM-INDIGO-DOT-SHIRT-INDIGO-XL', 11, 4);
INSERT INTO public.product_variants VALUES ('41af3da2-3648-45ff-b53a-ca1d4ee682ba', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'XS', 'Plum', '#5a2742', 'JM-POPLIN-SHIRT-PLUM-XS', 8, 0);
INSERT INTO public.product_variants VALUES ('ab40d0e1-9a36-4cd3-bc22-49ad1c0048f2', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'S', 'Plum', '#5a2742', 'JM-POPLIN-SHIRT-PLUM-S', 2, 1);
INSERT INTO public.product_variants VALUES ('b933a3bc-e5f4-4f44-97a4-77e140b2f252', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'M', 'Plum', '#5a2742', 'JM-POPLIN-SHIRT-PLUM-M', 10, 2);
INSERT INTO public.product_variants VALUES ('3bd1e0cf-c2c9-4407-92f3-36a1aa2783cc', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'L', 'Plum', '#5a2742', 'JM-POPLIN-SHIRT-PLUM-L', 9, 3);
INSERT INTO public.product_variants VALUES ('b5f6b7b9-2781-435c-a7dd-664717fd864f', '225d211d-aa6b-4f13-82aa-95ac686ab0cc', 'XL', 'Plum', '#5a2742', 'JM-POPLIN-SHIRT-PLUM-XL', 15, 4);
INSERT INTO public.product_variants VALUES ('1ff8bbc4-6781-4296-9f95-124eaae98002', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'XS', 'Dusty rose', '#d9aaa0', 'JM-ROSE-PANT-DUSTY-ROSE-XS', 11, 0);
INSERT INTO public.product_variants VALUES ('38d3bb07-330d-4328-9d23-ce16d0ae4139', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'S', 'Dusty rose', '#d9aaa0', 'JM-ROSE-PANT-DUSTY-ROSE-S', 3, 1);
INSERT INTO public.product_variants VALUES ('db9474a7-ca82-47a7-85ef-bdcb09b39905', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'M', 'Dusty rose', '#d9aaa0', 'JM-ROSE-PANT-DUSTY-ROSE-M', 11, 2);
INSERT INTO public.product_variants VALUES ('a8a29562-b3cb-4d76-a163-cf3a277b3916', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'L', 'Dusty rose', '#d9aaa0', 'JM-ROSE-PANT-DUSTY-ROSE-L', 10, 3);
INSERT INTO public.product_variants VALUES ('86410347-843c-4cfe-9952-e9f882b46ad0', '8c8ff529-c74f-4f1c-b6f7-55fbef57cc0f', 'XL', 'Dusty rose', '#d9aaa0', 'JM-ROSE-PANT-DUSTY-ROSE-XL', 4, 4);
INSERT INTO public.product_variants VALUES ('4d4df518-ca97-4591-8eed-8c6032995981', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '36', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-36', 2, 0);
INSERT INTO public.product_variants VALUES ('003bafc5-7a0e-433a-858c-da05ed593cfd', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '38', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-38', 4, 1);
INSERT INTO public.product_variants VALUES ('b7a254d0-84eb-440f-89e1-dca14b1518d4', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '40', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-40', 13, 2);
INSERT INTO public.product_variants VALUES ('f3692f66-1376-4149-ab2d-e67b34bffdf5', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '42', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-42', 15, 3);
INSERT INTO public.product_variants VALUES ('4e48ae3e-5194-4c2f-93f0-6ea0e5d89bbb', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '44', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-44', 3, 4);
INSERT INTO public.product_variants VALUES ('715b9723-282e-4168-95e5-7995477a1bc7', '8f279b6a-95d1-4ba7-a88b-b1b3997fb26b', '46', 'Raw indigo', '#1f2a3a', 'JM-INDIGO-WORK-PANT-RAW-INDIGO-46', 5, 5);
INSERT INTO public.product_variants VALUES ('aa09fa64-ff88-44e5-b621-7b2f89a783b5', '83a720e3-005d-4573-95d5-2fe8b9226608', '36', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-36', 2, 0);
INSERT INTO public.product_variants VALUES ('c814044f-c8a9-45d9-ba56-e902a79367ea', '83a720e3-005d-4573-95d5-2fe8b9226608', '38', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-38', 4, 1);
INSERT INTO public.product_variants VALUES ('10674082-14c8-4abd-acc9-21f5bd6f0f56', '83a720e3-005d-4573-95d5-2fe8b9226608', '40', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-40', 13, 2);
INSERT INTO public.product_variants VALUES ('d6592d76-6cc6-4a3a-bc71-8c5ada439b1e', '83a720e3-005d-4573-95d5-2fe8b9226608', '42', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-42', 15, 3);
INSERT INTO public.product_variants VALUES ('356f42b7-59a9-4df9-9379-412947b1c6d3', '83a720e3-005d-4573-95d5-2fe8b9226608', '44', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-44', 3, 4);
INSERT INTO public.product_variants VALUES ('05ec6115-ca72-4cc7-bd73-33103425ce3c', '83a720e3-005d-4573-95d5-2fe8b9226608', '46', 'Light wash', '#9fb6cc', 'JM-RIP-STRAIGHT-JEAN-LIGHT-WASH-46', 0, 5);
INSERT INTO public.product_variants VALUES ('96743039-a7ff-4d2b-aaaa-91f94fd0850f', 'd4dff2eb-3761-414a-8523-17e0d8006837', '36', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-36', 11, 0);
INSERT INTO public.product_variants VALUES ('a4351d1c-e8e5-455e-b1c3-359d7cf39f24', 'd4dff2eb-3761-414a-8523-17e0d8006837', '38', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-38', 13, 1);
INSERT INTO public.product_variants VALUES ('6949d8fd-9670-4712-96f8-5b416c88fb0f', 'd4dff2eb-3761-414a-8523-17e0d8006837', '40', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-40', 8, 2);
INSERT INTO public.product_variants VALUES ('79f91860-8d96-4d4e-b0fe-a222fc9522db', 'd4dff2eb-3761-414a-8523-17e0d8006837', '42', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-42', 10, 3);
INSERT INTO public.product_variants VALUES ('b6261840-23e2-41d8-a97e-0d653c551130', 'd4dff2eb-3761-414a-8523-17e0d8006837', '44', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-44', 12, 4);
INSERT INTO public.product_variants VALUES ('783de829-9373-4904-b364-d985fa19fe21', 'd4dff2eb-3761-414a-8523-17e0d8006837', '46', 'Mid blue', '#5f7fa3', 'JM-CLASSIC-SLIM-JEAN-MID-BLUE-46', 14, 5);
INSERT INTO public.product_variants VALUES ('ee6808f0-330f-4243-99e2-5138bdd4b3cb', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'XS', 'Black', '#0d0d0d', 'JM-MOTO-LEATHER-JACKET-BLACK-XS', 0, 0);
INSERT INTO public.product_variants VALUES ('33d899e5-e035-4627-9f20-26afbfdb7edf', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'S', 'Black', '#0d0d0d', 'JM-MOTO-LEATHER-JACKET-BLACK-S', 0, 1);
INSERT INTO public.product_variants VALUES ('21369482-cfe5-4b0f-b839-b459ae0dd0d2', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'M', 'Black', '#0d0d0d', 'JM-MOTO-LEATHER-JACKET-BLACK-M', 10, 2);
INSERT INTO public.product_variants VALUES ('126f5867-46ef-4670-9366-09b22fa9ba38', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'L', 'Black', '#0d0d0d', 'JM-MOTO-LEATHER-JACKET-BLACK-L', 9, 3);
INSERT INTO public.product_variants VALUES ('a6738788-3a45-4ca0-ab9f-a5ff26694e06', 'a987ae50-5ac9-4bb9-8d53-386b33700bc1', 'XL', 'Black', '#0d0d0d', 'JM-MOTO-LEATHER-JACKET-BLACK-XL', 5, 4);
INSERT INTO public.product_variants VALUES ('131248bb-99a2-4f7b-95f8-77425cfa1037', '03299bbf-88d2-44d3-b279-205efb0cc2c0', 'XS', 'Rust', '#b8653f', 'JM-RUST-BOMBER-RUST-XS', 7, 0);
INSERT INTO public.product_variants VALUES ('d85ca23d-2d8c-4959-acbc-81e7132bfd38', '03299bbf-88d2-44d3-b279-205efb0cc2c0', 'S', 'Rust', '#b8653f', 'JM-RUST-BOMBER-RUST-S', 0, 1);
INSERT INTO public.product_variants VALUES ('685e2698-6769-4710-b073-278cc8c42b51', '03299bbf-88d2-44d3-b279-205efb0cc2c0', 'M', 'Rust', '#b8653f', 'JM-RUST-BOMBER-RUST-M', 13, 2);
INSERT INTO public.product_variants VALUES ('3ec78d71-5b23-473d-98a9-d997be801af0', '03299bbf-88d2-44d3-b279-205efb0cc2c0', 'L', 'Rust', '#b8653f', 'JM-RUST-BOMBER-RUST-L', 12, 3);
INSERT INTO public.product_variants VALUES ('401106f2-4de6-456e-9d12-846b8510f6ca', '03299bbf-88d2-44d3-b279-205efb0cc2c0', 'XL', 'Rust', '#b8653f', 'JM-RUST-BOMBER-RUST-XL', 14, 4);
INSERT INTO public.product_variants VALUES ('4bae6e74-73e7-4402-9f2e-1a639656ad26', '2919247c-0078-463e-8ae6-fc89d6c96b45', 'XS', 'Dark indigo', '#26344d', 'JM-CORD-DENIM-JACKET-DARK-INDIGO-XS', 9, 0);
INSERT INTO public.product_variants VALUES ('d14c6cb1-8a3b-4573-b404-89c61554899f', '2919247c-0078-463e-8ae6-fc89d6c96b45', 'S', 'Dark indigo', '#26344d', 'JM-CORD-DENIM-JACKET-DARK-INDIGO-S', 9, 1);
INSERT INTO public.product_variants VALUES ('3887f852-62e9-458b-8bbb-29d191a9227c', '2919247c-0078-463e-8ae6-fc89d6c96b45', 'M', 'Dark indigo', '#26344d', 'JM-CORD-DENIM-JACKET-DARK-INDIGO-M', 3, 2);
INSERT INTO public.product_variants VALUES ('094c7393-127f-40cb-aded-e9a677b7c3e0', '2919247c-0078-463e-8ae6-fc89d6c96b45', 'L', 'Dark indigo', '#26344d', 'JM-CORD-DENIM-JACKET-DARK-INDIGO-L', 2, 3);
INSERT INTO public.product_variants VALUES ('347a498a-e915-4b0e-afbc-ff2c719849f7', '2919247c-0078-463e-8ae6-fc89d6c96b45', 'XL', 'Dark indigo', '#26344d', 'JM-CORD-DENIM-JACKET-DARK-INDIGO-XL', 0, 4);
INSERT INTO public.product_variants VALUES ('da639989-c7ec-4277-9239-2ba7ba0c0868', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'XS', 'Black', '#111111', 'JM-NOIR-BLAZER-BLACK-XS', 5, 0);
INSERT INTO public.product_variants VALUES ('7ee3988c-9078-4963-ba5a-17d87c4a828f', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'S', 'Black', '#111111', 'JM-NOIR-BLAZER-BLACK-S', 5, 1);
INSERT INTO public.product_variants VALUES ('2efd0431-ebd7-4b51-b97a-4a2afff81ec7', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'M', 'Black', '#111111', 'JM-NOIR-BLAZER-BLACK-M', 13, 2);
INSERT INTO public.product_variants VALUES ('9d227a6b-cfd5-4c01-abef-00750614bb4d', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'L', 'Black', '#111111', 'JM-NOIR-BLAZER-BLACK-L', 12, 3);
INSERT INTO public.product_variants VALUES ('d05c3e6c-724a-45e8-b372-ac812034707e', '6dcd4b1a-4aa4-4500-ae70-3a9b5e8905ef', 'XL', 'Black', '#111111', 'JM-NOIR-BLAZER-BLACK-XL', 12, 4);
INSERT INTO public.product_variants VALUES ('2466fe5f-f5ab-4dd0-af08-80854fe22a16', '102d5a64-bfda-47ac-bf89-4e03d3784601', 'XS', 'Bleach blue', '#a8bdd3', 'JM-BLEACH-DENIM-JACKET-BLEACH-BLUE-XS', 3, 0);
INSERT INTO public.product_variants VALUES ('58582b56-4774-4b90-a85e-e11f84f509ac', '102d5a64-bfda-47ac-bf89-4e03d3784601', 'S', 'Bleach blue', '#a8bdd3', 'JM-BLEACH-DENIM-JACKET-BLEACH-BLUE-S', 13, 1);
INSERT INTO public.product_variants VALUES ('8373b2c5-168b-4be3-a822-66a551edf570', '102d5a64-bfda-47ac-bf89-4e03d3784601', 'M', 'Bleach blue', '#a8bdd3', 'JM-BLEACH-DENIM-JACKET-BLEACH-BLUE-M', 7, 2);
INSERT INTO public.product_variants VALUES ('78781296-dfe4-481a-9cf5-f3c11376f6df', '102d5a64-bfda-47ac-bf89-4e03d3784601', 'L', 'Bleach blue', '#a8bdd3', 'JM-BLEACH-DENIM-JACKET-BLEACH-BLUE-L', 6, 3);
INSERT INTO public.product_variants VALUES ('1efa7c6c-7081-4da3-9e84-dc2e8a6ef4ab', '102d5a64-bfda-47ac-bf89-4e03d3784601', 'XL', 'Bleach blue', '#a8bdd3', 'JM-BLEACH-DENIM-JACKET-BLEACH-BLUE-XL', 10, 4);
INSERT INTO public.product_variants VALUES ('752e0d8f-ff82-43c7-b334-e82a0e138297', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'XS', 'Fog grey', '#9ea3a6', 'JM-FOG-HOODIE-FOG-GREY-XS', 12, 0);
INSERT INTO public.product_variants VALUES ('b25c173e-436c-4298-abe0-9eeff7a8e2f4', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'S', 'Fog grey', '#9ea3a6', 'JM-FOG-HOODIE-FOG-GREY-S', 8, 1);
INSERT INTO public.product_variants VALUES ('621a1024-9e6d-48c6-b9ab-fad2109b4091', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'M', 'Fog grey', '#9ea3a6', 'JM-FOG-HOODIE-FOG-GREY-M', 2, 2);
INSERT INTO public.product_variants VALUES ('dab371bd-4164-45a5-b505-d065d75effa3', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'L', 'Fog grey', '#9ea3a6', 'JM-FOG-HOODIE-FOG-GREY-L', 15, 3);
INSERT INTO public.product_variants VALUES ('08c353a5-df72-4599-9923-30b3a241e919', '6c41a0ff-9ebb-4392-af5d-fbea20d5739f', 'XL', 'Fog grey', '#9ea3a6', 'JM-FOG-HOODIE-FOG-GREY-XL', 0, 4);
INSERT INTO public.product_variants VALUES ('0cbddb46-2cb8-4aa5-8869-cacfe2ad8d55', '668af8fc-43d0-4262-a17c-34e977e96549', 'XS', 'Sun yellow', '#e9b62f', 'JM-SOL-TRACKSUIT-SUN-YELLOW-XS', 0, 0);
INSERT INTO public.product_variants VALUES ('d64179b3-55c1-4fb3-8154-35d31ffa4d86', '668af8fc-43d0-4262-a17c-34e977e96549', 'S', 'Sun yellow', '#e9b62f', 'JM-SOL-TRACKSUIT-SUN-YELLOW-S', 9, 1);
INSERT INTO public.product_variants VALUES ('efd1ea4f-c95e-4cbd-be09-43b57e90be46', '668af8fc-43d0-4262-a17c-34e977e96549', 'M', 'Sun yellow', '#e9b62f', 'JM-SOL-TRACKSUIT-SUN-YELLOW-M', 3, 2);
INSERT INTO public.product_variants VALUES ('51c39e4c-6f82-4f20-97e4-75ac8c4b33cf', '668af8fc-43d0-4262-a17c-34e977e96549', 'L', 'Sun yellow', '#e9b62f', 'JM-SOL-TRACKSUIT-SUN-YELLOW-L', 2, 3);
INSERT INTO public.product_variants VALUES ('f5e539f9-e614-40b9-b079-0ce01bade095', '668af8fc-43d0-4262-a17c-34e977e96549', 'XL', 'Sun yellow', '#e9b62f', 'JM-SOL-TRACKSUIT-SUN-YELLOW-XL', 14, 4);
INSERT INTO public.product_variants VALUES ('78f8376b-9770-482c-a0b6-24714d14e78f', 'e862487d-a951-49c2-9932-e842eeb3e2c7', 'XS', 'Cloud white', '#f5f5f3', 'JM-CLOUD-CREWNECK-CLOUD-WHITE-XS', 10, 0);
INSERT INTO public.product_variants VALUES ('9250c8bf-f442-4636-b059-7779302cf3fa', 'e862487d-a951-49c2-9932-e842eeb3e2c7', 'S', 'Cloud white', '#f5f5f3', 'JM-CLOUD-CREWNECK-CLOUD-WHITE-S', 10, 1);
INSERT INTO public.product_variants VALUES ('a96e303e-9049-4f7b-b579-8237310293d2', 'e862487d-a951-49c2-9932-e842eeb3e2c7', 'M', 'Cloud white', '#f5f5f3', 'JM-CLOUD-CREWNECK-CLOUD-WHITE-M', 4, 2);
INSERT INTO public.product_variants VALUES ('1d976bb7-e59d-4e55-a475-08b72c56a95b', 'e862487d-a951-49c2-9932-e842eeb3e2c7', 'L', 'Cloud white', '#f5f5f3', 'JM-CLOUD-CREWNECK-CLOUD-WHITE-L', 0, 3);
INSERT INTO public.product_variants VALUES ('121be119-0a8e-46bc-9297-a01bcc3071db', 'e862487d-a951-49c2-9932-e842eeb3e2c7', 'XL', 'Cloud white', '#f5f5f3', 'JM-CLOUD-CREWNECK-CLOUD-WHITE-XL', 0, 4);
INSERT INTO public.product_variants VALUES ('dd452ef1-71cd-4b7e-a564-7b5fad097203', '15f676d7-ad50-44b5-b670-dc60f0495213', '36', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-36', 13, 0);
INSERT INTO public.product_variants VALUES ('1b1934ef-97c8-4247-8f3b-c7ca4af2ad02', '15f676d7-ad50-44b5-b670-dc60f0495213', '38', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-38', 15, 1);
INSERT INTO public.product_variants VALUES ('3c34caed-7c27-4f4e-ad39-1d2694e58690', '15f676d7-ad50-44b5-b670-dc60f0495213', '40', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-40', 10, 2);
INSERT INTO public.product_variants VALUES ('ea3864ad-996c-4b4d-801b-a3fd1f265000', '15f676d7-ad50-44b5-b670-dc60f0495213', '42', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-42', 12, 3);
INSERT INTO public.product_variants VALUES ('39d2616f-6be9-46c7-850d-1cee95149cb1', '15f676d7-ad50-44b5-b670-dc60f0495213', '44', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-44', 14, 4);
INSERT INTO public.product_variants VALUES ('69ac28d2-658c-4dcc-beb5-a01811971d15', '15f676d7-ad50-44b5-b670-dc60f0495213', '46', 'Bleach blue', '#b8cadb', 'JM-FRAYED-DENIM-SHORT-BLEACH-BLUE-46', 2, 5);
INSERT INTO public.product_variants VALUES ('d0050e1b-f475-4d7a-b93c-38ddd6eaf086', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', 'XS', 'Carmine', '#c0262d', 'JM-CARMIM-DRESS-CARMINE-XS', 3, 0);
INSERT INTO public.product_variants VALUES ('7b07b0fd-493b-4867-9e6b-90eeaed42399', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', 'S', 'Carmine', '#c0262d', 'JM-CARMIM-DRESS-CARMINE-S', 11, 1);
INSERT INTO public.product_variants VALUES ('5fa290d4-9b83-4d37-9f5a-e1dc4aa76dc4', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', 'M', 'Carmine', '#c0262d', 'JM-CARMIM-DRESS-CARMINE-M', 5, 2);
INSERT INTO public.product_variants VALUES ('30d626bb-ffb1-423a-b59f-b6f247e9beca', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', 'L', 'Carmine', '#c0262d', 'JM-CARMIM-DRESS-CARMINE-L', 4, 3);
INSERT INTO public.product_variants VALUES ('4c6384eb-574b-418b-acf5-f1656ab3393a', 'c0a12d3b-099c-43fb-99cd-a864b03b08df', 'XL', 'Carmine', '#c0262d', 'JM-CARMIM-DRESS-CARMINE-XL', 10, 4);
INSERT INTO public.product_variants VALUES ('aac35953-c450-48f5-ad67-379bb9bc5404', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', 'XS', 'Scarlet', '#c8102e', 'JM-SCARLET-GOWN-SCARLET-XS', 3, 0);
INSERT INTO public.product_variants VALUES ('e52a6ac5-f574-44ae-8c5c-6b53004c0608', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', 'S', 'Scarlet', '#c8102e', 'JM-SCARLET-GOWN-SCARLET-S', 5, 1);
INSERT INTO public.product_variants VALUES ('469aa026-ba33-4328-8b64-adf27b46f5ac', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', 'M', 'Scarlet', '#c8102e', 'JM-SCARLET-GOWN-SCARLET-M', 13, 2);
INSERT INTO public.product_variants VALUES ('6f5ce5f1-9d65-44a5-a07f-0c0f848426d5', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', 'L', 'Scarlet', '#c8102e', 'JM-SCARLET-GOWN-SCARLET-L', 12, 3);
INSERT INTO public.product_variants VALUES ('58b60078-246c-4511-87b4-25e05cb35774', 'f7b514ec-ba5b-431c-a12a-edb1d913b362', 'XL', 'Scarlet', '#c8102e', 'JM-SCARLET-GOWN-SCARLET-XL', 10, 4);
INSERT INTO public.product_variants VALUES ('813ceebb-0b72-4dd3-b13f-a2e2cc1709e8', '4123fbe7-9884-4332-a5d3-f69aa33834e8', 'XS', 'Floral ivory', '#ece5da', 'JM-JARDIM-WRAP-DRESS-FLORAL-IVORY-XS', 9, 0);
INSERT INTO public.product_variants VALUES ('89e0a754-4afe-4326-bede-952b42a34082', '4123fbe7-9884-4332-a5d3-f69aa33834e8', 'S', 'Floral ivory', '#ece5da', 'JM-JARDIM-WRAP-DRESS-FLORAL-IVORY-S', 5, 1);
INSERT INTO public.product_variants VALUES ('73eb290e-c79a-460a-93ab-a5ffae3d1104', '4123fbe7-9884-4332-a5d3-f69aa33834e8', 'M', 'Floral ivory', '#ece5da', 'JM-JARDIM-WRAP-DRESS-FLORAL-IVORY-M', 13, 2);
INSERT INTO public.product_variants VALUES ('c2de9a55-8227-4de4-8338-a36b8f3393d5', '4123fbe7-9884-4332-a5d3-f69aa33834e8', 'L', 'Floral ivory', '#ece5da', 'JM-JARDIM-WRAP-DRESS-FLORAL-IVORY-L', 0, 3);
INSERT INTO public.product_variants VALUES ('7ffe54c9-c1d9-4d42-a304-26596810121c', '4123fbe7-9884-4332-a5d3-f69aa33834e8', 'XL', 'Floral ivory', '#ece5da', 'JM-JARDIM-WRAP-DRESS-FLORAL-IVORY-XL', 0, 4);
INSERT INTO public.product_variants VALUES ('a211f245-32f6-4c86-8836-74143e4edee5', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'XS', 'Heather grey', '#b9bcbf', 'JM-KNIT-SHEATH-DRESS-HEATHER-GREY-XS', 12, 0);
INSERT INTO public.product_variants VALUES ('87c1fac9-7048-4ebd-b022-766a385558d7', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'S', 'Heather grey', '#b9bcbf', 'JM-KNIT-SHEATH-DRESS-HEATHER-GREY-S', 8, 1);
INSERT INTO public.product_variants VALUES ('a292942d-f079-4151-a2a7-2e9dcef808a9', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'M', 'Heather grey', '#b9bcbf', 'JM-KNIT-SHEATH-DRESS-HEATHER-GREY-M', 2, 2);
INSERT INTO public.product_variants VALUES ('5b84c8fb-cc5e-4dc1-98d5-e09b785f25d0', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'L', 'Heather grey', '#b9bcbf', 'JM-KNIT-SHEATH-DRESS-HEATHER-GREY-L', 0, 3);
INSERT INTO public.product_variants VALUES ('631ec042-fc8e-44fd-bff0-68841442b6f3', 'fd59b1e6-962e-403b-ba3b-bfa7b76eb10a', 'XL', 'Heather grey', '#b9bcbf', 'JM-KNIT-SHEATH-DRESS-HEATHER-GREY-XL', 5, 4);
INSERT INTO public.product_variants VALUES ('212b3ce6-537a-49fd-9e82-10d382904e55', '87aec20b-66a8-42b8-a149-e4aeb512f407', 'XS', 'Ruby', '#a3121f', 'JM-RUBI-SLIT-DRESS-RUBY-XS', 0, 0);
INSERT INTO public.product_variants VALUES ('d4be62e3-53fe-49d3-8a9e-dc3f9974ca0a', '87aec20b-66a8-42b8-a149-e4aeb512f407', 'S', 'Ruby', '#a3121f', 'JM-RUBI-SLIT-DRESS-RUBY-S', 12, 1);
INSERT INTO public.product_variants VALUES ('71a1f29b-1a39-4506-b9be-dc51d2346ca8', '87aec20b-66a8-42b8-a149-e4aeb512f407', 'M', 'Ruby', '#a3121f', 'JM-RUBI-SLIT-DRESS-RUBY-M', 6, 2);
INSERT INTO public.product_variants VALUES ('5ad01c9a-7a98-4b40-a86e-310c93ef8796', '87aec20b-66a8-42b8-a149-e4aeb512f407', 'L', 'Ruby', '#a3121f', 'JM-RUBI-SLIT-DRESS-RUBY-L', 5, 3);
INSERT INTO public.product_variants VALUES ('d995df43-81f3-442b-bf5a-e3f75cd37fc1', '87aec20b-66a8-42b8-a149-e4aeb512f407', 'XL', 'Ruby', '#a3121f', 'JM-RUBI-SLIT-DRESS-RUBY-XL', 15, 4);
INSERT INTO public.product_variants VALUES ('b5f01ecf-84ad-4da4-b56d-310f0db335ff', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'XS', 'Navy', '#1c2a4a', 'JM-HERITAGE-SUIT-NAVY-XS', 4, 0);
INSERT INTO public.product_variants VALUES ('cb3a91c9-6a6f-40cc-90c8-585f68e4293b', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'S', 'Navy', '#1c2a4a', 'JM-HERITAGE-SUIT-NAVY-S', 8, 1);
INSERT INTO public.product_variants VALUES ('21247183-668d-497f-9d41-9c2ee04408a3', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'M', 'Navy', '#1c2a4a', 'JM-HERITAGE-SUIT-NAVY-M', 2, 2);
INSERT INTO public.product_variants VALUES ('88c5414a-02f3-434a-ae4c-2740f78fb54a', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'L', 'Navy', '#1c2a4a', 'JM-HERITAGE-SUIT-NAVY-L', 15, 3);
INSERT INTO public.product_variants VALUES ('ed74fc1a-c432-4d3b-a97a-4f2e885e3ac3', '49ef3a4f-9ed5-439a-8bc9-20c81727975d', 'XL', 'Navy', '#1c2a4a', 'JM-HERITAGE-SUIT-NAVY-XL', 11, 4);
INSERT INTO public.product_variants VALUES ('4a59eaa2-ce48-4e5f-9c3e-6e0f730db5f0', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'XS', 'Midnight', '#141a2a', 'JM-MIDNIGHT-SUIT-MIDNIGHT-XS', 5, 0);
INSERT INTO public.product_variants VALUES ('3f8051b1-95ee-4d0f-bd47-84e26c9d1ea1', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'S', 'Midnight', '#141a2a', 'JM-MIDNIGHT-SUIT-MIDNIGHT-S', 5, 1);
INSERT INTO public.product_variants VALUES ('0b30cd98-a692-4c94-b33c-dfb790891e03', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'M', 'Midnight', '#141a2a', 'JM-MIDNIGHT-SUIT-MIDNIGHT-M', 13, 2);
INSERT INTO public.product_variants VALUES ('fded556e-7de8-4bc6-b49c-80db5739d6d8', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'L', 'Midnight', '#141a2a', 'JM-MIDNIGHT-SUIT-MIDNIGHT-L', 12, 3);
INSERT INTO public.product_variants VALUES ('fa9f3e92-8ce6-4a3d-a6f9-28e3dd1a1ba8', '65df62ee-4ab9-4745-a93e-9dc0d9cfaa1c', 'XL', 'Midnight', '#141a2a', 'JM-MIDNIGHT-SUIT-MIDNIGHT-XL', 12, 4);
INSERT INTO public.product_variants VALUES ('7a6e2f8e-7445-45ae-ad6b-25541154d3ce', 'a217c00d-f0b1-4079-8b13-40625287df2e', 'XS', 'Indigo & sand', '#5d6a7d', 'JM-WEEKEND-SET-INDIGO-SAND-XS', 6, 0);
INSERT INTO public.product_variants VALUES ('39d7f1dd-7177-4f05-a839-b9cdb2a29f50', 'a217c00d-f0b1-4079-8b13-40625287df2e', 'S', 'Indigo & sand', '#5d6a7d', 'JM-WEEKEND-SET-INDIGO-SAND-S', 12, 1);
INSERT INTO public.product_variants VALUES ('efc752f4-bc2c-413a-a713-913fe919f6ac', 'a217c00d-f0b1-4079-8b13-40625287df2e', 'M', 'Indigo & sand', '#5d6a7d', 'JM-WEEKEND-SET-INDIGO-SAND-M', 6, 2);
INSERT INTO public.product_variants VALUES ('4ec98731-3f44-4768-abb2-189c9febc904', 'a217c00d-f0b1-4079-8b13-40625287df2e', 'L', 'Indigo & sand', '#5d6a7d', 'JM-WEEKEND-SET-INDIGO-SAND-L', 5, 3);
INSERT INTO public.product_variants VALUES ('128d18f7-2ae2-4410-8ffe-1f5e76a39847', 'a217c00d-f0b1-4079-8b13-40625287df2e', 'XL', 'Indigo & sand', '#5d6a7d', 'JM-WEEKEND-SET-INDIGO-SAND-XL', 13, 4);
INSERT INTO public.product_variants VALUES ('09e35cc1-c117-44d2-83fc-6fed1f87d3af', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'XS', 'Camel', '#b07b4f', 'JM-CAMEL-LAYER-LOOK-CAMEL-XS', 7, 0);
INSERT INTO public.product_variants VALUES ('254eab29-9915-4ee0-9f90-7643f3de054d', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'S', 'Camel', '#b07b4f', 'JM-CAMEL-LAYER-LOOK-CAMEL-S', 5, 1);
INSERT INTO public.product_variants VALUES ('0759bd94-5980-4e33-bb35-a9bb773a4ea3', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'M', 'Camel', '#b07b4f', 'JM-CAMEL-LAYER-LOOK-CAMEL-M', 0, 2);
INSERT INTO public.product_variants VALUES ('c47a244b-31b1-4d26-9b87-922c1184d95c', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'L', 'Camel', '#b07b4f', 'JM-CAMEL-LAYER-LOOK-CAMEL-L', 12, 3);
INSERT INTO public.product_variants VALUES ('97e98764-44f1-4825-9a4d-bd07b9343b6d', '1b24eb84-38d4-454c-b99d-9dd51b3672b9', 'XL', 'Camel', '#b07b4f', 'JM-CAMEL-LAYER-LOOK-CAMEL-XL', 14, 4);
INSERT INTO public.product_variants VALUES ('bb896be6-051f-49fc-ae36-efa91448885c', 'f2ce5092-eac0-4dbd-bde2-9bdb18093837', 'One size', 'Gold & black', '#c7a755', 'JM-CHRONO-WATCH-GOLD-BLACK-ONE-SIZE', 3, 0);
INSERT INTO public.product_variants VALUES ('cce2fd94-6fda-4cc5-bb85-a01aaaf9061c', 'd16523c1-b1ed-4dd5-8691-582873091904', 'One size', 'Tan & white', '#a77a52', 'JM-MERIDIAN-WATCH-TAN-WHITE-ONE-SIZE', 0, 0);
INSERT INTO public.product_variants VALUES ('04710252-1f23-4eef-bcb6-79917de5c57f', '5545724c-6f89-4a26-b503-213bc7f69d65', 'One size', 'White', '#f0f0f0', 'JM-HALO-WATCH-WHITE-ONE-SIZE', 9, 0);
INSERT INTO public.product_variants VALUES ('12a681f1-94e7-42b9-b537-7d8ad145b042', 'e2425ffd-ae1e-4740-8324-4231e5c95b64', 'One size', 'Gold & green', '#2f4a3c', 'JM-AURORA-SUNGLASSES-GOLD-GREEN-ONE-SIZE', 0, 0);
INSERT INTO public.product_variants VALUES ('bc553b4b-9ba6-48f3-9914-410403a4c1ab', '31787ff9-f395-48a4-bba4-5376a1714b9f', 'One size', 'Silver & blue mirror', '#3f6ea6', 'JM-LUMEN-SUNGLASSES-SILVER-BLUE-MIRROR-ONE-SIZE', 8, 0);
INSERT INTO public.product_variants VALUES ('99bdad19-cd32-4615-a0f2-dd1dcf386c2d', '49c9a39e-283e-4263-b433-6d5521c3331f', '85', 'Cognac', '#8a4b2a', 'JM-COGNAC-BELT-COGNAC-85', 9, 0);
INSERT INTO public.product_variants VALUES ('eab73578-e735-4b8d-ae1c-1183a71bd2a5', '49c9a39e-283e-4263-b433-6d5521c3331f', '90', 'Cognac', '#8a4b2a', 'JM-COGNAC-BELT-COGNAC-90', 0, 1);
INSERT INTO public.product_variants VALUES ('22909d3c-5d9d-46de-ad1f-5b005afaed9a', '49c9a39e-283e-4263-b433-6d5521c3331f', '95', 'Cognac', '#8a4b2a', 'JM-COGNAC-BELT-COGNAC-95', 12, 2);
INSERT INTO public.product_variants VALUES ('4d3354c9-c52e-4d23-9c33-9ecce84cba81', '49c9a39e-283e-4263-b433-6d5521c3331f', '100', 'Cognac', '#8a4b2a', 'JM-COGNAC-BELT-COGNAC-100', 3, 3);
INSERT INTO public.product_variants VALUES ('06e9b849-64db-4d7c-8bce-f0e2362f0a7e', '49c9a39e-283e-4263-b433-6d5521c3331f', '105', 'Cognac', '#8a4b2a', 'JM-COGNAC-BELT-COGNAC-105', 0, 4);
INSERT INTO public.product_variants VALUES ('026c743e-2fb0-4041-8152-d0d1179531f7', 'bbf42783-72b1-41dd-b2cf-66243d2e2146', 'One size', 'Navy', '#1d2944', 'JM-NAVY-DAYPACK-NAVY-ONE-SIZE', 8, 0);
INSERT INTO public.product_variants VALUES ('4f487a88-9207-45a6-97b3-a1cdf212e410', '5c7fbeaa-3cd5-406d-88d5-8a917881170b', 'One size', 'Rouge', '#c43a2a', 'JM-ROUGE-HANDBAG-ROUGE-ONE-SIZE', 12, 0);
INSERT INTO public.product_variants VALUES ('2a6f2e8b-de65-43a5-81e9-e0c346412f04', '06705de0-d31e-4e35-8845-e37dee7f05b8', 'One size', 'Pearl grey', '#c9c9c7', 'JM-PEARL-SATCHEL-PEARL-GREY-ONE-SIZE', 13, 0);
INSERT INTO public.product_variants VALUES ('999b0c30-a5f3-45c4-8295-8ddc06d18cd0', '604eaf3b-a428-45e9-a6ed-c2d020f5484a', 'One size', 'Pearl', '#efe9df', 'JM-PEROLA-NECKLACE-PEARL-ONE-SIZE', 0, 0);
INSERT INTO public.product_variants VALUES ('e99523f3-9530-4c0c-a246-e60394affde4', '466ca77d-be26-4f51-a58c-58f1d89b1c3c', 'One size', 'Gold', '#c7a25a', 'JM-CRESCENT-PENDANT-GOLD-ONE-SIZE', 10, 0);
INSERT INTO public.product_variants VALUES ('5ac27f70-4882-4b15-9763-124d329ba7e0', 'f504cdef-7582-4df1-8bb7-9e69d5c27dea', 'One size', 'Gold', '#c9a24e', 'JM-SCULPT-EARRINGS-GOLD-ONE-SIZE', 13, 0);
INSERT INTO public.product_variants VALUES ('ebe82031-a6df-4b30-9eed-ddc349c5211c', 'c640cba5-69b2-493d-81ae-cd93d5736429', 'One size', 'Gold', '#d1b06a', 'JM-DROP-NECKLACE-GOLD-ONE-SIZE', 6, 0);
INSERT INTO public.product_variants VALUES ('03ec7e3d-5385-4556-b585-1bb7757655c9', 'd696f2c4-9516-470e-b49d-d778c0d5e3de', 'One size', 'White', '#f3f3f1', 'JM-CANVAS-CAP-WHITE-ONE-SIZE', 8, 0);
INSERT INTO public.product_variants VALUES ('a753a6a8-788b-4205-89d7-f3b3bb7c2315', '29f9b246-49db-436b-a004-a1c358e062d0', '37', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-37', 4, 0);
INSERT INTO public.product_variants VALUES ('4e7c0ba4-cde9-43a0-b98b-824b4aada031', '29f9b246-49db-436b-a004-a1c358e062d0', '38', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-38', 5, 1);
INSERT INTO public.product_variants VALUES ('716eab3f-d943-4ed7-b5a7-29c4b0cbb3dd', '29f9b246-49db-436b-a004-a1c358e062d0', '39', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-39', 6, 2);
INSERT INTO public.product_variants VALUES ('ad1e5b5b-7005-45a1-9065-e4a27d5c1d58', '29f9b246-49db-436b-a004-a1c358e062d0', '40', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-40', 14, 3);
INSERT INTO public.product_variants VALUES ('f3d178c8-7e02-4cb1-b27d-b010f7f0bf54', '29f9b246-49db-436b-a004-a1c358e062d0', '41', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-41', 15, 4);
INSERT INTO public.product_variants VALUES ('7ce76d6a-fbf7-48f2-9859-36ffe2f1de7b', '29f9b246-49db-436b-a004-a1c358e062d0', '42', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-42', 0, 5);
INSERT INTO public.product_variants VALUES ('81d80492-b3bd-431f-8161-5da953894a6b', '29f9b246-49db-436b-a004-a1c358e062d0', '43', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-43', 3, 6);
INSERT INTO public.product_variants VALUES ('045ede98-2353-4707-b154-0d35f3fa3ca4', '29f9b246-49db-436b-a004-a1c358e062d0', '44', 'Midnight blue', '#1f7fb8', 'JM-VELOCITY-SNEAKER-MIDNIGHT-BLUE-44', 4, 7);
INSERT INTO public.product_variants VALUES ('db16cf5a-26ce-4267-b0c2-fbbf703db1df', '29f9b246-49db-436b-a004-a1c358e062d0', '38', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-38', 9, 9);
INSERT INTO public.product_variants VALUES ('a8201d5e-949e-4c6a-b284-3f1c54738914', '29f9b246-49db-436b-a004-a1c358e062d0', '39', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-39', 0, 10);
INSERT INTO public.product_variants VALUES ('9d27b36e-dd5a-4e38-94f3-7d4eab447c33', '29f9b246-49db-436b-a004-a1c358e062d0', '40', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-40', 4, 11);
INSERT INTO public.product_variants VALUES ('e8ee32e0-a57d-4558-8a70-e5ee3908e619', '29f9b246-49db-436b-a004-a1c358e062d0', '41', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-41', 5, 12);
INSERT INTO public.product_variants VALUES ('3dbb53ce-6924-467e-bd0f-9d9a82d658d2', '29f9b246-49db-436b-a004-a1c358e062d0', '42', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-42', 6, 13);
INSERT INTO public.product_variants VALUES ('8921543c-3a4b-4dc5-8976-949abe824fef', '29f9b246-49db-436b-a004-a1c358e062d0', '43', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-43', 7, 14);
INSERT INTO public.product_variants VALUES ('d486d41c-22df-452a-8166-50f8bc32e8f9', '29f9b246-49db-436b-a004-a1c358e062d0', '44', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-44', 8, 15);
INSERT INTO public.product_variants VALUES ('6d4539f9-f621-4cc1-871b-1e55d6d555e6', '29f9b246-49db-436b-a004-a1c358e062d0', '37', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-37', 8, 16);
INSERT INTO public.product_variants VALUES ('e3d2c7c2-08a2-4468-b9ac-8e63f82211d6', '29f9b246-49db-436b-a004-a1c358e062d0', '38', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-38', 0, 17);
INSERT INTO public.product_variants VALUES ('e8e5e6fb-747c-4479-9836-141108020a7d', '29f9b246-49db-436b-a004-a1c358e062d0', '39', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-39', 10, 18);
INSERT INTO public.product_variants VALUES ('e15dfc04-07f6-4075-87d4-7c62e69a5ee4', '29f9b246-49db-436b-a004-a1c358e062d0', '40', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-40', 4, 19);
INSERT INTO public.product_variants VALUES ('3e978990-46eb-4be0-8e66-d8abf413c680', '29f9b246-49db-436b-a004-a1c358e062d0', '41', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-41', 5, 20);
INSERT INTO public.product_variants VALUES ('6e56bc5a-bf0b-4a59-9ebc-7ea00b3a23a4', '29f9b246-49db-436b-a004-a1c358e062d0', '42', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-42', 6, 21);
INSERT INTO public.product_variants VALUES ('e2eeeae3-9a9e-4142-a6a6-e0187da17a36', '29f9b246-49db-436b-a004-a1c358e062d0', '43', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-43', 7, 22);
INSERT INTO public.product_variants VALUES ('3c33c793-6c94-420f-9cb7-edc64f711e09', '29f9b246-49db-436b-a004-a1c358e062d0', '44', 'Street black', '#141414', 'JM-VELOCITY-SNEAKER-STREET-BLACK-44', 0, 23);
INSERT INTO public.product_variants VALUES ('6db3d046-6e82-4e21-8ffe-bc6bf6752d26', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '37', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-37', 15, 0);
INSERT INTO public.product_variants VALUES ('c6dfe809-dc89-41bb-ba3c-0a32fef99fd6', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '38', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-38', 0, 1);
INSERT INTO public.product_variants VALUES ('1ec6e65d-1142-4324-af23-698ab616dc1d', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '39', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-39', 3, 2);
INSERT INTO public.product_variants VALUES ('baf8fb1b-5562-44de-89d5-571f539f2b4a', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '40', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-40', 11, 3);
INSERT INTO public.product_variants VALUES ('1bd625e9-4e2e-4ff9-9c70-8b7e87735656', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '41', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-41', 12, 4);
INSERT INTO public.product_variants VALUES ('8d92985e-75cf-499f-b1b5-b6533ba3abb7', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '42', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-42', 13, 5);
INSERT INTO public.product_variants VALUES ('761fda9e-1d52-40f9-8e60-3b88687f83b0', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '43', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-43', 14, 6);
INSERT INTO public.product_variants VALUES ('cbfe35a8-1b4b-4df0-ba88-694469f01a3b', '57d7b5cb-f0e6-4981-819e-ac7216c38655', '44', 'Prism', '#e8e2d8', 'JM-PRISM-RUNNER-PRISM-44', 0, 7);
INSERT INTO public.product_variants VALUES ('d370a953-8c92-493d-8df8-5d90fdea1193', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '37', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-37', 0, 0);
INSERT INTO public.product_variants VALUES ('fca76fd9-a9f8-4b59-94eb-45e9f264d9a1', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '38', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-38', 12, 1);
INSERT INTO public.product_variants VALUES ('a7ab9b46-0855-485a-b9fc-d61fa3ad9e3b', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '39', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-39', 13, 2);
INSERT INTO public.product_variants VALUES ('031cfd4f-7f65-44c0-9b04-16728089ef36', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '40', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-40', 7, 3);
INSERT INTO public.product_variants VALUES ('dcdf0953-8a91-4d36-bc94-c21294e41b46', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '41', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-41', 8, 4);
INSERT INTO public.product_variants VALUES ('b99c82a4-c062-4cac-9747-b262caa4abb4', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '42', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-42', 9, 5);
INSERT INTO public.product_variants VALUES ('ff4f5417-4535-4e7f-a910-4684a47e3aeb', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '43', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-43', 0, 6);
INSERT INTO public.product_variants VALUES ('9396c171-60a9-4022-862a-6217c35964d1', '2986bc5f-23db-4447-b6ab-b024e2ad30d2', '44', 'Red', '#c8282d', 'JM-RIVIERA-ESPADRILLE-RED-44', 11, 7);
INSERT INTO public.product_variants VALUES ('1366503a-19ef-4ceb-8481-0fac7b4366cb', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '37', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-37', 11, 0);
INSERT INTO public.product_variants VALUES ('99e05caf-6fae-42c0-a5f5-3a0ec66a6ea2', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '38', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-38', 0, 1);
INSERT INTO public.product_variants VALUES ('4d3e0d40-2e92-4a1a-8ccc-d233a15cfc80', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '39', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-39', 13, 2);
INSERT INTO public.product_variants VALUES ('f44a1ced-9a79-40d5-84d4-00b2e8128c78', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '40', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-40', 7, 3);
INSERT INTO public.product_variants VALUES ('863217e2-d3a5-41ea-b407-4f8fd7f7b80e', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '41', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-41', 8, 4);
INSERT INTO public.product_variants VALUES ('275d0039-7aa2-47c2-a9bb-3b88e8296019', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '42', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-42', 9, 5);
INSERT INTO public.product_variants VALUES ('60fbbd7d-a8b9-4aa9-ab18-caaecb91384c', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '43', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-43', 10, 6);
INSERT INTO public.product_variants VALUES ('005d627a-f98a-4a75-b21a-2ae1c0a4fe14', 'b9580d8c-6611-4821-b4d7-8771ad1e6e7e', '44', 'Brown', '#5c3b25', 'JM-DOUBLE-MONK-BROWN-44', 0, 7);
INSERT INTO public.product_variants VALUES ('81f37da5-98fc-4493-b032-17f13284ad77', '8e9f99e6-965a-4420-868b-e8b882700bdf', '37', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-37', 13, 0);
INSERT INTO public.product_variants VALUES ('4dd41a69-4cfb-44ec-b871-eab889cab0f8', '8e9f99e6-965a-4420-868b-e8b882700bdf', '38', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-38', 0, 1);
INSERT INTO public.product_variants VALUES ('b4e3adb3-6ce3-4eab-9d3e-a9e33020da39', '8e9f99e6-965a-4420-868b-e8b882700bdf', '39', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-39', 15, 2);
INSERT INTO public.product_variants VALUES ('e4e685f2-df01-4ce6-9bab-04086d7bf3be', '8e9f99e6-965a-4420-868b-e8b882700bdf', '40', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-40', 9, 3);
INSERT INTO public.product_variants VALUES ('5a987ae8-e21a-4ac6-8428-c44f761a00bc', '8e9f99e6-965a-4420-868b-e8b882700bdf', '41', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-41', 10, 4);
INSERT INTO public.product_variants VALUES ('8b56aa60-7d19-4a1b-a38e-d9a898212fe9', '8e9f99e6-965a-4420-868b-e8b882700bdf', '42', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-42', 11, 5);
INSERT INTO public.product_variants VALUES ('6aa4c9e7-7ddb-4d33-911e-44b4fae97a4c', '8e9f99e6-965a-4420-868b-e8b882700bdf', '43', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-43', 12, 6);
INSERT INTO public.product_variants VALUES ('95f7bce1-9b0f-49d9-b467-d50c5523beee', '8e9f99e6-965a-4420-868b-e8b882700bdf', '44', 'Cognac', '#8f4d26', 'JM-OXFORD-COGNAC-COGNAC-44', 0, 7);
INSERT INTO public.product_variants VALUES ('5bf92eb6-51b9-42e9-9a87-9277eddba63f', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '34', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-34', 3, 0);
INSERT INTO public.product_variants VALUES ('a280238c-bf2f-4370-af31-270bd47985a8', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '35', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-35', 4, 1);
INSERT INTO public.product_variants VALUES ('53fe3058-2375-48b7-b511-334c96ac91a2', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '36', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-36', 5, 2);
INSERT INTO public.product_variants VALUES ('c4a7586e-4655-49c1-bcef-552001629ec8', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '37', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-37', 0, 3);
INSERT INTO public.product_variants VALUES ('517211d4-5b44-4a03-9494-901cfdfd288c', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '38', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-38', 7, 4);
INSERT INTO public.product_variants VALUES ('61c360e8-439a-46cd-ae79-88dd38223ea3', '432e957b-2bb4-4515-a192-3bd68a89c7aa', '39', 'Blue floral', '#2e5fa8', 'JM-FLORAL-PUMP-BLUE-FLORAL-39', 8, 5);
INSERT INTO public.product_variants VALUES ('76a0f8bf-66eb-42bd-a3fb-00b9687dc68d', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '37', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-37', 4, 0);
INSERT INTO public.product_variants VALUES ('91a8206a-9a2d-42fa-b9a3-626c8c56a8a3', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '38', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-38', 0, 1);
INSERT INTO public.product_variants VALUES ('a1313129-a1ff-46de-bccc-0acf3021d1ed', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '39', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-39', 6, 2);
INSERT INTO public.product_variants VALUES ('13f189f9-2ea5-4450-8687-756322f22ecc', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '40', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-40', 14, 3);
INSERT INTO public.product_variants VALUES ('49a2fc8c-49e3-44ca-8d11-6f88ccd898c7', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '41', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-41', 15, 4);
INSERT INTO public.product_variants VALUES ('4b63b0af-c0c2-4d14-ac8b-4d62e5d83937', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '42', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-42', 2, 5);
INSERT INTO public.product_variants VALUES ('8326746f-4b6a-488c-8a5a-469cee509fab', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '43', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-43', 3, 6);
INSERT INTO public.product_variants VALUES ('27c1dd41-dfca-4365-afaf-3f506e959433', '09bc2c62-c8e2-484a-bc56-1e9247a33fd3', '44', 'Tobacco', '#7a4a26', 'JM-TRAIL-BOOT-TOBACCO-44', 0, 7);
INSERT INTO public.product_variants VALUES ('a51103b1-8a0f-438b-80fc-555864f31468', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '37', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-37', 9, 0);
INSERT INTO public.product_variants VALUES ('a9cf2d02-7c12-4616-95d8-9a57bab2a64d', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '38', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-38', 10, 1);
INSERT INTO public.product_variants VALUES ('09961263-60c8-408e-9d00-c77d18e861c6', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '39', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-39', 11, 2);
INSERT INTO public.product_variants VALUES ('2e61ed86-3294-4bc3-b7e6-4d63b87d5468', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '40', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-40', 5, 3);
INSERT INTO public.product_variants VALUES ('5db1412a-dc93-472c-83b0-0fd92fcd644a', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '41', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-41', 6, 4);
INSERT INTO public.product_variants VALUES ('1c84fe3d-55af-457e-a28e-145fc8ed6e84', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '42', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-42', 7, 5);
INSERT INTO public.product_variants VALUES ('f64dcbbb-8ca9-4d60-bd03-463e3749b9de', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '43', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-43', 8, 6);
INSERT INTO public.product_variants VALUES ('70baf373-b98f-4b05-acc9-e15953ae62d8', '52726473-334e-4c9f-ae4c-50a6f8bc6513', '44', 'Dark brown', '#3a2a22', 'JM-OBSIDIAN-BOOT-DARK-BROWN-44', 9, 7);
INSERT INTO public.product_variants VALUES ('f41b768b-fbd9-4f26-a9aa-684e9f21012e', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '37', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-37', 12, 0);
INSERT INTO public.product_variants VALUES ('6d0aeba8-56f3-4a00-b3f9-feb22ed1f6a6', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '38', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-38', 13, 1);
INSERT INTO public.product_variants VALUES ('86ecd1c2-1f70-48a3-9612-0e9acea0539b', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '39', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-39', 14, 2);
INSERT INTO public.product_variants VALUES ('b6d7af15-ce49-4d3b-a916-165a9b7680cb', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '40', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-40', 8, 3);
INSERT INTO public.product_variants VALUES ('9d4f8d42-c047-4cf7-aab5-8564fc951c84', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '41', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-41', 9, 4);
INSERT INTO public.product_variants VALUES ('408db8ca-a8a4-410d-a469-22e38e76b7eb', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '42', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-42', 10, 5);
INSERT INTO public.product_variants VALUES ('854b06d1-324c-4ab3-a69b-64f1795d2da4', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '43', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-43', 11, 6);
INSERT INTO public.product_variants VALUES ('30340cbd-cd76-45ad-b4ce-dc872613c926', '7e8dca8f-aff6-42a8-a33e-0fcb80e6e3bf', '44', 'Stone', '#c8c2b6', 'JM-CORK-SANDAL-STONE-44', 12, 7);
INSERT INTO public.product_variants VALUES ('174e060b-667c-4422-bcff-c43cadb3c3dc', '29f9b246-49db-436b-a004-a1c358e062d0', '37', 'Beach rose', '#d6a7a8', 'JM-VELOCITY-SNEAKER-BEACH-ROSE-37', 5, 8);



INSERT INTO public.shipping_rates VALUES ('SE', 'Southeast', 1990, 4, 3490, 2, 39900);
INSERT INTO public.shipping_rates VALUES ('S', 'South', 2490, 5, 4290, 2, 49900);
INSERT INTO public.shipping_rates VALUES ('CO', 'Centre-West', 2790, 6, 4890, 3, 49900);
INSERT INTO public.shipping_rates VALUES ('NE', 'Northeast', 3290, 8, 5990, 3, 59900);
INSERT INTO public.shipping_rates VALUES ('N', 'North', 3990, 10, 6990, 4, 69900);



INSERT INTO public.tryon_models VALUES ('d75ceb40-1b0c-439e-907b-d5a52002b3d8', 'Rafael', 'men', 'regular', 'front', 'standing', '/catalog/essential-tee-2.jpg', true, 0);
INSERT INTO public.tryon_models VALUES ('f8a3f4d9-2e1b-4753-a803-a618f0d68b09', 'Thiago', 'men', 'regular', 'front', 'standing', '/catalog/classic-slim-jean.jpg', true, 1);
INSERT INTO public.tryon_models VALUES ('f048f09c-a7fa-4ac5-aa1f-4611e62c2461', 'Lia', 'women', 'slim', 'front', 'standing', '/catalog/knit-sheath-dress.jpg', true, 2);
INSERT INTO public.tryon_models VALUES ('28091ca5-ca7a-45f9-b3a7-dd06c55cc2a8', 'Nina', 'women', 'regular', 'front', 'standing', '/catalog/sol-tracksuit.jpg', true, 3);



\unrestrict FWZRxguUOb6A7yLYjeg5IJHdVIrRgB5gR3FbCd8hbvxahmQ066CiRJaJcW1Jitp
update discount_codes set uses = 0;
insert into settings (key, value) values ('store', '{"name":"JAMAICA","pixKey":"","pixMerchantName":"JAMAICA","pixMerchantCity":"SAO PAULO","supportEmail":""}');

-- The owner account is created separately (npm run create-owner, or the snippet Claude gives you), so no password is stored in this file.
commit;
