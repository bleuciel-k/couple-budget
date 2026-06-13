import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction, Goal, MonthlyBudget, AppSettings, Settlement, User } from '../types';
import { USERS, TRANSACTIONS, GOALS, BUDGET, DEFAULT_SETTINGS } from './data';
import {
  type AuthProfile,
  deleteGoalDoc,
  deleteTransactionDoc,
  deleteUserDoc,
  saveGoal,
  saveGroupMeta,
  saveSettlement,
  saveTransaction,
  saveUser,
} from '../services/firebaseData';

interface AppState {
  authStatus: 'checking' | 'signedOut' | 'signedIn';
  authUser?: AuthProfile;
  firebaseStatus: 'idle' | 'connecting' | 'connected' | 'error';
  firebaseError?: string;
  groupId?: string;
  users: User[];
  transactions: Transaction[];
  goals: Goal[];
  settlements: Settlement[];
  budget: MonthlyBudget;
  settings: AppSettings;

  // Transaction actions
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Transaction actions
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Goal actions
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Budget actions
  updateBudget: (budget: MonthlyBudget) => void;

  // Settlement actions
  addSettlement: (settlement: Settlement) => void;
  updateSettlement: (id: string, updates: Partial<Settlement>) => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Firebase sync
  setAuthUser: (user?: AuthProfile) => void;
  setFirebaseStatus: (status: AppState['firebaseStatus'], error?: string) => void;
  setGroupId: (groupId: string) => void;
  applyRemoteData: (payload: Partial<Pick<AppState, 'users' | 'transactions' | 'goals' | 'settlements' | 'budget' | 'settings'>>) => void;
  clearRemoteSession: () => void;

  // Data
  resetDemoData: () => void;
}

const initialState = {
  authStatus: 'checking' as const,
  authUser: undefined,
  firebaseStatus: 'idle' as const,
  firebaseError: undefined,
  groupId: undefined,
  users: USERS,
  transactions: TRANSACTIONS,
  goals: GOALS,
  settlements: [] as Settlement[],
  budget: BUDGET,
  settings: DEFAULT_SETTINGS,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      addUser: (user) =>
        set((s) => {
          void saveUser(user);
          return { users: [...s.users, user] };
        }),

      updateUser: (id, updates) =>
        set((s) => {
          const nextUsers = s.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
          const nextUser = nextUsers.find((u) => u.id === id);
          if (nextUser) void saveUser(nextUser);
          return { users: nextUsers };
        }),

      deleteUser: (id) =>
        set((s) => {
          void deleteUserDoc(id);
          return {
            users: s.users.filter((u) => u.id !== id || u.role === 'me'),
            transactions: s.transactions.filter((t) => t.paidBy !== id),
          };
        }),

      addTransaction: (tx) =>
        set((s) => {
          void saveTransaction(tx);
          return { transactions: [tx, ...s.transactions] };
        }),

      updateTransaction: (id, updates) =>
        set((s) => {
          const transactions = s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          );
          const transaction = transactions.find((t) => t.id === id);
          if (transaction) void saveTransaction(transaction);
          return { transactions };
        }),

      deleteTransaction: (id) =>
        set((s) => {
          void deleteTransactionDoc(id);
          return { transactions: s.transactions.filter((t) => t.id !== id) };
        }),

      addGoal: (goal) =>
        set((s) => {
          void saveGoal(goal);
          return { goals: [...s.goals, goal] };
        }),

      updateGoal: (id, updates) =>
        set((s) => {
          const goals = s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
          const goal = goals.find((g) => g.id === id);
          if (goal) void saveGoal(goal);
          return { goals };
        }),

      deleteGoal: (id) =>
        set((s) => {
          void deleteGoalDoc(id);
          return { goals: s.goals.filter((g) => g.id !== id) };
        }),

      updateBudget: (budget) =>
        set(() => {
          void saveGroupMeta({ budget });
          return { budget };
        }),

      addSettlement: (settlement) =>
        set((s) => {
          void saveSettlement(settlement);
          return { settlements: [settlement, ...s.settlements] };
        }),

      updateSettlement: (id, updates) =>
        set((s) => {
          const settlements = s.settlements.map((settlement) =>
            settlement.id === id ? { ...settlement, ...updates } : settlement
          );
          const settlement = settlements.find((item) => item.id === id);
          if (settlement) void saveSettlement(settlement);
          return { settlements };
        }),

      updateSettings: (updates) =>
        set((s) => {
          const settings = { ...s.settings, ...updates };
          void saveGroupMeta({ settings });
          return { settings };
        }),

      setAuthUser: (authUser) =>
        set(() => ({
          authUser,
          authStatus: authUser ? 'signedIn' : 'signedOut',
        })),

      setFirebaseStatus: (firebaseStatus, firebaseError) =>
        set(() => ({ firebaseStatus, firebaseError })),

      setGroupId: (groupId) =>
        set(() => ({ groupId })),

      applyRemoteData: (payload) =>
        set((s) => ({
          users: payload.users
            ? [...payload.users].sort((a, b) => (a.role === 'me' ? -1 : b.role === 'me' ? 1 : 0))
            : s.users,
          transactions: payload.transactions ?? s.transactions,
          goals: payload.goals ?? s.goals,
          settlements: payload.settlements ?? s.settlements,
          budget: payload.budget ?? s.budget,
          settings: payload.settings ?? s.settings,
        })),

      clearRemoteSession: () =>
        set(() => ({
          ...initialState,
          authStatus: 'signedOut',
        })),

      resetDemoData: () => set(() => initialState),
    }),
    {
      name: 'couple-budget-store',
      version: 3,
      migrate: () => initialState,
      partialize: (state) => ({
        users: state.users,
        transactions: state.transactions,
        goals: state.goals,
        settlements: state.settlements,
        budget: state.budget,
        settings: state.settings,
        groupId: state.groupId,
      }),
    }
  )
);

export const useMe = () => useStore.getState().users.find((u) => u.role === 'me')!;
export const useMembers = () => useStore.getState().users;
