import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, BarChart2, Target, Settings } from 'lucide-react';

const TABS = [
  { path: '/', label: '달력', Icon: CalendarDays },
  { path: '/report', label: '리포트', Icon: BarChart2 },
  { path: '/goals', label: '목표', Icon: Target },
  { path: '/settings', label: '설정', Icon: Settings },
];

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="flex justify-around items-center bg-[var(--color-paper)] shrink-0 select-none z-20"
      style={{
        boxShadow: '0 -10px 24px rgba(31, 42, 68, 0.05)',
        paddingTop: '0.5rem',
        paddingBottom: 'max(1.15rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))',
      }}
      aria-label="하단 탭바"
    >
      {TABS.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1 min-w-[52px] py-0.5 cursor-pointer transition-all duration-200 active:scale-90"
            style={{ opacity: active ? 1 : 0.48 }}
            aria-label={label}
          >
            <div
              className="w-10 h-7 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: active ? 'var(--color-accent)' : 'transparent',
                boxShadow: active ? 'var(--shadow-button)' : 'none',
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.4 : 2}
                color={active ? '#fff' : 'var(--color-ink)'}
                className="transition-transform duration-200"
              />
            </div>
            <span
              className="text-[11px] font-medium transition-colors duration-200"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-ink)',
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
