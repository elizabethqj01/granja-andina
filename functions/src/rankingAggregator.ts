export interface UserScoreSnapshot {
  uid: string
  displayName: string
  photoURL: string
  totalScore: number
  starsTotal: number
}

export interface RankingEntry {
  uid: string
  displayName: string
  photoURL: string
  totalScore: number
  starsTotal: number
}

/** Sorts a group's members by totalScore desc, capped for the 500-concurrent-users NFR. */
export function buildRankingEntries(users: UserScoreSnapshot[], limit = 100): RankingEntry[] {
  return [...users]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map(({ uid, displayName, photoURL, totalScore, starsTotal }) => ({
      uid,
      displayName,
      photoURL,
      totalScore,
      starsTotal,
    }))
}

export interface RecordHolder {
  uid: string
  displayName: string
  value: number
}

export interface GlobalRecordsState {
  menorCostoUnitario: RecordHolder | null
  tiempoMasRapido: RecordHolder | null
  mayorUtilidad: RecordHolder | null
}

export interface RecordCandidate {
  uid: string
  displayName: string
  costoUnitario: number
  timeSeconds: number
  utilidad: number
}

/** Returns updated global records if this attempt beats any of the three categories (spec §SC-04). */
export function updateGlobalRecords(
  current: GlobalRecordsState,
  candidate: RecordCandidate
): GlobalRecordsState {
  const next: GlobalRecordsState = { ...current }

  if (
    candidate.costoUnitario > 0 &&
    (!current.menorCostoUnitario || candidate.costoUnitario < current.menorCostoUnitario.value)
  ) {
    next.menorCostoUnitario = {
      uid: candidate.uid,
      displayName: candidate.displayName,
      value: candidate.costoUnitario,
    }
  }

  if (
    candidate.timeSeconds > 0 &&
    (!current.tiempoMasRapido || candidate.timeSeconds < current.tiempoMasRapido.value)
  ) {
    next.tiempoMasRapido = {
      uid: candidate.uid,
      displayName: candidate.displayName,
      value: candidate.timeSeconds,
    }
  }

  if (!current.mayorUtilidad || candidate.utilidad > current.mayorUtilidad.value) {
    next.mayorUtilidad = {
      uid: candidate.uid,
      displayName: candidate.displayName,
      value: candidate.utilidad,
    }
  }

  return next
}
