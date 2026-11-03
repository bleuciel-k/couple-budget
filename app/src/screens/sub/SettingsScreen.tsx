import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/layout/TopBar';
import { Screen } from '../../components/layout/Screen';
import { Avatar } from '../../components/ui/Avatar';
import { Pill } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import {
  deleteCurrentAccount,
  getInviteLink as getFirebaseInviteLink,
  sendAccountPasswordReset,
  signOutCurrentUser,
  updateCurrentAccount,
} from '../../services/firebaseData';

function getDday(anniversaryDate?: string) {
  if (!anniversaryDate) return 0;
  const anniversary = new Date(anniversaryDate);
  const now = new Date();
  return Math.floor((now.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24));
}

interface SettingRowProps {
  icon: string;
  label: string;
  hint?: string;
  value?: string;
  last?: boolean;
}

function SettingRow({ icon, label, hint, value, last }: SettingRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: last ? 'none' : '1px dotted var(--color-faint)' }}
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{hint}</div>}
      </div>
      {value && (
        <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>
          {value}
        </span>
      )}
      <ChevronRight size={14} color="var(--color-muted)" />
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-mono px-1 mb-1.5" style={{ color: 'var(--color-muted)' }}>
        {title}
      </div>
      <div
        className="rounded-2xl px-3.5 py-1"
        style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
      >
        {children}
      </div>
    </div>
  );
}

function SplitRatioSection({
  ratio,
  defaultSplitType,
  partnerName,
  onChange,
}: {
  ratio: [number, number];
  defaultSplitType: 'mine' | 'half' | 'ratio';
  partnerName: string;
  onChange: (updates: { defaultSplitRatio: [number, number]; defaultSplitType: 'mine' | 'half' | 'ratio' }) => void;
}) {
  const rawMy = ratio[0] <= 10 && ratio[1] <= 10 ? ratio[0] * 10 : ratio[0];
  const [sliderVal, setSliderVal] = useState(rawMy);

  useEffect(() => {
    setSliderVal(rawMy);
  }, [rawMy]);

  const partnerVal = 100 - sliderVal;

  const handleRatioChange = (my: number) => {
    const clamped = Math.max(10, Math.min(90, my));
    setSliderVal(clamped);
    const partner = 100 - clamped;
    onChange({
      defaultSplitRatio: [clamped, partner],
      defaultSplitType: defaultSplitType === 'mine' ? 'mine' : clamped === 50 ? 'half' : 'ratio',
    });
  };

  return (
    <div className="py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg w-6 text-center">⚖️</span>
          <div>
            <div className="text-sm font-semibold">둘이 함께 분담 비율</div>
            <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
              100% 기준으로 드래그해서 바로 조절
            </div>
          </div>
        </div>
        <div
          className="text-xs font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
        >
          <span style={{ color: 'var(--color-theme-me)' }}>나 {sliderVal}%</span>
          <span style={{ color: 'var(--color-muted)' }}>:</span>
          <span style={{ color: 'var(--color-theme-together)' }}>{partnerName} {partnerVal}%</span>
        </div>
      </div>

      {/* Visual Proportional Bar */}
      <div
        className="h-10 w-full rounded-2xl overflow-hidden flex relative shadow-inner p-1"
        style={{ background: 'rgba(31,42,68,0.06)' }}
      >
        <div
          className="h-full rounded-xl flex items-center justify-center font-bold text-xs text-white transition-all duration-150 select-none overflow-hidden"
          style={{
            width: `${sliderVal}%`,
            background: 'var(--color-theme-me)',
            boxShadow: 'var(--shadow-theme-me)',
          }}
        >
          {sliderVal >= 25 ? `나 ${sliderVal}%` : sliderVal >= 15 ? `${sliderVal}%` : ''}
        </div>
        <div
          className="h-full rounded-xl flex items-center justify-center font-bold text-xs text-white transition-all duration-150 select-none overflow-hidden ml-1"
          style={{
            width: `${partnerVal}%`,
            background: 'var(--color-theme-together)',
            boxShadow: 'var(--shadow-theme-together)',
          }}
        >
          {partnerVal >= 25 ? `${partnerName} ${partnerVal}%` : partnerVal >= 15 ? `${partnerVal}%` : ''}
        </div>
      </div>

      {/* Draggable Slider */}
      <div className="px-1 pt-1">
        <input
          type="range"
          min="10"
          max="90"
          step="5"
          value={sliderVal}
          onChange={(e) => handleRatioChange(Number(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-theme-me) 0%, var(--color-theme-me) ${sliderVal}%, var(--color-theme-together) ${sliderVal}%, var(--color-theme-together) 100%)`,
          }}
        />
        <div className="flex justify-between text-[11px] font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
          <span>나 10% : 90%</span>
          <button
            type="button"
            className="font-semibold cursor-pointer underline decoration-dotted"
            onClick={() => handleRatioChange(50)}
            style={{ color: sliderVal === 50 ? 'var(--color-theme-together)' : undefined }}
          >
            50:50 (반반)
          </button>
          <span>90% : {partnerName} 10%</span>
        </div>
      </div>

      {/* Default split type selection */}
      <div className="pt-2 mt-1" style={{ borderTop: '1px dotted var(--color-faint)' }}>
        <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>
          지출 등록 시 기본 시작 모드
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ defaultSplitRatio: [sliderVal, partnerVal], defaultSplitType: 'mine' })}
            className="rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{
              background: defaultSplitType === 'mine' ? 'var(--color-theme-me)' : 'var(--color-paper)',
              color: defaultSplitType === 'mine' ? '#fff' : 'var(--color-ink)',
              border: defaultSplitType === 'mine' ? 'none' : '1px solid var(--color-line)',
              boxShadow: defaultSplitType === 'mine' ? 'var(--shadow-theme-me)' : 'none',
            }}
          >
            <span>👤 개인(나) 기본</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                defaultSplitRatio: [sliderVal, partnerVal],
                defaultSplitType: sliderVal === 50 ? 'half' : 'ratio',
              })
            }
            className="rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{
              background: defaultSplitType !== 'mine' ? 'var(--color-theme-together)' : 'var(--color-paper)',
              color: defaultSplitType !== 'mine' ? '#fff' : 'var(--color-ink)',
              border: defaultSplitType !== 'mine' ? 'none' : '1px solid var(--color-line)',
              boxShadow: defaultSplitType !== 'mine' ? 'var(--shadow-theme-together)' : 'none',
            }}
          >
            <span>👥 둘이 함께 기본 ({sliderVal}:{partnerVal})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const store = useStore();
  const {
    settings,
    updateSettings,
    budget,
    updateBudget,
    goals,
    resetDemoData,
    users,
    addUser,
    deleteUser,
    firebaseStatus,
    firebaseError,
    groupId,
    authUser,
    updateUser,
  } = store;
  const [memberName, setMemberName] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [profileName, setProfileName] = useState(authUser?.displayName ?? '');
  const [profileEmail, setProfileEmail] = useState(authUser?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const me = users.find((u) => u.role === 'me') ?? users[0];
  const partner = users.find((u) => u.id !== me?.id);
  const partnerName = partner?.name ?? '상대';
  const dday = getDday(me?.anniversaryDate);
  const firebaseLabel =
    firebaseStatus === 'connected'
      ? '연결됨'
      : firebaseStatus === 'connecting'
        ? '연결 중'
        : firebaseStatus === 'error'
          ? '오류'
          : '대기';

  function handleAddMember() {
    const name = memberName.trim();
    if (!name) return;
    addUser({
      id: `u${Date.now()}`,
      name,
      avatarLetter: name.slice(0, 1).toUpperCase(),
      tone: users.length % 2 === 0 ? 'accent' : 'accent2',
      role: 'member',
    });
    setMemberName('');
  }

  function handleResetOnboarding() {
    localStorage.removeItem('couple-budget-onboarded');
    navigate('/onboarding');
  }

  async function handleCopyInviteLink() {
    const inviteLink = await getFirebaseInviteLink(groupId);
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  async function handleSaveProfile() {
    if (!authUser) return;
    setAccountMessage('');
    setAccountBusy(true);
    try {
      const nextName = profileName.trim() || authUser.displayName;
      const nextEmail = profileEmail.trim() || authUser.email || '';
      await updateCurrentAccount({ displayName: nextName, email: nextEmail }, currentPassword);
      updateUser(authUser.uid, {
        name: nextName,
        email: nextEmail,
        avatarLetter: nextName.slice(0, 1).toUpperCase(),
      });
      setCurrentPassword('');
      setAccountMessage('개인정보가 저장됐어요.');
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : '개인정보 저장에 실패했습니다.');
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleSignOut() {
    setAccountBusy(true);
    try {
      await signOutCurrentUser();
      localStorage.removeItem('couple-budget-onboarded');
      navigate('/onboarding', { replace: true });
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('계정을 삭제하면 이 기기에서 로그아웃되고 공유 그룹 접근 권한도 제거됩니다. 계속할까요?')) return;
    setAccountBusy(true);
    try {
      await deleteCurrentAccount(groupId, currentPassword);
      localStorage.removeItem('couple-budget-store');
      localStorage.removeItem('couple-budget-onboarded');
      navigate('/onboarding', { replace: true });
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : '계정 삭제에 실패했습니다. 최근 로그인이 필요할 수 있어요.');
    } finally {
      setAccountBusy(false);
    }
  }

  async function handlePasswordReset() {
    const email = profileEmail.trim() || authUser?.email || '';
    setAccountBusy(true);
    setAccountMessage('');
    try {
      await sendAccountPasswordReset(email);
      setAccountMessage('비밀번호 재설정 메일을 보냈어요.');
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : '비밀번호 재설정 메일 발송에 실패했습니다.');
    } finally {
      setAccountBusy(false);
    }
  }

  function updateTotalBudget(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    updateBudget({ ...budget, totalBudget: parsed });
  }

  function handleResetData() {
    resetDemoData();
    localStorage.removeItem('couple-budget-store');
    localStorage.removeItem('couple-budget-onboarded');
    navigate('/onboarding');
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      transactions: store.transactions,
      goals: store.goals,
      settlements: store.settlements,
      budget: store.budget,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `couple-budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Screen scrollable>
      <TopBar title="설정" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Profile card */}
        <div
          className="rounded-3xl p-4"
          style={{ border: '1px solid var(--color-line)', background: 'var(--color-accent-soft)' }}
        >
          <div className="flex items-center gap-3">
            <Avatar letter={me?.avatarLetter ?? 'N'} tone={me?.tone ?? 'accent'} size={44} />
            <div className="flex-1">
              <div className="font-semibold text-lg">
                {users.length > 1 ? `${me?.name ?? '나'} 외 ${users.length - 1}명` : me?.name ?? '나'}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                {dday > 0 ? `D+${dday}` : '다인 공유 그룹'}
              </div>
            </div>
            <Pill tone="accent">{users.length}명</Pill>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1 rounded-2xl">프로필 편집</Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-2xl"
              disabled={!groupId}
              onClick={handleCopyInviteLink}
            >
              {inviteCopied ? '복사됨' : '초대 링크'}
            </Button>
          </div>
        </div>

        <SettingsGroup title="공동 관리">
          <div className="py-2.5" style={{ borderBottom: '1px dotted var(--color-faint)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg w-6 text-center">👥</span>
              <div className="flex-1">
                <div className="text-sm font-medium">공유 멤버</div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  지출 결제자와 공동 분담 대상
                </div>
              </div>
              <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>{users.length}명</span>
            </div>
            <div className="flex flex-col gap-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-2 rounded-2xl px-2.5 py-2" style={{ background: 'var(--color-accent-soft)' }}>
                  <Avatar letter={user.avatarLetter} tone={user.tone} size={26} />
                  <span className="flex-1 text-sm font-medium">{user.name}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                    {user.role === 'me' ? '나' : '멤버'}
                  </span>
                  {user.role !== 'me' && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-xs font-mono"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      제거
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded-2xl px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                placeholder="새 멤버 이름"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              />
              <button
                onClick={handleAddMember}
                className="rounded-2xl px-3.5 text-sm font-semibold text-white transition-all active:scale-95 flex items-center gap-1"
                style={{ background: 'var(--color-positive)', boxShadow: 'var(--shadow-positive)' }}
              >
                + 추가
              </button>
            </div>
          </div>
          <SplitRatioSection
            ratio={settings.defaultSplitRatio ?? [50, 50]}
            defaultSplitType={settings.defaultSplitType ?? 'mine'}
            partnerName={partnerName}
            onChange={(updates) => updateSettings(updates)}
          />
          <SettingRow icon="🎯" label="목표 관리" hint={`진행 중 ${goals.length}개`} />
          <SettingRow icon="🔒" label="서로 볼 수 있는 항목" last />
        </SettingsGroup>

        <SettingsGroup title="앱">
          <SettingRow
            icon="☁️"
            label="Firebase 동기화"
            hint={firebaseError ?? groupId ?? '앱 시작 시 자동 연결'}
            value={firebaseLabel}
          />
          <SettingRow icon="🎨" label="테마" value="민트" />
          <button
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            className="flex items-center gap-3 py-2.5 w-full text-left"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            <span className="text-lg w-6 text-center">🌙</span>
            <div className="flex-1">
              <div className="text-sm font-medium">다크모드</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>설정값 저장, 시각 테마는 다음 버전 적용</div>
            </div>
            <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>
              {settings.darkMode ? 'ON' : 'OFF'}
            </span>
          </button>
          <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px dotted var(--color-faint)' }}>
            <span className="text-lg w-6 text-center">💰</span>
            <div className="flex-1">
              <div className="text-sm font-medium">월 예산</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>리포트와 홈에 반영</div>
            </div>
            <input
              type="number"
              className="w-28 rounded-xl px-2 py-1 text-right text-sm font-mono outline-none"
              style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
              value={budget.totalBudget}
              onChange={(e) => updateTotalBudget(e.target.value)}
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-3 py-2.5 w-full text-left"
          >
            <span className="text-lg w-6 text-center">💾</span>
            <div className="flex-1">
              <div className="text-sm font-medium">백업 / 내보내기</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>JSON 파일로 저장</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
        </SettingsGroup>

        <SettingsGroup title="계정">
          <div className="py-2.5" style={{ borderBottom: '1px dotted var(--color-faint)' }}>
            <div className="text-sm font-medium mb-2">개인정보</div>
            <div className="flex flex-col gap-2">
              <input
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                placeholder="이름"
                value={profileName || authUser?.displayName || ''}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <input
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                placeholder="이메일"
                type="email"
                value={profileEmail || authUser?.email || ''}
                onChange={(event) => setProfileEmail(event.target.value)}
              />
              {authUser?.providerId === 'password' && (
                <input
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
                  placeholder="현재 비밀번호"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              )}
              <button
                onClick={handleSaveProfile}
                disabled={accountBusy || !authUser}
                className="rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--color-accent)' }}
              >
                개인정보 저장
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={accountBusy || !authUser?.email}
                className="rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
                style={{ border: '1px solid var(--color-line)' }}
              >
                비밀번호 재설정 메일 보내기
              </button>
              {accountMessage && <div className="text-xs font-mono" style={{ color: accountMessage.includes('실패') || accountMessage.includes('필요') ? '#d64545' : 'var(--color-muted)' }}>{accountMessage}</div>}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={accountBusy}
            className="flex items-center gap-3 py-2.5 w-full text-left disabled:opacity-50"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            <span className="text-lg w-6 text-center">↪</span>
            <div className="flex-1">
              <div className="text-sm font-medium">로그아웃</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>이 기기에서 계정 연결 해제</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={accountBusy || !authUser}
            className="flex items-center gap-3 py-2.5 w-full text-left disabled:opacity-50"
          >
            <span className="text-lg w-6 text-center">!</span>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: '#d64545' }}>계정 삭제</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>Auth 계정과 그룹 멤버 권한 제거</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
        </SettingsGroup>

        <SettingsGroup title="기타">
          <button
            onClick={() => window.open('/terms.html', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-3 py-2.5 w-full text-left"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            <span className="text-lg w-6 text-center">§</span>
            <div className="flex-1">
              <div className="text-sm font-medium">이용약관</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>서비스 이용 조건</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
          <button
            onClick={() => window.open('/privacy.html', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-3 py-2.5 w-full text-left"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            <span className="text-lg w-6 text-center">🔐</span>
            <div className="flex-1">
              <div className="text-sm font-medium">개인정보처리방침</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>수집, 이용, 삭제 안내</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
          <button
            onClick={handleResetOnboarding}
            className="flex items-center gap-3 py-2.5 w-full text-left"
            style={{ borderBottom: '1px dotted var(--color-faint)' }}
          >
            <span className="text-lg w-6 text-center">👋</span>
            <div className="flex-1">
              <div className="text-sm font-medium">온보딩 다시 보기</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>초대 화면부터 다시 시작</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
          <button
            onClick={handleResetData}
            className="flex items-center gap-3 py-2.5 w-full text-left"
          >
            <span className="text-lg w-6 text-center">🧹</span>
            <div className="flex-1">
              <div className="text-sm font-medium">로컬 데이터 초기화</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>이 기기의 저장 상태를 초기화</div>
            </div>
            <ChevronRight size={14} color="var(--color-muted)" />
          </button>
        </SettingsGroup>
      </div>
    </Screen>
  );
}
