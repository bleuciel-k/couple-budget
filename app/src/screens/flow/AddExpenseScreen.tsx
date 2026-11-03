import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Delete, Plus, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/layout/Screen';
import { useStore } from '../../store';
import { CATEGORIES } from '../../store/data';
import type { TransactionType, WalletType } from '../../types';
import { calculateSplit } from '../../utils/finance';

type TxTypeTab = 'expense' | 'income';
type EntryStep = 'amount' | 'details' | 'payment';
type SplitMode = 'half' | 'ratio' | 'mine' | 'partner';

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

const PAYMENT_METHOD_STORAGE_KEY = 'couple-budget-payment-methods';

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash', name: '현금', color: 'var(--color-accent)' },
  { id: 'card', name: '카드', color: '#2dd4bf' },
];

const PAYMENT_METHOD_EXAMPLES = ['PayPay', 'au PAY', 'Rakuten Pay', 'LINE Pay'];
const PAYMENT_METHOD_COLORS = ['#00B8A9', '#2dd4bf', '#14b8a6', '#0d9488', '#5eead4'];
const CATEGORY_COLORS = ['#00B8A9', '#2dd4bf', '#14b8a6', '#06b6d4', '#10B981', '#34d399', '#0d9488', '#99f6e4'];
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'];
const EXPENSE_CATEGORY_IDS = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
const INCOME_CATEGORY_IDS = new Set(['i1', 'i2', 'i3', 'i4', 'i5', 'i6']);
const EXPENSE_CATEGORIES = CATEGORIES.filter((category) => EXPENSE_CATEGORY_IDS.has(category.id));
const INCOME_CATEGORIES = CATEGORIES.filter((category) => INCOME_CATEGORY_IDS.has(category.id));

function categoriesFor(type: TxTypeTab) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function readPaymentMethods() {
  try {
    const saved = window.localStorage.getItem(PAYMENT_METHOD_STORAGE_KEY);
    if (!saved) return DEFAULT_PAYMENT_METHODS;
    const parsed = JSON.parse(saved) as PaymentMethod[];
    return parsed.length > 0 ? parsed : DEFAULT_PAYMENT_METHODS;
  } catch {
    return DEFAULT_PAYMENT_METHODS;
  }
}

function persistPaymentMethods(methods: PaymentMethod[]) {
  window.localStorage.setItem(PAYMENT_METHOD_STORAGE_KEY, JSON.stringify(methods));
}

function formatDateSlash(date: string) {
  return date.replaceAll('-', '/');
}

function amountText(amount: number) {
  return amount > 0 ? amount.toLocaleString('ko-KR') : '0';
}

function makePaymentId(name: string, order: number) {
  return `pm-${name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')}-${order}`;
}

function Header({
  showBack,
  title,
  titleColor,
  showAddPayment,
  onBack,
  onAddPayment,
  onClose,
}: {
  showBack?: boolean;
  title?: string;
  titleColor?: string;
  showAddPayment?: boolean;
  onBack: () => void;
  onAddPayment?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-5 pb-3 shrink-0 select-none"
      style={{
        paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
      }}
    >
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 grid place-items-center rounded-full active:opacity-70"
          aria-label="이전"
        >
          <ArrowLeft size={28} strokeWidth={2.5} color="var(--color-ink)" />
        </button>
      )}
      {title ? (
        <div
          className={`${showBack ? 'text-[30px]' : 'text-[24px]'} flex-1 min-w-0 truncate font-semibold`}
          style={{ color: titleColor ?? (showBack ? 'var(--color-accent)' : 'var(--color-muted)') }}
        >
          {title}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {showAddPayment && (
        <button
          type="button"
          onClick={onAddPayment}
          className="w-11 h-11 grid place-items-center rounded-full active:opacity-70"
          style={{ background: 'var(--color-positive-soft)' }}
          aria-label="결제 방법 추가"
        >
          <Plus size={27} strokeWidth={2.5} color="var(--color-positive)" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="w-11 h-11 grid place-items-center rounded-full active:opacity-70"
        style={{ background: 'rgba(31,42,68,0.06)' }}
        aria-label="닫기"
      >
        <X size={28} strokeWidth={2.4} color="var(--color-ink)" />
      </button>
    </div>
  );
}

function SplitSwitcher({
  splitMode,
  onToggle,
  amount,
  ratio = [50, 50],
  partnerName = '상대',
}: {
  splitMode: SplitMode;
  onToggle: (mode: SplitMode) => void;
  amount: number;
  ratio?: [number, number];
  partnerName?: string;
}) {
  const isMine = splitMode === 'mine';
  const myRatio = ratio[0] <= 10 && ratio[1] <= 10 ? ratio[0] * 10 : ratio[0];
  const partnerRatio = 100 - myRatio;
  const mySplitAmount = Math.round((amount * myRatio) / 100);

  return (
    <div className="mx-6 mb-2">
      <div
        className="flex p-1 rounded-2xl"
        style={{
          background: isMine ? 'rgba(99, 102, 241, 0.08)' : 'rgba(2, 132, 199, 0.08)',
          border: `1.5px solid ${isMine ? 'rgba(99, 102, 241, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
          transition: 'all 0.25s ease',
        }}
      >
        <button
          type="button"
          onClick={() => onToggle('mine')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: isMine ? 'var(--color-theme-me)' : 'transparent',
            color: isMine ? '#fff' : 'var(--color-muted)',
            boxShadow: isMine ? 'var(--shadow-theme-me)' : 'none',
          }}
        >
          <span>👤</span>
          <span>개인(나)</span>
          {isMine && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-normal">100%</span>}
        </button>

        <button
          type="button"
          onClick={() => onToggle(myRatio === 50 ? 'half' : 'ratio')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: !isMine ? 'var(--color-theme-together)' : 'transparent',
            color: !isMine ? '#fff' : 'var(--color-muted)',
            boxShadow: !isMine ? 'var(--shadow-theme-together)' : 'none',
          }}
        >
          <span>👥</span>
          <span>둘이 함께</span>
          {!isMine && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-normal">
              {myRatio === 50 ? '반반' : `${myRatio}:${partnerRatio}`}
            </span>
          )}
        </button>
      </div>

      {/* Dynamic theme explanation banner */}
      <div
        className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all"
        style={{
          background: isMine ? 'var(--color-theme-me-soft)' : 'var(--color-theme-together-soft)',
          color: isMine ? 'var(--color-theme-me)' : 'var(--color-theme-together)',
          border: `1px solid ${isMine ? 'var(--color-theme-me-line)' : 'var(--color-theme-together-line)'}`,
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isMine ? 'var(--color-theme-me)' : 'var(--color-theme-together)' }}
          />
          {isMine
            ? '개인(나) 지출 · 정산 제외'
            : `둘이 함께 분담 (${myRatio === 50 ? '5:5 반반' : `${myRatio}:${partnerRatio}`} 정산)`}
        </span>
        <span className="font-semibold">
          {isMine
            ? '내 몫 100%'
            : amount > 0
            ? `내 몫 ₩${mySplitAmount.toLocaleString('ko-KR')} (${myRatio}%)`
            : `나 ${myRatio}% : ${partnerName} ${partnerRatio}%`}
        </span>
      </div>
    </div>
  );
}

function NumberPad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <div
      className="rounded-t-[32px] px-3 pt-5 shrink-0"
      style={{
        background: 'var(--color-bg)',
        paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))',
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              onPress(key);
            }}
            className={`h-[58px] rounded-2xl text-[32px] font-semibold transition-all duration-150 active:scale-90 active:brightness-95 cursor-pointer ${
              key === '0' ? 'col-start-2' : ''
            } ${key === '⌫' ? 'text-[22px]' : ''}`}
            style={{
              background: key === '⌫' ? 'transparent' : 'var(--color-paper)',
              color: 'var(--color-ink)',
              boxShadow: key === '⌫' ? 'none' : 'var(--shadow-soft)',
            }}
          >
            {key === '⌫' ? <Delete className="mx-auto" size={34} strokeWidth={1.8} /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaymentMethodSheet({
  paymentMethods,
  onAdd,
  onClose,
}: {
  paymentMethods: PaymentMethod[];
  onAdd: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const existingNames = paymentMethods.map((method) => method.name.toLowerCase());
  const examples = PAYMENT_METHOD_EXAMPLES.filter((example) => !existingNames.includes(example.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/20" onClick={onClose}>
      <div
        className="rounded-t-[28px] px-5 pt-4 pb-8"
        style={{ background: 'var(--color-paper)', boxShadow: '0 -12px 40px rgba(31,42,68,0.16)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-11 rounded-full" style={{ background: 'var(--color-faint)' }} />
        <div className="mb-3 text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          결제 방법 추가
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: PayPay"
            className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-base outline-none"
            style={{ background: 'var(--color-bg)', color: 'var(--color-ink)' }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              onAdd(name);
              setName('');
            }}
            className="h-12 w-12 rounded-2xl text-white active:scale-95"
            style={{ background: 'var(--color-positive)', boxShadow: 'var(--shadow-positive)' }}
            aria-label="추가"
          >
            <Plus className="mx-auto" size={24} />
          </button>
        </div>
        {examples.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onAdd(example)}
                className="rounded-full px-4 py-2 text-sm font-medium active:scale-95"
                style={{ background: 'var(--color-accent-soft)', color: 'var(--color-ink)' }}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AddExpenseScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('tx');
  const selectedDate = searchParams.get('date');
  const { addTransaction, updateTransaction, deleteTransaction, transactions, settings, users } = useStore();
  const me = users.find((user) => user.role === 'me') ?? users[0];
  const shareUsers = users.length > 0 ? users : [me].filter(Boolean);
  const firstOther = shareUsers.find((user) => user.id !== me?.id);
  const editingTx = transactions.find((transaction) => transaction.id === editingId);

  const [step, setStep] = useState<EntryStep>(editingTx ? 'details' : 'amount');
  const [txType, setTxType] = useState<TxTypeTab>(editingTx?.type === 'income' ? 'income' : 'expense');
  const [rawAmount, setRawAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [categoryId, setCategoryId] = useState(editingTx?.categoryId ?? CATEGORIES[0].id);
  const [title, setTitle] = useState(editingTx?.title ?? '');
  const [memo, setMemo] = useState(editingTx?.memo ?? '');
  const [date] = useState(editingTx ? editingTx.date.slice(0, 10) : selectedDate ?? new Date().toISOString().slice(0, 10));
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(readPaymentMethods);
  const [selectedPaymentId, setSelectedPaymentId] = useState(editingTx?.paymentMethodId ?? DEFAULT_PAYMENT_METHODS[0].id);
  const [showPaymentEditor, setShowPaymentEditor] = useState(false);
  const configuredRatio: [number, number] = settings.defaultSplitRatio
    ? (settings.defaultSplitRatio[0] <= 10 && settings.defaultSplitRatio[1] <= 10
        ? [settings.defaultSplitRatio[0] * 10, settings.defaultSplitRatio[1] * 10]
        : settings.defaultSplitRatio)
    : [50, 50];
  const [ratio] = useState<[number, number]>(editingTx?.split.ratio ?? configuredRatio);

  const [splitMode, setSplitMode] = useState<SplitMode>(
    editingTx?.split.splitType === 'ratio'
      ? 'ratio'
      : editingTx?.split.splitType === 'mine' || editingTx?.split.splitType === 'partner'
        ? editingTx.split.splitType
        : (settings.defaultSplitType ?? 'mine')
  );

  const isMine = splitMode === 'mine';
  const effectiveSplitType: SplitMode = isMine
    ? 'mine'
    : ratio[0] === 50 && ratio[1] === 50
    ? 'half'
    : 'ratio';

  const amount = parseInt(rawAmount || '0', 10);
  const activeCategories = categoriesFor(txType);
  const selectedCat = activeCategories.find((category) => category.id === categoryId) ?? activeCategories[0];
  const selectedPayment = paymentMethods.find((method) => method.id === selectedPaymentId) ?? paymentMethods[0];
  const amountColor = txType === 'income' ? 'var(--color-positive)' : 'var(--color-grapefruit)';
  const themeAccentColor = isMine ? 'var(--color-theme-me)' : 'var(--color-theme-together)';
  const split = useMemo(
    () => calculateSplit(amount, txType === 'expense' ? effectiveSplitType : 'none', ratio, shareUsers.map((user) => user.id)),
    [amount, effectiveSplitType, ratio, shareUsers, txType]
  );

  const handleToggleSplitMode = (mode: SplitMode) => {
    setSplitMode(mode);
    if (mode !== 'mine' && txType === 'income') {
      setTxType('expense');
    }
  };

  const chooseType = (nextType: TxTypeTab) => {
    const nextCategories = categoriesFor(nextType);
    setTxType(nextType);
    if (!nextCategories.some((category) => category.id === categoryId)) {
      setCategoryId(nextCategories[0].id);
      setTitle('');
    }
    setStep('details');
  };

  const handleKeypad = (key: string) => {
    setRawAmount((previous) => {
      if (key === '⌫') return previous.slice(0, -1);
      if (previous.length >= 9) return previous;
      if (previous === '0') return key;
      return previous + key;
    });
  };

  const handleAddPaymentMethod = (rawName: string) => {
    const nextName = rawName.trim();
    if (!nextName) return;

    const existing = paymentMethods.find((method) => method.name.toLowerCase() === nextName.toLowerCase());
    if (existing) {
      setSelectedPaymentId(existing.id);
      setShowPaymentEditor(false);
      return;
    }

    const next: PaymentMethod = {
      id: makePaymentId(nextName, paymentMethods.length + 1),
      name: nextName,
      color: PAYMENT_METHOD_COLORS[paymentMethods.length % PAYMENT_METHOD_COLORS.length],
    };
    const nextMethods = [...paymentMethods, next];
    setPaymentMethods(nextMethods);
    persistPaymentMethods(nextMethods);
    setSelectedPaymentId(next.id);
    setShowPaymentEditor(false);
  };

  const handleSave = (paymentMethod = selectedPayment) => {
    if (amount <= 0) return;

    const now = new Date().toISOString();
    const transactionId = `t${now.replace(/\D/g, '')}`;
    const savedDate = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    const tx = {
      id: editingTx?.id ?? transactionId,
      type: txType as TransactionType,
      amount,
      title: title.trim() || selectedCat.name,
      categoryId: selectedCat.id,
      date: savedDate,
      paidBy: editingTx?.paidBy ?? me?.id ?? shareUsers[0]?.id ?? 'u1',
      walletType: (txType === 'expense' && (splitMode === 'half' || splitMode === 'ratio') ? 'shared' : 'personal') as WalletType,
      split,
      memo: memo.trim(),
      paymentMethodId: paymentMethod.id,
      paymentMethodName: paymentMethod.name,
      createdAt: editingTx?.createdAt ?? now,
      updatedAt: now,
    };

    if (editingTx) updateTransaction(editingTx.id, tx);
    else addTransaction(tx);

    navigate('/add-success', { state: { tx, partnerName: firstOther?.name ?? '공유 멤버' } });
  };

  const close = () => navigate(-1);

  return (
    <>
      <Screen>
        {step === 'amount' && (
          <>
            <Header title={formatDateSlash(date)} onBack={close} onClose={close} />
            <SplitSwitcher
              splitMode={splitMode}
              onToggle={handleToggleSplitMode}
              amount={amount}
              ratio={ratio}
              partnerName={firstOther?.name ?? '상대'}
            />
            <div className="flex-1 px-7 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-[82px] font-semibold leading-none" style={{ color: 'var(--color-muted)' }}>
                  ₩
                </div>
                <div className="flex items-center">
                  <div
                    className="max-w-[250px] truncate text-right text-[84px] font-semibold leading-none"
                    style={{ color: amount > 0 ? amountColor : 'var(--color-muted)' }}
                  >
                    {amountText(amount)}
                  </div>
                  <div className="ml-2 h-[104px] w-[3px] animate-pulse rounded-full" style={{ background: themeAccentColor }} />
                </div>
              </div>

              {/* 개인(나)일 때는 입금과 지출 버튼 모두 표시, 둘이 함께일 때는 지출 버튼만 표시 */}
              {isMine ? (
                <div className="mt-14 grid grid-cols-2 gap-5">
                  <button
                    type="button"
                    onClick={() => chooseType('income')}
                    className="h-20 rounded-2xl text-2xl font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2 transition-transform"
                    style={{ background: 'var(--color-positive)', boxShadow: 'var(--shadow-positive)' }}
                  >
                    <Plus size={28} strokeWidth={2.8} />
                    <span>입금</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseType('expense')}
                    className="h-20 rounded-2xl text-2xl font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2 transition-transform"
                    style={{ background: 'var(--color-grapefruit)', boxShadow: 'var(--shadow-grapefruit)' }}
                  >
                    <span className="text-3xl font-black leading-none mb-1">−</span>
                    <span>지출</span>
                  </button>
                </div>
              ) : (
                <div className="mt-14">
                  <button
                    type="button"
                    onClick={() => chooseType('expense')}
                    className="w-full h-20 rounded-2xl text-2xl font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2.5 transition-transform"
                    style={{ background: 'var(--color-grapefruit)', boxShadow: 'var(--shadow-grapefruit)' }}
                  >
                    <span className="text-3xl font-black leading-none mb-1">−</span>
                    <span>둘이 함께 지출하기</span>
                  </button>
                </div>
              )}
            </div>
            <NumberPad onPress={handleKeypad} />
          </>
        )}

        {step === 'details' && (
          <>
            <Header
              showBack
              title={`${amountText(amount)}원`}
              titleColor={amountColor}
              onBack={() => setStep('amount')}
              onClose={close}
            />
            {txType === 'expense' && (
              <SplitSwitcher
                splitMode={splitMode}
                onToggle={handleToggleSplitMode}
                amount={amount}
                ratio={ratio}
                partnerName={firstOther?.name ?? '상대'}
              />
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <label className="flex items-center py-3" style={{ borderBottom: '1px solid var(--color-line)' }}>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="내역"
                  className="min-w-0 flex-1 bg-transparent text-[30px] font-semibold outline-none"
                  style={{ color: 'var(--color-ink)' }}
                  autoFocus
                />
                <ChevronDown size={30} strokeWidth={2.2} color="var(--color-muted)" />
              </label>

              <div className="mt-9 grid grid-cols-4 gap-x-5 gap-y-6">
                {activeCategories.map((category, index) => {
                  const selected = category.id === selectedCat.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className="flex min-w-0 flex-col items-center gap-2 active:scale-95"
                    >
                      <span
                        className="grid h-[68px] w-[68px] place-items-center rounded-full text-[31px] shadow-sm"
                        style={{
                          background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          color: '#fff',
                          boxShadow: selected ? `0 0 0 4px ${themeAccentColor}, var(--shadow-button)` : 'var(--shadow-soft)',
                        }}
                      >
                        {category.emoji}
                      </span>
                      <span className="w-full truncate text-center text-[15px] font-semibold" style={{ color: 'var(--color-muted)' }}>
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setMemo((previous) => (previous ? previous : ''))}
                className="mt-8 rounded-2xl px-5 py-4 text-2xl font-semibold active:scale-95"
                style={{ background: 'var(--color-accent-soft)', color: 'var(--color-ink)' }}
              >
                메모
              </button>
              <textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="메모를 입력하세요"
                className="mt-3 h-24 w-full resize-none rounded-2xl px-4 py-3 text-base outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-ink)' }}
              />

              {editingTx && (
                <button
                  type="button"
                  onClick={() => {
                    deleteTransaction(editingTx.id);
                    navigate('/');
                  }}
                  className="mt-4 flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-grapefruit)' }}
                >
                  <Delete size={17} />
                  내역 삭제
                </button>
              )}
            </div>
            <div className="px-5 pb-7 pt-3">
              <button
                type="button"
                disabled={amount <= 0}
                onClick={() => setStep('payment')}
                className="h-14 w-full rounded-2xl text-lg font-semibold text-white active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{
                  background:
                    amount <= 0
                      ? 'var(--color-faint)'
                      : txType === 'income'
                      ? 'var(--color-positive)'
                      : isMine
                      ? 'var(--color-theme-me)'
                      : 'var(--color-theme-together)',
                  boxShadow:
                    amount <= 0
                      ? 'none'
                      : txType === 'income'
                      ? 'var(--shadow-positive)'
                      : isMine
                      ? 'var(--shadow-theme-me)'
                      : 'var(--shadow-theme-together)',
                }}
              >
                {txType === 'income' ? (
                  <>
                    <Plus size={20} strokeWidth={2.8} />
                    <span>입금 방법 선택</span>
                  </>
                ) : isMine ? (
                  <span>👤 개인(나) 지출 방법 선택</span>
                ) : (
                  <span>
                    👥 둘이 함께 결제 방법 선택 ({ratio[0] === 50 ? '5:5' : `${ratio[0]}:${ratio[1]}`} 정산)
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <Header
              showBack
              showAddPayment={txType === 'income'}
              onBack={() => setStep('details')}
              onAddPayment={() => {
                if (txType === 'income') setShowPaymentEditor(true);
              }}
              onClose={close}
            />
            <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-24">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentId(method.id);
                    handleSave(method);
                  }}
                  className="h-[74px] w-full max-w-[270px] rounded-full text-[25px] font-light text-white shadow-sm active:scale-[0.98]"
                  style={{ background: method.color }}
                >
                  {method.name}
                </button>
              ))}
            </div>
          </>
        )}
      </Screen>

      {showPaymentEditor && step === 'payment' && txType === 'income' && (
        <PaymentMethodSheet
          paymentMethods={paymentMethods}
          onAdd={handleAddPaymentMethod}
          onClose={() => setShowPaymentEditor(false)}
        />
      )}
    </>
  );
}
