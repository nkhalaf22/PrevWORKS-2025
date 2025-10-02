import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence,
    GoogleAuthProvider } from 'firebase/auth'
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'


const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)

// 🔽 Google provider
export const googleProvider = new GoogleAuthProvider()
// prompt the account chooser every time
googleProvider.setCustomParameters({ prompt: 'select_account' })
// Optional: restrict to your workspace domain
// if (import.meta.env.VITE_GOOGLE_HD) {
//   googleProvider.setCustomParameters({ hd: import.meta.env.VITE_GOOGLE_HD })
// }

// (optional) analytics guard
export let analytics = null
if (import.meta.env.PROD) {
    analyticsSupported().then(ok => {
        if (ok && firebaseConfig.measurementId) analytics = getAnalytics(app)
    }).catch(() => {})
}
