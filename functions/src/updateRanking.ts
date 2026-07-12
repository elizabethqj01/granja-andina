import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import {
  buildRankingEntries,
  updateGlobalRecords,
  type GlobalRecordsState,
  type RecordCandidate,
} from './rankingAggregator'

const EMPTY_RECORDS: GlobalRecordsState = {
  menorCostoUnitario: null,
  tiempoMasRapido: null,
  mayorUtilidad: null,
}

async function updateRecordsDoc(
  db: admin.firestore.Firestore,
  path: string,
  candidate: RecordCandidate
): Promise<void> {
  const ref = db.doc(path)
  const snap = await ref.get()
  const current = (snap.data() as GlobalRecordsState | undefined) ?? EMPTY_RECORDS
  const next = updateGlobalRecords(current, candidate)
  await ref.set({ ...next, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
}

/**
 * Fires on every scores/{scoreId} write and recomputes the group's ranking
 * plus the records board — global (records/global) and, when the score
 * belongs to a group, that group's own board (records/{groupId}, spec §SC-04
 * "mejores marcas globales y por grupo"). Runs server-side (Admin SDK) so
 * none of this can be tampered with client-side — firestore.rules blocks
 * direct writes to rankings/ and records/ entirely.
 */
export const updateRanking = onDocumentWritten('scores/{scoreId}', async (event) => {
  const after = event.data?.after?.data()
  if (!after) return // score deleted — nothing to recompute

  const db = admin.firestore()
  const groupId = after.groupId as string | null

  if (groupId) {
    const usersSnap = await db.collection('users').where('groupId', '==', groupId).get()
    const entries = buildRankingEntries(
      usersSnap.docs.map((d) => ({
        uid: d.id,
        displayName: (d.data().displayName as string) ?? '',
        photoURL: (d.data().photoURL as string) ?? '',
        totalScore: (d.data().totalScore as number) ?? 0,
        starsTotal: (d.data().starsTotal as number) ?? 0,
      }))
    )
    await db.doc(`rankings/${groupId}`).set({
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  const userSnap = await db.doc(`users/${after.uid}`).get()
  const displayName = (userSnap.data()?.displayName as string) ?? ''

  const candidate: RecordCandidate = {
    uid: after.uid as string,
    displayName,
    costoUnitario: (after.costoUnitario as number) ?? 0,
    timeSeconds: (after.timeSeconds as number) ?? 0,
    utilidad: (after.utilidad as number) ?? 0,
  }

  await updateRecordsDoc(db, 'records/global', candidate)
  if (groupId) await updateRecordsDoc(db, `records/${groupId}`, candidate)
})
