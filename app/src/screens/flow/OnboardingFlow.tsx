import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Copy, Check, ChevronRight, Heart } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { useStore } from '../../store';
import {
  createEmailAccount,
  getInviteLink as getFirebaseInviteLink,
  sendAccountPasswordReset,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  updateCurrentAccount,
} from '../../services/firebaseData';

// ── Helpers ───────────────────────────────────
function markOnboarded() {
  localStorage.setItem('couple-budget-onboarded', '1');
}

function getAuthErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 해당 로그인 제공자를 활성화해야 합니다. Email/Password와 Google 제공자 상태를 확인해 주세요.';
    case 'auth/unauthorized-domain':
      return '현재 접속 도메인이 Firebase Auth 승인 도메인에 없습니다. Firebase 콘솔에서 localhost와 127.0.0.1을 승인 도메인에 추가해 주세요.';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다. 로그인 탭에서 다시 시도해 주세요.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/account-exists-with-different-credential':
      return '같은 이메일로 다른 로그인 방식이 이미 연결되어 있습니다. 기존 방식으로 로그인해 주세요.';
    case 'auth/popup-blocked':
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '브라우저가 로그인 팝업을 막았습니다. Google 로그인은 리다이렉트 방식으로 다시 시도해 주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
    case 'auth/missing-email':
      return '비밀번호를 재설정할 이메일을 입력해 주세요.';
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return error instanceof Error ? error.message : '로그인에 실패했습니다.';
  }
}

// ── QR sketch ────────────────────────────────
const QR_CELLS = Array.from({ length: 49 }, (_, i) =>
  [0,1,2,6,7,8,9,14,16,17,19,21,22,24,25,27,28,30,31,32,36,37,40,41,42,43,48].includes(i)
);

function QRSketch() {
  return (
    <div
      className="grid gap-0.5 p-2 rounded-xl"
      style={{ gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--color-line)' }}
    >
      {QR_CELLS.map((on, i) => (
        <div
          key={i}
          className="w-3 h-3"
          style={{
            background: on ? 'var(--color-ink)' : 'transparent',
            border: on ? 'none' : '0.8px dotted var(--color-faint)',
          }}
        />
      ))}
    </div>
  );
}

// ── Feature line ──────────────────────────────
function FeatureLine({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div
      className="flex gap-3 items-start px-3 py-3 rounded-xl"
      style={{ border: '1px solid var(--color-line)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm" style={{ color: 'var(--color-muted)' }}>{body}</div>
      </div>
    </div>
  );
}

// ── Setup row ─────────────────────────────────
function SetupRow({
  n, label, hint, done, last, onToggle,
}: {
  n: string; label: string; hint: string; done: boolean; last?: boolean; onToggle?: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 py-3 w-full text-left"
      style={{ borderBottom: last ? 'none' : '1px dotted var(--color-faint)' }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
        style={{
          border: '1px solid var(--color-line)',
          background: done ? 'var(--color-accent)' : 'transparent',
          color: done ? '#fff' : 'var(--color-ink)',
        }}
      >
        {done ? <Check size={12} /> : n}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{hint}</div>
      </div>
      <ChevronRight size={14} color="var(--color-muted)" />
    </button>
  );
}

// ══════════════════════════════════════════════
// SCREEN 1 — Welcome
// ══════════════════════════════════════════════
export function OnboardingScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authStatus, authUser, firebaseError } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const hasInvite = Boolean(searchParams.get('group') && searchParams.get('invite'));
  const trimmedEmail = email.trim();
  const emailPasswordReady = mode === 'signup' ? password.length >= 6 : password.length > 0;
  const canSubmitEmail = Boolean(trimmedEmail && emailPasswordReady && !busy);
  const lastLoginEmail =
    typeof window !== 'undefined' ? localStorage.getItem('couple-budget-last-login-email') ?? '' : '';

  useEffect(() => {
    if (authStatus === 'signedIn' && authUser) {
      navigate(hasInvite ? `/onboarding/joined?${searchParams.toString()}` : '/onboarding/invite', { replace: true });
    }
  }, [authStatus, authUser, hasInvite, navigate, searchParams]);

  async function handleEmailAuth() {
    setAuthError('');
    if (!trimmedEmail) {
      setAuthError('이메일을 입력해 주세요.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setAuthError('가입 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await createEmailAccount(trimmedEmail, password, displayName.trim() || trimmedEmail.split('@')[0]);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
      localStorage.setItem('couple-budget-last-login-email', trimmedEmail);
      navigate(hasInvite ? `/onboarding/joined?${searchParams.toString()}` : '/onboarding/invite', { replace: true });
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleProviderAuth(provider: 'google' | 'apple') {
    setAuthError('');
    setBusy(true);
    try {
      const profile = await (provider === 'google' ? signInWithGoogle() : signInWithApple());
      if (profile) {
        if (profile.email) localStorage.setItem('couple-budget-last-login-email', profile.email);
        navigate(hasInvite ? `/onboarding/joined?${searchParams.toString()}` : '/onboarding/invite', { replace: true });
      } else {
        setAuthError('Google 로그인 화면으로 이동합니다. 로그인 후 앱으로 돌아오면 계속 진행됩니다.');
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function continueSignedIn() {
    navigate(hasInvite ? `/onboarding/joined?${searchParams.toString()}` : '/onboarding/invite');
  }

  async function handlePasswordReset() {
    setRecoveryMessage('');
    setAuthError('');
    const targetEmail = (recoveryEmail || trimmedEmail || lastLoginEmail).trim();
    if (!targetEmail) {
      setRecoveryMessage('가입한 이메일을 입력하면 비밀번호 재설정 메일을 보내드릴게요.');
      return;
    }

    setBusy(true);
    try {
      await sendAccountPasswordReset(targetEmail);
      localStorage.setItem('couple-budget-last-login-email', targetEmail);
      setRecoveryMessage(`${targetEmail}로 비밀번호 재설정 메일을 보냈습니다.`);
    } catch (error) {
      setRecoveryMessage(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-paper)]">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 pt-20 pb-4 px-6">
        <div className="relative flex items-center">
          <Avatar letter="J" tone="accent" size={72} />
          <span
            className="absolute text-2xl"
            style={{ left: 52, top: 16, color: 'var(--color-accent)', zIndex: 1 }}
          >
            ♥
          </span>
          <div
            className="inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0"
            style={{
              width: 72, height: 72,
              background: 'transparent',
              border: '1px dashed var(--color-line)',
              fontSize: 28,
              color: 'var(--color-muted)',
              marginLeft: -16,
            }}
          >
            ?
          </div>
        </div>

        <div className="text-4xl font-bold text-center leading-tight">
          우리 둘의<br />가계부
        </div>
        <div className="text-base text-center leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          데이트 지출부터 공동 저축까지,<br />함께 기록하고 나눠 봐요
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 flex flex-col gap-3 px-6 py-2 overflow-y-auto">
        <FeatureLine icon="💝" title="공동 지갑 / 개인 지갑" body="누가 얼마 냈는지 자동으로 기록" />
        <FeatureLine icon="📊" title="월간 정산" body="서로 얼마 주고받을지 한눈에" />
        <FeatureLine icon="🎯" title="함께 모으는 목표" body="여행, 데이트 자금, 둘만의 저축" />
        <FeatureLine icon="🔔" title="실시간 공유" body="상대 지출이 바로 내 앱에" />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 px-6 pb-12 pt-4">
        {authStatus === 'signedIn' && authUser ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(47,128,237,0.10)' }}>
              <div className="text-sm font-semibold">{authUser.displayName}</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{authUser.email}</div>
            </div>
            <button
              onClick={continueSignedIn}
              className="w-full py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--color-accent)',
                border: '1px solid var(--color-line)',
                boxShadow: 'var(--shadow-button)',
                color: '#fff',
              }}
            >
              {hasInvite ? '초대 수락 계속하기' : '커플 공간 만들기'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('signup')}
                className="rounded-xl py-2 text-sm font-semibold"
                style={{ background: mode === 'signup' ? 'var(--color-accent)' : 'var(--color-paper)', color: mode === 'signup' ? '#fff' : 'var(--color-ink)', border: '1px solid var(--color-line)' }}
              >
                가입
              </button>
              <button
                onClick={() => setMode('login')}
                className="rounded-xl py-2 text-sm font-semibold"
                style={{ background: mode === 'login' ? 'var(--color-accent)' : 'var(--color-paper)', color: mode === 'login' ? '#fff' : 'var(--color-ink)', border: '1px solid var(--color-line)' }}
              >
                로그인
              </button>
            </div>
            {mode === 'signup' && (
              <input
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                placeholder="이름"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            )}
            <input
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              placeholder="이메일"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              placeholder="비밀번호"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === 'signup' && password && password.length < 6 && (
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                비밀번호는 6자 이상이어야 합니다.
              </div>
            )}
            {(authError || firebaseError) && (
              <div className="text-xs font-mono" style={{ color: '#d64545' }}>
                {authError || firebaseError}
              </div>
            )}
            <button
              onClick={handleEmailAuth}
              disabled={!canSubmitEmail}
              className="w-full py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: 'var(--color-accent)',
                border: '1px solid var(--color-line)',
                boxShadow: 'var(--shadow-button)',
                color: '#fff',
              }}
            >
              {mode === 'signup' ? '이메일로 가입' : '이메일로 로그인'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryOpen((open) => !open);
                setRecoveryEmail((prev) => prev || trimmedEmail || lastLoginEmail);
                setRecoveryMessage('');
              }}
              className="text-xs font-mono text-center"
              style={{ color: 'var(--color-muted)' }}
            >
              아이디 / 비밀번호를 잊으셨나요?
            </button>
            {recoveryOpen && (
              <div
                className="rounded-2xl px-3 py-3 flex flex-col gap-2"
                style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.08)' }}
              >
                <div className="text-sm font-semibold">계정 찾기</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  이 앱의 아이디는 이메일입니다.
                  {lastLoginEmail ? ` 이 기기에서 마지막으로 사용한 이메일은 ${lastLoginEmail} 입니다.` : ' 이전 로그인 기록이 없으면 가입한 이메일을 직접 입력해 주세요.'}
                </div>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                  placeholder="비밀번호 재설정 이메일"
                  type="email"
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                />
                {recoveryMessage && (
                  <div className="text-xs font-mono" style={{ color: recoveryMessage.includes('보냈습니다') ? '#1677c9' : '#d64545' }}>
                    {recoveryMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: 'var(--color-accent)',
                    border: '1px solid var(--color-line)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-button)',
                  }}
                >
                  비밀번호 재설정 메일 보내기
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleProviderAuth('google')}
                disabled={busy}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ border: '1px solid var(--color-line)' }}
              >
                Google
              </button>
              <button
                onClick={() => handleProviderAuth('apple')}
                disabled={busy}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ border: '1px solid var(--color-line)' }}
              >
                Apple
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN 2 — Invite / Profile Setup
// ══════════════════════════════════════════════
export function InviteScreen() {
  const navigate = useNavigate();
  const { updateSettings, updateUser, authUser, groupId } = useStore();
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const inviteLink = await getFirebaseInviteLink(groupId);
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    markOnboarded();
    if (authUser) {
      const nextName = myName.trim();
      if (nextName) {
        await updateCurrentAccount({ displayName: nextName });
        updateUser(authUser.uid, {
          name: nextName,
          avatarLetter: nextName.slice(0, 1).toUpperCase(),
          anniversaryDate: anniversary || undefined,
        });
      } else if (anniversary) {
        updateUser(authUser.uid, { anniversaryDate: anniversary });
      }
    }
    updateSettings({});
    navigate('/');
  }

  function handleViewJoined() {
    markOnboarded();
    navigate('/onboarding/joined');
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--color-paper)]">
      {/* TopBar */}
      <div className="flex items-center px-4 pt-12 pb-3" style={{ boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}>
        <button onClick={() => navigate('/onboarding')} className="w-14 flex items-center">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 text-center text-lg font-semibold">파트너 초대</div>
        <button onClick={handleStart} className="w-14 flex justify-end">
          <X size={20} color="var(--color-ink)" />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* Title */}
        <div>
          <div className="text-xl font-bold">공유 멤버를 초대해 보세요</div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            링크를 보내면 곧바로 함께 기록할 수 있어요
          </div>
        </div>

        {/* Profile fields */}
        <div
          className="rounded-2xl px-4 py-4 flex flex-col gap-3"
          style={{ border: '1px solid var(--color-line)' }}
        >
          <div className="text-sm font-semibold">프로필 설정</div>
          {[
            { label: '내 이름', value: myName, onChange: setMyName, placeholder: '내 이름' },
            { label: '멤버 이름 (선택)', value: partnerName, onChange: setPartnerName, placeholder: '공유 멤버' },
          ].map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
              <input
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-muted)' }}>사귄 날 (기념일)</div>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
            />
          </div>
        </div>

        {/* Invite code */}
        <div
          className="rounded-2xl px-4 py-4 flex flex-col items-center gap-2"
          style={{ border: '1px solid var(--color-line)', background: 'rgba(47,128,237,0.12)' }}
        >
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>INVITE GROUP</div>
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: 'monospace' }}
          >
            {groupId ? groupId.slice(-10).toUpperCase() : '준비 중'}
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>링크를 받은 멤버가 같은 그룹에 연결돼요</div>
        </div>

        {/* QR + share buttons */}
        <div className="flex gap-3 items-start">
          <div
            className="flex-shrink-0 rounded-xl p-2"
            style={{ border: '1px dashed var(--color-line)' }}
          >
            <QRSketch />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={handleCopy}
              disabled={!groupId}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: '1px solid var(--color-line)' }}
            >
              <span>{copied ? '복사됐어요!' : groupId ? '링크 복사' : '연결 대기'}</span>
              {copied ? <Check size={15} color="#1677c9" /> : <Copy size={15} />}
            </button>
            {[
              { label: '카카오톡으로', emoji: '💬' },
              { label: '메시지로', emoji: '📩' },
            ].map(({ label, emoji }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ border: '1px solid var(--color-line)', color: 'var(--color-muted)' }}
              >
                <span>{label}</span>
                <span>{emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1" style={{ borderTop: '1px dotted var(--color-faint)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>또는</span>
          <div className="flex-1" style={{ borderTop: '1px dotted var(--color-faint)' }} />
        </div>

        {/* Demo: simulate partner joined */}
        <button
          onClick={handleViewJoined}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ border: '1px solid var(--color-line)', color: 'var(--color-muted)' }}
        >
          파트너가 수락한 상황 보기 (데모)
        </button>

        {/* Solo start */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-95"
          style={{
            background: 'var(--color-accent)',
            border: '1px solid var(--color-line)',
            boxShadow: 'var(--shadow-button)',
            color: '#fff',
          }}
        >
          혼자 먼저 시작 (나중에 초대)
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN 3 — Partner Joined / Connected
// ══════════════════════════════════════════════
export function JoinedScreen() {
  const navigate = useNavigate();
  const { firebaseStatus, groupId } = useStore();
  const [done, setDone] = useState([true, false, false, false]);

  const setupItems = [
    { label: '공동 지갑 / 개인 지갑', hint: '누가 돈을 관리할지' },
    { label: '이번 달 함께 예산', hint: '권장 80만원' },
    { label: '기본 분담 비율', hint: '기본 5:5' },
    { label: '함께 모으는 목표', hint: '선택 사항' },
  ];

  function handleStart() {
    markOnboarded();
    navigate('/add');
  }

  function handleLater() {
    markOnboarded();
    navigate('/');
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-paper)]">
      {/* TopBar */}
      <div
        className="flex items-center px-4 pt-12 pb-3"
        style={{ boxShadow: '0 10px 22px rgba(31,42,68,0.04)' }}
      >
        <button onClick={() => navigate('/onboarding/invite')} className="w-14 flex items-center">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 text-center text-lg font-semibold">연결 완료</div>
        <div className="w-14" />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-8 pb-4 px-6 text-center">
        <div className="flex items-center">
          <Avatar letter="N" tone="accent" size={64} />
          <Heart
            size={28}
            className="mx-2"
            fill="var(--color-accent)"
            color="var(--color-accent)"
          />
          <Avatar letter="M" tone="accent2" size={64} />
        </div>
        <div className="text-2xl font-bold mt-2">공유 멤버와 연결됐어요!</div>
        <div className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {firebaseStatus === 'connected' && groupId ? '이제 함께 기록을 시작해 볼까요?' : '계정 연결을 확인하고 있어요'}
        </div>
      </div>

      {/* Setup checklist */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div
          className="rounded-2xl px-4 py-1"
          style={{ border: '1px solid var(--color-line)' }}
        >
          <div className="text-base font-semibold py-3" style={{ borderBottom: '1px dotted var(--color-faint)' }}>
            먼저 설정해두면 편한 것들
          </div>
          {setupItems.map((item, i) => (
            <SetupRow
              key={i}
              n={String(i + 1)}
              label={item.label}
              hint={item.hint}
              done={done[i]}
              last={i === setupItems.length - 1}
              onToggle={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
            />
          ))}
        </div>

        {/* Tip note */}
        <div
          className="rounded-xl px-4 py-3 mt-4 flex gap-2"
          style={{
            border: '1px solid var(--color-line)',
            background: 'rgba(47,128,237,0.12)',
            transform: 'rotate(-0.5deg)',
          }}
        >
          <span className="text-lg">💡</span>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            지출은 각자 자기 앱에서 입력해도 자동으로 공유돼요.
            상대가 영수증 사진을 찍으면 내 앱에도 알림이 떠요.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 px-5 pb-12 pt-4">
        <button
          onClick={handleLater}
          className="flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{ border: '1px solid var(--color-line)' }}
        >
          나중에
        </button>
        <button
          onClick={handleStart}
          className="flex-[2] py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-95"
          style={{
            background: 'var(--color-accent)',
            border: '1px solid var(--color-line)',
            boxShadow: 'var(--shadow-button)',
            color: '#fff',
          }}
        >
          첫 지출 기록하기
        </button>
      </div>
    </div>
  );
}
