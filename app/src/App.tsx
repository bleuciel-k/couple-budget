import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './components/layout/TabBar';
import { HomeScreen } from './screens/home/HomeScreen';
import { ReportScreen } from './screens/sub/ReportScreen';
import { GoalsScreen } from './screens/sub/GoalsScreen';
import { SettingsScreen } from './screens/sub/SettingsScreen';
import { SettleScreen } from './screens/sub/SettleScreen';
import { AddExpenseScreen } from './screens/flow/AddExpenseScreen';
import { AddSuccessScreen } from './screens/flow/AddSuccessScreen';
import { OnboardingScreen, InviteScreen, JoinedScreen } from './screens/flow/OnboardingFlow';
import { useStore } from './store';
import {
  clearActiveGroupId,
  completeRedirectSignIn,
  ensureGroup,
  getInviteGroupIdFromUrl,
  onFirebaseAuthChange,
  subscribeGroup,
} from './services/firebaseData';

const HIDE_TABBAR_PATHS = ['/add', '/add-success', '/onboarding'];

function OnboardingGate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const authStatus = useStore((state) => state.authStatus);

  useEffect(() => {
    if (authStatus === 'checking') return;
    const onboarded = localStorage.getItem('couple-budget-onboarded');
    const onOnboarding = pathname.startsWith('/onboarding');
    if (authStatus === 'signedOut' && !onOnboarding) {
      navigate('/onboarding', { replace: true });
      return;
    }
    if (authStatus === 'signedIn' && !onboarded && !onOnboarding) {
      navigate('/onboarding/invite', { replace: true });
    }
  }, [authStatus, navigate, pathname]);

  return null;
}

function getFirebaseErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return 'Firebase Authentication 제공자를 활성화해야 합니다. Email/Password와 Google 제공자 설정을 확인해 주세요.';
  }

  if (code === 'auth/unauthorized-domain') {
    return '현재 접속 도메인이 Firebase Auth 승인 도메인에 없습니다. localhost와 127.0.0.1을 승인 도메인에 추가해 주세요.';
  }

  if (code === 'permission-denied') {
    return 'Firestore 보안 규칙에서 현재 사용자의 읽기/쓰기가 허용되지 않았습니다.';
  }

  return error instanceof Error ? error.message : 'Firebase 연결에 실패했습니다.';
}

function AuthStateGate() {
  useEffect(() => {
    void completeRedirectSignIn().catch((error) => {
      useStore.getState().setFirebaseStatus('error', getFirebaseErrorMessage(error));
    });

    return onFirebaseAuthChange((profile) => {
      const store = useStore.getState();
      if (profile?.email) {
        localStorage.setItem('couple-budget-last-login-email', profile.email);
      }
      store.setAuthUser(profile ?? undefined);
      if (!profile) {
        store.clearRemoteSession();
      }
    });
  }, []);

  return null;
}

function FirebaseSyncGate() {
  const authUser = useStore((state) => state.authUser);
  const authStatus = useStore((state) => state.authStatus);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let disposed = false;

    if (authStatus === 'checking') {
      return undefined;
    }

    if (!authUser) {
      clearActiveGroupId();
      return undefined;
    }

    async function connect() {
      getInviteGroupIdFromUrl();
      const store = useStore.getState();
      store.setFirebaseStatus('connecting');

      try {
        const groupId = await ensureGroup({
          users: store.users,
          transactions: store.transactions,
          goals: store.goals,
          settlements: store.settlements,
          budget: store.budget,
          settings: store.settings,
        });

        if (disposed) return;

        store.setGroupId(groupId);
        unsubscribe = subscribeGroup(groupId, (payload) => {
          useStore.getState().applyRemoteData(payload);
        });
        store.setFirebaseStatus('connected');
      } catch (error) {
        if (disposed) return;
        useStore.getState().setFirebaseStatus('error', getFirebaseErrorMessage(error));
      }
    }

    void connect();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [authStatus, authUser]);

  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const hideTabBar = HIDE_TABBAR_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className="flex flex-col h-screen">
      <AuthStateGate />
      <OnboardingGate />
      <FirebaseSyncGate />
      <Routes>
        {/* Main tabs */}
        <Route path="/" element={<HomeScreen />} />
        <Route path="/report" element={<ReportScreen />} />
        <Route path="/goals" element={<GoalsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/settle" element={<SettleScreen />} />
        {/* Flow */}
        <Route path="/add" element={<AddExpenseScreen />} />
        <Route path="/add-success" element={<AddSuccessScreen />} />
        {/* Onboarding */}
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/onboarding/invite" element={<InviteScreen />} />
        <Route path="/onboarding/joined" element={<JoinedScreen />} />
      </Routes>
      {!hideTabBar && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
