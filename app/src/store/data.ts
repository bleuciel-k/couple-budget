import type { User, Category, Transaction, MonthlyBudget, Goal, AppSettings } from '../types';

export const USERS: User[] = [
  { id: 'u1', name: '나', avatarLetter: 'N', tone: 'accent', role: 'me' },
  { id: 'u2', name: '공유 멤버', avatarLetter: 'M', tone: 'accent2', role: 'partner' },
];

export const CATEGORIES: Category[] = [
  { id: 'c1', name: '데이트·외식', emoji: '🍝' },
  { id: 'c2', name: '교통', emoji: '🚕' },
  { id: 'c3', name: '쇼핑', emoji: '🛍' },
  { id: 'c4', name: '문화생활', emoji: '🎬' },
  { id: 'c5', name: '주거·공과금', emoji: '🏠' },
  { id: 'c6', name: '식료품', emoji: '🛒' },
  { id: 'c7', name: '커피·카페', emoji: '☕' },
  { id: 'c8', name: '기타', emoji: '📦' },
  { id: 'i1', name: '월급', emoji: '💼' },
  { id: 'i2', name: '용돈', emoji: '🎁' },
  { id: 'i3', name: '환급', emoji: '↩' },
  { id: 'i4', name: '보너스', emoji: '✨' },
  { id: 'i5', name: '이자', emoji: '🏦' },
  { id: 'i6', name: '기타입금', emoji: '➕' },
];

export const TRANSACTIONS: Transaction[] = [];

export const BUDGET: MonthlyBudget = {
  id: 'b1', yearMonth: new Date().toISOString().slice(0, 7), totalBudget: 0,
  categoryBudgets: [
    { categoryId: 'c1', budgetAmount: 0, spentAmount: 0 },
    { categoryId: 'c5', budgetAmount: 0, spentAmount: 0 },
    { categoryId: 'c6', budgetAmount: 0, spentAmount: 0 },
    { categoryId: 'c4', budgetAmount: 0, spentAmount: 0 },
    { categoryId: 'c2', budgetAmount: 0, spentAmount: 0 },
  ],
};

export const GOALS: Goal[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  themeColor: 'mint',
  darkMode: false,
  partnerNotifications: true,
  defaultSplitType: 'mine',
  defaultSplitRatio: [50, 50],
  currency: 'KRW',
};
