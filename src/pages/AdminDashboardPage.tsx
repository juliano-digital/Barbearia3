import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CircleDollarSign, ClipboardList, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { getAppointments, getBarbers, getBusinessSettings, getServices } from '../lib/supabase';
import type { Appointment, Barber, BusinessSettings, Service } from '../types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const excludedFromSchedule = new Set<Appointment['status']>(['cancelled', 'no_show']);
const brazilTimeZone = 'America/Sao_Paulo';

function getBusinessDateTime(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

function getRecentDays(today: string) {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayDate);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return {
      date: date.toISOString().slice(0, 10),
      label: `${weekdayFormatter.format(date).replace('.', '')} ${dateFormatter.format(date)}`,
    };
  });
}

export function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => getBusinessDateTime(brazilTimeZone).date);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void Promise.all([getAppointments(), getServices(), getBarbers(), getBusinessSettings()])
      .then(([nextAppointments, nextServices, nextBarbers, nextSettings]) => {
        if (!active) return;
        setAppointments(nextAppointments);
        setServices(nextServices);
        setBarbers(nextBarbers);
        setSettings(nextSettings);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados do dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const businessDateTime = useMemo(() => getBusinessDateTime(brazilTimeZone), [refreshKey]);
  const days = useMemo(() => getRecentDays(selectedDate), [selectedDate]);

  const metrics = useMemo(() => {
    const appointmentsForDate = appointments.filter((item) => item.appointment_date === selectedDate);
    const scheduledForDate = appointmentsForDate.filter((item) => !excludedFromSchedule.has(item.status));
    const pending = appointmentsForDate.filter((item) => item.status === 'pending').length;
    const confirmed = appointmentsForDate.filter((item) => item.status === 'confirmed').length;
    const revenue = appointmentsForDate.reduce(
      (sum, item) => sum + (item.status === 'completed' ? Number(item.price) || 0 : 0),
      0,
    );
    const next = appointments
      .filter((item) =>
        ['pending', 'confirmed'].includes(item.status)
        && (item.appointment_date > businessDateTime.date
          || (item.appointment_date === businessDateTime.date && item.start_time >= businessDateTime.time)),
      )
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))[0];
    const dailyAppointments = days.map((day) => ({
      ...day,
      count: appointments.filter(
        (item) => item.appointment_date === day.date && !excludedFromSchedule.has(item.status),
      ).length,
    }));

    return { pending, confirmed, appointmentsForDate: scheduledForDate.length, revenue, next, dailyAppointments };
  }, [appointments, businessDateTime.date, businessDateTime.time, days, selectedDate]);

  const recentAppointments = useMemo(
    () => appointments
      .filter((item) => item.appointment_date === selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, selectedDate],
  );
  const maxDailyAppointments = Math.max(1, ...metrics.dailyAppointments.map((day) => day.count));
  const serviceMap = useMemo(() => new Map(services.map((service) => [service.id, service.name])), [services]);
  const barberMap = useMemo(() => new Map(barbers.map((barber) => [barber.id, barber.name])), [barbers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d4af6b]">Resumo</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-300">
            {settings?.business_name ?? 'Barbearia'}
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            aria-label="Atualizar dashboard"
            className="rounded-full border border-stone-700 p-2 text-stone-300 transition hover:border-stone-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <span>Não foi possível carregar os dados: {error}</span>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 underline">
            Tentar novamente
          </button>
        </div>
      )}

      <label className="flex w-fit items-center gap-3 rounded-xl border border-stone-800 bg-[#11161d] px-3 py-2 text-sm text-stone-300">
        <CalendarCheck2 className="h-4 w-4 shrink-0 text-[#d4af6b]" />
        <span>Data</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => {
            if (event.target.value) setSelectedDate(event.target.value);
          }}
          aria-label="Filtrar dashboard por data"
          className="w-36 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-white [color-scheme:dark]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Agendamentos no dia" value={String(metrics.appointmentsForDate)} icon={CalendarCheck2} accent="text-emerald-300" />
        <MetricCard title="Pendentes no dia" value={String(metrics.pending)} icon={ClipboardList} accent="text-amber-300" />
        <MetricCard title="Confirmados no dia" value={String(metrics.confirmed)} icon={TrendingUp} accent="text-sky-300" />
        <MetricCard title="Faturamento realizado no dia" value={currencyFormatter.format(metrics.revenue)} icon={CircleDollarSign} accent="text-[#f6e5b3]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Agendamentos por dia</h3>
              <p className="mt-1 text-xs text-stone-400">7 dias até {selectedDate} · exclui cancelados e não comparecimentos</p>
            </div>
            <Users className="h-5 w-5 text-[#d4af6b]" />
          </div>
          <div className="flex h-44 items-end gap-3" aria-label="Gráfico de agendamentos nos últimos 7 dias">
            {metrics.dailyAppointments.map((day) => (
              <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs text-stone-300">{day.count}</span>
                <div
                  className="w-full min-h-1 rounded-t-2xl bg-gradient-to-t from-[#d4af6b] to-[#f6e5b3]"
                  style={{ height: `${day.count ? (day.count / maxDailyAppointments) * 100 : 2}%` }}
                  title={`${day.count} agendamento(s)`}
                />
                <span className="text-center text-[10px] capitalize text-stone-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
          <h3 className="text-xl font-semibold text-white">Próximo atendimento</h3>
          {metrics.next ? (
            <div className="mt-5 space-y-3 text-sm text-stone-300">
              <p className="text-lg font-medium text-white">{metrics.next.customer_name}</p>
              <p>{serviceMap.get(metrics.next.service_id) ?? 'Serviço'}</p>
              <p>{barberMap.get(metrics.next.barber_id) ?? 'Barbeiro'}</p>
              <p>{metrics.next.appointment_date} às {metrics.next.start_time}</p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-stone-400">Nenhum atendimento futuro pendente ou confirmado.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
        <h3 className="text-xl font-semibold text-white">Agendamentos de {selectedDate}</h3>
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-950 text-stone-300">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Barbeiro</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAppointments.map((item) => (
                <tr key={item.id} className="border-t border-stone-800 text-stone-200">
                  <td className="px-4 py-3">{item.customer_name}</td>
                  <td className="px-4 py-3">{serviceMap.get(item.service_id) ?? '—'}</td>
                  <td className="px-4 py-3">{barberMap.get(item.barber_id) ?? '—'}</td>
                  <td className="px-4 py-3">{item.appointment_date} · {item.start_time}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-stone-700 px-2 py-1 text-xs capitalize">{item.status}</span>
                  </td>
                </tr>
              ))}
              {!loading && recentAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-stone-400">Nenhum agendamento nesta data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: typeof CalendarCheck2; accent: string }) {
  return (
    <div className="rounded-3xl border border-stone-800 bg-[#11161d] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">{title}</p>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <p className="mt-6 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
