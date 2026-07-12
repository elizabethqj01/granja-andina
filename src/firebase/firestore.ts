import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type {
  AppUser,
  GameLevel,
  SessionStatus,
  Group,
  LevelStars,
  RankingEntry,
  GlobalRecords,
  ScoreBreakdown,
} from '@/types'

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
    const data = snap.data() as AppUser
    // Backfill bestRecords sub-maps for accounts created before a given field
    // existed (e.g. Fase 1 users predate bestScoreByLevel/bestStarsByLevel) —
    // without this, code that indexes into them (appUser.bestRecords.x[level])
    // throws instead of just seeing "no record yet".
    return {
      user: {
        ...data,
        uid,
        bestRecords: {
          bestTimeByLevel: data.bestRecords?.bestTimeByLevel ?? {},
          bestCostUnitarioByLevel: data.bestRecords?.bestCostUnitarioByLevel ?? {},
          bestUtilidadByLevel: data.bestRecords?.bestUtilidadByLevel ?? {},
          bestScoreByLevel: data.bestRecords?.bestScoreByLevel ?? {},
          bestStarsByLevel: data.bestRecords?.bestStarsByLevel ?? {},
        },
      },
      isNewUser: false,
    }
  }

  const newUser: AppUser = {
    uid,
    email,
    displayName,
    photoURL,
    role: 'estudiante',
    groupId: null,
    groupChangedAt: null,
    totalScore: 0,
    starsTotal: 0,
    levelsCompleted: 0,
    bestRecords: {
      bestTimeByLevel: {},
      bestCostUnitarioByLevel: {},
      bestUtilidadByLevel: {},
      bestScoreByLevel: {},
      bestStarsByLevel: {},
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

// ─── Score / Groups / Ranking (Fase 2) ─────────────────────────────────────────

export interface LevelScoreRecord {
  score: number
  stars: LevelStars
  timeSeconds: number
  costoUnitario: number
  utilidad: number
}

/**
 * Overwrites scores/{uid}_{levelId} with this attempt's result. Call only
 * when it beats the player's previous best for this level (see FarmGamePage).
 */
export async function writeScore(
  uid: string,
  levelId: GameLevel,
  groupId: string | null,
  result: LevelScoreRecord
): Promise<void> {
  await setDoc(doc(db, 'scores', `${uid}_${levelId}`), {
    uid,
    levelId,
    groupId,
    ...result,
    createdAt: serverTimestamp(),
  })
}

/**
 * Updates users/{uid}'s aggregate totals and per-level bestRecords. Call only
 * when the attempt is a new best — totalScore/starsTotal are maintained
 * incrementally (subtract the old best for this level, add the new one).
 */
export async function updateBestRecords(
  uid: string,
  levelId: GameLevel,
  previous: AppUser,
  result: LevelScoreRecord
): Promise<void> {
  const key = String(levelId)
  const prevScore = previous.bestRecords.bestScoreByLevel[key] ?? 0
  const prevStars = previous.bestRecords.bestStarsByLevel[key] ?? 0
  const isFirstCompletion = !(key in previous.bestRecords.bestScoreByLevel)

  await updateDoc(doc(db, 'users', uid), {
    totalScore: previous.totalScore - prevScore + result.score,
    starsTotal: previous.starsTotal - prevStars + result.stars,
    levelsCompleted: previous.levelsCompleted + (isFirstCompletion ? 1 : 0),
    [`bestRecords.bestScoreByLevel.${key}`]: result.score,
    [`bestRecords.bestStarsByLevel.${key}`]: result.stars,
    [`bestRecords.bestTimeByLevel.${key}`]: result.timeSeconds,
    [`bestRecords.bestCostUnitarioByLevel.${key}`]: result.costoUnitario,
    [`bestRecords.bestUtilidadByLevel.${key}`]: result.utilidad,
  })
}

/** Real-time subscription to a group's ranking, updated by the updateRanking Cloud Function. */
export function subscribeToRanking(
  groupId: string,
  callback: (entries: RankingEntry[]) => void
): () => void {
  return onSnapshot(doc(db, 'rankings', groupId), (snap) => {
    callback(snap.exists() ? ((snap.data().entries as RankingEntry[]) ?? []) : [])
  })
}

/**
 * Real-time subscription to a records board, updated by the updateRanking
 * Cloud Function. Pass a groupId for that group's records, or omit it for
 * the global board (records/global).
 */
export function subscribeToRecords(
  callback: (records: GlobalRecords | null) => void,
  groupId?: string
): () => void {
  return onSnapshot(doc(db, 'records', groupId ?? 'global'), (snap) => {
    callback(snap.exists() ? (snap.data() as GlobalRecords) : null)
  })
}

/**
 * Assigns groupId to the student. The 7-day change cooldown is enforced by
 * firestore.rules, not here — a too-soon attempt surfaces as a
 * `permission-denied` FirebaseError for the caller to catch and explain.
 */
export async function joinGroup(uid: string, code: string): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groups', code))
  if (!groupSnap.exists() || !(groupSnap.data() as Group).activo) {
    throw new Error('Código de grupo inválido')
  }
  await updateDoc(doc(db, 'users', uid), {
    groupId: code,
    groupChangedAt: serverTimestamp(),
  })
}

/**
 * Clears groupId (SC-02 "Salir del grupo"). Subject to the same 7-day
 * cooldown as joining — enforced by firestore.rules.
 */
export async function leaveGroup(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    groupId: null,
    groupChangedAt: serverTimestamp(),
  })
}

const GROUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O, 1/I

function randomGroupCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += GROUP_CODE_CHARS[Math.floor(Math.random() * GROUP_CODE_CHARS.length)]
  }
  return code
}

/** EV-01/EV-02 — persists one evaluation-mode attempt (assessments/{uid}_{levelId}_{timestamp}). */
export async function writeAssessment(
  uid: string,
  levelId: GameLevel,
  nota: number,
  breakdown: ScoreBreakdown,
  timeSeconds: number
): Promise<void> {
  await setDoc(doc(db, 'assessments', `${uid}_${levelId}_${Date.now()}`), {
    userId: uid,
    levelId,
    nota,
    breakdown,
    timeSeconds,
    completedAt: serverTimestamp(),
  })
}

/** Creates a group with a unique 6-char code (spec §2.2, e.g. "CONT2026"), retrying on collision. */
export async function createGroup(profesorUid: string, nombre: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomGroupCode()
    const ref = doc(db, 'groups', code)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        codigo: code,
        nombre,
        profesorUid,
        activo: true,
        createdAt: serverTimestamp(),
      })
      return code
    }
  }
  throw new Error('No se pudo generar un código de grupo único, intenta de nuevo')
}
