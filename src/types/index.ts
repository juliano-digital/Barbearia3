export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface ThemeColors {
  projectBackground: string;
  subBackground: string;
  title: string;
  subtitle: string;
  description: string;
  scheduleButton: string;
  whatsappButton: string;
  navbar: string;
  navbarText: string;
  barberTitle: string;
  barberDescription: string;
  barberAccent: string;
  barberCard: string;
  formPanel: string;
  formBorder: string;
  formField: string;
  formText: string;
  reviewText: string;
  premiumBadgeText: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  slogan: string;
  logo_url: string;
  cover_url: string;
  primary_color: string;
  secondary_color: string;
  theme_colors: ThemeColors;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  timezone: string;
  opening_hours: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  photo_url: string;
  specialty: string;
  active: boolean;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
}

export interface Appointment {
  id: string;
  booking_code: string;
  customer_name: string;
  phone: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export type CustomerAppointment = Pick<
  Appointment,
  'id' | 'booking_code' | 'service_id' | 'barber_id' | 'appointment_date' | 'start_time' | 'end_time' | 'status'
>;

export interface AppointmentDraft {
  customer_name: string;
  phone: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  price: number;
}
