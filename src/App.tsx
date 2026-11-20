import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { BrowserRouter, Link } from 'react-router-dom';
import { CalendarRange, LayoutDashboard, LogOut, Scissors, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminBarbersPage } from './pages/AdminBarbersPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminServicesPage } from './pages/AdminServicesPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { isAdminAuthenticated, signOutAdmin } from './lib/supabase';
import { PwaExperience } from './components/PwaExperience';
import { AdminPwaExperience } from './components/AdminPwaExperience';
import brandIcon from './assets/icon/192.png';

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', mobileLabel: 'Painel', icon: LayoutDashboard },
  { to: '/admin/agendamentos', label: 'Agenda', mobileLabel: 'Agenda', icon: CalendarRange },
  { to: '/admin/servicos', label: 'Serviços', mobileLabel: 'Serviços', icon: Scissors },
  { to: '/admin/barbeiros', label: 'Barbeiros', mobileLabel: 'Equipe', icon: Users },
  { to: '/admin/configuracoes', label: 'Configurações', mobileLabel: 'Ajustes', icon: Settings },
];

function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (!isAdminAuthenticated()) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  if (!ready || !isAdminAuthenticated()) {
    return null;
  }

  const handleSignOut = async () => {
    await signOutAdmin();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-stone-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-stone-800 bg-[#12161d] p-6 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <img src={brandIcon} alt="Royal Barber" className="h-11 w-11 rounded-xl object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Admin</p>
            <h2 className="text-lg font-semibold text-white">Royal Barber</h2>
          </div>
        </div>
        <nav className="space-y-2">
          {adminNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isActive ? 'bg-[#d4af6b] text-[#0b0d11]' : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 px-4 py-3 text-sm text-stone-200 transition hover:border-stone-500 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      <main className="pb-20 lg:ml-72 lg:pb-0">
        <header className="border-b border-stone-800 bg-[#0f1217]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Painel administrativo</p>
              <h1 className="text-xl font-semibold text-white">Controle da barbearia</h1>
            </div>
            <div className="lg:hidden">
              <Link to="/" className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-200">
                Ver loja
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>

      <nav
        aria-label="Navegação administrativa"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-stone-800 bg-[#12161d]/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden"
      >
        {adminNav.map(({ to, mobileLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={mobileLabel}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4af6b] ${
                isActive ? 'text-[#d4af6b]' : 'text-stone-400 hover:text-white'
              }`
            }
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span>{mobileLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <PwaExperience />
      <AdminPwaExperience />
      <Routes>
        <Route path="/" element={<PublicBookingPage />} />
        <Route path="/agendar" element={<PublicBookingPage />} />
        <Route path="/servicos" element={<PublicBookingPage />} />
        <Route path="/barbeiros" element={<PublicBookingPage />} />
        <Route path="/contato" element={<PublicBookingPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminLayout>
              <AdminDashboardPage />
            </ProtectedAdminLayout>
          }
        />
        <Route
          path="/admin/agendamentos"
          element={
            <ProtectedAdminLayout>
              <AdminBookingsPage />
            </ProtectedAdminLayout>
          }
        />
        <Route
          path="/admin/servicos"
          element={
            <ProtectedAdminLayout>
              <AdminServicesPage />
            </ProtectedAdminLayout>
          }
        />
        <Route
          path="/admin/barbeiros"
          element={
            <ProtectedAdminLayout>
              <AdminBarbersPage />
            </ProtectedAdminLayout>
          }
        />
        <Route
          path="/admin/configuracoes"
          element={
            <ProtectedAdminLayout>
              <AdminSettingsPage />
            </ProtectedAdminLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
