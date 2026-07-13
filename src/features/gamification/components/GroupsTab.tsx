import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { useAuthStore } from '@/store/authStore'
import { joinGroup, leaveGroup, createGroup } from '@/firebase/firestore'
import type { AppUser } from '@/types'

function groupChangeErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && err.code === 'permission-denied') {
    return 'Solo puedes cambiar de grupo una vez cada 7 días.'
  }
  return err instanceof Error ? err.message : 'No se pudo actualizar el grupo.'
}

export function GroupsTab() {
  const appUser = useAuthStore((s) => s.appUser)
  const setAppUser = useAuthStore((s) => s.setAppUser)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  if (!appUser) return null

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!appUser || code.trim().length === 0) return
    setJoinError(null)
    setJoining(true)
    try {
      const normalized = code.trim().toUpperCase()
      await joinGroup(appUser.uid, normalized)
      setAppUser({
        ...appUser,
        groupId: normalized,
        groupChangedAt: new Date() as unknown as AppUser['groupChangedAt'],
      })
      setCode('')
    } catch (err) {
      setJoinError(groupChangeErrorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!appUser) return
    setLeaveError(null)
    setLeaving(true)
    try {
      await leaveGroup(appUser.uid)
      setAppUser({
        ...appUser,
        groupId: null,
        groupChangedAt: new Date() as unknown as AppUser['groupChangedAt'],
      })
    } catch (err) {
      setLeaveError(groupChangeErrorMessage(err))
    } finally {
      setLeaving(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!appUser || groupName.trim().length === 0) return
    setCreateError(null)
    setCreating(true)
    try {
      const newCode = await createGroup(appUser.uid, groupName.trim())
      setCreatedCode(newCode)
      setGroupName('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el grupo.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {appUser.groupId && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-status-ok/10 px-3 py-2">
          <p className="text-sm text-status-ok">
            Perteneces al grupo <strong>{appUser.groupId}</strong>
          </p>
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="text-sm text-text-muted underline transition-colors hover:text-text-primary"
          >
            {leaving ? '...' : 'Salir del grupo'}
          </button>
        </div>
      )}
      {leaveError && <p className="text-sm text-status-error">{leaveError}</p>}

      <form onSubmit={handleJoin} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-text-secondary">
          Unirme a un grupo (código de 6 caracteres)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            placeholder="CONT2026"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 rounded-md border border-border-default bg-surface-secondary px-3 py-2 text-sm uppercase text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={joining || code.trim().length === 0}
            className="btn-primary"
          >
            {joining ? '...' : 'Unirme'}
          </button>
        </div>
        {joinError && <p className="text-sm text-status-error">{joinError}</p>}
      </form>

      {appUser.role === 'profesor' && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 border-t border-border-default pt-6"
        >
          <label className="text-sm font-medium text-text-secondary">Crear un grupo nuevo</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="flex-1 rounded-md border border-border-default bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating || groupName.trim().length === 0}
              className="btn-secondary"
            >
              {creating ? '...' : 'Crear'}
            </button>
          </div>
          {createError && <p className="text-sm text-status-error">{createError}</p>}
          {createdCode && (
            <p className="rounded-md bg-status-ok/10 px-3 py-2 text-sm text-status-ok">
              Grupo creado — código: <strong>{createdCode}</strong>
            </p>
          )}
        </form>
      )}
    </div>
  )
}
