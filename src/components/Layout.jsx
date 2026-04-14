import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const NAV = [
  {
    to: '/',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/analise',
    end: false,
    label: 'Nova Análise',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Layout({ user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await fetch('/api/auth?logout=1').catch(() => {});
    window.location.href = '/api/auth?logout=1';
  }

  const initial = (user?.name || user?.email || '?')[0].toUpperCase();

  return (
    <div className="flex min-h-screen bg-nibo-bg">

      {/* ── Overlay mobile ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          w-64 transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'linear-gradient(180deg,#002d72 0%,#3a1fa8 60%,#6431e2 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            N
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Nibo</p>
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">CS Auditor</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, end, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                transition-all duration-150
                ${isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.name || user?.email}
              </p>
              {user?.name && (
                <p className="text-white/50 text-[10px] truncate">{user?.email}</p>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12a9 9 0 0 0 9 9m0-18a9 9 0 0 0-9 9" strokeLinecap="round" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-nibo-petroleo hover:bg-slate-100 transition"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-bold text-nibo-petroleo text-sm">Nibo CS Auditor</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
