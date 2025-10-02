// src/lib/googleSignIn.js
import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export async function signInWithGoogle() {
    try {
        return await signInWithPopup(auth, googleProvider)
    } catch (e) {
        // Popup blocked or unsupported? fall back to redirect
        if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(auth, googleProvider)
            return null
        }
        throw e
    }
}
