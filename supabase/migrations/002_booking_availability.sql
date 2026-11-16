create or replace function public.get_busy_appointment_ranges(
  p_barber_id text,
  p_date date
)
returns table (start_time time, end_time time)
language sql
security definer
set search_path = public
as $$
  select a.start_time, a.end_time
  from public.appointments a
  where a.barber_id = p_barber_id
    and a.appointment_date = p_date
    and a.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_busy_appointment_ranges(text, date) from public;
grant execute on function public.get_busy_appointment_ranges(text, date) to anon, authenticated;
