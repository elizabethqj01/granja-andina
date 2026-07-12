import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import {
  buildRankingEntries,
  updateGlobalRecords,
  type GlobalRecordsState,
} from './rankingAggregator'

/**
 * Fires on every scores/{scoreId} write and recomputes the group's ranking
 * plus the global records board. Runs server-side (Admin SDK) so the ranking
 * can't be tampered with client-side — firestore.rules blocks direct writes
 * to rankings/ and records/ entirely.
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

  const recordsRef = db.doc('records/global')
  const recordsSnap = await recordsRef.get()
  const current = (recordsSnap.data() as GlobalRecordsState | undefined) ?? {
    menorCostoUnitario: null,
    tiempoMasRapido: null,
    mayorUtilidad: null,
  }

  const userSnap = await db.doc(`users/${after.uid}`).get()
  const displayName = (userSnap.data()?.displayName as string) ?? ''

  const next = updateGlobalRecords(current, {
    uid: after.uid as string,
    displayName,
    costoUnitario: (after.costoUnitario as number) ?? 0,
    timeSeconds: (after.timeSeconds as number) ?? 0,
    utilidad: (after.utilidad as number) ?? 0,
  })

  await recordsRef.set({ ...next, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
})
