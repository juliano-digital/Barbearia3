create or replace function public.get_customer_appointments(
  p_customer_name text,
  p_phone text
)
returns table (
  id text,
  booking_code text,
  service_id text,
  barber_id text,
  appointment_date date,
  start_time time,
  end_time time,
  status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    a.id,
    a.booking_code,
    a.service_id,
    a.barber_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status
  from public.appointments as a
  where length(btrim(p_customer_name)) >= 2
    and length(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 4
    and lower(btrim(a.customer_name)) = lower(btrim(p_customer_name))
    and regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
    and a.status not in ('cancelled', 'no_show')
    and ((a.appointment_date + a.end_time) at time zone 'America/Sao_Paulo') > now()
  order by a.appointment_date, a.start_time;
$$;

revoke all on function public.get_customer_appointments(text, text) from public;
grant execute on function public.get_customer_appointments(text, text) to anon, authenticated;
