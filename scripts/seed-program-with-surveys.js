/**
 * Seed a fresh program with manager, residents, and WHO-5 surveys.
 *
 * Creates:
 * - manager_info/{managerId} doc with program_id + department list
 * - resident_info/{residentId} docs for each department
 * - resident_info/{residentId}/surveys/{dayKey} docs spread across the last N weeks
 *
 * Response-rate math will now work because cohort sizes come from resident_info
 * and surveys include resident_id, department, weekKey, and dayKey.
 *
 * Usage (requires .env with VITE_FIREBASE_*):
 *   node scripts/seed-program-with-surveys.js --program=PW-DEMO1 --departments="Emergency,Internal Med,Pediatrics" --residents=10 --surveys=8 --weeks=52
 *   node scripts/seed-program-with-surveys.js --dry-run
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { config as loadEnv } from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment (.env by default; fallback to .env.local if present)
const envPath = fs.existsSync(path.join(process.cwd(), '.env'))
  ? path.join(process.cwd(), '.env')
  : (fs.existsSync(path.join(process.cwd(), '.env.local'))
      ? path.join(process.cwd(), '.env.local')
      : undefined)
if (envPath) {
  loadEnv({ path: envPath })
} else {
  loadEnv() // default lookup
}

// ----------- CLI args ------------------------------------------------------
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (!arg.startsWith('--')) return acc
  const [key, val] = arg.slice(2).split('=')
  acc[key] = val ?? true
  return acc
}, {})

const CONFIG = {
  programId: args.program || 'PW-DEMO1',
  departments: args.departments ? args.departments.split(',').map(s => s.trim()).filter(Boolean) : ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery'],
  residentsPerDept: parseInt(args.residents, 10) || 8,
  surveysPerResident: parseInt(args.surveys, 10) || 12,
  weeksBack: parseInt(args.weeks, 10) || 52,
  dryRun: args['dry-run'] === true
}

// ----------- Firebase init -------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.projectId) {
  console.error('Missing Firebase config. Set VITE_FIREBASE_* in .env')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ----------- Helpers -------------------------------------------------------
function randId(prefix = '') {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) /
      7
    )
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function randomDateWithinWeeks(weeksBack) {
  const days = weeksBack * 7
  const offset = Math.floor(Math.random() * days)
  const dt = new Date()
  dt.setDate(dt.getDate() - offset)
  return dt
}

function randomWho5Score() {
  // bias toward mid-range with occasional highs/lows
  const r = Math.random()
  if (r < 0.15) return Math.floor(Math.random() * 7) // 0-6
  if (r < 0.65) return 10 + Math.floor(Math.random() * 8) // 10-17
  if (r < 0.90) return 18 + Math.floor(Math.random() * 6) // 18-23
  return 24 + Math.floor(Math.random() * 2) // 24-25
}

// ----------- Generators ----------------------------------------------------
function buildManagerDoc(programId, departments) {
  const managerId = randId('mgr_')
  return {
    id: managerId,
    ref: doc(db, 'manager_info', managerId),
    data: {
      program_id: programId,
      departments,
      hospital_name: 'Demo Program',
      hospital_city: 'Sample City',
      hospital_state: 'CA',
      first_name: 'Demo',
      last_name: 'Manager',
      email: `manager+${programId.toLowerCase()}@example.com`,
      manager_id: managerId
    }
  }
}

function buildResidents(programId, departments, residentsPerDept) {
  const residents = []
  departments.forEach(dept => {
    for (let i = 0; i < residentsPerDept; i++) {
      const rid = randId('res_')
      residents.push({
        id: rid,
        ref: doc(db, 'resident_info', rid),
        department: dept,
        data: {
          resident_id: rid,
          program_id: programId,
          department: dept,
          first_name: `Resident ${i + 1}`,
          last_name: dept,
          email: `resident+${dept.replace(/\s+/g, '').toLowerCase()}${i + 1}@example.com`
        }
      })
    }
  })
  return residents
}

function buildSurveysForResident(residentId, department, surveysPerResident, weeksBack) {
  const surveys = []
  const target = Math.min(surveysPerResident, weeksBack * 7) // at most one per day
  const usedDays = new Set()
  let attempts = 0
  const maxAttempts = target * 10

  while (surveys.length < target && attempts < maxAttempts) {
    const date = randomDateWithinWeeks(weeksBack)
    const key = dayKey(date)
    attempts++
    if (usedDays.has(key)) continue
    usedDays.add(key)
    surveys.push({
      residentId,
      department,
      dayKey: key,
      weekKey: isoWeekKey(date),
      createdAt: Timestamp.fromDate(date),
      score: randomWho5Score(),
      ref: doc(db, 'resident_info', residentId, 'surveys', key)
    })
  }
  return surveys
}

// ----------- Orchestration -------------------------------------------------
async function main() {
  console.log('Seeding program data with aligned cohort sizes and surveys...')
  console.log(`Program: ${CONFIG.programId}`)
  console.log(`Departments: ${CONFIG.departments.join(', ')}`)
  console.log(`Residents per dept: ${CONFIG.residentsPerDept}`)
  console.log(`Surveys per resident: ${CONFIG.surveysPerResident} across last ${CONFIG.weeksBack} weeks`)
  if (CONFIG.dryRun) console.log('DRY RUN (no writes)\n')

  const manager = buildManagerDoc(CONFIG.programId, CONFIG.departments)
  const residents = buildResidents(CONFIG.programId, CONFIG.departments, CONFIG.residentsPerDept)

  const surveys = residents.flatMap(r =>
    buildSurveysForResident(r.id, r.department, CONFIG.surveysPerResident, CONFIG.weeksBack)
  )

  if (CONFIG.dryRun) {
    console.log(`Would create manager: ${manager.id}`)
    console.log(`Would create residents: ${residents.length}`)
    console.log(`Would create surveys: ${surveys.length}`)
    console.log('Sample survey:', surveys[0])
    return
  }

  // manager + residents batch
  const batch = writeBatch(db)
  batch.set(manager.ref, manager.data)
  // create a minimal program doc so subcollections are anchored
  batch.set(doc(db, 'programs', CONFIG.programId), {
    program_id: CONFIG.programId,
    departments: CONFIG.departments,
    createdAt: Timestamp.now()
  }, { merge: true })
  residents.forEach(r => batch.set(r.ref, r.data))
  await batch.commit()
  console.log(`✓ Wrote manager_info doc and ${residents.length} resident_info docs`)

  // surveys (chunk to stay under batch limits; 2 writes per survey)
  const batchSize = 200
  for (let i = 0; i < surveys.length; i += batchSize) {
    const chunk = surveys.slice(i, i + batchSize)
    const b = writeBatch(db)
    chunk.forEach(s => {
      // resident-facing record (once per dayKey)
      b.set(s.ref, {
        resident_id: s.residentId,
        department: s.department,
        dayKey: s.dayKey,
        weekKey: s.weekKey,
        createdAt: s.createdAt,
        score: s.score
      })
      // mirror to program anon_surveys (matching app behavior)
      const anonRef = doc(db, `programs/${CONFIG.programId}/anon_surveys/${s.residentId}_${s.dayKey}`)
      b.set(anonRef, {
        program_id: CONFIG.programId,
        resident_id: s.residentId,
        department: s.department,
        dayKey: s.dayKey,
        weekKey: s.weekKey,
        createdAt: s.createdAt,
        score: s.score
      })
    })
    await b.commit()
    console.log(`✓ Wrote surveys ${i + 1}-${Math.min(i + batchSize, surveys.length)} (resident + anon)`)
  }

  console.log('\nDone. Cloud Functions will mirror resident surveys into programs/{programId}/anon_surveys and dept_weekly (if deployed).')
}

main().catch(err => {
  console.error('❌ Seed failed', err)
  process.exit(1)
})
