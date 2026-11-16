create extension if not exists pgcrypto;

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Royal Barber House',
  slogan text,
  logo_url text,
  cover_url text,
  primary_color text default '#d4af6b',
  secondary_color text default '#f6e5b3',
  address text,
  phone text,
  whatsapp text,
  instagram text,
  timezone text default 'America/Sao_Paulo',
  opening_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 30,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.barbers (
  id text primary key,
  name text not null,
  photo_url text,
  specialty text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id text primary key,
  booking_code text not null unique,
  customer_name text not null,
  phone text not null,
  barber_id text references public.barbers(id),
  service_id text references public.services(id),
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','no_show')),
  notes text,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references public.barbers(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  active boolean not null default true
);

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references public.barbers(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_date on public.appointments (appointment_date);
create index if not exists idx_appointments_status on public.appointments (status);
create index if not exists idx_appointments_barber_date on public.appointments (barber_id, appointment_date);

alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_slots enable row level security;

create policy "Public read access" on public.business_settings for select using (true);
create policy "Public read access" on public.services for select using (true);
create policy "Public read access" on public.barbers for select using (true);
create policy "Public insert access" on public.appointments for insert with check (true);
create policy "Public update status" on public.appointments for update using (true) with check (true);

create policy "Admins manage services" on public.services for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Admins manage barbers" on public.barbers for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Admins manage settings" on public.business_settings for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Admins manage appointments" on public.appointments for all using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function public.prevent_overlapping_appointments()
returns trigger as $$
begin
  if exists (
    select 1
    from public.appointments a
    where a.barber_id = new.barber_id
      and a.appointment_date = new.appointment_date
      and a.status in ('pending', 'confirmed')
      and a.id <> new.id
      and (
        (a.start_time, a.end_time) overlaps (new.start_time, new.end_time)
      )
  ) then
    raise exception 'Horário indisponível para o barbeiro selecionado.';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger appointment_overlap_guard
before insert or update on public.appointments
for each row
execute function public.prevent_overlapping_appointments();
