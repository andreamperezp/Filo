-- Filo · cierre de turnos (cobro y duración real) para el panel de Caja.

alter table public.bookings
  add column started_at timestamptz,
  add column closed_at timestamptz,
  add column closed_by uuid references public.profiles (id),
  add column charged_ars integer check (charged_ars >= 0),
  add column deposit_ars integer not null default 0 check (deposit_ars >= 0),
  add column tip_ars integer not null default 0 check (tip_ars >= 0),
  add column payment_channel text check (payment_channel in ('cash', 'transfer', 'card', 'mercadopago', 'other')),
  add column actual_duration_min smallint check (actual_duration_min between 5 and 600),
  add column checkout_note text check (char_length(checkout_note) <= 120);

-- Un turno finalizado siempre tiene su cobro completo.
alter table public.bookings add constraint attended_has_checkout check (
  status <> 'attended'
  or (closed_at is not null and charged_ars is not null and payment_channel is not null and actual_duration_min is not null)
);

-- Consultas de Caja por período (y por profesional).
create index bookings_checkout_idx on public.bookings (closed_at, professional_id) where status = 'attended';

-- Vista de caja: ingresos = cobrado en el local + seña. RLS de bookings aplica (security_invoker).
create view public.cashbox with (security_invoker = true) as
  select
    id, professional_id, service_id, (starts_at at time zone 'America/Argentina/Buenos_Aires')::date as day,
    charged_ars + deposit_ars as revenue_ars, tip_ars, payment_channel, actual_duration_min,
    extract(epoch from (ends_at - starts_at)) / 60 as scheduled_duration_min
  from public.bookings
  where status = 'attended';
