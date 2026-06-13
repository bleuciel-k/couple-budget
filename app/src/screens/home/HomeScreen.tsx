import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Plus, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/layout/TopBar';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { Pill } from '../../components/ui/Pill';
import { useStore } from '../../store';
import { CATEGORIES } from '../../store/data';
import type { Transaction, User } from '../../types';
import { getActiveYearMonth, isInYearMonth } from '../../utils/finance';

type ViewMode = 'calendar' | 'timeline';
type TimelineFilter = 'all' | 'shared' | 'me' | 'partner';
type PayerFilter = 'all' | 'me' | 'partner';
type WalletFilter = 'all' | 'shared' | 'personal';
type TypeFilter = 'all' | Transaction['type'];

interface CalendarFilters {
  payer: PayerFilter;
  wallet: WalletFilter;
  type: TypeFilter;
  categoryId: 'all' | string;
}

const DEFAULT_FILTERS: CalendarFilters = {
  payer: 'all',
  wallet: 'all',
  type: 'all',
  categoryId: 'all',
};

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];

function filterTransactions(transactions: Transaction[], filters: CalendarFilters, users: User[]) {
  const me = users.find((u) => u.role === 'me') ?? users[0];
  const otherIds = users.filter((u) => u.id !== me?.id).map((u) => u.id);
  return transactions.filter((t) => {
    if (filters.payer === 'me' && t.paidBy !== me?.id) return false;
    if (filters.payer === 'partner' && !otherIds.includes(t.paidBy)) return false;
    if (filters.wallet !== 'all' && t.walletType !== filters.wallet) return false;
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) return false;
    return true;
  });
}

function hasActiveFilters(filters: CalendarFilters) {
  return (
    filters.payer !== 'all' ||
    filters.wallet !== 'all' ||
    filters.type !== 'all' ||
    filters.categoryId !== 'all'
  );
}

function formatSignedAmount(t: Transaction) {
  const sign = t.type === 'income' ? '+' : '-';
  return `${sign}${formatKRW(t.amount)}`;
}

// ── Budget Strip ──────────────────────────────
function BudgetStrip({ compact, transactions }: { compact?: boolean; transactions: Transaction[] }) {
  const { budget } = useStore();
  const activeYearMonth = getActiveYearMonth(transactions, budget.yearMonth);
  const monthTransactions = transactions.filter((t) => isInYearMonth(t.date, activeYearMonth));
  const totalSpent = transactions
    .filter((t) => t.type === 'expense' && isInYearMonth(t.date, activeYearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget.totalBudget - totalSpent;

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{ background: 'var(--color-paper)', boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}
      >
        <div className="flex-1">
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            이번 달 함께 지출
          </div>
          <div className="text-lg font-bold">-{formatKRW(totalSpent)}원</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            예산 남은
          </div>
          <div className="text-lg font-semibold" style={{ color: remaining > 0 ? '#1677c9' : 'var(--color-accent)' }}>
            {formatKRW(remaining)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2 px-4 py-3"
      style={{ boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}
    >
      <div
        className="flex-1 rounded-xl px-3 py-2"
        style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
      >
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>수입</div>
        <div className="text-lg font-semibold">+ {formatKRW(totalIncome)}</div>
      </div>
      <div
        className="flex-1 rounded-xl px-3 py-2"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
      >
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>지출</div>
        <div className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          - {formatKRW(totalSpent)}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW A — Calendar
// ══════════════════════════════════════════════
function CalendarGrid({
  selectedDay,
  onSelectDay,
  transactions,
  activeYearMonth,
  users,
}: {
  selectedDay: number;
  onSelectDay: (d: number) => void;
  transactions: Transaction[];
  activeYearMonth: string;
  users: User[];
}) {
  const [year, month] = activeYearMonth.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const prevLastDate = new Date(year, month - 1, 0).getDate();
  const cells = Array.from({ length: 35 }, (_, i) => {
    const day = i - first.getDay() + 1;
    if (day < 1) return { day: prevLastDate + day, outOfMonth: true };
    if (day > lastDate) return { day: day - lastDate, outOfMonth: true };
    return { day, outOfMonth: false };
  });
  const cal = Array.from({ length: 5 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const spendsByDay: Record<number, string[]> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (isInYearMonth(t.date, activeYearMonth)) {
      const day = d.getDate();
      const who = users.find((u) => u.id === t.paidBy)?.avatarLetter ?? '?';
      spendsByDay[day] = [...(spendsByDay[day] || []), who];
    }
  });

  return (
    <>
      <div
        className="grid grid-cols-7 px-2 py-1 text-xs text-center font-mono"
        style={{ color: 'var(--color-muted)' }}
      >
        {DAY_NAMES_KO.map((d, i) => (
          <div
            key={i}
            style={{ color: i === 0 ? 'var(--color-accent)' : i === 6 ? '#2f80ed' : undefined }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid shrink-0"
        style={{
          gridTemplateRows: 'repeat(5, 1fr)',
          height: 'clamp(260px, 36vh, 305px)',
          borderTop: '1px solid var(--color-faint)',
        }}
      >
        {cal.map((row, ri) => (
          <div
            key={ri}
            className="grid grid-cols-7"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            {row.map(({ day, outOfMonth }, ci) => {
              const isSelected = day === selectedDay && !outOfMonth;
              const dots = spendsByDay[day] || [];

              return (
                <button
                  key={ci}
                  onClick={() => !outOfMonth && onSelectDay(day)}
                  className="px-1.5 py-1 relative text-left transition-colors"
                  style={{
                    borderRight: ci < 6 ? '1px dotted var(--color-faint)' : 'none',
                    opacity: outOfMonth ? 0.3 : 1,
                    background: isSelected ? 'rgba(47,128,237,0.12)' : 'transparent',
                  }}
                >
                  <div
                    className="text-sm"
                    style={{
                      color: ci === 0 ? 'var(--color-accent)' : ci === 6 ? '#2f80ed' : 'var(--color-ink)',
                      fontWeight: isSelected ? 700 : 500,
                    }}
                  >
                    {day}
                  </div>
                  {!outOfMonth && dots.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                      {dots.slice(0, 3).map((o, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: o === 'J' ? 'var(--color-accent)' : 'var(--color-accent2)',
                            border: '0',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function DayDetail({
  day,
  transactions,
  activeYearMonth,
  users,
}: {
  day: number;
  transactions: Transaction[];
  activeYearMonth: string;
  users: User[];
}) {
  const navigate = useNavigate();
  const [year, month] = activeYearMonth.split('-').map(Number);
  const dayTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return isInYearMonth(t.date, activeYearMonth) && d.getDate() === day;
  });

  if (dayTxs.length === 0) return null;

  const dayDate = new Date(year, month - 1, day);
  const dayName = DAY_NAMES_KO[dayDate.getDay()];

  return (
    <div
      className="mx-3 mb-3 rounded-2xl px-3 py-3"
      style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base font-semibold">
          {month}월 {day}일 ({dayName})
        </span>
        <div className="flex-1" />
        <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {dayTxs.length}건
        </span>
      </div>

      <div className="max-h-[116px] overflow-y-auto">
      {dayTxs.map((t, i) => {
        const user = users.find((u) => u.id === t.paidBy) ?? users[0];
        const cat = catMap[t.categoryId];
        return (
          <button
            key={t.id}
            onClick={() => navigate(`/add?tx=${t.id}`)}
            className="flex items-center gap-2 py-1.5 w-full text-left"
            style={{
              borderBottom: i < dayTxs.length - 1 ? '1px dotted var(--color-faint)' : 'none',
            }}
          >
            <Avatar letter={user.avatarLetter} tone={user.tone} size={24} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.title}</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                {cat?.emoji} {cat?.name}
              </div>
            </div>
            <div className="text-sm font-semibold">{formatSignedAmount(t)}</div>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function CalendarView({
  selectedDay,
  setSelectedDay,
  transactions,
  filtered,
  activeYearMonth,
  users,
}: {
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  transactions: Transaction[];
  filtered: boolean;
  activeYearMonth: string;
  users: User[];
}) {
  const me = users.find((u) => u.role === 'me') ?? users[0];
  return (
    <>
      <BudgetStrip transactions={transactions} />
      <div className="flex items-center gap-2 px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <Avatar letter={me?.avatarLetter ?? 'N'} tone={me?.tone ?? 'accent'} size={22} />
          <span className="text-sm font-medium">
            {me?.name ?? '나'}
            <span style={{ color: 'var(--color-muted)' }}> (나)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 min-w-0">
          <div className="flex">
            {users.filter((u) => u.id !== me?.id).slice(0, 3).map((user) => (
              <Avatar key={user.id} letter={user.avatarLetter} tone={user.tone} size={22} className="-ml-1 first:ml-0" />
            ))}
          </div>
          <span className="text-sm font-medium truncate">
            {users.length > 1 ? `멤버 ${users.length - 1}명` : '멤버 추가 필요'}
          </span>
        </div>
        <div className="flex-1" />
        <Pill tone={filtered ? 'accent' : 'neutral'}>{filtered ? '필터 적용' : '전체'}</Pill>
      </div>
      <CalendarGrid
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        transactions={transactions}
        activeYearMonth={activeYearMonth}
        users={users}
      />
      <DayDetail day={selectedDay} transactions={transactions} activeYearMonth={activeYearMonth} users={users} />
    </>
  );
}

// ══════════════════════════════════════════════
// VIEW B — Timeline
// ══════════════════════════════════════════════
function TimelineView({ transactions, users }: { transactions: Transaction[]; users: User[] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const me = users.find((u) => u.role === 'me') ?? users[0];
  const otherIds = users.filter((u) => u.id !== me?.id).map((u) => u.id);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === 'shared') return t.walletType === 'shared';
      if (filter === 'me') return t.paidBy === me?.id;
      if (filter === 'partner') return otherIds.includes(t.paidBy);
      return true;
    });
  }, [transactions, filter, me?.id, otherIds]);

  // Group by date (YYYY-MM-DD)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const key = t.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const filters: { id: TimelineFilter; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'shared', label: '공동' },
    { id: 'me', label: me?.name ?? '나' },
    { id: 'partner', label: '다른 멤버' },
  ];

  function formatDayLabel(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    const dayName = DAY_NAMES_KO[d.getDay()];
    const mmdd = `${d.getMonth() + 1}/${d.getDate()}`;
    if (diff === 0) return `오늘 · ${mmdd} ${dayName}`;
    if (diff === 1) return `어제 · ${mmdd} ${dayName}`;
    return `${mmdd} ${dayName}`;
  }

  return (
    <>
      <BudgetStrip compact transactions={transactions} />
      <div className="flex gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-faint)' }}>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1 rounded-full text-sm font-medium transition-all"
            style={{
              background: filter === f.id ? 'var(--color-accent)' : 'var(--color-paper)',
              color: filter === f.id ? '#fff' : 'var(--color-muted)',
              border: '1px solid var(--color-line)',
              boxShadow: filter === f.id ? 'var(--shadow-button)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-10 font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            해당 내역이 없어요
          </div>
        )}
        {groups.map(([dateStr, txs]) => {
          const dayTotal = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          return (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  {formatDayLabel(dateStr)}
                </span>
                <div className="flex-1" style={{ borderTop: '1.2px dotted var(--color-faint)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {dayTotal >= 0 ? '+' : '-'}{formatKRW(Math.abs(dayTotal))}
                </span>
              </div>
              <div
                className="rounded-xl overflow-hidden px-3"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              >
                {txs.map((t, i) => {
                  const user = users.find((u) => u.id === t.paidBy) ?? users[0];
                  const cat = catMap[t.categoryId];
                  const isShared = t.walletType === 'shared';
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/add?tx=${t.id}`)}
                      className="flex items-center gap-3 py-3 w-full text-left"
                      style={{ borderBottom: i < txs.length - 1 ? '1px dotted var(--color-faint)' : 'none' }}
                    >
                      <Avatar letter={user.avatarLetter} tone={user.tone} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{t.title}</span>
                          {isShared && t.split.splitType === 'half' && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(47,128,237,0.12)',
                                border: '1px solid var(--color-line)',
                                color: 'var(--color-accent)',
                              }}
                            >
                              1/2
                            </span>
                          )}
                          {isShared && t.split.splitType !== 'half' && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(122,163,217,0.15)',
                                border: '1px solid var(--color-line)',
                                color: '#2f80ed',
                              }}
                            >
                              공동
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {cat?.emoji} {cat?.name}
                          {t.memo ? ` · ${t.memo}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold">{formatSignedAmount(t)}</div>
                        {isShared && (
                          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                            내 몫 {formatKRW(t.split.myAmount)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="h-4" />
      </div>
    </>
  );
}

function MenuSheet({
  onClose,
  onSelectView,
}: {
  onClose: () => void;
  onSelectView: (view: ViewMode) => void;
}) {
  const navigate = useNavigate();
  const { transactions, goals, settlements } = useStore();
  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const actions = [
    { label: '달력 보기', hint: '월별 지출 흐름', action: () => onSelectView('calendar') },
    { label: '목록 보기', hint: '거래를 빠르게 수정', action: () => onSelectView('timeline') },
    { label: '리포트', hint: '월간 분석과 예산', action: () => navigate('/report') },
    { label: '정산', hint: `${settlements.length}개 완료 기록`, action: () => navigate('/settle') },
    { label: '목표', hint: `${goals.length}개 목표`, action: () => navigate('/goals') },
    { label: '설정', hint: '분담, 예산, 백업', action: () => navigate('/settings') },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(31,42,68,0.26)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl px-4 pt-4 pb-8"
        style={{ background: 'var(--color-paper)', boxShadow: '0 -18px 42px rgba(31,42,68,0.16)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-3">
          <div className="flex-1">
            <div className="text-lg font-semibold">메뉴</div>
            <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              이번 달 지출 {formatKRW(totalSpent)}원
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="rounded-2xl px-3 py-3 text-left"
              style={{ background: 'rgba(47,128,237,0.08)', border: '1px solid var(--color-line)' }}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
                {item.hint}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchSheet({ transactions, users, onClose }: { transactions: Transaction[]; users: User[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return transactions.slice(0, 8);
    return transactions.filter((t) => {
      const cat = catMap[t.categoryId];
      return [
        t.title,
        t.memo ?? '',
        cat?.name ?? '',
        cat?.emoji ?? '',
        String(t.amount),
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [normalized, transactions]);

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'var(--color-paper)' }}>
      <div className="px-4 pt-12 pb-3" style={{ boxShadow: '0 10px 24px rgba(31,42,68,0.05)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2.5"
            style={{ background: 'rgba(47,128,237,0.08)', border: '1px solid var(--color-line)' }}
          >
            <Search size={18} color="var(--color-muted)" />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-base"
              placeholder="금액, 제목, 메모, 카테고리 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={onClose} className="w-10 h-10 grid place-items-center">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="px-4 py-4 overflow-y-auto h-[calc(100vh-96px)]">
        <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>
          {normalized ? `${results.length}건 검색됨` : '최근 거래'}
        </div>
        <div className="flex flex-col gap-2">
          {results.map((t) => {
            const cat = catMap[t.categoryId];
            const payer = users.find((u) => u.id === t.paidBy) ?? users[0];
            return (
              <button
                key={t.id}
                onClick={() => {
                  navigate(`/add?tx=${t.id}`);
                  onClose();
                }}
                className="rounded-2xl px-3 py-3 text-left flex items-center gap-3"
                style={{ background: 'var(--color-paper)', border: '1px solid var(--color-line)' }}
              >
                <Avatar letter={payer.avatarLetter} tone={payer.tone} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {cat?.emoji} {cat?.name} · {new Date(t.date).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: t.type === 'income' ? '#1677c9' : 'var(--color-accent)' }}>
                  {formatSignedAmount(t)}
                </div>
              </button>
            );
          })}
          {results.length === 0 && (
            <div className="py-12 text-center text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
              검색 결과가 없어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSheet({
  filters,
  users,
  onChange,
  onReset,
  onClose,
}: {
  filters: CalendarFilters;
  users: User[];
  onChange: (filters: CalendarFilters) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const me = users.find((u) => u.role === 'me') ?? users[0];
  const set = (updates: Partial<CalendarFilters>) => onChange({ ...filters, ...updates });
  const pillStyle = (active: boolean) => ({
    background: active ? 'var(--color-accent)' : 'var(--color-paper)',
    color: active ? '#fff' : 'var(--color-ink)',
    border: '1px solid var(--color-line)',
    boxShadow: active ? 'var(--shadow-button)' : 'none',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(31,42,68,0.26)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl px-4 pt-4 pb-8"
        style={{ background: 'var(--color-paper)', boxShadow: '0 -18px 42px rgba(31,42,68,0.16)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <div className="text-lg font-semibold">필터</div>
            <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              달력과 목록의 거래 표시를 조정해요
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>결제자</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['all', '전체'],
                ['me', me?.name ?? '나'],
                ['partner', '다른 멤버'],
              ].map(([value, label]) => (
                <button key={value} className="rounded-xl py-2 text-sm font-medium" style={pillStyle(filters.payer === value)} onClick={() => set({ payer: value as PayerFilter })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>범위</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['all', '전체'],
                ['shared', '공동'],
                ['personal', '개인'],
              ].map(([value, label]) => (
                <button key={value} className="rounded-xl py-2 text-sm font-medium" style={pillStyle(filters.wallet === value)} onClick={() => set({ wallet: value as WalletFilter })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>유형</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                ['all', '전체'],
                ['expense', '지출'],
                ['income', '수입'],
                ['transfer', '이체'],
              ].map(([value, label]) => (
                <button key={value} className="rounded-xl py-2 text-sm font-medium" style={pillStyle(filters.type === value)} onClick={() => set({ type: value as TypeFilter })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>카테고리</div>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              <button className="rounded-xl py-2 text-sm font-medium" style={pillStyle(filters.categoryId === 'all')} onClick={() => set({ categoryId: 'all' })}>
                전체
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="rounded-xl py-2 text-sm font-medium"
                  style={pillStyle(filters.categoryId === cat.id)}
                  onClick={() => set({ categoryId: cat.id })}
                >
                  <span className="block text-lg">{cat.emoji}</span>
                  <span className="text-[11px]">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onReset}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ border: '1px solid var(--color-line)', color: 'var(--color-muted)' }}
            >
              초기화
            </button>
            <button
              onClick={onClose}
              className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--color-accent)', boxShadow: 'var(--shadow-button)' }}
            >
              적용하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Main HomeScreen
// ══════════════════════════════════════════════
export function HomeScreen() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [selectedDay, setSelectedDay] = useState(22);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const navigate = useNavigate();
  const { transactions, budget, users } = useStore();
  const filtered = hasActiveFilters(filters);
  const visibleTransactions = useMemo(
    () => filterTransactions(transactions, filters, users),
    [transactions, filters, users]
  );
  const activeYearMonth = getActiveYearMonth(transactions, budget.yearMonth);
  const [activeYear, activeMonth] = activeYearMonth.split('-');
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = currentYearMonth === activeYearMonth;
  const subtitleEndDay = isCurrentMonth ? today.getDate() : new Date(Number(activeYear), Number(activeMonth), 0).getDate();

  const topBarProps = {
    calendar: {
      title: `${Number(activeMonth)}월 ▾`,
      subtitle: '함께하는 달력',
      right: (
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(true)} aria-label="거래 검색">
            <Search size={18} color="var(--color-ink)" />
          </button>
          <button onClick={() => setShowFilters(true)} aria-label="거래 필터">
            <SlidersHorizontal size={18} color={filtered ? 'var(--color-accent)' : 'var(--color-ink)'} />
          </button>
        </div>
      ),
    },
    timeline: {
      title: '이번 달',
      subtitle: `${Number(activeMonth)}월 1일 → ${subtitleEndDay}일`,
      right: (
        <div className="flex items-center gap-2">
          <button onClick={() => setView('calendar')} aria-label="달력 보기">
            <Calendar size={18} color="var(--color-ink)" />
          </button>
          <button onClick={() => setShowFilters(true)} aria-label="거래 필터">
            <SlidersHorizontal size={18} color={filtered ? 'var(--color-accent)' : 'var(--color-ink)'} />
          </button>
        </div>
      ),
    },
  } as const;

  const { title, subtitle, right } = topBarProps[view];

  return (
    <Screen>
      <TopBar
        title={title}
        subtitle={subtitle}
        left={
          <button onClick={() => setShowMenu(true)} aria-label="메뉴 열기">
            <div className="flex flex-col gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-0.5 rounded"
                  style={{ width: i === 1 ? 14 : 18, background: 'var(--color-ink)' }}
                />
              ))}
            </div>
          </button>
        }
        right={right}
      />

      {view === 'calendar' && (
        <CalendarView
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          transactions={visibleTransactions}
          filtered={filtered}
          activeYearMonth={activeYearMonth}
          users={users}
        />
      )}
      {view === 'timeline' && <TimelineView transactions={visibleTransactions} users={users} />}

      {/* FAB */}
      <button
        onClick={() => {
          const selectedDate = `${activeYearMonth}-${String(selectedDay).padStart(2, '0')}`;
          navigate(`/add?date=${selectedDate}`);
        }}
        className="absolute flex items-center justify-center rounded-full transition-all active:scale-90"
        style={{
          right: 20,
          bottom: 96,
          width: 56,
          height: 56,
          background: 'var(--color-accent)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-button)',
          color: '#fff',
          zIndex: 10,
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showMenu && (
        <MenuSheet
          onClose={() => setShowMenu(false)}
          onSelectView={setView}
        />
      )}
      {showSearch && (
        <SearchSheet
          transactions={transactions}
          users={users}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showFilters && (
        <FilterSheet
          filters={filters}
          users={users}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Screen>
  );
}
