import { useState, useMemo } from 'react';
import { ChevronLeft, SlidersHorizontal, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/layout/TopBar';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import { USERS, CATEGORIES } from '../../store/data';
import type { Transaction } from '../../types';
import { calculateSettlement, getActiveYearMonth } from '../../utils/finance';

const me = USERS.find((u) => u.role === 'me')!;
const partner = USERS.find((u) => u.role === 'partner')!;

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Settlement Row ────────────────────────────
function SettleRow({
  t,
  paidByMe,
  oweDelta,
  last,
}: {
  t: Transaction;
  paidByMe: boolean;
  oweDelta: number;
  last: boolean;
}) {
  const cat = CATEGORIES.find((c) => c.id === t.categoryId);
  const payer = paidByMe ? me : partner;
  const isPositive = oweDelta > 0;

  return (
    <div
      className="flex items-center gap-2 py-3"
      style={{ borderBottom: last ? 'none' : '1px dotted var(--color-faint)' }}
    >
      <span className="text-xs font-mono w-9 flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
        {formatDate(t.date)}
      </span>
      <Avatar letter={payer.avatarLetter} tone={payer.tone} size={22} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{t.title}</div>
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {cat?.emoji} {cat?.name} · 총 {formatKRW(t.amount)}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div
          className="text-sm font-bold"
          style={{ color: isPositive ? 'var(--color-accent)' : '#1677c9' }}
        >
          {isPositive ? '+' : ''}{formatKRW(oweDelta)}
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {isPositive
            ? `${partner.name} → ${me.name}`
            : `${me.name} → ${partner.name}`}
        </div>
      </div>
    </div>
  );
}

// ── Settled State ─────────────────────────────
function SettledCard({ owes, owed, abs }: { owes: typeof me; owed: typeof me; abs: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: '#1677c9', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-button)' }}
      >
        <Check size={32} color="#fff" strokeWidth={3} />
      </div>
      <div className="text-center">
        <div className="text-xl font-bold">정산 완료!</div>
        <div className="text-sm font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
          {owes.name}이(가) {owed.name}에게 {formatKRW(abs)}원을 보냈어요
        </div>
      </div>
      <div
        className="w-full rounded-2xl px-4 py-4 flex items-center justify-center gap-4"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(159,211,255,0.2)' }}
      >
        <div className="text-center">
          <Avatar letter={owes.avatarLetter} tone={owes.tone} size={44} />
          <div className="text-sm font-medium mt-1">{owes.name}</div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>송금</div>
          <div
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(159,211,255,0.2)', border: '1px solid var(--color-line)' }}
          >
            {formatKRW(abs)}원
          </div>
          <div className="text-lg">→</div>
        </div>
        <div className="text-center">
          <Avatar letter={owed.avatarLetter} tone={owed.tone} size={44} />
          <div className="text-sm font-medium mt-1">{owed.name}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Main SettleScreen
// ══════════════════════════════════════════════
export function SettleScreen() {
  const navigate = useNavigate();
  const { transactions, settlements, addSettlement, users } = useStore();
  const activeYearMonth = getActiveYearMonth(transactions);
  const { rows, netAmount, abs, owes, owed } = useMemo(
    () => calculateSettlement(transactions, activeYearMonth, users),
    [transactions, activeYearMonth, users]
  );
  const existingSettlement = settlements.find(
    (s) => s.yearMonth === activeYearMonth && s.status === 'completed'
  );
  const [settled, setSettled] = useState(Boolean(existingSettlement));

  const isZero = abs === 0;
  const [year, month] = activeYearMonth.split('-');

  function completeSettlement() {
    if (!existingSettlement && abs > 0) {
      addSettlement({
        id: `s${Date.now()}`,
        yearMonth: activeYearMonth,
        fromUserId: owes.id,
        toUserId: owed.id,
        amount: abs,
        status: 'completed',
        transactionIds: rows.map((r) => r.t.id),
        completedAt: new Date().toISOString(),
      });
    }
    setSettled(true);
  }

  return (
    <Screen scrollable>
      <TopBar
        title="정산"
        subtitle={`${year}년 ${Number(month)}월`}
        left={
          <button onClick={() => navigate('/report')}>
            <ChevronLeft size={22} color="var(--color-ink)" />
          </button>
        }
        right={
          <button>
            <SlidersHorizontal size={18} color="var(--color-ink)" />
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">

        {settled ? (
          <SettledCard owes={owes} owed={owed} abs={abs} />
        ) : (
          <>
            {/* Hero: amount + direction */}
            {isZero ? (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ border: '1px solid var(--color-line)', background: 'rgba(159,211,255,0.2)' }}
              >
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-xl font-bold">정산 금액 없음</div>
                <div className="text-sm font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
                  이번 달은 정확히 반반이에요!
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl pt-5 pb-4 px-4 text-center"
                style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
              >
                <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  이번 달 정산
                </span>
                <div className="text-xl font-semibold mt-1">
                  {owes.name} → {owed.name}
                </div>
                <div className="mt-1">
                  <span
                    className="text-5xl font-bold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {formatKRW(abs)}
                  </span>
                  <span className="text-xl" style={{ color: 'var(--color-muted)' }}> 원</span>
                </div>
              </div>
            )}

            {/* Arrow visualization */}
            {!isZero && (
              <div
                className="rounded-2xl py-4 px-6 flex items-center justify-center gap-3"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              >
                {/* Payer */}
                <div className="text-center flex-1">
                  <Avatar letter={owes.avatarLetter} tone={owes.tone} size={48} />
                  <div className="text-sm font-medium mt-1.5">{owes.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {formatKRW(
                      owes.id === partner.id
                        ? rows.filter((r) => !r.paidByMe).reduce((s, r) => s + r.t.amount, 0)
                        : rows.filter((r) => r.paidByMe).reduce((s, r) => s + r.t.amount, 0)
                    )} 냄
                  </div>
                </div>

                {/* Arrow SVG */}
                <div className="flex flex-col items-center gap-1">
                  <svg width={80} height={36} viewBox="0 0 80 36">
                    <path
                      d="M6 18 Q 40 4 74 18"
                      stroke="var(--color-ink)" strokeWidth={1.8}
                      fill="none" strokeDasharray="4 2"
                    />
                    <path
                      d="M67 12 L74 18 L67 24"
                      stroke="var(--color-ink)" strokeWidth={1.8}
                      fill="none"
                    />
                  </svg>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid var(--color-line)', color: 'var(--color-accent)' }}
                  >
                    {formatKRW(abs)}
                  </span>
                </div>

                {/* Receiver */}
                <div className="text-center flex-1">
                  <Avatar letter={owed.avatarLetter} tone={owed.tone} size={48} />
                  <div className="text-sm font-medium mt-1.5">{owed.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {formatKRW(
                      owed.id === me.id
                        ? rows.filter((r) => r.paidByMe).reduce((s, r) => s + r.t.amount, 0)
                        : rows.filter((r) => !r.paidByMe).reduce((s, r) => s + r.t.amount, 0)
                    )} 냄
                  </div>
                </div>
              </div>
            )}

            {/* Balance breakdown */}
            <div
              className="rounded-xl px-4 py-3 flex gap-0"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
            >
              {[
                {
                  user: me,
                  paid: rows.filter((r) => r.paidByMe).reduce((s, r) => s + r.t.amount, 0),
                  shouldPay: rows.filter((r) => !r.paidByMe).reduce((s, r) => s + r.t.split.myAmount, 0),
                },
                {
                  user: partner,
                  paid: rows.filter((r) => !r.paidByMe).reduce((s, r) => s + r.t.amount, 0),
                  shouldPay: rows.filter((r) => r.paidByMe).reduce((s, r) => s + r.t.split.partnerAmount, 0),
                },
              ].map(({ user, paid, shouldPay }, i) => (
                <div
                  key={user.id}
                  className="flex-1 text-center py-1"
                  style={{ borderRight: i === 0 ? '1px dotted var(--color-faint)' : 'none' }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Avatar letter={user.avatarLetter} tone={user.tone} size={18} />
                    <span className="text-xs font-mono">{user.name}</span>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>지불</div>
                  <div className="text-sm font-bold">{formatKRW(paid)}</div>
                  <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-muted)' }}>부담해야 할</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {formatKRW(shouldPay)}
                  </div>
                </div>
              ))}
            </div>

            {/* Settlement detail list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">정산 내역</span>
                <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  공동 지출 {rows.length}건
                </span>
              </div>
              <div
                className="rounded-2xl px-3"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              >
                {rows.length === 0 ? (
                  <div className="py-6 text-center text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
                    공동 지출 내역이 없어요
                  </div>
                ) : (
                  rows
                    .slice()
                    .sort((a, b) => b.t.date.localeCompare(a.t.date))
                    .map(({ t, paidByMe, oweDelta }, i) => (
                      <SettleRow
                        key={t.id}
                        t={t}
                        paidByMe={paidByMe}
                        oweDelta={oweDelta}
                        last={i === rows.length - 1}
                      />
                    ))
                )}
              </div>
            </div>

            {/* Net summary */}
            {!isZero && (
              <div
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  border: '1px solid var(--color-line)',
                  background: netAmount > 0 ? 'rgba(47,128,237,0.12)' : 'rgba(159,211,255,0.2)',
                }}
              >
                <span className="text-sm font-medium">최종 정산금액</span>
                <div className="text-right">
                  <div className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                    {formatKRW(abs)}원
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                    {owes.name} → {owed.name}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        {!settled && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={completeSettlement}
            >
              기록만 남기기
            </Button>
            <button
              onClick={completeSettlement}
              className="flex-[2] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: 'var(--color-accent)',
                border: '1px solid var(--color-line)',
                boxShadow: 'var(--shadow-button)',
                color: '#fff',
              }}
            >
              <ExternalLink size={15} />
              송금 요청 (토스)
            </button>
          </div>
        )}

        {settled && (
          <Button variant="outline" onClick={() => navigate('/report')}>
            리포트로 돌아가기
          </Button>
        )}

        <div className="h-4" />
      </div>
    </Screen>
  );
}
