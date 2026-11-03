import { useState } from 'react';
import { Plus, X, ChevronRight, Coins } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import { USERS } from '../../store/data';
import type { Goal, GoalOwner } from '../../types';

const me = USERS.find((u) => u.role === 'me')!;
const partner = USERS.find((u) => u.role === 'partner')!;

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type OwnerFilter = 'all' | 'couple' | 'me' | 'partner';

// ── Circular Progress Ring ────────────────────
function RingProgress({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const cx = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-faint)" strokeWidth={5} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Goal Card ─────────────────────────────────
function GoalCard({
  goal,
  onDeposit,
  onDetail,
}: {
  goal: Goal;
  onDeposit: (goal: Goal) => void;
  onDetail: (goal: Goal) => void;
}) {
  const pct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
  const days = goal.targetDate ? daysUntil(goal.targetDate) : null;
  const remaining = goal.targetAmount - goal.savedAmount;
  const done = pct >= 100;

  return (
    <div
      className="rounded-3xl p-4"
      style={{
        border: '1px solid var(--color-line)',
        background: done
          ? 'var(--color-accent-soft)'
          : goal.owner === 'me'
          ? 'var(--color-theme-me-soft)'
          : 'var(--color-paper)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <RingProgress pct={pct} size={56} />
          <div
            className="absolute inset-0 flex items-center justify-center text-xl"
            style={{ transform: 'none' }}
          >
            {goal.emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{goal.title}</span>
            {done && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
                style={{ background: 'var(--color-accent)', color: '#fff', fontSize: 11 }}
              >
                완료!
              </span>
            )}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {goal.targetDate && (
              <>
                {new Date(goal.targetDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                })}
                {days !== null && days > 0 && ` · D-${days}`}
                {days !== null && days <= 0 && ' · 기간 종료'}
              </>
            )}
          </div>
        </div>

        {/* Owner avatars */}
        <div className="flex items-center flex-shrink-0">
          {goal.owner === 'couple' && (
            <div className="flex">
              <Avatar letter={me.avatarLetter} tone={me.tone} size={22} />
              <Avatar letter={partner.avatarLetter} tone={partner.tone} size={22} className="-ml-1.5" />
            </div>
          )}
          {goal.owner === 'me' && <Avatar letter={me.avatarLetter} tone={me.tone} size={22} />}
          {goal.owner === 'partner' && (
            <Avatar letter={partner.avatarLetter} tone={partner.tone} size={22} />
          )}
        </div>

        <button onClick={() => onDetail(goal)}>
          <ChevronRight size={18} color="var(--color-muted)" />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm">
            <strong>{formatKRW(goal.savedAmount)}</strong>
            <span style={{ color: 'var(--color-muted)' }}> / {formatKRW(goal.targetAmount)}원</span>
          </span>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-accent)' }}>
            {pct}%
          </span>
        </div>
        <ProgressBar value={pct} color="accent" height={8} showOverflow={false} />
        {!done && (
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
            남은 금액 {formatKRW(remaining)}원
          </div>
        )}
      </div>

      {/* Deposit button */}
      {!done && (
        <button
          onClick={() => onDeposit(goal)}
          className="mt-3 w-full py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
          style={{
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-line)',
            color: 'var(--color-ink)',
          }}
        >
          <Coins size={14} />
          입금하기
        </button>
      )}
    </div>
  );
}

// ── Deposit Modal ─────────────────────────────
function DepositModal({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const { updateGoal } = useStore();
  const [amount, setAmount] = useState('');

  function handleDeposit() {
    const parsed = parseInt(amount.replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      const newSaved = Math.min(goal.savedAmount + parsed, goal.targetAmount);
      updateGoal(goal.id, { savedAmount: newSaved });
    }
    onClose();
  }

  const preset = [10000, 30000, 50000, 100000];

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 pb-10"
        style={{ background: 'var(--color-paper)', border: '1px solid var(--color-line)' }}
      >
        <div className="flex items-center mb-4">
          <span className="text-lg font-semibold flex-1">
            {goal.emoji} {goal.title}에 입금
          </span>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>
          현재 {formatKRW(goal.savedAmount)} / {formatKRW(goal.targetAmount)}원
        </div>

        {/* Preset amounts */}
        <div className="flex gap-2 mb-4">
          {preset.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v.toLocaleString())}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                border: '1px solid var(--color-line)',
                background:
                  amount === v.toLocaleString() ? 'var(--color-accent)' : 'transparent',
                color: amount === v.toLocaleString() ? '#fff' : 'var(--color-ink)',
              }}
            >
              {formatKRW(v)}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-3 mb-4"
          style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
        >
          <span className="font-mono text-lg" style={{ color: 'var(--color-muted)' }}>₩</span>
          <input
            type="number"
            className="flex-1 text-xl font-bold outline-none bg-transparent"
            placeholder="직접 입력"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ color: 'var(--color-ink)' }}
          />
        </div>

        <Button variant="filled" tone="positive" className="w-full" onClick={handleDeposit}>
          + 입금 저장하기
        </Button>
      </div>
    </div>
  );
}

// ── Add Goal Sheet ────────────────────────────
const EMOJI_PRESETS = ['🏝', '💍', '🎁', '🚗', '🏠', '✈️', '💰', '🎓', '🐶', '🎮'];

function AddGoalSheet({ onClose }: { onClose: () => void }) {
  const { addGoal } = useStore();
  const [emoji, setEmoji] = useState('🎯');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');
  const [owner, setOwner] = useState<GoalOwner>('couple');
  const [showEmoji, setShowEmoji] = useState(false);

  function handleSave() {
    const parsed = parseInt(target.replace(/,/g, ''), 10);
    if (!title.trim() || isNaN(parsed)) return;

    addGoal({
      id: `g${Date.now()}`,
      title: title.trim(),
      emoji,
      targetAmount: parsed,
      savedAmount: 0,
      targetDate: date || undefined,
      owner,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  const ownerOptions: { id: GoalOwner; label: string }[] = [
    { id: 'couple', label: `${me.name} ♥ ${partner.name}` },
    { id: 'me', label: `${me.name} (나만)` },
    { id: 'partner', label: `${partner.name}만` },
  ];

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl pb-10"
        style={{ background: 'var(--color-paper)', border: '1px solid var(--color-line)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center px-5 pt-5 mb-4">
          <span className="text-lg font-semibold flex-1">새 목표 만들기</span>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="px-5 flex flex-col gap-4">
          {/* Emoji picker */}
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>이모지</div>
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-3xl w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ border: '1px solid var(--color-line)' }}
            >
              {emoji}
            </button>
            {showEmoji && (
              <div className="flex flex-wrap gap-2 mt-2">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setShowEmoji(false); }}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
                    style={{
                      border: '1px solid var(--color-line)',
                      background: emoji === e ? 'var(--color-accent-soft)' : 'transparent',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--color-muted)' }}>목표 이름</div>
            <input
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              placeholder="예: 공동 여행"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Target amount */}
          <div>
            <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--color-muted)' }}>목표 금액</div>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ border: '1px solid var(--color-line)' }}
            >
              <span className="font-mono" style={{ color: 'var(--color-muted)' }}>₩</span>
              <input
                type="number"
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="1,000,000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>원</span>
            </div>
          </div>

          {/* Target date */}
          <div>
            <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--color-muted)' }}>목표 날짜 (선택)</div>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Owner */}
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>목표 주체</div>
            <div className="flex flex-col gap-2">
              {ownerOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOwner(o.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-left px-3 transition-all"
                  style={{
                    border: '1px solid var(--color-line)',
                    background: owner === o.id ? 'var(--color-accent-soft)' : 'transparent',
                    boxShadow: owner === o.id ? 'var(--shadow-button)' : 'none',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="filled"
            tone="positive"
            onClick={handleSave}
            className="w-full"
          >
            + 새 목표 만들기
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Goal Detail Sheet ─────────────────────────
function GoalDetailSheet({
  goal,
  onClose,
  onDeposit,
}: {
  goal: Goal;
  onClose: () => void;
  onDeposit: (goal: Goal) => void;
}) {
  const { updateGoal, deleteGoal } = useStore();
  const pct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
  const days = goal.targetDate ? daysUntil(goal.targetDate) : null;
  const remaining = goal.targetAmount - goal.savedAmount;
  const monthlyNeeded =
    days !== null && days > 0 ? Math.ceil(remaining / Math.ceil(days / 30)) : null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl pb-10"
        style={{ background: 'var(--color-paper)', border: '1px solid var(--color-line)', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="flex items-center px-5 pt-5 mb-1">
          <span className="text-lg font-semibold flex-1">{goal.emoji} {goal.title}</span>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* D-day */}
        {days !== null && (
          <div className="px-5 mb-4">
            <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              {days > 0 ? `D-${days}` : '기간 종료'}
              {goal.targetDate &&
                ` · ${new Date(goal.targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`}
            </span>
          </div>
        )}

        <div className="px-5 flex flex-col gap-4">
          {/* Big ring + stats */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <RingProgress pct={pct} size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>모은 금액</div>
                <div className="text-lg font-bold">{formatKRW(goal.savedAmount)}원</div>
              </div>
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>목표 금액</div>
                <div className="text-sm font-semibold">{formatKRW(goal.targetAmount)}원</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="rounded-2xl px-4 py-3 flex gap-4"
            style={{ border: '1px solid var(--color-line)', background: 'var(--color-accent-soft)' }}
          >
            <div className="flex-1 text-center">
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>남은 금액</div>
              <div className="text-sm font-bold mt-0.5">{formatKRW(Math.max(0, remaining))}원</div>
            </div>
            {monthlyNeeded && (
              <div className="flex-1 text-center" style={{ borderLeft: '1px dotted var(--color-faint)' }}>
                <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>월 필요액</div>
                <div className="text-sm font-bold mt-0.5">{formatKRW(monthlyNeeded)}원</div>
              </div>
            )}
            <div className="flex-1 text-center" style={{ borderLeft: '1px dotted var(--color-faint)' }}>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>목표 주체</div>
              <div className="mt-0.5 flex justify-center">
                {goal.owner === 'couple' && (
                  <div className="flex">
                    <Avatar letter={me.avatarLetter} tone={me.tone} size={20} />
                    <Avatar letter={partner.avatarLetter} tone={partner.tone} size={20} className="-ml-1" />
                  </div>
                )}
                {goal.owner === 'me' && <Avatar letter={me.avatarLetter} tone={me.tone} size={20} />}
                {goal.owner === 'partner' && <Avatar letter={partner.avatarLetter} tone={partner.tone} size={20} />}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                deleteGoal(goal.id);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{
                border: '1px solid var(--color-grapefruit)',
                color: 'var(--color-grapefruit)',
                background: 'var(--color-grapefruit-soft)',
              }}
            >
              삭제
            </button>
            <button
              onClick={() => {
                updateGoal(goal.id, { savedAmount: 0 });
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: '1px solid var(--color-line)', color: 'var(--color-muted)' }}
            >
              초기화
            </button>
            <button
              onClick={() => { onClose(); onDeposit(goal); }}
              className="flex-2 py-2.5 rounded-xl text-sm font-semibold flex-1 transition-all active:scale-95"
              style={{
                background: 'var(--color-positive)',
                border: '1px solid var(--color-positive)',
                boxShadow: 'var(--shadow-positive)',
                color: '#fff',
              }}
            >
              + 입금하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Main GoalsScreen
// ══════════════════════════════════════════════
export function GoalsScreen() {
  const { goals } = useStore();
  const [filter, setFilter] = useState<OwnerFilter>('all');
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = goals.filter((g) => {
    if (filter === 'couple') return g.owner === 'couple';
    if (filter === 'me') return g.owner === 'me';
    if (filter === 'partner') return g.owner === 'partner';
    return true;
  });

  // Summary stats
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const filterTabs: { id: OwnerFilter; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'couple', label: '커플' },
    { id: 'me', label: '나만' },
    { id: 'partner', label: partner.name },
  ];

  return (
    <>
      <Screen scrollable>
        <TopBar
          title="함께 모아요"
          right={
            <button
              onClick={() => setShowAdd(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: 'var(--color-positive-soft)' }}
              aria-label="목표 추가"
            >
              <Plus size={20} color="var(--color-positive)" strokeWidth={2.5} />
            </button>
          }
        />

        <div className="px-4 pt-4 flex flex-col gap-4">
          {/* Summary Card */}
          <div
            className="rounded-3xl px-4 py-4"
            style={{ border: '1px solid var(--color-line)', background: 'var(--color-accent-soft)' }}
          >
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  전체 목표 달성률
                </div>
                <div className="text-3xl font-bold mt-0.5">
                  {formatKRW(totalSaved)}
                  <span className="text-base font-normal" style={{ color: 'var(--color-muted)' }}>
                    {' '}/ {formatKRW(totalTarget)}원
                  </span>
                </div>
              </div>
              <span
                className="text-2xl font-bold mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {overallPct}%
              </span>
            </div>
            <ProgressBar value={overallPct} color="accent" height={10} showOverflow={false} />
            <div className="text-xs font-mono mt-1.5" style={{ color: 'var(--color-muted)' }}>
              {goals.length}개 목표 중 {goals.filter((g) => g.savedAmount >= g.targetAmount).length}개 달성
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {filterTabs.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
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

          {/* Goal Cards */}
          {filtered.length === 0 && (
            <div
              className="py-10 text-center text-sm font-mono rounded-2xl"
              style={{ color: 'var(--color-muted)', border: '1px dashed var(--color-line)' }}
            >
              해당 목표가 없어요
            </div>
          )}

          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onDeposit={setDepositGoal}
              onDetail={setDetailGoal}
            />
          ))}

          {/* Add new goal */}
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-2xl p-4 text-center w-full transition-all active:scale-95"
            style={{ border: '1px dashed var(--color-positive)', background: 'var(--color-positive-soft)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1.5"
              style={{ background: 'var(--color-positive)', boxShadow: 'var(--shadow-positive)' }}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>새 목표 만들기</div>
            <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              혼자 / 함께
            </div>
          </button>

          <div className="h-4" />
        </div>
      </Screen>

      {/* Modals */}
      {depositGoal && (
        <DepositModal goal={depositGoal} onClose={() => setDepositGoal(null)} />
      )}
      {detailGoal && (
        <GoalDetailSheet
          goal={goals.find((g) => g.id === detailGoal.id) ?? detailGoal}
          onClose={() => setDetailGoal(null)}
          onDeposit={(g) => { setDetailGoal(null); setDepositGoal(g); }}
        />
      )}
      {showAdd && <AddGoalSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}
