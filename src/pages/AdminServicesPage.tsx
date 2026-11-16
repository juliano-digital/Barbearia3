import { useEffect, useState } from 'react';
import { deleteService, getServices, saveService } from '../lib/supabase';
import type { Service } from '../types';

const emptyService = {
  id: '',
  name: '',
  description: '',
  price: 0,
  duration_minutes: 30,
  image_url: '',
  active: true,
};

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<Service>(emptyService);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const nextServices = await getServices();
        setServices(nextServices);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os serviços.');
      }
    };
    void load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextService: Service = {
      ...form,
      id: form.id || `service-${Date.now()}`,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
    };
    setError('');
    try {
      const saved = await saveService(nextService);
      setServices((current) => {
        const index = current.findIndex((item) => item.id === saved.id);
        if (index >= 0) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...current];
      });
      setForm(emptyService);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o serviço.');
    }
  };

  const handleEdit = (service: Service) => setForm(service);

  const toggleActive = async (service: Service) => {
    const updated = { ...service, active: !service.active };
    setError('');
    try {
      const saved = await saveService(updated);
      setServices((current) => current.map((item) => (item.id === updated.id ? saved : item)));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o serviço.');
    }
  };

  const handleDelete = async (service: Service) => {
    if (!window.confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
      return;
    }

    setError('');
    try {
      await deleteService(service.id);
      setServices((current) => current.filter((item) => item.id !== service.id));
      if (form.id === service.id) {
        setForm(emptyService);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? `Não foi possível excluir o serviço: ${deleteError.message}`
          : 'Não foi possível excluir o serviço.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#d4af6b]">Catálogo</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Gerenciar serviços</h2>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
          <h3 className="text-xl font-semibold text-white">{form.id ? 'Editar serviço' : 'Novo serviço'}</h3>
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-stone-300">
              Nome
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-stone-300">
              Descrição
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-[88px] w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-stone-300">
                Preço
                <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
              </label>
              <label className="block text-sm text-stone-300">
                Duração (min)
                <input type="number" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm text-stone-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Serviço ativo
            </label>
            <button type="submit" className="w-full rounded-xl bg-[#d4af6b] px-4 py-3 font-semibold text-[#0a0d10]">Salvar serviço</button>
          </div>
        </form>

        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="rounded-3xl border border-stone-800 bg-[#11161d] p-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{service.name}</h4>
                    <p className="mt-1 text-sm text-stone-400">{service.description}</p>
                  </div>
                  <span className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-300">{service.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-stone-300">
                  <span>R$ {service.price}</span>
                  <span>{service.duration_minutes} min</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => handleEdit(service)} className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-white">Editar</button>
                  <button type="button" onClick={() => void toggleActive(service)} className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-white">{service.active ? 'Desativar' : 'Ativar'}</button>
                  <button type="button" onClick={() => void handleDelete(service)} className="rounded-full border border-red-900 px-3 py-1.5 text-xs text-red-200 hover:border-red-600">Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
