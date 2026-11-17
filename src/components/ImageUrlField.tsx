import { useRef, useState } from 'react';
import { uploadImage } from '../lib/supabase';

interface ImageUrlFieldProps {
  label: string;
  folder: string;
  value: string;
  onChange: (value: string) => void;
}

export function ImageUrlField({ label, folder, value, onChange }: ImageUrlFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : '';
      setError(
        message.toLowerCase().includes('bucket not found')
          ? 'Armazenamento de imagens não configurado. Aplique a migração 008 no Supabase.'
          : message || 'Não foi possível carregar a imagem.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm text-stone-300">
        {label}
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white"
        />
      </label>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleFileChange(event)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="mt-2 rounded-full border border-stone-700 px-3 py-1.5 text-xs text-white transition hover:border-stone-500 disabled:cursor-wait disabled:opacity-60"
      >
        {uploading ? 'Carregando imagem...' : 'Buscar imagem no aparelho'}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
