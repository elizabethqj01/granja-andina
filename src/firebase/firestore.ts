import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
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
  LevelSnapshot,
  LevelOutcome,
} from '@/types'
import type { AggregatedMetrics, SessionMetrics } from '@/features/gamification/metricsAggregator'
import { aggregate } from '@/features/gamification/metricsAggregator'

/**
 * publicProfiles/{uid} mirrors only the fields the spec allows showing about
 * other users (§2.2: never email or detailed calculations) — a Cloud
 * Function would normally own this denormalization, but Functions requires
 * the paid Blaze plan, so it's written client-side, same trust model as the
 * rest of users/{uid} already uses.
 */
async function writePublicProfile(
  uid: string,
  data: Partial<{
    displayName: string
    photoURL: string
    groupId: string | null
    totalScore: number
    starsTotal: number
  }>
): Promise<void> {
  await setDoc(doc(db, 'publicProfiles', uid), data, { merge: true })
}

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
    const backfilled: AppUser = {
      ...data,
      uid,
      bestRecords: {
        bestTimeByLevel: data.bestRecords?.bestTimeByLevel ?? {},
        bestCostUnitarioByLevel: data.bestRecords?.bestCostUnitarioByLevel ?? {},
        bestUtilidadByLevel: data.bestRecords?.bestUtilidadByLevel ?? {},
        bestScoreByLevel: data.bestRecords?.bestScoreByLevel ?? {},
        bestStarsByLevel: data.bestRecords?.bestStarsByLevel ?? {},
      },
    }
    // Also backfill publicProfiles/{uid} for accounts that predate that
    // collection (everyone before this change) — self-heals on next login.
    await writePublicProfile(uid, {
      displayName: backfilled.displayName,
      photoURL: backfilled.photoURL,
      groupId: backfilled.groupId,
      totalScore: backfilled.totalScore,
      starsTotal: backfilled.starsTotal,
    })
    return { user: backfilled, isNewUser: false }
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
  await writePublicProfile(uid, {
    displayName: newUser.displayName,
    photoURL: newUser.photoURL,
    groupId: newUser.groupId,
    totalScore: newUser.totalScore,
    starsTotal: newUser.starsTotal,
  })
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
 * displayName is denormalized here (not just on users/{uid}) so the records
 * board (subscribeToRecords) can show a name without a second read per score.
 */
export async function writeScore(
  uid: string,
  displayName: string,
  levelId: GameLevel,
  groupId: string | null,
  result: LevelScoreRecord
): Promise<void> {
  await setDoc(doc(db, 'scores', `${uid}_${levelId}`), {
    uid,
    displayName,
    levelId,
    groupId,
    ...result,
    createdAt: serverTimestamp(),
  })
}

/**
 * Updates users/{uid}'s aggregate totals and per-level bestRecords, and
 * mirrors the new totals to publicProfiles/{uid} (read by the ranking
 * query). Call only when the attempt is a new best — totalScore/starsTotal
 * are maintained incrementally (subtract the old best for this level, add
 * the new one).
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
  const totalScore = previous.totalScore - prevScore + result.score
  const starsTotal = previous.starsTotal - prevStars + result.stars

  await updateDoc(doc(db, 'users', uid), {
    totalScore,
    starsTotal,
    levelsCompleted: previous.levelsCompleted + (isFirstCompletion ? 1 : 0),
    [`bestRecords.bestScoreByLevel.${key}`]: result.score,
    [`bestRecords.bestStarsByLevel.${key}`]: result.stars,
    [`bestRecords.bestTimeByLevel.${key}`]: result.timeSeconds,
    [`bestRecords.bestCostUnitarioByLevel.${key}`]: result.costoUnitario,
    [`bestRecords.bestUtilidadByLevel.${key}`]: result.utilidad,
  })
  await writePublicProfile(uid, { totalScore, starsTotal })
}

/**
 * Real-time ranking for a group — a direct Firestore query (no Cloud
 * Function; Functions requires the paid Blaze plan). Reads publicProfiles/,
 * never users/ directly, so email/bestRecords of other students are never
 * exposed even at the rules level (especificaciones.md §2.2).
 */
export function subscribeToRanking(
  groupId: string,
  callback: (entries: RankingEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'publicProfiles'),
    where('groupId', '==', groupId),
    orderBy('totalScore', 'desc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => {
        const data = d.data()
        return {
          uid: d.id,
          displayName: (data.displayName as string) ?? '',
          photoURL: (data.photoURL as string) ?? '',
          totalScore: (data.totalScore as number) ?? 0,
          starsTotal: (data.starsTotal as number) ?? 0,
        }
      })
    )
  })
}

type RecordCategory = 'costoUnitario' | 'timeSeconds' | 'utilidad'

function subscribeToTopScore(
  category: RecordCategory,
  direction: 'asc' | 'desc',
  groupId: string | undefined,
  callback: (holder: { uid: string; displayName: string; value: number } | null) => void
): () => void {
  const constraints = groupId ? [where('groupId', '==', groupId)] : []
  const q = query(collection(db, 'scores'), ...constraints, orderBy(category, direction), limit(1))
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null)
      return
    }
    const top = snap.docs[0].data()
    callback({
      uid: top.uid as string,
      displayName: (top.displayName as string) ?? '',
      value: top[category] as number,
    })
  })
}

/**
 * Real-time records board (menor costo unitario / tiempo más rápido / mayor
 * utilidad) — 3 direct queries on scores/, no Cloud Function. Pass a groupId
 * for that group's board, or omit it for the global board.
 */
export function subscribeToRecords(
  callback: (records: GlobalRecords | null) => void,
  groupId?: string
): () => void {
  const state: Partial<GlobalRecords> = {}

  function emit() {
    callback({
      menorCostoUnitario: state.menorCostoUnitario ?? null,
      tiempoMasRapido: state.tiempoMasRapido ?? null,
      mayorUtilidad: state.mayorUtilidad ?? null,
    })
  }

  const unsubs = [
    subscribeToTopScore('costoUnitario', 'asc', groupId, (h) => {
      state.menorCostoUnitario = h
      emit()
    }),
    subscribeToTopScore('timeSeconds', 'asc', groupId, (h) => {
      state.tiempoMasRapido = h
      emit()
    }),
    subscribeToTopScore('utilidad', 'desc', groupId, (h) => {
      state.mayorUtilidad = h
      emit()
    }),
  ]

  return () => unsubs.forEach((u) => u())
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
  await writePublicProfile(uid, { groupId: code })
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
  await writePublicProfile(uid, { groupId: null })
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

// ─── Analytics / Metrics (client-side — no Cloud Function, requires Blaze) ─────

/**
 * Client-side equivalent of the old calculateMetrics Cloud Function: reads
 * this user's completed sessions and aggregates them with the same pure
 * `aggregate()` used there. Not wired to any screen yet (neither was the
 * function it replaces) — available for a future progress dashboard (P-18).
 */
export async function fetchSessionMetrics(
  uid: string
): Promise<{ sessions: SessionMetrics[]; aggregated: AggregatedMetrics }> {
  const snap = await getDocs(
    query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      where('status', '==', 'completed')
    )
  )
  const sessions: SessionMetrics[] = snap.docs.map((d) => {
    const data = d.data()
    return {
      sessionId: d.id,
      level: data.level as number,
      finalProfit: (data.finalProfit as number) ?? null,
      finalScore: (data.finalScore as number) ?? null,
      decisionCount: data.decisionCount as number,
      durationTicks: null,
    }
  })
  return { sessions, aggregated: aggregate(sessions) }
}

/**
 * Client-side equivalent of the old exportResults Cloud Function: reads a
 * session's analytics events and builds the same CSV, without uploading
 * anywhere — the caller triggers a browser download via a Blob. Not wired to
 * any screen yet (neither was the function it replaces).
 */
export async function buildSessionCsv(uid: string, sessionId: string): Promise<string> {
  const sessionSnap = await getDoc(doc(db, 'sessions', sessionId))
  if (!sessionSnap.exists() || sessionSnap.data().userId !== uid) {
    throw new Error('Sesión no encontrada o no te pertenece')
  }

  const eventsSnap = await getDocs(
    query(collection(db, 'analytics'), where('sessionId', '==', sessionId), orderBy('tick', 'asc'))
  )

  const headers = ['tick', 'eventType', 'decisionTimeMs', 'payload']
  const rows = eventsSnap.docs.map((d) => {
    const e = d.data()
    return [e.tick, e.eventType, e.decisionTimeMs, JSON.stringify(e.payload)].join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

// ─── Level review — "último intento" snapshot ──────────────────────────────────

export type LevelSnapshotInput = Omit<LevelSnapshot, 'uid' | 'levelId' | 'completedAt' | 'outcome'>

/**
 * Overwrites levelSnapshots/{uid}_{levelId} with this attempt's full detail
 * (transactions, cost events, final tallies) — unlike scores/, which only
 * updates on a *better* attempt, this always reflects the *last* attempt so
 * "repasar flujo de costos" can replay it even if it wasn't the best run.
 */
export async function writeLevelSnapshot(
  uid: string,
  levelId: GameLevel,
  outcome: LevelOutcome,
  snapshot: LevelSnapshotInput
): Promise<void> {
  await setDoc(doc(db, 'levelSnapshots', `${uid}_${levelId}`), {
    ...snapshot,
    uid,
    levelId,
    outcome,
    completedAt: serverTimestamp(),
  })
}

/** Reads back the last saved attempt for a level, or null if none exists yet. */
export async function getLevelSnapshot(
  uid: string,
  levelId: GameLevel
): Promise<LevelSnapshot | null> {
  const snap = await getDoc(doc(db, 'levelSnapshots', `${uid}_${levelId}`))
  return snap.exists() ? (snap.data() as LevelSnapshot) : null
}
