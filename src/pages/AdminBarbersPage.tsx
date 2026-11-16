import { useEffect, useState } from 'react';
import { getBarbers, saveBarber } from '../lib/supabase';
import type { Barber } from '../types';

const emptyBarber = {
  id: '',
  name: '',
  photo_url: '',
  specialty: '',
  active: true,
};

export function AdminBarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [form, setForm] = useState<Barber>(emptyBarber);

  useEffect(() => {
    const load = async () => {
      const nextBarbers = await getBarbers();
      setBarbers(nextBarbers);
    };
    void load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBarber: Barber = {
      ...form,
      id: form.id || `barber-${Date.now()}`,
    };
    const saved = await saveBarber(nextBarber);
    setBarbers((current) => {
      const index = current.findIndex((item) => item.id === saved.id);
      if (index >= 0) {
        return current.map((item) => (item.id === saved.id ? saved : item));
      }
      return [saved, ...current];
    });
    setForm(emptyBarber);
  };

  const toggleActive = async (barber: Barber) => {
    const updated = { ...barber, active: !barber.active };
    await saveBarber(updated);
    setBarbers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#d4af6b]">Equipe</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Gerenciar barbeiros</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
          <h3 className="text-xl font-semibold text-white">{form.id ? 'Editar barbeiro' : 'Novo barbeiro'}</h3>
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-stone-300">
              Nome
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-stone-300">
              Especialidade
              <input value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-stone-300">
              Foto (URL)
              <input value={form.photo_url} onChange={(event) => setForm({ ...form, photo_url: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
            </label>
            <label className="flex items-center gap-3 text-sm text-stone-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Profissional ativo
            </label>
            <button type="submit" className="w-full rounded-xl bg-[#d4af6b] px-4 py-3 font-semibold text-[#0a0d10]">Salvar barbeiro</button>
          </div>
        </form>

        <div className="space-y-4">
          {barbers.map((barber) => (
            <div key={barber.id} className="flex items-center gap-4 rounded-3xl border border-stone-800 bg-[#11161d] p-4">
              <img src={barber.photo_url} alt={barber.name} className="h-20 w-20 rounded-full object-cover" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{barber.name}</h4>
                    <p className="text-sm text-[#f6e5b3]">{barber.specialty}</p>
                  </div>
                  <span className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-300">{barber.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setForm(barber)} className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-white">Editar</button>
                  <button type="button" onClick={() => void toggleActive(barber)} className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-white">{barber.active ? 'Desativar' : 'Ativar'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
