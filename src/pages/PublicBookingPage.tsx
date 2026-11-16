import { useEffect, useMemo, useState } from 'react';
import { AtSign, Clock3, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createAppointment, getBarbers, getBusinessSettings, getAvailableSlots, getServices, getSlotAvailability } from '../lib/supabase';
import { defaultThemeColors } from '../data/mockData';
import type { Appointment, Barber, BusinessSettings, Service } from '../types';
import { BottomNav } from '../components/BottomNav';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefix = number.slice(0, 5);
  const suffix = number.slice(5, 9);

  return `(${areaCode}${digits.length >= 2 ? ')' : ''}${digits.length > 2 ? ` ${prefix}` : ''}${digits.length > 7 ? `-${suffix}` : ''}`;
}

function getInstagramUrl(value: string) {
  const instagram = value.trim();
  if (!instagram) return '';
  if (/^https?:\/\//i.test(instagram)) return instagram;
  return `https://www.instagram.com/${instagram.replace(/^@/, '')}`;
}

function getContrastingTextColor(hexColor: string) {
  const hex = hexColor.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(hex)) return '#0a0d10';

  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.179 ? '#0a0d10' : '#ffffff';
}

export function PublicBookingPage() {
  const location = useLocation();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<Array<{ time: string; reserved: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<Appointment | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const sectionIds: Record<string, string> = {
      '/agendar': 'agendar',
      '/servicos': 'servicos',
      '/barbeiros': 'barbeiros',
      '/contato': 'contato',
    };
    const sectionId = sectionIds[location.pathname];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  useEffect(() => {
    const load = async () => {
      try {
        const [businessSettings, serviceList, barberList] = await Promise.all([
          getBusinessSettings(),
          getServices(),
          getBarbers(),
        ]);
        setSettings(businessSettings);
        const activeServices = serviceList.filter((service) => service.active);
        setServices(activeServices);
        setBarbers(barberList.filter((barber) => barber.active));
        setSelectedServiceId(activeServices[0]?.id ?? '');
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : 'Não foi possível carregar os serviços.');
      }
    };

    void load();
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  );

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarberId) ?? null,
    [selectedBarberId, barbers],
  );

  useEffect(() => {
    if (!selectedBarberId || !selectedService || !selectedDate) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    const candidates = selectedBarberId === 'any'
      ? barbers
      : barbers.filter((barber) => barber.id === selectedBarberId);
    if (candidates.length === 0) {
      setSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    void (async () => {
      try {
        const barberSlots = await Promise.all(
          candidates.map(async (barber) => ({
            ...await getSlotAvailability(barber.id, selectedService.id, selectedDate),
          })),
        );
        if (!active) return;
        const availableSlots = new Set(barberSlots.flatMap((item) => item.availableSlots));
        const reservedSlots = new Set(barberSlots.flatMap((item) => item.reservedSlots));
        const nextSlots = [...new Set([...availableSlots, ...reservedSlots])]
          .sort()
          .map((time) => ({ time, reserved: !availableSlots.has(time) }));
        setSlots(nextSlots);
        if (selectedTime && !availableSlots.has(selectedTime)) {
          setSelectedTime('');
        }
      } catch (error) {
        if (!active) return;
        setSlots([]);
        setBookingError(error instanceof Error ? error.message : 'Não foi possível carregar os horários.');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [availabilityRefresh, barbers, selectedBarberId, selectedDate, selectedService]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      return;
    }

    setBookingError('');
    setSubmittingBooking(true);
    try {
      const candidates = selectedBarberId === 'any'
        ? barbers
        : barbers.filter((barber) => barber.id === selectedBarberId);
      let availableBarber: Barber | undefined;
      for (const barber of candidates) {
        const availableSlots = await getAvailableSlots(barber.id, selectedService.id, selectedDate);
        if (availableSlots.includes(selectedTime)) {
          availableBarber = barber;
          break;
        }
      }
      if (!availableBarber) {
        throw new Error('Esse horário não está mais disponível. Escolha outro horário.');
      }

      const appointment = await createAppointment({
        customer_name: customerName,
        phone: customerPhone,
        barber_id: availableBarber.id,
        service_id: selectedService.id,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: addMinutesToTime(selectedTime, selectedService.duration_minutes),
        status: 'pending',
        notes,
        price: selectedService.price,
      });

      setBooking(appointment);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Não foi possível concluir o agendamento.');
      setSelectedTime('');
      setAvailabilityRefresh((current) => current + 1);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const summaryReady = Boolean(selectedService && selectedDate && selectedTime && customerName && customerPhone);
  const theme = { ...defaultThemeColors, ...settings?.theme_colors };

  return (
    <div className="min-h-screen text-stone-100" style={{ backgroundColor: theme.projectBackground }}>
      <header className="border-b border-stone-800 backdrop-blur" style={{ backgroundColor: theme.navbar }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img className="h-10 w-10 rounded-full object-cover" src={settings?.logo_url ?? ''} alt={settings?.business_name} />
            <div>
              <p className="text-lg font-semibold" style={{ color: theme.title }}>{settings?.business_name ?? 'Barbearia'}</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: theme.navbarText }}>
            <a href="#servicos">Serviços</a>
            <a href="#barbeiros">Barbeiros</a>
            <a href="#agendar">Agendar</a>
            <a href="#contato">Contato</a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${settings?.whatsapp ?? '5511999999999'}`}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border px-4 py-2 text-sm md:inline-flex"
              style={{ backgroundColor: theme.whatsappButton, borderColor: theme.barberAccent, color: theme.navbarText }}
            >
              WhatsApp
            </a>
            <Link to="/admin" className="rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: theme.scheduleButton, color: getContrastingTextColor(theme.scheduleButton) }}>
              Agendar
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-24">
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs tracking-[0.2em] uppercase" style={{ borderColor: theme.barberAccent, backgroundColor: theme.subBackground, color: theme.premiumBadgeText }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Serviço premium
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: theme.title }}>
              {settings?.business_name ?? 'Royal Barber House'}
            </h1>
            <p className="mt-4 max-w-xl text-lg" style={{ color: theme.subtitle }}>{settings?.slogan ?? 'Precisão, estilo e presença.'}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm" style={{ color: theme.description }}>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: theme.barberAccent }} /> {settings?.address ?? 'Rua das Flores, 154'}</div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" style={{ color: theme.barberAccent }} /> {settings?.opening_hours ?? 'Segunda a sábado · 09:00 às 19:00'}</div>
              {settings?.phone && (
                <a href={`tel:${settings.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4" style={{ color: theme.barberAccent }} />
                  {settings.phone}
                </a>
              )}
              {settings?.instagram && (
                <a
                  href={getInstagramUrl(settings.instagram)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <AtSign className="h-4 w-4" style={{ color: theme.barberAccent }} />
                  {settings.instagram}
                </a>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#agendar" className="rounded-full px-6 py-3 font-medium shadow-soft transition hover:brightness-110" style={{ backgroundColor: theme.scheduleButton, color: getContrastingTextColor(theme.scheduleButton) }}>
                AGENDAR HORÁRIO
              </a>
              <a
                href={`https://wa.me/${settings?.whatsapp ?? '5511999999999'}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 font-medium transition hover:border-stone-500"
                style={{ backgroundColor: theme.whatsappButton, borderColor: theme.barberAccent, color: theme.navbarText }}
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-800 shadow-soft" style={{ backgroundColor: theme.subBackground }}>
            <img src={settings?.cover_url ?? 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186'} alt="Barbearia" className="h-[480px] w-full object-cover" />
          </div>
        </section>

        <section id="barbeiros" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.barberAccent }}>Barbeiros</p>
              <h2 className="mt-2 text-3xl font-semibold" style={{ color: theme.title }}>Quem você prefere?</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setSelectedBarberId('any');
                setBookingError('');
              }}
              className="rounded-2xl border p-5 text-left transition hover:brightness-110"
              style={{ backgroundColor: theme.barberCard, borderColor: selectedBarberId === 'any' ? theme.barberAccent : theme.subBackground }}
            >
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={`Logo ${settings.business_name || 'Royal Barber'}`}
                  className="mb-3 h-12 w-12 rounded-xl border object-contain p-1"
                  style={{ borderColor: theme.barberAccent, backgroundColor: theme.subBackground }}
                />
              ) : (
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold"
                  style={{ borderColor: theme.barberAccent, backgroundColor: theme.subBackground, color: theme.barberAccent }}
                >
                  RB
                </div>
              )}
              <h3 className="text-lg font-semibold" style={{ color: theme.barberTitle }}>Qualquer profissional disponível</h3>
              <div className="my-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: theme.barberAccent }} />
              <p className="mt-2 text-sm" style={{ color: theme.barberDescription }}>Escolha a melhor opção conforme a agenda.</p>
            </button>
            {barbers.map((barber) => (
              <button
                key={barber.id}
                type="button"
                onClick={() => {
                  setSelectedBarberId(barber.id);
                  setBookingError('');
                }}
                className="rounded-2xl border p-5 text-left transition hover:brightness-110"
                style={{ backgroundColor: theme.barberCard, borderColor: selectedBarberId === barber.id ? theme.barberAccent : theme.subBackground }}
              >
                <img src={barber.photo_url} alt={barber.name} className="mb-4 h-20 w-20 rounded-full object-cover" />
                <h3 className="text-lg font-semibold" style={{ color: theme.barberTitle }}>{barber.name}</h3>
                <div className="my-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: theme.barberAccent }} />
                <p className="mt-1 text-sm" style={{ color: theme.barberDescription }}>{barber.specialty}</p>
              </button>
            ))}
          </div>
        </section>

        <section id="agendar" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-3xl border p-6 shadow-soft" style={{ backgroundColor: theme.formPanel, borderColor: theme.formBorder }}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.barberAccent }}>Agendamento</p>
                <h2 className="mt-2 text-3xl font-semibold" style={{ color: theme.title }}>Selecione data e horário</h2>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <label id="servicos" className="block text-sm" style={{ color: theme.formText }}>
                  Serviço
                  <select
                    value={selectedServiceId}
                    onChange={(event) => {
                      setSelectedServiceId(event.target.value);
                      setSelectedTime('');
                      setBookingError('');
                    }}
                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                    style={{ backgroundColor: theme.formField, borderColor: theme.formBorder, color: theme.formText }}
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · R$ {service.price} · {service.duration_minutes} min
                      </option>
                    ))}
                  </select>
                  {catalogError && <span role="alert" className="mt-2 block text-sm text-red-300">{catalogError}</span>}
                </label>
                <label className="block text-sm" style={{ color: theme.formText }}>
                  Data
                  <input
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setBookingError('');
                    }}
                    className="mt-2 w-full cursor-pointer rounded-xl border px-4 py-3 outline-none ring-0"
                    style={{
                      backgroundColor: theme.formField,
                      borderColor: theme.formBorder,
                      color: theme.formText,
                      colorScheme: getContrastingTextColor(theme.formField) === '#ffffff' ? 'dark' : 'light',
                    }}
                  />
                </label>
                <div className="rounded-2xl border p-4" style={{ backgroundColor: theme.subBackground, borderColor: theme.formBorder }}>
                  <p className="mb-3 text-sm font-medium" style={{ color: theme.formText }}>Resumo</p>
                  <ul className="space-y-3 text-sm" style={{ color: theme.formText }}>
                    <li>Serviço: {selectedService?.name ?? 'Selecione'}</li>
                    <li>Barbeiro: {selectedBarber?.name ?? 'Qualquer disponível'}</li>
                    <li>Data: {selectedDate || '—'}</li>
                    <li>Horário: {selectedTime || '—'}</li>
                  </ul>
                </div>
              </div>
              <div>
                {selectedDate && selectedService ? (
                  <div>
                    <p className="mb-3 text-sm" style={{ color: theme.formText }}>Horários disponíveis</p>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                      {loadingSlots ? (
                        <p className="text-sm text-stone-400">Carregando horários disponíveis...</p>
                      ) : bookingError ? (
                        <p role="alert" className="text-sm text-red-300">{bookingError}</p>
                      ) : slots.length > 0 ? (
                        slots.map(({ time, reserved }) => (
                          <button
                            key={time}
                            type="button"
                            disabled={reserved}
                            aria-label={reserved ? `${time}, reservado` : time}
                            onClick={() => {
                              setSelectedTime(time);
                              setBookingError('');
                            }}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm ${reserved ? 'cursor-not-allowed' : 'transition hover:brightness-110'}`}
                            style={reserved
                              ? { backgroundColor: '#d6d3d1', borderColor: '#a8a29e', color: '#57534e' }
                              : { backgroundColor: selectedTime === time ? theme.scheduleButton : theme.formField, borderColor: selectedTime === time ? theme.scheduleButton : theme.subBackground, color: selectedTime === time ? getContrastingTextColor(theme.scheduleButton) : theme.formText }}
                          >
                            {reserved && <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Reservado</span>}
                            <span>{time}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-stone-400">Nenhum horário livre nesta data. Tente outra opção.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-stone-400" style={{ backgroundColor: theme.subBackground, borderColor: theme.formBorder }}>
                    Selecione uma data e serviço para visualizar os horários disponíveis.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="contato" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-3xl border p-6" style={{ backgroundColor: theme.formPanel, borderColor: theme.formBorder }}>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.barberAccent }}>Seus dados</p>
              <h2 className="mt-2 text-3xl font-semibold" style={{ color: theme.title }}>Finalize o agendamento</h2>
              <div className="mt-6 space-y-4">
                <label className="block text-sm" style={{ color: theme.formText }}>
                  Nome completo
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                    style={{ backgroundColor: theme.formField, borderColor: theme.formBorder, color: theme.formText }}
                    placeholder="Seu nome"
                  />
                </label>
                <label className="block text-sm" style={{ color: theme.formText }}>
                  Telefone / WhatsApp
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(formatPhone(event.target.value))}
                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                    style={{ backgroundColor: theme.formField, borderColor: theme.formBorder, color: theme.formText }}
                    placeholder="(11) 99999-9999"
                    inputMode="numeric"
                    maxLength={15}
                  />
                </label>
                <label className="block text-sm" style={{ color: theme.formText }}>
                  Observações
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-2 min-h-[96px] w-full rounded-xl border px-4 py-3 outline-none"
                    style={{ backgroundColor: theme.formField, borderColor: theme.formBorder, color: theme.formText }}
                    placeholder="Deseja algo específico?"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border p-6" style={{ backgroundColor: theme.subBackground, borderColor: theme.formBorder }}>
              <h2 className="mt-2 text-3xl font-semibold" style={{ color: theme.reviewText }}>Confirme sua reserva</h2>
              <div className="mt-6 space-y-4 text-sm" style={{ color: theme.formText }}>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Cliente</span><span style={{ color: theme.reviewText }}>{customerName || '—'}</span></div>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Serviço</span><span style={{ color: theme.reviewText }}>{selectedService?.name ?? '—'}</span></div>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Barbeiro</span><span style={{ color: theme.reviewText }}>{booking ? barbers.find((barber) => barber.id === booking.barber_id)?.name ?? '—' : selectedBarber?.name ?? 'Qualquer disponível'}</span></div>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Data</span><span style={{ color: theme.reviewText }}>{selectedDate || '—'}</span></div>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Horário</span><span style={{ color: theme.reviewText }}>{selectedTime || '—'}</span></div>
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3"><span>Duração</span><span style={{ color: theme.reviewText }}>{selectedService?.duration_minutes ?? 0} min</span></div>
                <div className="flex items-center justify-between gap-4 pb-3"><span>Preço</span><span className="text-lg font-semibold" style={{ color: theme.reviewText }}>R$ {selectedService?.price ?? 0}</span></div>
              </div>

              {booking ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/20 p-4 text-sm" style={{ color: theme.barberAccent }}>
                  <p className="text-lg font-semibold">Agendamento confirmado</p>
                  <p className="mt-2">Código: <span className="font-mono font-bold">{booking.booking_code}</span></p>
                  <p className="mt-2">Data: {booking.appointment_date} às {booking.start_time}</p>
                  <a href={`https://wa.me/${settings?.whatsapp ?? '5511999999999'}?text=${encodeURIComponent(`Olá! Confirmei meu agendamento com código ${booking.booking_code}.`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium" style={{ backgroundColor: theme.whatsappButton, color: theme.navbarText }}>
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </a>
                </div>
              ) : (
                <>
                  {bookingError && <p role="alert" className="mt-4 text-sm text-red-300">{bookingError}</p>}
                  <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={!summaryReady || submittingBooking}
                    className="mt-6 w-full rounded-full px-4 py-3 font-semibold disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: summaryReady ? '#22c55e' : '#44403c',
                      color: summaryReady ? getContrastingTextColor('#22c55e') : '#a8a29e',
                    }}
                  >
                    {submittingBooking ? 'Salvando...' : 'Confirmar agendamento'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function addMinutesToTime(value: string, duration: number): string {
  const [hours, minutes] = value.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const computedHours = Math.floor(totalMinutes / 60) % 24;
  const computedMinutes = totalMinutes % 60;
  return `${String(computedHours).padStart(2, '0')}:${String(computedMinutes).padStart(2, '0')}`;
}
