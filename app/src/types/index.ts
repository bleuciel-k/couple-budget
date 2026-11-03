// ─── User & Members ─────────────────────────────
export type UserRole = 'me' | 'partner' | 'member';
export type GroupPermission = 'owner' | 'member';
export type AvatarTone = 'accent' | 'accent2';

export interface User {
  id: string;
  uid?: string;
  email?: string | null;
  name: string;
  avatarLetter: string;
  tone: AvatarTone;
  role: UserRole;
  permission?: GroupPermission;
  anniversaryDate?: string; // ISO date string e.g. "2024-10-14"
  joinedAt?: string;
}

// ─── Category ───────────────────────────────────
export interface Category {
  id: string;
  name: string;
  emoji: string;
  color?: string;
}

// ─── Transaction ────────────────────────────────
export type TransactionType = 'expense' | 'income' | 'transfer';
export type WalletType = 'shared' | 'personal';
export type SplitType = 'half' | 'ratio' | 'mine' | 'partner' | 'none';

export interface SplitDetail {
  splitType: SplitType;
  myAmount: number;
  partnerAmount: number;
  ratio?: [number, number]; // e.g. [6, 4] for 60:40
  shares?: Record<string, number>; // per-user split amount for multi-member groups
  ratios?: Record<string, number>; // per-user ratio weights for multi-member groups
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  categoryId: string;
  date: string; // ISO datetime string
  paidBy: string; // user id
  walletType: WalletType;
  split: SplitDetail;
  memo?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  receiptImageUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Budget ─────────────────────────────────────
export interface CategoryBudget {
  categoryId: string;
  budgetAmount: number;
  spentAmount: number;
}

export interface MonthlyBudget {
  id: string;
  yearMonth: string; // "2026-05"
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
}

// ─── Goal / Savings ─────────────────────────────
export type GoalOwner = 'couple' | 'me' | 'partner';

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string; // ISO date
  owner: GoalOwner;
  createdAt: string;
}

// ─── Settlement ─────────────────────────────────
export type SettlementStatus = 'pending' | 'completed';

export interface Settlement {
  id: string;
  yearMonth: string; // "2026-05"
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: SettlementStatus;
  transactionIds: string[];
  completedAt?: string;
}

// ─── App Settings ───────────────────────────────
export type ThemeColor = 'pink' | 'coral' | 'lavender' | 'blue' | 'mint';
export type DefaultSplitType = 'mine' | 'half' | 'ratio';

export interface AppSettings {
  themeColor: ThemeColor;
  darkMode: boolean;
  partnerNotifications: boolean;
  defaultSplitType: DefaultSplitType;
  defaultSplitRatio: [number, number];
  currency: string;
}
