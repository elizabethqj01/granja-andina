import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { AppUser, GameLevel, SessionStatus } from '@/types'

/**
 * Reads users/{uid}. Creates it with the spec's default values on first
 * login; on subsequent logins, only bumps lastLoginAt.
 */
export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string
): Promise<{ user: AppUser; isNewUser: boolean }> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() })
    return { user: { ...(snap.data() as AppUser), uid }, isNewUser: false }
  }

  const newUser: AppUser = {
    uid,
    email,
    displayName,
    photoURL,
    role: 'estudiante',
    groupId: null,
    totalScore: 0,
    starsTotal: 0,
    levelsCompleted: 0,
    bestRecords: {
      bestTimeByLevel: {},
      bestCostUnitarioByLevel: {},
      bestUtilidadByLevel: {},
    },
    createdAt: serverTimestamp() as unknown as AppUser['createdAt'],
    lastLoginAt: serverTimestamp() as unknown as AppUser['lastLoginAt'],
  }
  await setDoc(ref, newUser)
  return { user: newUser, isNewUser: true }
}

/** Creates sessions/{id} with status 'active' and returns the generated id. */
export async function createSession(uid: string, level: GameLevel): Promise<string> {
  const ref = await addDoc(collection(db, 'sessions'), {
    userId: uid,
    level,
    status: 'active' satisfies SessionStatus,
    startedAt: serverTimestamp(),
    completedAt: null,
    finalScore: null,
    finalProfit: null,
    decisionCount: 0,
  })
  return ref.id
}

export interface CompleteSessionInput {
  status: SessionStatus
  finalScore: number | null
  finalProfit: number | null
  decisionCount: number
}

/** Closes sessions/{sessionId} with the final in-game stats. */
export async function completeSession(
  sessionId: string,
  results: CompleteSessionInput
): Promise<void> {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, {
    ...results,
    completedAt: serverTimestamp(),
  })
}
