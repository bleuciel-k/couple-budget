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
  { id: 'card', name: '카드', color: '#7fb8f5' },
];

const PAYMENT_METHOD_EXAMPLES = ['PayPay', 'au PAY', 'Rakuten Pay', 'LINE Pay'];
const PAYMENT_METHOD_COLORS = ['#66a9f2', '#8fc6ff', '#5e95d8', '#9fd3ff', '#4f86d9'];
const CATEGORY_COLORS = ['#2f80ed', '#66a9f2', '#7fb8f5', '#9fd3ff', '#5e95d8', '#82c6f2', '#4f86d9', '#b8dfff'];
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
    <div className="flex items-center gap-2 px-5 pt-12 pb-4 shrink-0">
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
          style={{ background: 'rgba(47,128,237,0.1)' }}
          aria-label="결제 방법 추가"
        >
          <Plus size={27} strokeWidth={2.5} color="var(--color-accent)" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="w-11 h-11 grid place-items-center rounded-full active:opacity-70"
        style={{ background: 'rgba(47,128,237,0.1)' }}
        aria-label="닫기"
      >
        <X size={28} strokeWidth={2.4} color="var(--color-ink)" />
      </button>
    </div>
  );
}

function NumberPad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <div className="rounded-t-[32px] px-3 pt-5 pb-9 shrink-0" style={{ background: 'var(--color-bg)' }}>
      <div className="grid grid-cols-3 gap-3">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              onPress(key);
            }}
            className={`h-[58px] rounded-2xl text-[32px] font-semibold active:scale-[0.98] ${
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
            style={{ background: 'var(--color-accent)', boxShadow: 'var(--shadow-button)' }}
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
                style={{ background: 'rgba(47,128,237,0.1)', color: 'var(--color-ink)' }}
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
  const [splitMode] = useState<SplitMode>(
    editingTx?.split.splitType === 'ratio'
      ? 'ratio'
      : editingTx?.split.splitType === 'mine' || editingTx?.split.splitType === 'partner'
        ? editingTx.split.splitType
        : settings.defaultSplitType
  );
  const [ratio] = useState<[number, number]>(editingTx?.split.ratio ?? settings.defaultSplitRatio);

  const amount = parseInt(rawAmount || '0', 10);
  const activeCategories = categoriesFor(txType);
  const selectedCat = activeCategories.find((category) => category.id === categoryId) ?? activeCategories[0];
  const selectedPayment = paymentMethods.find((method) => method.id === selectedPaymentId) ?? paymentMethods[0];
  const amountColor = txType === 'income' ? '#278f6e' : 'var(--color-accent)';
  const split = useMemo(
    () => calculateSplit(amount, txType === 'expense' ? splitMode : 'none', ratio, shareUsers.map((user) => user.id)),
    [amount, ratio, shareUsers, splitMode, txType]
  );

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
            <div className="flex-1 px-7 pt-8">
              <div className="flex items-center justify-between">
                <div className="text-[82px] font-semibold leading-none" style={{ color: 'var(--color-muted)' }}>
                  ₩
                </div>
                <div className="flex items-center">
                  <div
                    className="max-w-[250px] truncate text-right text-[84px] font-semibold leading-none"
                    style={{ color: amount > 0 ? amountColor : 'var(--color-accent)' }}
                  >
                    {amountText(amount)}
                  </div>
                  <div className="ml-2 h-[104px] w-[3px] animate-pulse rounded-full" style={{ background: 'var(--color-accent)' }} />
                </div>
              </div>
              <div className="mt-20 grid grid-cols-2 gap-7">
                <button
                  type="button"
                  onClick={() => chooseType('income')}
                  className="h-20 rounded-2xl text-3xl font-semibold text-white active:scale-[0.98]"
                  style={{ background: '#278f6e', boxShadow: 'var(--shadow-button)' }}
                >
                  입금
                </button>
                <button
                  type="button"
                  onClick={() => chooseType('expense')}
                  className="h-20 rounded-2xl text-3xl font-semibold text-white active:scale-[0.98]"
                  style={{ background: 'var(--color-accent)', boxShadow: 'var(--shadow-button)' }}
                >
                  지출
                </button>
              </div>
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
                          boxShadow: selected ? '0 0 0 4px var(--color-accent2), var(--shadow-button)' : 'var(--shadow-soft)',
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
                className="mt-8 rounded-xl px-5 py-4 text-2xl font-semibold active:scale-95"
                style={{ background: 'rgba(47,128,237,0.08)', color: 'var(--color-ink)' }}
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
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-red-500"
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
                className="h-14 w-full rounded-2xl text-lg font-semibold text-white active:scale-[0.99] disabled:shadow-none"
                style={{
                  background: amount > 0 ? 'var(--color-accent)' : 'var(--color-faint)',
                  boxShadow: amount > 0 ? 'var(--shadow-button)' : 'none',
                }}
              >
                {txType === 'income' ? '입금 방법 선택' : '결제 방법 선택'}
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
