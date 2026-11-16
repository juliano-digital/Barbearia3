import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, signInAdmin } from '../lib/supabase';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@barbearia.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signInAdmin(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message ?? 'Não foi possível entrar.');
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0d10] px-4 py-12 text-stone-100">
      <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-[#11161d] p-8 shadow-soft">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d4af6b] text-2xl font-bold text-[#0a0d10]">RB</div>
          <h1 className="mt-5 text-3xl font-semibold text-white">Área administrativa</h1>
          <p className="mt-2 text-sm text-stone-400">Acesse o painel para gerenciar agenda e serviços.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-stone-300">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none"
              placeholder="admin@barbearia.com"
            />
          </label>

          <label className="block text-sm text-stone-300">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af6b] px-4 py-3 font-semibold text-[#0a0d10] disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {loading ? 'Entrando...' : 'Entrar'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-950 p-4 text-sm text-stone-300">
          <div className="flex items-center gap-2 text-[#f6e5b3]">
            <LockKeyhole className="h-4 w-4" />
            Acesso restrito a administradores.
          </div>
          <p className="mt-2 text-stone-400">Em produção, o primeiro administrador deve ser criado por processo controlado no Supabase Auth.</p>
        </div>
      </div>
    </div>
  );
}
