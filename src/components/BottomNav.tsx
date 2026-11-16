import { CalendarCheck, Phone, Scissors, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/agendar', label: 'Agendar', icon: CalendarCheck, primary: true },
  { to: '/servicos', label: 'Serviços', icon: Scissors },
  { to: '/barbeiros', label: 'Barbeiros', icon: Users },
  { to: '/contato', label: 'Contato', icon: Phone },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgba(201,169,107,0.25)] bg-ink/90 backdrop-blur-xl md:hidden"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-lg">
        {items.map(({ to, label, icon: Icon, primary }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `group relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E3C98F] active:scale-95 ${
                isActive ? 'text-gold' : 'text-[#8A8578] hover:text-[#E3C98F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-0.5 w-8 rounded-full bg-gold shadow-[0_0_10px_rgba(201,169,107,0.7)] transition-all duration-200 ${
                    isActive ? 'opacity-100' : 'scale-x-50 opacity-0'
                  }`}
                />
                <span
                  className={
                    primary
                      ? `relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink shadow-[0_0_18px_rgba(201,169,107,0.35)] transition duration-200 group-hover:bg-[#E3C98F] ${
                          isActive ? 'ring-2 ring-[#E3C98F] ring-offset-2 ring-offset-ink' : ''
                        }`
                      : 'relative flex h-6 items-center justify-center'
                  }
                >
                  {primary && isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-gold/30 blur-md"
                    />
                  )}
                  <Icon
                    aria-hidden="true"
                    className={primary ? 'relative h-5 w-5' : 'h-5 w-5'}
                    strokeWidth={1.5}
                  />
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
