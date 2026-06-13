import { useRef, useState, useMemo } from 'react';
import { Share2, Pencil, BarChart2, PieChart, Target, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/layout/TopBar';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useStore } from '../../store';
import { USERS, CATEGORIES } from '../../store/data';
import type { Transaction } from '../../types';
import { calculateSettlement, isInYearMonth } from '../../utils/finance';

type SubTab = 'report' | 'analysis' | 'budget';

const me = USERS.find((u) => u.role === 'me')!;
const partner = USERS.find((u) => u.role === 'partner')!;

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${Number(month)}월`;
}

function getRemainingDaysText(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const today = new Date();
  const selectedIsCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = new Date(year, month, 0).getDate();
  if (!selectedIsCurrent) return `${lastDay}일 기준`;
  return `${Math.max(lastDay - today.getDate(), 0)}일 남음`;
}

function MonthPickerButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (yearMonth: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (pickerInput.showPicker) {
      pickerInput.showPicker();
      return;
    }
    pickerInput.click();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="h-10 w-10 rounded-full grid place-items-center transition-all active:scale-95"
        style={{
          background: 'rgba(47,128,237,0.1)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-soft)',
        }}
        aria-label="리포트 월 선택"
      >
        <Calendar size={19} color="var(--color-ink)" />
      </button>
      <input
        ref={inputRef}
        type="month"
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className="absolute inset-0 h-10 w-10 opacity-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

// ── Sub Tab Bar ───────────────────────────────
function SubTabBar({ tab, onChange }: { tab: SubTab; onChange: (t: SubTab) => void }) {
  const tabs: { id: SubTab; label: string; icon: typeof BarChart2 }[] = [
    { id: 'report', label: '리포트', icon: BarChart2 },
    { id: 'analysis', label: '분석', icon: PieChart },
    { id: 'budget', label: '예산', icon: Target },
  ];
  return (
    <div
      className="flex gap-1 px-4 py-2"
      style={{ background: 'var(--color-paper)', boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--color-muted)',
              border: active ? '1px solid var(--color-line)' : '1px solid transparent',
              boxShadow: active ? 'var(--shadow-button)' : 'none',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 1 — Monthly Report
// ══════════════════════════════════════════════
function getWeekNumber(date: string) {
  const d = new Date(date);
  const day = d.getDate();
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
}

function ReportTab({ transactions, yearMonth }: { transactions: Transaction[]; yearMonth: string }) {
  const navigate = useNavigate();
  const { users } = useStore();
  const reportMonth = Number(yearMonth.split('-')[1]);
  const expenses = transactions.filter((t) => t.type === 'expense');
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const myPaid = expenses.filter((t) => t.paidBy === me.id).reduce((s, t) => s + t.amount, 0);
  const partnerPaid = expenses.filter((t) => t.paidBy === partner.id).reduce((s, t) => s + t.amount, 0);
  const myPct = total > 0 ? Math.round((myPaid / total) * 100) : 50;
  const partnerPct = 100 - myPct;

  const { abs: settlement, owes, owed } = calculateSettlement(transactions, undefined, users);

  const weeklyData = [
    { w: '1주', j: 0, m: 0 },
    { w: '2주', j: 0, m: 0 },
    { w: '3주', j: 0, m: 0 },
    { w: '4주', j: 0, m: 0 },
  ];
  expenses.forEach((t) => {
    const wk = getWeekNumber(t.date);
    if (t.paidBy === me.id) weeklyData[wk].j += t.amount;
    else weeklyData[wk].m += t.amount;
  });

  const maxWeeklyVal = Math.max(...weeklyData.flatMap((w) => [w.j, w.m]), 1);
  const BAR_H = 100;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Headline */}
      <div
        className="rounded-2xl p-4"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
      >
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {reportMonth}월 함께 쓴 돈
        </div>
        <div className="text-4xl font-bold mt-1">
          {formatKRW(total)}
          <span className="text-xl font-normal" style={{ color: 'var(--color-muted)' }}> 원</span>
        </div>
        <div className="flex gap-4 mt-1.5">
          <span className="text-xs font-mono text-green-600">▼ 12% 지난달 대비</span>
          <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            평균 {formatKRW(Math.round(total / 22))}/일
          </span>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div
        className="rounded-2xl p-4"
        style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
      >
        <div className="flex justify-between items-baseline mb-3">
          <span className="font-semibold">주별 지출</span>
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3"
                style={{ background: 'var(--color-accent)', border: '1px solid var(--color-line)' }}
              />
              {me.name}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3"
                style={{ background: 'var(--color-accent2)', border: '1px solid var(--color-line)' }}
              />
              {partner.name}
            </span>
          </div>
        </div>
        <div
          className="flex gap-3 items-end px-1 pb-1"
          style={{ height: BAR_H + 36, borderBottom: '1px solid var(--color-line)' }}
        >
          {weeklyData.map((b, i) => {
            const jH = Math.round((b.j / maxWeeklyVal) * BAR_H);
            const mH = Math.round((b.m / maxWeeklyVal) * BAR_H);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex gap-1.5 items-end" style={{ height: BAR_H }}>
                  <div
                    style={{
                      width: 14,
                      height: jH || 2,
                      background: 'var(--color-accent)',
                      border: '1px solid var(--color-line)',
                    }}
                  />
                  <div
                    style={{
                      width: 14,
                      height: mH || 2,
                      background: 'var(--color-accent2)',
                      border: '1px solid var(--color-line)',
                    }}
                  />
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  {b.w}
                </span>
                {(b.j > 0 || b.m > 0) && (
                  <span className="text-xs font-mono" style={{ color: 'var(--color-muted)', fontSize: 9 }}>
                    {formatKRW(Math.round((b.j + b.m) / 1000))}K
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Who Paid */}
      <div
        className="rounded-2xl p-4"
        style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
      >
        <span className="font-semibold">누가 얼마 냈나</span>
        <div className="flex flex-col gap-3 mt-3">
          {[
            { user: me, amount: myPaid, pct: myPct },
            { user: partner, amount: partnerPaid, pct: partnerPct },
          ].map(({ user, amount, pct }) => (
            <div key={user.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar letter={user.avatarLetter} tone={user.tone} size={26} />
                <span className="flex-1 text-sm font-medium">{user.name}</span>
                <span className="font-semibold">{formatKRW(amount)}</span>
                <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--color-muted)' }}>
                  {pct}%
                </span>
              </div>
              <ProgressBar value={pct} color={user.tone} height={8} />
            </div>
          ))}
        </div>
      </div>

      {/* Settlement Hint */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(159,211,255,0.2)' }}
      >
        <span className="text-2xl">💸</span>
        <div className="flex-1">
          <div className="font-medium">
            {owes.name} → {owed.name} 정산
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            5:5 분담 기준
          </span>
        </div>
        <div className="text-xl font-bold">{formatKRW(settlement)}</div>
        <Button variant="filled" size="sm" onClick={() => navigate('/settle')}>정산</Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 2 — Category Analysis (donut chart)
// ══════════════════════════════════════════════
type CatFilter = 'shared' | 'me' | 'partner';

// SVG donut arc helper
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

const SLICE_COLORS = [
  'var(--color-accent)',
  'var(--color-accent2)',
  'rgba(122,163,217,0.85)',
  'rgba(159,211,255,0.2)',
  'rgba(255,200,100,0.85)',
  'rgba(200,180,255,0.85)',
];

function AnalysisTab({ transactions, yearMonth }: { transactions: Transaction[]; yearMonth: string }) {
  const [filter, setFilter] = useState<CatFilter>('shared');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (filter === 'shared') return t.walletType === 'shared';
      if (filter === 'me') return t.paidBy === me.id;
      if (filter === 'partner') return t.paidBy === partner.id;
      return true;
    });
  }, [transactions, filter]);

  const catTotals = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([id, amount]) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return { id, name: cat?.name ?? id, emoji: cat?.emoji ?? '', amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const grandTotal = catTotals.reduce((s, c) => s + c.amount, 0);

  const slices = useMemo(() => {
    const accumulated = { angle: 0 };
    return catTotals.map((c, i) => {
      const pct = grandTotal > 0 ? c.amount / grandTotal : 0;
      const span = pct * 360;
      const startDeg = accumulated.angle;
      const path = span > 0 ? describeArc(90, 90, 70, startDeg, startDeg + span) : '';
      accumulated.angle = startDeg + span;
      return { ...c, pct: Math.round(pct * 100), path, color: SLICE_COLORS[i % SLICE_COLORS.length] };
    });
  }, [catTotals, grandTotal]);

  const filters: { id: CatFilter; label: string }[] = [
    { id: 'shared', label: '공동' },
    { id: 'me', label: `${me.name}만` },
    { id: 'partner', label: `${partner.name}만` },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Filter */}
      <div className="flex gap-2">
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
        <div className="flex-1" />
        <span
          className="px-3 py-1 rounded-full text-sm font-mono"
          style={{
            border: '1px solid var(--color-line)',
            color: 'var(--color-muted)',
          }}
        >
          {formatYearMonth(yearMonth)}
        </span>
      </div>

      {/* Donut Chart */}
      <div className="flex flex-col items-center">
        <svg width={180} height={180} viewBox="0 0 180 180">
          {slices.length > 0 ? (
            slices.map((s, i) => (
              <path
                key={i}
                d={s.path}
                fill={s.color}
                stroke="var(--color-ink)"
                strokeWidth={1.5}
              />
            ))
          ) : (
            <circle cx={90} cy={90} r={70} fill="var(--color-faint)" stroke="var(--color-ink)" strokeWidth={1.5} />
          )}
          {/* Inner hole */}
          <circle cx={90} cy={90} r={34} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={1.5} />
          <text x={90} y={86} textAnchor="middle" fontSize={12} fill="var(--color-muted)" fontFamily="monospace">
            total
          </text>
          <text x={90} y={104} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--color-ink)">
            {grandTotal >= 1000 ? `${Math.round(grandTotal / 1000)}K` : formatKRW(grandTotal)}
          </text>
        </svg>
      </div>

      {/* Category List */}
      {slices.length === 0 ? (
        <div className="text-center py-6 text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
          해당 내역이 없어요
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden px-3"
          style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
        >
          {slices.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < slices.length - 1 ? '1px dotted var(--color-faint)' : 'none' }}
            >
              <div
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ background: c.color, border: '1px solid var(--color-line)' }}
              />
              <span className="text-sm flex-1">
                {c.emoji} {c.name}
              </span>
              <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--color-muted)' }}>
                {c.pct}%
              </span>
              <span className="text-sm font-semibold w-24 text-right">{formatKRW(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 3 — Budget Management
// ══════════════════════════════════════════════
function BudgetTab({ transactions, yearMonth }: { transactions: Transaction[]; yearMonth: string }) {
  const { budget, updateBudget } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const totalBudget = budget.totalBudget;
  const remaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Compute actual spent per category from transactions
  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount));
    return map;
  }, [transactions]);

  const catBudgets = budget.categoryBudgets.map((cb) => ({
    ...cb,
    realSpent: spentByCat.get(cb.categoryId) ?? cb.spentAmount,
    cat: CATEGORIES.find((c) => c.id === cb.categoryId),
  }));

  function startEdit(id: string, current: number) {
    setEditingId(id);
    setEditVal(String(current));
  }

  function commitEdit(categoryId: string) {
    const parsed = parseInt(editVal.replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const updated = {
        ...budget,
        categoryBudgets: budget.categoryBudgets.map((cb) =>
          cb.categoryId === categoryId ? { ...cb, budgetAmount: parsed } : cb
        ),
      };
      updateBudget(updated);
    }
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Total Budget Card */}
      <div
        className="rounded-2xl p-4"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{Number(yearMonth.split('-')[1])}월 총 예산</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: totalPct > 90 ? 'var(--color-accent)' : 'rgba(159,211,255,0.2)',
              color: totalPct > 90 ? '#fff' : '#1677c9',
              border: '1px solid var(--color-line)',
            }}
          >
            {totalPct}% 사용
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatKRW(totalSpent)}</span>
          <span className="text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
            / {formatKRW(totalBudget)} 원
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={totalPct} color="accent" height={12} />
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono">
          <span style={{ color: 'var(--color-muted)' }}>{getRemainingDaysText(yearMonth)}</span>
          <span style={{ color: remaining > 0 ? '#1677c9' : 'var(--color-accent)' }}>
            남은 금액 {formatKRW(remaining)}
          </span>
        </div>
      </div>

      {/* Category Budgets */}
      <div className="flex justify-between items-center">
        <span className="font-semibold">카테고리별</span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          함께 관리 중
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {catBudgets.map((cb) => {
          const pct = cb.budgetAmount > 0 ? Math.round((cb.realSpent / cb.budgetAmount) * 100) : 0;
          const over = pct >= 90;
          const isEditing = editingId === cb.categoryId;

          return (
            <div
              key={cb.categoryId}
              className="rounded-xl px-3 py-3"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold flex-1">
                  {cb.cat?.emoji} {cb.cat?.name}
                </span>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      className="w-24 text-right text-sm font-mono px-1 py-0.5 rounded"
                      style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(cb.categoryId)}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit(cb.categoryId)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(cb.categoryId, cb.budgetAmount)}
                    className="flex items-center gap-1 text-xs font-mono"
                    style={{ color: over ? 'var(--color-accent)' : 'var(--color-muted)' }}
                  >
                    {formatKRW(cb.realSpent)} / {formatKRW(cb.budgetAmount)}
                    <Pencil size={10} />
                  </button>
                )}
              </div>
              <ProgressBar
                value={pct}
                color={over ? 'accent' : 'accent2'}
                height={8}
              />
              {over && (
                <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-accent)' }}>
                  {pct > 100 ? `예산 초과 ${formatKRW(cb.realSpent - cb.budgetAmount)}` : `⚠ ${pct}% 사용 중`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Category button */}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium transition-all"
        style={{
          border: '1px dashed var(--color-line)',
          color: 'var(--color-muted)',
          background: 'transparent',
        }}
      >
        + 카테고리 예산 추가
      </button>

      <div className="h-4" />
    </div>
  );
}

// ══════════════════════════════════════════════
// Main ReportScreen
// ══════════════════════════════════════════════
export function ReportScreen() {
  const [tab, setTab] = useState<SubTab>('report');
  const [selectedYearMonth, setSelectedYearMonth] = useState(getCurrentYearMonth);
  const { transactions } = useStore();
  const monthTransactions = transactions.filter((t) => isInYearMonth(t.date, selectedYearMonth));

  return (
    <Screen scrollable>
      <TopBar
        title={tab === 'report' ? '월간 리포트' : tab === 'analysis' ? '카테고리 분석' : '공동 예산'}
        subtitle={formatYearMonth(selectedYearMonth)}
        left={<MonthPickerButton value={selectedYearMonth} onChange={setSelectedYearMonth} />}
        right={
          tab === 'report' ? (
            <button><Share2 size={18} color="var(--color-ink)" /></button>
          ) : tab === 'budget' ? (
            <button><Pencil size={18} color="var(--color-ink)" /></button>
          ) : undefined
        }
      />

      <SubTabBar tab={tab} onChange={setTab} />

      {tab === 'report' && <ReportTab transactions={monthTransactions} yearMonth={selectedYearMonth} />}
      {tab === 'analysis' && <AnalysisTab transactions={monthTransactions} yearMonth={selectedYearMonth} />}
      {tab === 'budget' && <BudgetTab transactions={monthTransactions} yearMonth={selectedYearMonth} />}
    </Screen>
  );
}
