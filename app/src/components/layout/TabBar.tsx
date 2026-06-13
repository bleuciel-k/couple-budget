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
    <div
      className="flex justify-around items-center bg-[var(--color-paper)] pb-6 pt-2 shrink-0"
      style={{ boxShadow: '0 -12px 26px rgba(31,42,68,0.06)', zIndex: 1 }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1 min-w-[44px] transition-opacity"
            style={{ opacity: active ? 1 : 0.45 }}
          >
            <div
              className="w-8 h-7 rounded flex items-center justify-center"
              style={{
                background: active ? 'var(--color-accent)' : 'transparent',
                boxShadow: active ? 'var(--shadow-button)' : 'none',
              }}
            >
              <Icon size={15} strokeWidth={2} color={active ? '#fff' : 'var(--color-ink)'} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink)' }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
