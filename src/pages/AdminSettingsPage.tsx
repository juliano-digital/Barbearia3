import { useEffect, useState } from 'react';
import { getBusinessSettings, saveBusinessSettings } from '../lib/supabase';
import { defaultThemeColors } from '../data/mockData';
import type { BusinessSettings, ThemeColors } from '../types';

const emptySettings: BusinessSettings = {
  id: 'business-1',
  business_name: '',
  slogan: '',
  logo_url: '',
  cover_url: '',
  primary_color: '#d4af6b',
  secondary_color: '#f6e5b3',
  theme_colors: defaultThemeColors,
  address: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  timezone: 'America/Sao_Paulo',
  opening_hours: '',
};

const themeColorFields: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: 'title', label: 'Títulos' },
  { key: 'subtitle', label: 'Subtítulos' },
  { key: 'description', label: 'Texto de descrição' },
  { key: 'scheduleButton', label: 'Botão Agendar horário' },
  { key: 'whatsappButton', label: 'Botão WhatsApp' },
  { key: 'navbar', label: 'Fundo da navbar/menu' },
  { key: 'navbarText', label: 'Texto da navbar/menu' },
  { key: 'barberTitle', label: 'Título dos cards de barbeiros' },
  { key: 'barberDescription', label: 'Descrição dos barbeiros' },
  { key: 'barberAccent', label: 'Destaque e sublinhado dos barbeiros' },
  { key: 'barberCard', label: 'Fundo dos cards de barbeiros' },
  { key: 'formPanel', label: 'Fundo dos formulários' },
  { key: 'formBorder', label: 'Borda dos formulários' },
  { key: 'formField', label: 'Fundo dos campos' },
  { key: 'formText', label: 'Texto dos formulários' },
  { key: 'reviewText', label: 'Texto do resumo e confirmação da reserva' },
  { key: 'premiumBadgeText', label: 'Texto do selo Serviço premium' },
  { key: 'projectBackground', label: 'Fundo do projeto' },
  { key: 'subBackground', label: 'Subfundo de painéis e conteúdos' },
];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefix = number.slice(0, 5);
  const suffix = number.slice(5, 9);

  return `(${areaCode}${digits.length >= 2 ? ')' : ''}${digits.length > 2 ? ` ${prefix}` : ''}${digits.length > 7 ? `-${suffix}` : ''}`;
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(emptySettings);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const nextSettings = await getBusinessSettings();
        setSettings({
          ...nextSettings,
          theme_colors: { ...defaultThemeColors, ...nextSettings.theme_colors },
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
      }
    };
    void load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    try {
      setSettings(await saveBusinessSettings(settings));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as configurações.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#d4af6b]">Branding</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Personalização da barbearia</h2>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-800 bg-[#11161d] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm text-stone-300">
            Nome da barbearia
            <input value={settings.business_name} onChange={(event) => setSettings({ ...settings, business_name: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Slogan
            <input value={settings.slogan} onChange={(event) => setSettings({ ...settings, slogan: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Logotipo (URL)
            <input value={settings.logo_url} onChange={(event) => setSettings({ ...settings, logo_url: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Capa (URL)
            <input value={settings.cover_url} onChange={(event) => setSettings({ ...settings, cover_url: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Endereço
            <input value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Telefone
            <input
              type="tel"
              value={formatPhone(settings.phone)}
              onChange={(event) => setSettings({ ...settings, phone: formatPhone(event.target.value) })}
              placeholder="(51) 99366-7248"
              inputMode="numeric"
              maxLength={15}
              className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm text-stone-300">
            WhatsApp
            <input value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300">
            Instagram
            <input value={settings.instagram} onChange={(event) => setSettings({ ...settings, instagram: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-stone-300 md:col-span-2">
            Horário de funcionamento
            <input value={settings.opening_hours} onChange={(event) => setSettings({ ...settings, opening_hours: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white" />
          </label>
        </div>
        <fieldset className="mt-8">
          <legend className="text-lg font-semibold text-white">Personalizar cores do projeto</legend>
          <p className="mt-1 text-sm text-stone-400">Clique no quadrado ao lado de cada item para escolher uma cor.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themeColorFields.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-stone-300">
                <span>{label}</span>
                <input
                  type="color"
                  value={settings.theme_colors[key]}
                  aria-label={`Escolher cor: ${label}`}
                  onChange={(event) => setSettings({
                    ...settings,
                    theme_colors: { ...settings.theme_colors, [key]: event.target.value },
                  })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-stone-600 bg-transparent p-0.5"
                />
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        {saved && <p role="status" className="mt-4 text-sm text-emerald-300">Configurações salvas.</p>}
        <button type="submit" className="mt-6 rounded-xl bg-[#d4af6b] px-4 py-3 font-semibold text-[#0a0d10]">Salvar configurações</button>
      </form>
    </div>
  );
}
