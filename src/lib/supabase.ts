import { createClient } from '@supabase/supabase-js';
import { defaultAppointments, defaultBarbers, defaultBusinessSettings, defaultServices, defaultThemeColors } from '../data/mockData';
import type { Appointment, AppointmentDraft, Barber, BusinessSettings, CustomerAppointment, Service } from '../types';

const STORAGE_KEYS = {
  settings: 'barbearia-business-settings',
  services: 'barbearia-services',
  deletedServices: 'barbearia-deleted-services',
  barbers: 'barbearia-barbers',
  deletedBarbers: 'barbearia-deleted-barbers',
  appointments: 'barbearia-appointments',
  customerReminders: 'barbearia-customer-reminders',
  adminAuth: 'barbearia-admin-auth',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 15 MB.');
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Não foi possível processar a imagem.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.')),
        'image/webp',
        0.82,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível abrir o arquivo de imagem.'));
    };
    image.src = objectUrl;
  });

  if (imageBlob.size > 2 * 1024 * 1024) {
    throw new Error('A imagem ficou muito grande após a compressão. Escolha outra imagem.');
  }

  if (supabase) {
    const path = `${folder}/${crypto.randomUUID()}.webp`;
    const { data, error } = await supabase.storage
      .from('barbearia-images')
      .upload(path, imageBlob, { contentType: 'image/webp', cacheControl: '3600' });
    if (error) {
      throw new Error(error.message);
    }
    return supabase.storage.from('barbearia-images').getPublicUrl(data.path).data.publicUrl;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Não foi possível carregar a imagem.'));
    reader.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    reader.readAsDataURL(imageBlob);
  });
}

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
  const deletedIds = new Set(readStored<string[]>(STORAGE_KEYS.deletedBarbers, []));
  return filterBarbers([...merged.values()].filter((barber) => !deletedIds.has(barber.id)));
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
  const deletedIds = new Set(readStored<string[]>(STORAGE_KEYS.deletedBarbers, []));
  deletedIds.delete(barber.id);
  writeStored(STORAGE_KEYS.deletedBarbers, [...deletedIds]);
  return barber;
}

export async function deleteBarber(barberId: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('barbers').delete().eq('id', barberId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const barbers = readStored<Barber[]>(STORAGE_KEYS.barbers, defaultBarbers)
    .filter((barber) => barber.id !== barberId);
  writeStored(STORAGE_KEYS.barbers, barbers);
  const deletedIds = new Set(readStored<string[]>(STORAGE_KEYS.deletedBarbers, []));
  deletedIds.add(barberId);
  writeStored(STORAGE_KEYS.deletedBarbers, [...deletedIds]);
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

export async function getCustomerAppointments(customerName: string, phone: string): Promise<CustomerAppointment[]> {
  const normalizedName = customerName.trim();
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedName.length < 2 || normalizedPhone.length < 4) {
    return [];
  }

  if (supabase) {
    const { data, error } = await supabase.rpc('get_customer_appointments', {
      p_customer_name: normalizedName,
      p_phone: normalizedPhone,
    });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as CustomerAppointment[];
  }

  const normalizedNameKey = normalizedName.toLocaleLowerCase('pt-BR');
  const now = Date.now();
  return (await getAppointments())
    .filter((appointment) =>
      appointment.customer_name.trim().toLocaleLowerCase('pt-BR') === normalizedNameKey
      && appointment.phone.replace(/\D/g, '') === normalizedPhone
      && !['cancelled', 'no_show'].includes(appointment.status)
      && Date.parse(`${appointment.appointment_date}T${appointment.end_time}-03:00`) > now,
    )
    .map(({ id, booking_code, service_id, barber_id, appointment_date, start_time, end_time, status }) => ({
      id,
      booking_code,
      service_id,
      barber_id,
      appointment_date,
      start_time,
      end_time,
      status,
    }))
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time));
}

export function getBrowserAppointmentReminders(): CustomerAppointment[] {
  const reminders = readStored<CustomerAppointment[]>(STORAGE_KEYS.customerReminders, []);
  const activeReminders = reminders.filter((appointment) =>
    appointment
    && typeof appointment.id === 'string'
    && !['cancelled', 'no_show'].includes(appointment.status)
    && Date.parse(`${appointment.appointment_date}T${appointment.end_time}-03:00`) > Date.now(),
  );
  if (activeReminders.length !== reminders.length) {
    writeStored(STORAGE_KEYS.customerReminders, activeReminders);
  }
  return activeReminders;
}

export function rememberBrowserAppointment(appointment: Appointment): CustomerAppointment[] {
  const reminder: CustomerAppointment = {
    id: appointment.id,
    booking_code: appointment.booking_code,
    service_id: appointment.service_id,
    barber_id: appointment.barber_id,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: appointment.status,
  };
  const reminders = [
    reminder,
    ...getBrowserAppointmentReminders().filter((item) => item.id !== reminder.id),
  ];
  writeStored(STORAGE_KEYS.customerReminders, reminders);
  return reminders;
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

export async function deleteAppointment(appointmentId: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const appointments = readStored<Appointment[]>(STORAGE_KEYS.appointments, defaultAppointments)
    .filter((appointment) => appointment.id !== appointmentId);
  writeStored(STORAGE_KEYS.appointments, appointments);
}

export async function createAppointment(input: AppointmentDraft): Promise<Appointment> {
  const phoneDigits = input.phone.replace(/\D/g, '');
  const customerInitial = input.customer_name.trim().charAt(0).toUpperCase();
  if (!customerInitial || phoneDigits.length < 4) {
    throw new Error('Informe nome e telefone válidos para gerar o código do agendamento.');
  }

  const appointment: Appointment = {
    id: `appt-${crypto.randomUUID()}`,
    booking_code: `${customerInitial}${phoneDigits.slice(-4)}`,
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
  const stepMinutes = duration;
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
    const startsAtBusyAppointment = busyRanges.some((range) => range.start === minutes);
    const overlapsBusy = busyRanges.some((range) => {
      return minutes < range.end && minutes + duration > range.start;
    });

    if (startsAtBusyAppointment) {
      reservedSlots.push(candidateStart);
    } else if (!overlapsBusy) {
      availableSlots.push(candidateStart);
    }
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
