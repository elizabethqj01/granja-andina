import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth'
import { auth } from './config'
import { getOrCreateUser } from './firestore'
import { useAuthStore } from '@/store/authStore'

const googleProvider = new GoogleAuthProvider()

/**
 * Only Google sign-in is allowed (spec §1.1). On every auth state change,
 * mirrors the Firebase user into users/{uid} and populates appUser/isNewUser.
 */
export function initAuthListener(): () => void {
  return onAuthStateChanged(auth, (user) => {
    useAuthStore.setState({ user, loading: false })

    if (!user) {
      useAuthStore.setState({ appUser: null, isNewUser: false })
      return
    }

    void getOrCreateUser(
      user.uid,
      user.email ?? '',
      user.displayName ?? '',
      user.photoURL ?? ''
    ).then(({ user: appUser, isNewUser }) => {
      useAuthStore.setState({ appUser, isNewUser })
    })
  })
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider)
  return credential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}
