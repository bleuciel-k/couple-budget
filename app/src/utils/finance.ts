import type { SplitDetail, SplitType, Transaction, User } from '../types';

export function formatKRW(n: number) {
  return n.toLocaleString('ko-KR');
}

export function getYearMonth(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getActiveYearMonth(transactions: Transaction[], fallback = getYearMonth(new Date())) {
  const latest = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? getYearMonth(latest.date) : fallback;
}

export function isInYearMonth(date: string, yearMonth: string) {
  return getYearMonth(date) === yearMonth;
}

export function calculateSplit(
  amount: number,
  splitType: SplitType,
  ratio: [number, number] = [5, 5],
  participantIds: string[] = ['u1']
): SplitDetail {
  const ids = participantIds.length > 0 ? participantIds : ['u1'];
  const evenShare = Math.floor(amount / ids.length);
  const evenShares = Object.fromEntries(
    ids.map((id, index) => [id, evenShare + (index === ids.length - 1 ? amount - evenShare * ids.length : 0)])
  );

  if (splitType === 'none') {
    return { splitType, myAmount: amount, partnerAmount: 0, shares: { [ids[0]]: amount } };
  }

  if (splitType === 'mine') {
    return { splitType, myAmount: amount, partnerAmount: 0, shares: { [ids[0]]: amount } };
  }

  if (splitType === 'partner') {
    const target = ids[1] ?? ids[0];
    return { splitType, myAmount: 0, partnerAmount: amount, shares: { [target]: amount } };
  }

  if (splitType === 'ratio') {
    const weights = Object.fromEntries(ids.map((id, index) => [id, index === 0 ? ratio[0] : ratio[1]]));
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || ids.length;
    let assigned = 0;
    const shares = Object.fromEntries(
      ids.map((id, index) => {
        const value = index === ids.length - 1 ? amount - assigned : Math.round((amount * weights[id]) / totalWeight);
        assigned += value;
        return [id, value];
      })
    );
    return {
      splitType,
      myAmount: shares[ids[0]] ?? 0,
      partnerAmount: ids.slice(1).reduce((sum, id) => sum + (shares[id] ?? 0), 0),
      ratio,
      ratios: weights,
      shares,
    };
  }

  return {
    splitType: 'half',
    myAmount: evenShares[ids[0]] ?? 0,
    partnerAmount: ids.slice(1).reduce((sum, id) => sum + (evenShares[id] ?? 0), 0),
    shares: evenShares,
  };
}

export function calculateSettlement(transactions: Transaction[], yearMonth?: string, users: User[] = []) {
  const shared = transactions.filter((t) => {
    if (t.type !== 'expense' || t.walletType !== 'shared') return false;
    return yearMonth ? isInYearMonth(t.date, yearMonth) : true;
  });

  const me = users.find((u) => u.role === 'me') ?? users[0];
  const members = users.length > 0 ? users : me ? [me] : [];
  const balances = Object.fromEntries(members.map((u) => [u.id, 0]));

  const rows = shared.map((t) => {
    const paidByMe = Boolean(me && t.paidBy === me.id);
    const shares = t.split.shares ?? {
      [me?.id ?? 'u1']: t.split.myAmount,
      ...Object.fromEntries(members.filter((u) => u.id !== me?.id).map((u) => [u.id, t.split.partnerAmount])),
    };
    Object.entries(shares).forEach(([userId, share]) => {
      balances[userId] = (balances[userId] ?? 0) - share;
    });
    balances[t.paidBy] = (balances[t.paidBy] ?? 0) + t.amount;
    const oweDelta = paidByMe ? t.amount - (shares[t.paidBy] ?? 0) : -(shares[me?.id ?? ''] ?? 0);
    return { t, paidByMe, oweDelta };
  });

  const netAmount = me ? balances[me.id] ?? 0 : 0;
  const abs = Math.abs(netAmount);
  const debtors = Object.entries(balances).filter(([, value]) => value < 0).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balances).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const primaryDebtor = members.find((u) => u.id === debtors[0]?.[0]) ?? members[0];
  const primaryCreditor = members.find((u) => u.id === creditors[0]?.[0]) ?? members[0];
  const owes = netAmount > 0 ? primaryDebtor : me ?? primaryDebtor;
  const owed = netAmount > 0 ? me ?? primaryCreditor : primaryCreditor;

  return { rows, netAmount, abs, owes, owed, balances };
}
