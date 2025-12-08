/**
 * Complete Program Seeder with Residents, Surveys, and CG-CAHPS
 *
 * Creates a complete program structure:
 * - manager_info/{managerId} doc
 * - resident_info/{residentId} docs with nested surveys
 * - programs/{programId}/anon_surveys (mirrored from resident surveys)
 * - programs/{programId}/departments (cohort sizes)
 * - cgcahps_programdata (metrics per department)
 *
 * Response rates are naturally derived from actual resident survey participation.
 *
 * Usage (requires .env with VITE_FIREBASE_*):
 *   node scripts/seed-program-complete.js --program=PW-DEMO1 --weeks=52
 *   node scripts/seed-program-complete.js --dry-run
 *   node scripts/seed-program-complete.js --weeks=26 --residents=15
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
  Timestamp,
  connectFirestoreEmulator,
  collection,
  addDoc
} from 'firebase/firestore'
import { config as loadEnv } from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment
const envPath = fs.existsSync(path.join(process.cwd(), '.env'))
  ? path.join(process.cwd(), '.env')
  : (fs.existsSync(path.join(process.cwd(), '.env.local'))
      ? path.join(process.cwd(), '.env.local')
      : undefined)
if (envPath) {
  loadEnv({ path: envPath })
} else {
  loadEnv()
}

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (!arg.startsWith('--')) return acc
  const [key, val] = arg.slice(2).split('=')
  acc[key] = val ?? true
  return acc
}, {})

const DEPARTMENT_CONFIGS = {
  'Emergency': { cohortSize: 12, responseRate: 0.65 },
  'Internal Med': { cohortSize: 18, responseRate: 0.75 },
  'Pediatrics': { cohortSize: 10, responseRate: 0.80 },
  'Surgery': { cohortSize: 15, responseRate: 0.70 }
}

const CONFIG = {
  programId: args.program || 'PW-DEMO1',
  departments: Object.keys(DEPARTMENT_CONFIGS),
  departmentConfigs: DEPARTMENT_CONFIGS,
  weeksBack: parseInt(args.weeks, 10) || 52,
  residentsOverride: parseInt(args.residents, 10) || null,
  surveysPerResident: parseInt(args.surveys, 10) || 12,
  dryRun: args['dry-run'] === true,
  who5Dist: args['who5-dist'] || 'uniform',
  cgcahpsDist: args['cgcahps-dist'] || 'uniform',
  who5Min: parseInt(args['who5-min']) || 0,
  who5Max: parseInt(args['who5-max']) || 25,
  cgMin: parseFloat(args['cgcahps-min']) || 0.3,
  cgMax: parseFloat(args['cgcahps-max']) || 0.9
}

// Firebase init
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.projectId) {
  console.error('❌ Missing Firebase config. Set VITE_FIREBASE_* in .env')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

if (process.env.FIRESTORE_EMULATOR_HOST) {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
  connectFirestoreEmulator(db, host, Number(port) || 8080)
  console.log(`📍 Using Firestore emulator at ${host}:${port || 8080}`)
}

// ============================================================================
// HELPERS
// ============================================================================

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
      ((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7
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

function generateWho5Score() {
  if (CONFIG.who5Dist === 'uniform') {
    const min = Math.max(0, CONFIG.who5Min)
    const max = Math.min(25, CONFIG.who5Max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  // Balanced: bias toward mid-range
  const r = Math.random()
  if (r < 0.15) return Math.floor(Math.random() * 7)
  if (r < 0.65) return 10 + Math.floor(Math.random() * 8)
  if (r < 0.90) return 18 + Math.floor(Math.random() * 6)
  return 24 + Math.floor(Math.random() * 2)
}

function generateCgCahpsScore() {
  if (CONFIG.cgcahpsDist === 'uniform') {
    const min = CONFIG.cgMin
    const max = CONFIG.cgMax
    return Math.random() * (max - min) + min
  }
  // Realistic: cluster around 0.7-0.8
  const base = 0.75
  const variance = (Math.random() - 0.5) * 0.3
  return Math.max(CONFIG.cgMin, Math.min(CONFIG.cgMax, base + variance))
}

function weeksAgo(n) {
  const date = new Date()
  date.setDate(date.getDate() - n * 7)
  return date
}

// ============================================================================
// GENERATORS
// ============================================================================

function buildManagerDoc(programId) {
  const managerId = randId('mgr_')
  return {
    id: managerId,
    ref: doc(db, 'manager_info', managerId),
    data: {
      program_id: programId,
      departments: CONFIG.departments,
      hospital_name: 'Demo Program',
      hospital_city: 'Sample City',
      hospital_state: 'CA',
      first_name: 'Demo',
      last_name: 'Manager',
      email: `manager+${programId.toLowerCase()}@example.com`,
      manager_id: managerId,
      createdAt: Timestamp.now()
    }
  }
}

function buildResidents(programId) {
  const residents = []
  CONFIG.departments.forEach(dept => {
    const config = CONFIG.departmentConfigs[dept]
    const cohortSize = CONFIG.residentsOverride || config.cohortSize

    for (let i = 0; i < cohortSize; i++) {
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
          email: `resident+${dept.replace(/\s+/g, '').toLowerCase()}${i + 1}@example.com`,
          createdAt: Timestamp.now()
        }
      })
    }
  })
  return residents
}

function buildSurveysForResident(residentId, department, weeksBack) {
  const surveys = []
  const target = CONFIG.surveysPerResident
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
      score: generateWho5Score(),
      ref: doc(db, 'resident_info', residentId, 'surveys', key)
    })
  }
  return surveys
}

function buildDepartmentDocs(programId) {
  const depts = []
  CONFIG.departments.forEach(dept => {
    const config = CONFIG.departmentConfigs[dept]
    const cohortSize = CONFIG.residentsOverride || config.cohortSize

    depts.push({
      program_id: programId,
      department: dept,
      cohortSize: cohortSize,
      updatedAt: Timestamp.now(),
      ref: doc(db, `programs/${programId}/departments`, dept)
    })
  })
  return depts
}

function buildCgCahpsData(programId) {
  const cgCahpsData = []
  const startDate = weeksAgo(CONFIG.weeksBack)
  const endDate = new Date()

  CONFIG.departments.forEach(dept => {
    cgCahpsData.push({
      program_id: programId,
      department: dept,
      access_care: generateCgCahpsScore(),
      coord_care: generateCgCahpsScore(),
      emotional_support: generateCgCahpsScore(),
      information_education: generateCgCahpsScore(),
      respect_patient_prefs: generateCgCahpsScore(),
      sample_size: CONFIG.surveysPerResident * (CONFIG.residentsOverride || CONFIG.departmentConfigs[dept].cohortSize),
      start_date: Timestamp.fromDate(startDate),
      end_date: Timestamp.fromDate(endDate)
    })
  })
  return cgCahpsData
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Complete Program Seeder (Residents + Surveys + CG-CAHPS)')
  console.log('═══════════════════════════════════════════════════\n')

  console.log(`📋 Configuration:`)
  console.log(`   Program ID: ${CONFIG.programId}`)
  console.log(`   Departments: ${CONFIG.departments.join(', ')}`)
  console.log(`   Weeks back: ${CONFIG.weeksBack}`)
  console.log(`   Surveys per resident: ${CONFIG.surveysPerResident}`)
  console.log(`   WHO-5 distribution: ${CONFIG.who5Dist}`)
  console.log(`   CG-CAHPS distribution: ${CONFIG.cgcahpsDist}`)
  if (CONFIG.dryRun) console.log(`   Mode: DRY RUN (no writes)\n`)

  const manager = buildManagerDoc(CONFIG.programId)
  const residents = buildResidents(CONFIG.programId)
  const surveys = residents.flatMap(r =>
    buildSurveysForResident(r.id, r.department, CONFIG.weeksBack)
  )
  const deptDocs = buildDepartmentDocs(CONFIG.programId)
  const cgCahpsData = buildCgCahpsData(CONFIG.programId)

  console.log(`\n📊 Generated:`)
  console.log(`   Manager: 1`)
  console.log(`   Residents: ${residents.length}`)
  console.log(`   Surveys: ${surveys.length}`)
  console.log(`   Departments: ${deptDocs.length}`)
  console.log(`   CG-CAHPS records: ${cgCahpsData.length}`)

  if (CONFIG.dryRun) {
    console.log(`\n🔍 DRY RUN - Sample data:`)
    console.log(`   Manager ID: ${manager.id}`)
    console.log(`   Sample resident: ${residents[0]?.id}`)
    if (surveys.length > 0) {
      console.log(`   Sample survey:`, surveys[0])
    }
    console.log(`   Sample CG-CAHPS:`, cgCahpsData[0])
    return
  }

  console.log(`\n🔄 Uploading to Firestore...`)

  try {
    // 1. Create program doc + manager + residents
    console.log(`\n1️⃣  Writing manager and residents...`)
    const batch1 = writeBatch(db)
    batch1.set(manager.ref, manager.data)
    batch1.set(doc(db, 'programs', CONFIG.programId), {
      program_id: CONFIG.programId,
      departments: CONFIG.departments,
      createdAt: Timestamp.now()
    }, { merge: true })
    residents.forEach(r => batch1.set(r.ref, r.data))
    await batch1.commit()
    console.log(`   ✓ Created manager + ${residents.length} residents`)

    // 2. Write department docs
    console.log(`\n2️⃣  Writing department documents...`)
    const batch2 = writeBatch(db)
    deptDocs.forEach(d => {
      batch2.set(d.ref, {
        program_id: d.program_id,
        department: d.department,
        cohortSize: d.cohortSize,
        updatedAt: d.updatedAt
      })
    })
    await batch2.commit()
    console.log(`   ✓ Created ${deptDocs.length} department documents`)

    // 3. Write surveys (resident + anon_surveys mirror)
    console.log(`\n3️⃣  Writing surveys...`)
    const batchSize = 200
    for (let i = 0; i < surveys.length; i += batchSize) {
      const chunk = surveys.slice(i, i + batchSize)
      const b = writeBatch(db)

      chunk.forEach(s => {
        // Resident survey
        b.set(s.ref, {
          resident_id: s.residentId,
          department: s.department,
          dayKey: s.dayKey,
          weekKey: s.weekKey,
          createdAt: s.createdAt,
          score: s.score
        })

        // Mirror to anon_surveys
        const anonRef = doc(
          db,
          `programs/${CONFIG.programId}/anon_surveys/${s.residentId}_${s.dayKey}`
        )
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
      const end = Math.min(i + batchSize, surveys.length)
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: surveys ${i + 1}-${end}`)
    }

    // 4. Write CG-CAHPS data
    console.log(`\n4️⃣  Writing CG-CAHPS metrics...`)
    for (const cgData of cgCahpsData) {
      await addDoc(collection(db, 'cgcahps_programdata'), cgData)
    }
    console.log(`   ✓ Created ${cgCahpsData.length} CG-CAHPS records`)

    console.log(`\n✅ Complete! Program ${CONFIG.programId} is seeded and ready.`)
    console.log(`\n📊 Summary:`)
    console.log(`   Manager: 1`)
    console.log(`   Residents: ${residents.length}`)
    console.log(`   Surveys: ${surveys.length}`)
    console.log(`   Departments: ${deptDocs.length}`)
    console.log(`   CG-CAHPS: ${cgCahpsData.length}`)
    console.log(`\n💾 Collections:`)
    console.log(`   • manager_info`)
    console.log(`   • resident_info/{residentId}/surveys`)
    console.log(`   • programs/${CONFIG.programId}/departments`)
    console.log(`   • programs/${CONFIG.programId}/anon_surveys`)
    console.log(`   • cgcahps_programdata`)
    console.log('\n═══════════════════════════════════════════════════\n')
  } catch (error) {
    console.error(`\n❌ Seed failed:`, error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
