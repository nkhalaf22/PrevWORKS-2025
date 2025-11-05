/**
 * Mock Data Generator - Simplified Version
 * 
 * This version reads Firebase config from your .env file (same as the app).
 * No need to hardcode credentials!
 * 
 * Usage:
 *   node scripts/generate-mock-data-simple.js [options]
 * 
 * Options:
 *   --program=PW-6II1D3          Program ID (default: PW-6II1D3)
 *   --weeks=12                   Number of weeks (default: 12)
 *   --surveys=5                  Avg surveys per dept/week (default: 5)
 *   --dry-run                    Preview without writing
 * 
 * Examples:
 *   node scripts/generate-mock-data-simple.js --dry-run
 *   node scripts/generate-mock-data-simple.js --program=MY-PROG --weeks=24
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore'
import { config } from 'dotenv'

// Load environment variables
config()

// ============================================================================
// PARSE COMMAND LINE ARGS
// ============================================================================
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=')
    acc[key] = val || true
  }
  return acc
}, {})

const CONFIG = {
  programId: args.program || 'PW-6II1D3',
  departments: ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery'],
  weeksToGenerate: parseInt(args.weeks) || 12,
  surveysPerDeptPerWeek: parseInt(args.surveys) || 5,
  dryRun: args['dry-run'] === true
}

// ============================================================================
// FIREBASE SETUP (from environment)
// ============================================================================
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

// Validate config
if (!firebaseConfig.projectId) {
  console.error('\n❌ Error: Missing Firebase configuration')
  console.error('   Make sure .env file exists with VITE_FIREBASE_* variables\n')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIsoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function weeksAgo(n) {
  const date = new Date()
  date.setDate(date.getDate() - (n * 7))
  return date
}

function generateScore(weekIndex) {
  // Balanced distribution across all wellness levels
  // Use weighted random selection for realistic variety
  const rand = Math.random()
  
  let min, max
  if (rand < 0.20) {
    // 20% Critical (<28 scaled = 0-6 raw)
    min = 0
    max = 6
  } else if (rand < 0.50) {
    // 30% At-Risk (28-49 scaled = 7-12 raw)
    min = 7
    max = 12
  } else if (rand < 0.80) {
    // 30% Watch Zone (50-69 scaled = 13-17 raw)
    min = 13
    max = 17
  } else {
    // 20% Thriving (>=70 scaled = 18-25 raw)
    min = 18
    max = 25
  }
  
  // Random score within the selected range
  const score = min + Math.random() * (max - min)
  
  return Math.max(0, Math.min(25, Math.round(score)))
}

function randomTimestampInWeek(weekDate) {
  const start = new Date(weekDate)
  const randomHours = Math.random() * 7 * 24
  const timestamp = new Date(start.getTime() + randomHours * 60 * 60 * 1000)
  return Timestamp.fromDate(timestamp)
}

// ============================================================================
// GENERATE DATA
// ============================================================================

function generateMockData() {
  const { programId, departments, weeksToGenerate, surveysPerDeptPerWeek } = CONFIG
  const surveys = []
  
  console.log(`\n📊 Generating mock data for program: ${programId}`)
  console.log(`   Departments: ${departments.join(', ')}`)
  console.log(`   Weeks: ${weeksToGenerate}`)
  console.log(`   Surveys per dept per week: ~${surveysPerDeptPerWeek}\n`)
  
  for (let weekIndex = 0; weekIndex < weeksToGenerate; weekIndex++) {
    const weekDate = weeksAgo(weeksToGenerate - weekIndex - 1)
    const weekKey = getIsoWeekKey(weekDate)
    
    let weekCount = 0
    for (const department of departments) {
      // Add ±2 variance to surveys per week
      const count = Math.max(1, surveysPerDeptPerWeek + Math.floor(Math.random() * 5) - 2)
      
      for (let i = 0; i < count; i++) {
        surveys.push({
          department,
          score: generateScore(weekIndex),
          weekKey,
          createdAt: randomTimestampInWeek(weekDate)
        })
        weekCount++
      }
    }
    
    console.log(`   ${weekKey}: ${weekCount} surveys`)
  }
  
  console.log(`\n✅ Generated ${surveys.length} total surveys`)
  
  // Score distribution
  const bySegment = { thriving: 0, watchZone: 0, atRisk: 0, critical: 0 }
  surveys.forEach(s => {
    const scaled = s.score * 4
    if (scaled >= 70) bySegment.thriving++
    else if (scaled >= 50) bySegment.watchZone++
    else if (scaled >= 28) bySegment.atRisk++
    else bySegment.critical++
  })
  
  console.log('\n📈 Score Distribution (0-100 scale):')
  console.log(`   Thriving (≥70):     ${bySegment.thriving} (${Math.round(bySegment.thriving/surveys.length*100)}%)`)
  console.log(`   Watch Zone (50-69): ${bySegment.watchZone} (${Math.round(bySegment.watchZone/surveys.length*100)}%)`)
  console.log(`   At-Risk (28-49):    ${bySegment.atRisk} (${Math.round(bySegment.atRisk/surveys.length*100)}%)`)
  console.log(`   Critical (<28):     ${bySegment.critical} (${Math.round(bySegment.critical/surveys.length*100)}%)`)
  
  return surveys
}

// ============================================================================
// UPLOAD TO FIRESTORE
// ============================================================================

async function uploadToFirestore(surveys) {
  const { programId, dryRun } = CONFIG
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No data written')
    console.log('\nSample documents:')
    surveys.slice(0, 3).forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.weekKey} - ${s.department}`)
      console.log(`   Score: ${s.score} (raw) = ${s.score * 4} (scaled)`)
      console.log(`   Created: ${s.createdAt.toDate().toISOString()}`)
    })
    return
  }
  
  console.log('\n🔄 Uploading to Firestore...')
  
  const batchSize = 500
  const batches = []
  
  for (let i = 0; i < surveys.length; i += batchSize) {
    const batch = writeBatch(db)
    const chunk = surveys.slice(i, i + batchSize)
    
    chunk.forEach(survey => {
      const docRef = doc(collection(db, `programs/${programId}/anon_surveys`))
      batch.set(docRef, survey)
    })
    
    batches.push(batch)
  }
  
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit()
    console.log(`   ✓ Batch ${i + 1}/${batches.length} committed`)
  }
  
  console.log('\n✅ Upload complete!')
  console.log(`   Collection: programs/${programId}/anon_surveys`)
  console.log(`   Documents: ${surveys.length}`)
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  PrevWORKS Mock Data Generator')
  console.log('═══════════════════════════════════════════════════')
  
  try {
    const surveys = generateMockData()
    await uploadToFirestore(surveys)
    
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  Done!')
    console.log('═══════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
