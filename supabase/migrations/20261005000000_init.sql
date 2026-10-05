-- Filo · esquema inicial (fase 2)
-- Postgres / Supabase. Aplicar con `supabase db push`.

create extension if not exists btree_gist;

-- ───────────────────────── Negocio y catálogo ─────────────────────────

create table public.business (
  id                       smallint primary key default 1 check (id = 1), -- un solo local
  name                     text not null,
  address                  text not null,
  phone                    text not null,
  time_zone                text not null default 'America/Argentina/Buenos_Aires',
  slot_min                 smallint not null default 30 check (slot_min in (15, 30, 60)),
  deposit_rate             numeric(3, 2) not null default 0.20 check (deposit_rate between 0 and 1),
  free_cancellation_hours  smallint not null default 24,
  booking_window_days      smallint not null default 14
);

create table public.opening_hours (
  weekday    smallint primary key check (weekday between 0 and 6), -- 0 = domingo
  open_min   smallint not null check (open_min between 0 and 1439),
  close_min  smallint not null check (close_min > open_min and close_min <= 1440)
);

create table public.professionals (
  id          text primary key,
  name        text not null,
  role        text not null,
  color       text not null,
  active      boolean not null default true
);

create table public.services (
  id            text primary key,
  name          text not null,
  description   text not null default '',
  duration_min  smallint not null check (duration_min > 0 and duration_min % 15 = 0),
  price_ars     integer not null check (price_ars >= 0),
  icon          text not null,
  active        boolean not null default true,
  sort_order    smallint not null default 0
);

create table public.service_professionals (
  service_id       text references public.services (id) on delete cascade,
  professional_id  text references public.professionals (id) on delete cascade,
  primary key (service_id, professional_id)
);

-- ───────────────────────── Personas ─────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'client' check (role in ('client', 'owner')),
  full_name   text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Turnos ─────────────────────────

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles (id),
  professional_id  text not null references public.professionals (id),
  service_id       text not null references public.services (id),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  payment_method   text not null check (payment_method in ('in_store', 'deposit')),
  status           text not null default 'confirmed' check (status in ('confirmed', 'attended', 'cancelled')),
  unseen_by_owner  boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at),

  -- ADR-004: imposible guardar dos turnos activos superpuestos del mismo profesional.
  constraint bookings_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);

create index bookings_client_idx on public.bookings (client_id, starts_at);
create index bookings_day_idx on public.bookings (starts_at) where status <> 'cancelled';

create table public.blocked_slots (
  professional_id  text not null references public.professionals (id) on delete cascade,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  primary key (professional_id, starts_at),
  check (ends_at > starts_at)
);

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete cascade,
  amount_ars           integer not null check (amount_ars > 0),
  provider             text not null default 'mercadopago',
  provider_payment_id  text unique,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'refunded')),
  created_at           timestamptz not null default now()
);

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('created', 'cancelled', 'rescheduled')),
  booking_id  uuid references public.bookings (id) on delete set null,
  title       text not null,
  detail      text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index activity_recent_idx on public.activity (created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

alter table public.business               enable row level security;
alter table public.opening_hours          enable row level security;
alter table public.professionals          enable row level security;
alter table public.services               enable row level security;
alter table public.service_professionals  enable row level security;
alter table public.profiles               enable row level security;
alter table public.bookings               enable row level security;
alter table public.blocked_slots          enable row level security;
alter table public.payments               enable row level security;
alter table public.activity               enable row level security;

-- Catálogo: lectura pública, escritura solo de la dueña.
create policy "catalog read"  on public.business               for select using (true);
create policy "catalog read"  on public.opening_hours          for select using (true);
create policy "catalog read"  on public.professionals          for select using (true);
create policy "catalog read"  on public.services               for select using (true);
create policy "catalog read"  on public.service_professionals  for select using (true);
create policy "owner writes"  on public.business               for all using (public.is_owner()) with check (public.is_owner());
create policy "owner writes"  on public.opening_hours          for all using (public.is_owner()) with check (public.is_owner());
create policy "owner writes"  on public.professionals          for all using (public.is_owner()) with check (public.is_owner());
create policy "owner writes"  on public.services               for all using (public.is_owner()) with check (public.is_owner());
create policy "owner writes"  on public.service_professionals  for all using (public.is_owner()) with check (public.is_owner());

-- Perfiles: cada uno ve y edita el suyo; la dueña ve todos.
create policy "own profile"   on public.profiles for select using (id = auth.uid() or public.is_owner());
create policy "edit profile"  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'client');

-- Turnos: el cliente ve/crea/edita los suyos; la dueña, todos.
create policy "client reads own"    on public.bookings for select using (client_id = auth.uid() or public.is_owner());
create policy "client creates own"  on public.bookings for insert with check (client_id = auth.uid() and status = 'confirmed');
-- El cliente solo puede reprogramar o cancelar (nunca marcar "atendido"); la regla de 24 h la aplica el servidor.
create policy "client updates own"  on public.bookings for update using (client_id = auth.uid() and status = 'confirmed')
  with check (client_id = auth.uid() and status in ('confirmed', 'cancelled'));
create policy "owner manages"       on public.bookings for all using (public.is_owner()) with check (public.is_owner());

-- Disponibilidad pública sin exponer datos personales.
create view public.busy_ranges with (security_invoker = false) as
  select professional_id, starts_at, ends_at from public.bookings where status <> 'cancelled'
  union all
  select professional_id, starts_at, ends_at from public.blocked_slots;
grant select on public.busy_ranges to anon, authenticated;

create policy "owner manages" on public.blocked_slots for all using (public.is_owner()) with check (public.is_owner());
create policy "owner reads"   on public.activity      for select using (public.is_owner());
create policy "owner updates" on public.activity      for update using (public.is_owner());
create policy "payment visible to booking owner" on public.payments for select using (
  public.is_owner() or exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid())
);
-- Inserciones en activity y payments: solo desde el servidor con la service role key (webhooks, casos de uso).

-- Realtime para avisos en vivo de la dueña.
alter publication supabase_realtime add table public.activity;
