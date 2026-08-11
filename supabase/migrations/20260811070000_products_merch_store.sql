-- CreaseTalk merch store (Stripe Checkout + future POD-ready)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  category text not null default 'Apparel',
  stripe_price_id text,
  sku text,
  fulfillment_type text not null default 'manual'
    check (fulfillment_type in ('manual', 'printful', 'printify')),
  pod_variant_id text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_order_idx
  on public.products (is_active, display_order, created_at desc);

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true or (select public.is_staff()));

drop policy if exists "Staff can insert products" on public.products;
create policy "Staff can insert products"
  on public.products
  for insert
  to authenticated
  with check ((select public.is_staff()));

drop policy if exists "Staff can update products" on public.products;
create policy "Staff can update products"
  on public.products
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists "Staff can delete products" on public.products;
create policy "Staff can delete products"
  on public.products
  for delete
  to authenticated
  using ((select public.is_staff()));

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

comment on table public.products is 'Merch catalog; Stripe price_id for Checkout; fulfillment_type for manual/POD';
comment on column public.products.stripe_price_id is 'Stripe Price ID (price_...) used by Checkout Session';
comment on column public.products.fulfillment_type is 'manual today; printful/printify later without frontend changes';
comment on column public.products.pod_variant_id is 'POD catalog variant id when fulfillment is automated';
