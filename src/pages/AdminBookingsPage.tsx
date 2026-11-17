import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { deleteAppointment, getAppointments, getBarbers, getServices, saveAppointment } from '../lib/supabase';
import type { Appointment, Barber, Service } from '../types';

export function AdminBookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [nextAppointments, nextServices, nextBarbers] = await Promise.all([
          getAppointments(),
          getServices(),
          getBarbers(),
        ]);
        setAppointments(nextAppointments);
        setServices(nextServices);
        setBarbers(nextBarbers);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os agendamentos.');
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    return appointments.filter((item) => {
      const matchesSearch = !search || item.customer_name.toLowerCase().includes(search.toLowerCase()) || item.phone.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter]);

  const serviceMap = useMemo(() => new Map(services.map((service) => [service.id, service.name])), [services]);
  const barberMap = useMemo(() => new Map(barbers.map((barber) => [barber.id, barber.name])), [barbers]);

  const updateStatus = async (appointment: Appointment, status: Appointment['status']) => {
    const updated = { ...appointment, status, updated_at: new Date().toISOString() };
    setError('');
    try {
      const saved = await saveAppointment(updated);
      setAppointments((current) => current.map((item) => item.id === appointment.id ? saved : item));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o agendamento.');
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    const confirmed = window.confirm('Confirmar exclusão definitiva?');
    if (!confirmed) {
      return;
    }

    setError('');
    try {
      await deleteAppointment(appointment.id);
      setAppointments((current) => current.filter((item) => item.id !== appointment.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? `Não foi possível excluir o agendamento: ${deleteError.message}` : 'Não foi possível excluir o agendamento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d4af6b]">Agenda</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Agendamentos</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente ou telefone"
              className="rounded-xl border border-stone-700 bg-stone-950 py-2.5 pl-9 pr-4 text-sm text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm text-white"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="cancelled">Cancelado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      <div className="overflow-hidden rounded-3xl border border-stone-800 bg-[#11161d]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-950 text-stone-300">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3">Barbeiro</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-stone-800 text-stone-200">
                  <td className="px-4 py-3 font-mono text-xs text-[#f6e5b3]">{item.booking_code}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p>{item.customer_name}</p>
                      <p className="text-xs text-stone-400">{item.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{serviceMap.get(item.service_id) ?? '—'}</td>
                  <td className="max-w-xs whitespace-normal break-words px-4 py-3 text-stone-300">
                    {item.notes?.trim() || '—'}
                  </td>
                  <td className="px-4 py-3">{barberMap.get(item.barber_id) ?? '—'}</td>
                  <td className="px-4 py-3">{item.appointment_date} · {item.start_time}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-stone-700 px-2 py-1 text-xs capitalize">{item.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        aria-label={`Excluir agendamento ${item.booking_code}`}
                        title="Excluir agendamento"
                        className="rounded-full border border-red-500/50 bg-red-500/10 p-1.5 text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void updateStatus(item, 'cancelled')} className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs text-red-200">Cancelar</button>
                      <button type="button" onClick={() => void updateStatus(item, 'completed')} className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">Concluído</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
