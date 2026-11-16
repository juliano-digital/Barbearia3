create or replace function public.prevent_overlapping_appointments()
returns trigger as $$
begin
  if new.barber_id is not null and new.status in ('pending', 'confirmed') then
    perform pg_advisory_xact_lock(
      hashtextextended(new.barber_id || ':' || new.appointment_date::text, 0)
    );

    if exists (
      select 1
      from public.appointments a
      where a.barber_id = new.barber_id
        and a.appointment_date = new.appointment_date
        and a.status in ('pending', 'confirmed')
        and a.id <> new.id
        and (a.start_time, a.end_time) overlaps (new.start_time, new.end_time)
    ) then
      raise exception 'Este barbeiro já possui um agendamento nesse horário. Escolha outro horário ou barbeiro.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
