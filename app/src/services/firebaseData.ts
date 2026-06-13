import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseUser,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication, type AuthCredential } from '@capacitor-firebase/authentication';
import { auth, authPersistencePromise, db } from '../firebase.js';
import type { AppSettings, Goal, MonthlyBudget, Settlement, Transaction, User } from '../types';

export interface FirebaseGroupPayload {
  users?: User[];
  transactions?: Transaction[];
  goals?: Goal[];
  settlements?: Settlement[];
  budget?: MonthlyBudget;
  settings?: AppSettings;
}

export interface AuthProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  providerId: string;
}

const GROUP_KEY = 'couple-budget-group-id';
const GROUP_QUERY_KEY = 'group';
const INVITE_QUERY_KEY = 'invite';
let activeGroupId: string | null = localStorage.getItem(GROUP_KEY);
let activeInviteCode: string | null = null;

async function ensureAuthPersistence() {
  await authPersistencePromise;
}

function sortByDateDesc<T extends { id: string; date?: string; createdAt?: string; timestamp?: string; completedAt?: string; yearMonth?: string }>(items: T[]) {
  return items.sort((a, b) => {
    const av = a.date ?? a.createdAt ?? a.timestamp ?? a.completedAt ?? a.yearMonth ?? '';
    const bv = b.date ?? b.createdAt ?? b.timestamp ?? b.completedAt ?? b.yearMonth ?? '';
    return bv.localeCompare(av);
  });
}

function collectionPath(groupId: string, name: string) {
  return collection(db, 'groups', groupId, name);
}

export function getActiveGroupId() {
  return activeGroupId;
}

export function setActiveGroupId(groupId: string) {
  activeGroupId = groupId;
  localStorage.setItem(GROUP_KEY, groupId);
}

export function clearActiveGroupId() {
  activeGroupId = null;
  activeInviteCode = null;
  localStorage.removeItem(GROUP_KEY);
}

export function getInviteGroupIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get(GROUP_QUERY_KEY);
  const inviteCode = params.get(INVITE_QUERY_KEY);
  if (!groupId || !/^[A-Za-z0-9_-]{6,160}$/.test(groupId)) return null;
  setActiveGroupId(groupId);
  activeInviteCode = inviteCode && /^[A-Za-z0-9_-]{12,160}$/.test(inviteCode) ? inviteCode : null;
  return groupId;
}

function toAuthProfile(user: FirebaseUser): AuthProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? '나',
    photoURL: user.photoURL,
    providerId: user.providerData[0]?.providerId ?? 'password',
  };
}

function isNativeAuthPlatform() {
  return Capacitor.isNativePlatform();
}

function credentialToFirebaseCredential(credential?: AuthCredential | null) {
  if (!credential) throw new Error('인증 자격 증명을 가져오지 못했습니다.');

  if (credential.providerId === 'google.com') {
    return GoogleAuthProvider.credential(credential.idToken, credential.accessToken);
  }

  if (credential.providerId === 'apple.com') {
    const provider = new OAuthProvider('apple.com');
    return provider.credential({
      idToken: credential.idToken,
      rawNonce: credential.nonce,
    });
  }

  throw new Error('지원하지 않는 로그인 제공자입니다.');
}

async function signInToWebAuthWithNativeCredential(credential?: AuthCredential | null) {
  const firebaseCredential = credentialToFirebaseCredential(credential);
  const userCredential = await signInWithCredential(auth, firebaseCredential);
  return toAuthProfile(userCredential.user);
}

async function reauthenticateWithNativeProvider(providerId: 'google.com' | 'apple.com') {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  const result =
    providerId === 'google.com'
      ? await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
      : await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const firebaseCredential = credentialToFirebaseCredential(result.credential);
  await reauthenticateWithCredential(auth.currentUser, firebaseCredential);
}

function buildCurrentUser(user: FirebaseUser, fallback?: User): User {
  const displayName = user.displayName ?? fallback?.name ?? user.email?.split('@')[0] ?? '나';
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email,
    name: displayName,
    avatarLetter: displayName.slice(0, 1).toUpperCase(),
    tone: 'accent',
    role: 'me',
    permission: fallback?.permission ?? 'owner',
    anniversaryDate: fallback?.anniversaryDate,
    joinedAt: fallback?.joinedAt ?? new Date().toISOString(),
  };
}

function createInviteCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
}

export function onFirebaseAuthChange(onChange: (profile: AuthProfile | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    onChange(user ? toAuthProfile(user) : null);
  });
}

export async function signInWithEmail(email: string, password: string) {
  await ensureAuthPersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return toAuthProfile(credential.user);
}

export async function createEmailAccount(email: string, password: string, displayName: string) {
  await ensureAuthPersistence();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return toAuthProfile(credential.user);
}

export async function completeRedirectSignIn() {
  if (isNativeAuthPlatform()) return null;
  await ensureAuthPersistence();
  const hadPendingRedirect = sessionStorage.getItem('couple-budget-google-redirect-pending') === '1';
  const result = await getRedirectResult(auth);
  if (result?.user) {
    sessionStorage.removeItem('couple-budget-google-redirect-pending');
    return toAuthProfile(result.user);
  }
  if (hadPendingRedirect && !auth.currentUser) {
    sessionStorage.removeItem('couple-budget-google-redirect-pending');
    throw new Error('Google 로그인 결과를 앱으로 가져오지 못했습니다. Firebase 승인 도메인과 브라우저 저장소 설정을 확인해 주세요.');
  }
  return null;
}

export async function signInWithGoogle() {
  await ensureAuthPersistence();
  if (isNativeAuthPlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    return signInToWebAuthWithNativeCredential(result.credential);
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const credential = await signInWithPopup(auth, provider);
    return toAuthProfile(credential.user);
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      sessionStorage.setItem('couple-budget-google-redirect-pending', '1');
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function signInWithApple() {
  await ensureAuthPersistence();
  if (isNativeAuthPlatform()) {
    const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
    return signInToWebAuthWithNativeCredential(result.credential);
  }

  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const credential = await signInWithPopup(auth, provider);
  return toAuthProfile(credential.user);
}

export async function reauthenticateCurrentUser(password?: string) {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');

  const providerId = auth.currentUser.providerData[0]?.providerId ?? 'password';

  if (providerId === 'password') {
    if (!auth.currentUser.email || !password) {
      throw new Error('현재 비밀번호를 입력해야 합니다.');
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
    return;
  }

  if (providerId === 'google.com') {
    if (isNativeAuthPlatform()) {
      await reauthenticateWithNativeProvider('google.com');
      return;
    }
    await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
    return;
  }

  if (providerId === 'apple.com') {
    if (isNativeAuthPlatform()) {
      await reauthenticateWithNativeProvider('apple.com');
      return;
    }
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    await reauthenticateWithPopup(auth.currentUser, provider);
    return;
  }

  throw new Error('지원하지 않는 로그인 제공자입니다.');
}

export async function sendAccountPasswordReset(email: string) {
  if (!email) throw new Error('이메일을 입력해야 합니다.');
  await ensureAuthPersistence();
  await sendPasswordResetEmail(auth, email);
}

export async function updateCurrentAccount(updates: { displayName?: string; email?: string }, password?: string) {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  if (updates.displayName !== undefined) {
    await updateProfile(auth.currentUser, { displayName: updates.displayName });
  }
  if (updates.email && updates.email !== auth.currentUser.email) {
    await reauthenticateCurrentUser(password);
    await updateEmail(auth.currentUser, updates.email);
  }
  return toAuthProfile(auth.currentUser);
}

export async function signOutCurrentUser() {
  clearActiveGroupId();
  if (isNativeAuthPlatform()) {
    await FirebaseAuthentication.signOut().catch(() => {});
  }
  await signOut(auth);
}

export async function deleteCurrentAccount(groupId = activeGroupId, password?: string) {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  await reauthenticateCurrentUser(password);
  if (groupId) {
    await deleteUserDoc(auth.currentUser.uid, groupId);
  }
  clearActiveGroupId();
  await deleteFirebaseUser(auth.currentUser);
}

export async function ensureGroup(initial: FirebaseGroupPayload) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('로그인이 필요합니다.');

  const defaultGroupId = `group_${firebaseUser.uid}`;
  const groupId = activeGroupId ?? defaultGroupId;
  setActiveGroupId(groupId);

  const groupRef = doc(db, 'groups', groupId);
  const groupSnapshot = await getDoc(groupRef);
  const currentUser = buildCurrentUser(firebaseUser, initial.users?.find((user) => user.id === firebaseUser.uid));

  if (!groupSnapshot.exists()) {
    if (activeInviteCode || groupId !== defaultGroupId) {
      throw new Error('초대 링크가 만료되었거나 그룹을 찾을 수 없습니다.');
    }

    const inviteCode = createInviteCode();
    await setDoc(groupRef, {
      ownerId: firebaseUser.uid,
      inviteCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      budget: initial.budget,
      settings: initial.settings,
    });

    await Promise.all([
      saveUser(currentUser, groupId),
      ...(initial.transactions ?? []).map((transaction) => saveTransaction(transaction, groupId)),
      ...(initial.goals ?? []).map((goal) => saveGoal(goal, groupId)),
      ...(initial.settlements ?? []).map((settlement) => saveSettlement(settlement, groupId)),
    ]);
  } else {
    const memberSnapshot = await getDoc(doc(db, 'groups', groupId, 'members', firebaseUser.uid));
    if (memberSnapshot.exists()) {
      return groupId;
    }

    if (activeInviteCode) {
      await joinGroupWithInvite(groupId, activeInviteCode);
      activeInviteCode = null;
      return groupId;
    }

    if (groupSnapshot.data()?.ownerId === firebaseUser.uid) {
      await saveUser({ ...currentUser, permission: 'owner' }, groupId);
      return groupId;
    }

    throw new Error('이 그룹에 접근하려면 유효한 초대 링크가 필요합니다.');
  }

  return groupId;
}

export async function joinGroupWithInvite(groupId: string, inviteCode: string) {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  setActiveGroupId(groupId);
  const member = buildCurrentUser(auth.currentUser);
  await setDoc(
    doc(db, 'groups', groupId, 'members', auth.currentUser.uid),
    {
      ...member,
      permission: 'member',
      inviteCode,
      joinedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function rotateInviteCode(groupId = activeGroupId) {
  if (!groupId) throw new Error('그룹이 준비되지 않았습니다.');
  const inviteCode = createInviteCode();
  await setDoc(doc(db, 'groups', groupId), { inviteCode, updatedAt: serverTimestamp() }, { merge: true });
  return inviteCode;
}

export async function getInviteLink(groupId = activeGroupId) {
  if (!groupId) return '';
  const groupSnapshot = await getDoc(doc(db, 'groups', groupId));
  const inviteCode = (groupSnapshot.data()?.inviteCode as string | undefined) ?? (await rotateInviteCode(groupId));
  return `${window.location.origin}/onboarding/joined?group=${encodeURIComponent(groupId)}&invite=${encodeURIComponent(inviteCode)}`;
}

export function subscribeGroup(groupId: string, onChange: (payload: FirebaseGroupPayload) => void) {
  const unsubscribers: Unsubscribe[] = [];

  unsubscribers.push(
    onSnapshot(doc(db, 'groups', groupId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      onChange({
        budget: data.budget as MonthlyBudget | undefined,
        settings: data.settings as AppSettings | undefined,
      });
    })
  );

  unsubscribers.push(
    onSnapshot(collectionPath(groupId, 'members'), (snapshot) => {
      if (snapshot.empty) return;
      const currentUid = auth.currentUser?.uid;
      onChange({
        users: snapshot.docs.map((item) => {
          const user = item.data() as User;
          return user.uid === currentUid || user.id === currentUid ? { ...user, role: 'me' } : user;
        }),
      });
    })
  );

  unsubscribers.push(
    onSnapshot(collectionPath(groupId, 'transactions'), (snapshot) => {
      onChange({ transactions: sortByDateDesc(snapshot.docs.map((item) => item.data() as Transaction)) });
    })
  );

  unsubscribers.push(
    onSnapshot(collectionPath(groupId, 'goals'), (snapshot) => {
      onChange({ goals: snapshot.docs.map((item) => item.data() as Goal) });
    })
  );

  unsubscribers.push(
    onSnapshot(collectionPath(groupId, 'settlements'), (snapshot) => {
      onChange({ settlements: sortByDateDesc(snapshot.docs.map((item) => item.data() as Settlement)) });
    })
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function saveUser(user: User, groupId = activeGroupId) {
  if (!groupId) return;
  await setDoc(doc(db, 'groups', groupId, 'members', user.id), user, { merge: true });
}

export async function deleteUserDoc(userId: string, groupId = activeGroupId) {
  if (!groupId) return;
  await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
}

export async function saveTransaction(transaction: Transaction, groupId = activeGroupId) {
  if (!groupId) return;
  await setDoc(doc(db, 'groups', groupId, 'transactions', transaction.id), transaction, { merge: true });
}

export async function deleteTransactionDoc(transactionId: string, groupId = activeGroupId) {
  if (!groupId) return;
  await deleteDoc(doc(db, 'groups', groupId, 'transactions', transactionId));
}

export async function saveGoal(goal: Goal, groupId = activeGroupId) {
  if (!groupId) return;
  await setDoc(doc(db, 'groups', groupId, 'goals', goal.id), goal, { merge: true });
}

export async function deleteGoalDoc(goalId: string, groupId = activeGroupId) {
  if (!groupId) return;
  await deleteDoc(doc(db, 'groups', groupId, 'goals', goalId));
}

export async function saveSettlement(settlement: Settlement, groupId = activeGroupId) {
  if (!groupId) return;
  await setDoc(doc(db, 'groups', groupId, 'settlements', settlement.id), settlement, { merge: true });
}

export async function saveGroupMeta(updates: Partial<{ budget: MonthlyBudget; settings: AppSettings }>, groupId = activeGroupId) {
  if (!groupId) return;
  await setDoc(
    doc(db, 'groups', groupId),
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
