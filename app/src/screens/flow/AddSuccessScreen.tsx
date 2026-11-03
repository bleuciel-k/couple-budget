import { useNavigate, useLocation } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { Divider } from '../../components/ui/Divider';
import { CATEGORIES } from '../../store/data';
import { useStore } from '../../store';
import type { Transaction } from '../../types';

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const period = hours < 12 ? '오전' : hours < 18 ? '오후' : '저녁';
  return `${month}/${day} ${period}`;
}

export function AddSuccessScreen() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { tx: Transaction; partnerName: string } };
  const { users } = useStore();

  if (!state?.tx) {
    navigate('/');
    return null;
  }

  const { tx } = state;
  const cat = CATEGORIES.find((c) => c.id === tx.categoryId);
  const payer = users.find((u) => u.id === tx.paidBy) ?? users[0];
  const shareEntries = Object.entries(tx.split.shares ?? {}).filter(([, amount]) => amount > 0);
  const otherShareCount = shareEntries.filter(([userId]) => userId !== payer?.id).length;
  const isMine = tx.split.splitType === 'mine' || tx.walletType === 'personal';
  const isIncome = tx.type === 'income';

  return (
    <Screen scrollable>
      {/* Top bar */}
      <div
        className="flex items-center px-4 pt-12 pb-3"
        style={{ boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}
      >
        <button onClick={() => navigate('/')} className="w-10">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 text-center font-semibold text-lg">저장됨</div>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* Success icon */}
        <div className="flex flex-col items-center py-4 gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-positive)', boxShadow: 'var(--shadow-positive)' }}
          >
            <Check size={32} color="#fff" strokeWidth={2.8} />
          </div>
          <div className="text-2xl font-bold text-center">
            {isIncome
              ? '입금이 기록됐어요!'
              : isMine
              ? '개인(나) 지출로 기록됐어요!'
              : '둘이 함께 기록됐어요!'}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: isIncome
                  ? 'var(--color-positive-soft)'
                  : isMine
                  ? 'var(--color-theme-me-soft)'
                  : 'var(--color-theme-together-soft)',
                color: isIncome
                  ? 'var(--color-positive)'
                  : isMine
                  ? 'var(--color-theme-me)'
                  : 'var(--color-theme-together)',
                border: `1px solid ${
                  isIncome
                    ? 'rgba(16,185,129,0.3)'
                    : isMine
                    ? 'var(--color-theme-me-line)'
                    : 'var(--color-theme-together-line)'
                }`,
              }}
            >
              {isIncome ? '➕ 입금' : isMine ? '👤 개인(나) 지출 (정산 제외)' : `👥 둘이 함께 지출 (${tx.split.ratio ? `${tx.split.ratio[0]}:${tx.split.ratio[1]}` : '5:5'} 정산)`}
            </span>
          </div>
        </div>

        {/* Receipt card */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            border: '1px solid var(--color-line)',
            background: `repeating-linear-gradient(0deg, transparent 0 23px, rgba(0,0,0,0.035) 23px 24px)`,
          }}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xl font-bold">{tx.title}</span>
            <span
              className="text-xl font-bold"
              style={{ color: isIncome ? 'var(--color-positive)' : 'var(--color-grapefruit)' }}
            >
              {isIncome ? '+' : '-'}{formatKRW(tx.amount)}원
            </span>
          </div>
          <div className="text-xs font-mono mb-4" style={{ color: 'var(--color-muted)' }}>
            {cat?.emoji} {cat?.name} · {formatDateLabel(tx.date)}
          </div>

          {/* Who paid */}
          <div
            className="flex items-center gap-2 py-2"
            style={{ borderTop: '1px dotted var(--color-faint)' }}
          >
            <Avatar letter={payer?.avatarLetter ?? '?'} tone={payer?.tone ?? 'accent'} size={24} />
            <span className="flex-1 text-sm font-medium">{payer?.name ?? '알 수 없음'} ({isIncome ? '입금' : '지불'})</span>
            <span
              className="font-semibold"
              style={{ color: isIncome ? 'var(--color-positive)' : 'var(--color-grapefruit)' }}
            >
              {isIncome ? '+' : '-'}{formatKRW(tx.amount)}
            </span>
          </div>

          {shareEntries.map(([userId, share]) => {
            const user = users.find((u) => u.id === userId);
            return (
              <div key={userId} className="flex items-center gap-2 py-2">
                <Avatar letter={user?.avatarLetter ?? '?'} tone={user?.tone ?? 'accent'} size={24} />
                <span className="flex-1 text-sm font-medium">{user?.name ?? '멤버'} 부담</span>
                <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {formatKRW(share)}
                </span>
              </div>
            );
          })}

          {otherShareCount > 0 && (
            <>
              <Divider className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  다른 멤버가 {payer?.name ?? '결제자'}에게 줄 돈
                </span>
                <span className="text-lg font-bold" style={{ color: 'var(--color-theme-together)' }}>
                  {formatKRW(tx.split.partnerAmount)}원
                </span>
              </div>
            </>
          )}

          {tx.memo && (
            <div
              className="mt-3 pt-3 text-sm"
              style={{ borderTop: '1px dotted var(--color-faint)', color: 'var(--color-muted)' }}
            >
              메모: {tx.memo}
            </div>
          )}
        </div>

        {/* Partner reaction placeholder */}
        <div
          className="rounded-2xl px-3 py-3 flex items-center gap-3"
          style={{ border: '1px solid var(--color-line)' }}
        >
          <Avatar letter={(users.find((u) => u.id !== payer?.id) ?? payer)?.avatarLetter ?? '?'} tone={(users.find((u) => u.id !== payer?.id) ?? payer)?.tone ?? 'accent'} size={30} />
          <div className="flex-1">
            <div className="text-sm font-medium">공유 멤버에게 알림 준비 완료</div>
            <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              방금
            </div>
          </div>
          <span className="text-xl">❤️</span>
        </div>
      </div>

      {/* Bottom buttons */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--color-line)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white"
          style={{
            background: 'var(--color-accent)',
            border: '1px solid var(--color-line)',
            boxShadow: 'var(--shadow-button)',
          }}
        >
          홈으로
        </button>
      </div>
    </Screen>
  );
}
