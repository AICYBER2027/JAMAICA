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
