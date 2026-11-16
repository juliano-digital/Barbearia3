import { createClient } from '@supabase/supabase-js';
import { defaultAppointments, defaultBarbers, defaultBusinessSettings, defaultServices, defaultThemeColors } from '../data/mockData';
import type { Appointment, AppointmentDraft, Barber, BusinessSettings, Service } from '../types';

const STORAGE_KEYS = {
  settings: 'barbearia-business-settings',
  services: 'barbearia-services',
  deletedServices: 'barbearia-deleted-services',
  barbers: 'barbearia-barbers',
  appointments: 'barbearia-appointments',
  adminAuth: 'barbearia-admin-auth',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // local storage may be unavailable in private mode; ignore gracefully
  }
}

export const isAdminAuthenticated = (): boolean => {
  return window.localStorage.getItem(STORAGE_KEYS.adminAuth) === 'true';
};

export const setAdminAuthenticated = (value: boolean): void => {
  window.localStorage.setItem(STORAGE_KEYS.adminAuth, String(value));
};

export async function signInAdmin(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  if (!supabase) {
    if (email === 'admin@barbearia.com' && password === 'admin123') {
      setAdminAuthenticated(true);
      return { success: true };
    }

    return { success: false, message: 'Credenciais inválidas no modo local.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { success: false, message: error.message };
  }

  setAdminAuthenticated(true);
  return { success: true };
}

export async function signOutAdmin(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  setAdminAuthenticated(false);
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (supabase) {
    const { data, error } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (data) return normalizeBusinessSettings(data as BusinessSettings);
  }

  return normalizeBusinessSettings(readStored(STORAGE_KEYS.settings, defaultBusinessSettings));
}

export async function saveBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  const normalizedSettings = normalizeBusinessSettings(settings);
  if (supabase) {
    const { id, ...settingsWithoutId } = normalizedSettings;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const payload = isUuid ? { ...settingsWithoutId, id } : settingsWithoutId;
    const { data, error } = await supabase.from('business_settings').upsert(payload).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return normalizeBusinessSettings(data as BusinessSettings);
  }

  writeStored(STORAGE_KEYS.settings, normalizedSettings);
  return normalizedSettings;
}

function normalizeBusinessSettings(settings: BusinessSettings): BusinessSettings {
  return {
    ...settings,
    theme_colors: { ...defaultThemeColors, ...settings.theme_colors },
  };
}

export async function getServices(): Promise<Service[]> {
  if (supabase) {
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return data as Service[];
  }

  return mergeDefaultServices(readStored(STORAGE_KEYS.services, defaultServices), getDeletedServiceIds());
}

function getDeletedServiceIds(): string[] {
  return readStored(STORAGE_KEYS.deletedServices, []);
}

function mergeDefaultServices(services: Service[], deletedIds: string[]): Service[] {
  const merged = new Map(defaultServices.map((service) => [service.id, service]));
  services.forEach((service) => merged.set(service.id, service));
  const deleted = new Set(deletedIds);
  return [...merged.values()].filter((service) => !deleted.has(service.id));
}

export async function saveService(service: Service): Promise<Service> {
  if (supabase) {
    const { data, error } = await supabase.from('services').upsert(service).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Service;
  }

  const items = readStored<Service[]>(STORAGE_KEYS.services, defaultServices);
  const existingIndex = items.findIndex((item) => item.id === service.id);
  if (existingIndex >= 0) {
    items[existingIndex] = service;
  } else {
    items.push(service);
  }
  writeStored(STORAGE_KEYS.services, items);
  return service;
}

export async function deleteService(serviceId: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const services = readStored<Service[]>(STORAGE_KEYS.services, defaultServices)
      .filter((service) => service.id !== serviceId);
    writeStored(STORAGE_KEYS.services, services);
  }

  const deletedIds = new Set(getDeletedServiceIds());
  deletedIds.add(serviceId);
  writeStored(STORAGE_KEYS.deletedServices, [...deletedIds]);
}

export async function getBarbers(): Promise<Barber[]> {
  if (supabase) {
    const { data, error } = await supabase.from('barbers').select('*').order('name', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return filterBarbers(data as Barber[]);
  }

  return mergeDefaultBarbers(readStored(STORAGE_KEYS.barbers, defaultBarbers));
}

function mergeDefaultBarbers(barbers: Barber[]): Barber[] {
  const merged = new Map(defaultBarbers.map((barber) => [barber.id, barber]));
  barbers.forEach((barber) => merged.set(barber.id, barber));
  return filterBarbers([...merged.values()]);
}

function filterBarbers(barbers: Barber[]): Barber[] {
  return barbers.filter((barber) => {
    const normalizedName = barber.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return normalizedName !== 'joao' && normalizedName !== 'rafael';
  });
}

export async function saveBarber(barber: Barber): Promise<Barber> {
  if (supabase) {
    const { data, error } = await supabase.from('barbers').upsert(barber).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Barber;
  }

  const items = readStored<Barber[]>(STORAGE_KEYS.barbers, defaultBarbers);
  const existingIndex = items.findIndex((item) => item.id === barber.id);
  if (existingIndex >= 0) {
    items[existingIndex] = barber;
  } else {
    items.push(barber);
  }
  writeStored(STORAGE_KEYS.barbers, items);
  return barber;
}

export async function getAppointments(): Promise<Appointment[]> {
  if (supabase) {
    const { data, error } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return data as Appointment[];
  }

  return readStored(STORAGE_KEYS.appointments, defaultAppointments);
}

export async function saveAppointment(appointment: Appointment): Promise<Appointment> {
  if (supabase) {
    const { data, error } = await supabase.from('appointments').upsert(appointment).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Appointment;
  }

  const items = readStored<Appointment[]>(STORAGE_KEYS.appointments, defaultAppointments);
  const existingIndex = items.findIndex((item) => item.id === appointment.id);
  if (existingIndex >= 0) {
    items[existingIndex] = appointment;
  } else {
    items.push(appointment);
  }
  writeStored(STORAGE_KEYS.appointments, items);
  return appointment;
}

export async function createAppointment(input: AppointmentDraft): Promise<Appointment> {
  const appointment: Appointment = {
    id: `appt-${crypto.randomUUID()}`,
    booking_code: `BRR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    customer_name: input.customer_name,
    phone: input.phone,
    barber_id: input.barber_id,
    service_id: input.service_id,
    appointment_date: input.appointment_date,
    start_time: input.start_time,
    end_time: input.end_time,
    status: input.status,
    notes: input.notes ?? '',
    price: input.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from('appointments').insert(appointment);
    if (error) {
      throw new Error(error.message);
    }
    return appointment;
  }

  const appointments = await getAppointments();
  const start = timeToMinutes(appointment.start_time);
  const end = timeToMinutes(appointment.end_time);
  const overlapsExisting = appointments.some((existing) => {
    if (
      existing.barber_id !== appointment.barber_id
      || existing.appointment_date !== appointment.appointment_date
      || !['pending', 'confirmed'].includes(existing.status)
    ) {
      return false;
    }
    return start < timeToMinutes(existing.end_time) && end > timeToMinutes(existing.start_time);
  });
  if (overlapsExisting) {
    throw new Error('Este horário acabou de ser reservado. Escolha outro horário.');
  }

  writeStored(STORAGE_KEYS.appointments, [appointment, ...appointments]);
  return appointment;
}

export async function getAvailableSlots(barberId: string, serviceId: string, date: string): Promise<string[]> {
  const { availableSlots } = await getSlotAvailability(barberId, serviceId, date);
  return availableSlots;
}

export async function getSlotAvailability(
  barberId: string,
  serviceId: string,
  date: string,
): Promise<{ availableSlots: string[]; reservedSlots: string[] }> {
  const services = await getServices();
  const service = services.find((item) => item.id === serviceId);
  if (!service) {
    throw new Error('O serviço selecionado não está disponível.');
  }
  const duration = service.duration_minutes;
  const stepMinutes = 30;
  const startMinutes = 9 * 60;
  const endMinutes = 18 * 60;

  let busyRanges: Array<{ start: number; end: number }>;
  if (supabase) {
    const { data, error } = await supabase.rpc('get_busy_appointment_ranges', {
      p_barber_id: barberId,
      p_date: date,
    });
    if (error) {
      throw new Error(error.message);
    }
    const appointmentRanges = (data ?? []) as Array<{ start_time: string; end_time: string }>;
    busyRanges = appointmentRanges.map((range) => ({
      start: timeToMinutes(range.start_time),
      end: timeToMinutes(range.end_time),
    }));
  } else {
    const appointments = await getAppointments();
    busyRanges = appointments
      .filter((item) =>
        item.barber_id === barberId
        && item.appointment_date === date
        && ['pending', 'confirmed'].includes(item.status),
      )
      .map((item) => ({ start: timeToMinutes(item.start_time), end: timeToMinutes(item.end_time) }));
  }

  const availableSlots: string[] = [];
  const reservedSlots: string[] = [];
  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += stepMinutes) {
    const candidateStart = minutesToTime(minutes);
    const candidateEnd = minutesToTime(minutes + duration);
    const overlapsBusy = busyRanges.some((range) => {
      const candidateStartMinutes = timeToMinutes(candidateStart);
      const candidateEndMinutes = timeToMinutes(candidateEnd);
      return candidateStartMinutes < range.end && candidateEndMinutes > range.start;
    });

    (overlapsBusy ? reservedSlots : availableSlots).push(candidateStart);
  }

  return { availableSlots, reservedSlots };
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}
