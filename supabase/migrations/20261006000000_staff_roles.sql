-- Filo · roles del equipo (superadmin y peluqueros), servicio "Otro" y nota por turno.
-- Migración nueva (no se edita la inicial): así se puede aplicar sobre una base existente.

-- Roles: "owner" pasa a "admin" y se suma "professional" (peluquero con agenda propia).
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'admin' where role = 'owner';
alter table public.profiles
  add constraint profiles_role_check check (role in ('client', 'admin', 'professional')),
  add column professional_id text references public.professionals (id),
  add column active boolean not null default true,
  add column must_change_password boolean not null default false;

-- Un peluquero siempre está vinculado a su agenda.
alter table public.profiles
  add constraint professional_has_agenda check (role <> 'professional' or professional_id is not null);

-- Servicios solo para el equipo y de precio a convenir.
alter table public.services
  add column staff_only boolean not null default false,
  add column variable_price boolean not null default false;

insert into public.services (id, name, description, duration_min, price_ars, icon, staff_only, variable_price, sort_order)
values ('otro', 'Otro', 'Duración y motivo a elección', 30, 0, 'dots', true, true, 99)
on conflict (id) do nothing;

-- Nota interna (ej. el motivo de un "Otro"). La duración ya surge de ends_at - starts_at.
alter table public.bookings add column note text check (char_length(note) <= 80);

-- Actividad: "leído" por persona, no global.
create table public.activity_reads (
  activity_id uuid references public.activity (id) on delete cascade,
  profile_id  uuid references public.profiles (id) on delete cascade,
  read_at     timestamptz not null default now(),
  primary key (activity_id, profile_id)
);
alter table public.activity drop column read;

-- ───────────────────────── RLS ─────────────────────────

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.my_professional_id() returns text
language sql stable security definer set search_path = public as $$
  select professional_id from public.profiles where id = auth.uid() and role = 'professional' and active;
$$;

-- Un peluquero ve y gestiona solo los turnos y bloqueos de su propia agenda.
create policy "professional reads own agenda" on public.bookings
  for select using (professional_id = public.my_professional_id());
create policy "professional updates own agenda" on public.bookings
  for update using (professional_id = public.my_professional_id())
  with check (professional_id = public.my_professional_id());
create policy "professional books own agenda" on public.bookings
  for insert with check (professional_id = public.my_professional_id());
create policy "professional manages own blocks" on public.blocked_slots
  for all using (professional_id = public.my_professional_id())
  with check (professional_id = public.my_professional_id());

-- Actividad: el peluquero solo ve la de sus turnos; cada uno marca sus leídos.
create policy "professional reads own activity" on public.activity for select using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.professional_id = public.my_professional_id()
  )
);
alter table public.activity_reads enable row level security;
create policy "own reads" on public.activity_reads
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Los servicios "solo equipo" no se exponen a clientas ni a visitantes.
drop policy if exists "catalog read" on public.services;
create policy "catalog read" on public.services for select using (
  not staff_only or public.is_owner() or public.my_professional_id() is not null
);
