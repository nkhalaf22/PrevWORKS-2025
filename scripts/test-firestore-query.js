import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, orderBy, limit, getDocs, connectFirestoreEmulator } from 'firebase/firestore'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load env (.env by default; fallback to .env.local)
const envPath = fs.existsSync(path.join(process.cwd(), '.env'))
  ? path.join(process.cwd(), '.env')
  : (fs.existsSync(path.join(process.cwd(), '.env.local'))
      ? path.join(process.cwd(), '.env.local')
      : undefined)
dotenv.config(envPath ? { path: envPath } : {})

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
} = process.env

if (!VITE_FIREBASE_PROJECT_ID || !VITE_FIREBASE_API_KEY) {
  console.error('Missing Firebase config in env')
  process.exit(1)
}

const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID
}

const PROGRAM_ID = process.argv[2] || process.env.TEST_PROGRAM_ID
if (!PROGRAM_ID) {
  console.error('Pass program id: node scripts/test-firestore-query.js <PROGRAM_ID> or set TEST_PROGRAM_ID')
  process.exit(1)
}

async function main() {
  try {
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
      connectFirestoreEmulator(db, host, Number(port) || 8080)
      console.log(`Using Firestore emulator at ${host}:${port || 8080}`)
    }
    const q = query(
      collection(db, `programs/${PROGRAM_ID}/anon_surveys`),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    const snap = await getDocs(q)
    console.log(`Fetched ${snap.size} docs from programs/${PROGRAM_ID}/anon_surveys`)
    snap.forEach(d => {
      console.log('Doc ID:', d.id)
      console.log(JSON.stringify(d.data(), null, 2))
    })
  } catch (err) {
    console.error('Firestore query failed:', err)
    process.exit(1)
  }
}

main()
