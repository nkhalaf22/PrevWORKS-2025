/**
 * Mock Data Generator - Unified Version
 * 
 * Generates both WHO-5 and CG-CAHPS data with matching cohorts.
 * This version reads Firebase config from your .env file (same as the app).
 * 
 * Usage:
 *   node scripts/generate-mock-data-simple.js [options]
 * 
 * Options:
 *   --program=PW-6II1D3          Program ID (default: PW-6II1D3)
 *   --weeks=12                   Number of weeks (default: 12)
 *   --surveys=5                  Avg surveys per dept/week (default: 5)
 *   --dist=uniform|balanced      Apply to both WHO-5 and CG-CAHPS (default: uniform)
 *   --who5-dist=uniform|balanced Override WHO-5 distribution (default: uniform)
 *   --cgcahps-dist=uniform|realistic Override CG-CAHPS distribution (default: uniform)
 *   --who5-min=0                 WHO-5 min raw score inclusive (default: 0)
 *   --who5-max=25                WHO-5 max raw score inclusive (default: 25)
 *   --cgcahps-min=0.3            CG-CAHPS min (0-1) (default: 0.3)
 *   --cgcahps-max=0.9            CG-CAHPS max (0-1) (default: 0.9)
 *   --who5-only                  Generate only WHO-5 data
 *   --cgcahps-only               Generate only CG-CAHPS data
 *   --dry-run                    Preview without writing
 * 
 * Examples:
 *   node scripts/generate-mock-data-simple.js --dry-run
 *   node scripts/generate-mock-data-simple.js --program=MY-PROG --weeks=24
 *   node scripts/generate-mock-data-simple.js --who5-only
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, Timestamp, addDoc } from 'firebase/firestore'
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
  // Distribution controls (defaults to uniform for demo friendliness)
  who5Distribution: (args['who5-dist'] || args['dist'] || 'uniform').toLowerCase(),
  cgcahpsDistribution: (args['cgcahps-dist'] || args['dist'] || 'uniform').toLowerCase(),
  who5Min: Number.isFinite(parseInt(args['who5-min'])) ? parseInt(args['who5-min']) : 0,
  who5Max: Number.isFinite(parseInt(args['who5-max'])) ? parseInt(args['who5-max']) : 25,
  cgMin: Number.isFinite(parseFloat(args['cgcahps-min'])) ? parseFloat(args['cgcahps-min']) : 0.3,
  cgMax: Number.isFinite(parseFloat(args['cgcahps-max'])) ? parseFloat(args['cgcahps-max']) : 0.9,
  generateWho5: !args['cgcahps-only'],
  generateCgCahps: !args['who5-only'],
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

function generateWho5Score() {
  if (CONFIG.who5Distribution === 'uniform') {
    const min = Math.max(0, CONFIG.who5Min)
    const max = Math.min(25, CONFIG.who5Max)
    const val = Math.floor(min + Math.random() * (max - min + 1))
    return Math.max(0, Math.min(25, val))
  }

  // Balanced distribution across wellness levels (previous default)
  const rand = Math.random()
  let min, max
  if (rand < 0.20) {
    min = 0; max = 6
  } else if (rand < 0.50) {
    min = 7; max = 12
  } else if (rand < 0.80) {
    min = 13; max = 17
  } else {
    min = 18; max = 25
  }
  const score = min + Math.random() * (max - min)
  return Math.max(0, Math.min(25, Math.round(score)))
}

function generateCgCahpsScore() {
  // CG-CAHPS scores are 0.0 to 1.0
  if (CONFIG.cgcahpsDistribution === 'uniform') {
    const min = Math.max(0, CONFIG.cgMin)
    const max = Math.min(1, CONFIG.cgMax)
    const val = min + Math.random() * (max - min)
    return Math.max(0, Math.min(1, val))
  }
  // Realistic clustering around ~0.75
  const base = 0.70 + Math.random() * 0.15 // 0.70 to 0.85
  const variance = (Math.random() - 0.5) * 0.1 // ±0.05
  return Math.max(0, Math.min(1, base + variance))
}

function randomTimestampInWeek(weekDate) {
  const start = new Date(weekDate)
  const randomHours = Math.random() * 7 * 24
  const timestamp = new Date(start.getTime() + randomHours * 60 * 60 * 1000)
  return Timestamp.fromDate(timestamp)
}

// ============================================================================
// GENERATE WHO-5 DATA
// ============================================================================

function generateWho5Data() {
  const { programId, departments, weeksToGenerate, surveysPerDeptPerWeek } = CONFIG
  const surveys = []
  
  console.log(`\n📊 Generating WHO-5 data for program: ${programId}`)
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
          score: generateWho5Score(),
          weekKey,
          createdAt: randomTimestampInWeek(weekDate)
        })
        weekCount++
      }
    }
    
    console.log(`   ${weekKey}: ${weekCount} surveys`)
  }
  
  console.log(`\n✅ Generated ${surveys.length} total WHO-5 surveys`)
  
  // Score distribution
  const bySegment = { thriving: 0, watchZone: 0, atRisk: 0, critical: 0 }
  surveys.forEach(s => {
    const scaled = s.score * 4
    if (scaled >= 70) bySegment.thriving++
    else if (scaled >= 50) bySegment.watchZone++
    else if (scaled >= 28) bySegment.atRisk++
    else bySegment.critical++
  })
  
  console.log('\n📈 WHO-5 Score Distribution (0-100 scale):')
  console.log(`   Thriving (≥70):     ${bySegment.thriving} (${Math.round(bySegment.thriving/surveys.length*100)}%)`)
  console.log(`   Watch Zone (50-69): ${bySegment.watchZone} (${Math.round(bySegment.watchZone/surveys.length*100)}%)`)
  console.log(`   At-Risk (28-49):    ${bySegment.atRisk} (${Math.round(bySegment.atRisk/surveys.length*100)}%)`)
  console.log(`   Critical (<28):     ${bySegment.critical} (${Math.round(bySegment.critical/surveys.length*100)}%)`)
  
  return surveys
}

// ============================================================================
// GENERATE CG-CAHPS DATA
// ============================================================================

function generateCgCahpsData() {
  const { programId, departments, weeksToGenerate } = CONFIG
  const programDataRecords = []
  
  console.log(`\n🏥 Generating CG-CAHPS data for program: ${programId}`)
  console.log(`   Departments: ${departments.join(', ')}`)
  console.log(`   Survey periods: Based on ${weeksToGenerate} weeks\n`)
  
  // Generate one program data record per department
  // Using the time range from the WHO-5 data for consistency
  const endDate = new Date()
  const startDate = weeksAgo(weeksToGenerate)
  
  departments.forEach(department => {
    // Calculate sample size based on surveys per dept per week
    const sampleSize = CONFIG.surveysPerDeptPerWeek * weeksToGenerate
    
    const programData = {
      program_id: programId,
      department,
      access_care: generateCgCahpsScore(),
      coord_care: generateCgCahpsScore(),
      emotional_support: generateCgCahpsScore(),
      information_education: generateCgCahpsScore(),
      respect_patient_prefs: generateCgCahpsScore(),
      sample_size: sampleSize,
      start_date: Timestamp.fromDate(startDate),
      end_date: Timestamp.fromDate(endDate)
    }
    
    programDataRecords.push(programData)
    
    console.log(`   ${department}:`)
    console.log(`      Sample size: ${sampleSize}`)
    console.log(`      Access to Care: ${Math.round(programData.access_care * 100)}%`)
    console.log(`      Care Coordination: ${Math.round(programData.coord_care * 100)}%`)
    console.log(`      Emotional Support: ${Math.round(programData.emotional_support * 100)}%`)
    console.log(`      Information & Education: ${Math.round(programData.information_education * 100)}%`)
    console.log(`      Respect for Preferences: ${Math.round(programData.respect_patient_prefs * 100)}%`)
  })
  
  console.log(`\n✅ Generated ${programDataRecords.length} CG-CAHPS program data records`)
  
  return programDataRecords
}

// ============================================================================
// UPLOAD TO FIRESTORE
// ============================================================================

async function uploadToFirestore(who5Surveys, cgCahpsData) {
  const { programId, dryRun, generateWho5, generateCgCahps } = CONFIG
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No data written')
    
    if (generateWho5 && who5Surveys.length > 0) {
      console.log('\nSample WHO-5 documents:')
      who5Surveys.slice(0, 3).forEach((s, i) => {
        console.log(`\n${i + 1}. ${s.weekKey} - ${s.department}`)
        console.log(`   Score: ${s.score} (raw) = ${s.score * 4} (scaled)`)
        console.log(`   Created: ${s.createdAt.toDate().toISOString()}`)
      })
    }
    
    if (generateCgCahps && cgCahpsData.length > 0) {
      console.log('\nSample CG-CAHPS documents:')
      cgCahpsData.slice(0, 2).forEach((d, i) => {
        console.log(`\n${i + 1}. ${d.department}`)
        console.log(`   Sample size: ${d.sample_size}`)
        console.log(`   Period: ${d.start_date.toDate().toISOString().split('T')[0]} to ${d.end_date.toDate().toISOString().split('T')[0]}`)
      })
    }
    return
  }
  
  console.log('\n🔄 Uploading to Firestore...')
  
  let totalWho5 = 0
  let totalCgCahps = 0
  
  // Upload WHO-5 surveys
  if (generateWho5 && who5Surveys.length > 0) {
    console.log('\n📊 Uploading WHO-5 surveys...')
    const batchSize = 500
    const batches = []
    
    for (let i = 0; i < who5Surveys.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = who5Surveys.slice(i, i + batchSize)
      
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
    
    totalWho5 = who5Surveys.length
    console.log(`✅ WHO-5 Upload complete!`)
    console.log(`   Collection: programs/${programId}/anon_surveys`)
    console.log(`   Documents: ${totalWho5}`)
  }
  
  // Upload CG-CAHPS program data
  if (generateCgCahps && cgCahpsData.length > 0) {
    console.log('\n🏥 Uploading CG-CAHPS program data...')
    
    for (const programData of cgCahpsData) {
      const docRef = await addDoc(collection(db, 'cgcahps_programdata'), programData)
      console.log(`   ✓ ${programData.department} - ID: ${docRef.id}`)
      totalCgCahps++
    }
    
    console.log(`✅ CG-CAHPS Upload complete!`)
    console.log(`   Collection: cgcahps_programdata`)
    console.log(`   Documents: ${totalCgCahps}`)
  }
  
  return { totalWho5, totalCgCahps }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  PrevWORKS Unified Mock Data Generator')
  console.log('═══════════════════════════════════════════════════')
  
  const { generateWho5, generateCgCahps } = CONFIG
  
  console.log(`\n📋 Configuration:`)
  console.log(`   WHO-5: ${generateWho5 ? '✓ Enabled' : '✗ Disabled'}`)
  console.log(`   CG-CAHPS: ${generateCgCahps ? '✓ Enabled' : '✗ Disabled'}`)
  
  try {
    // Generate data
    const who5Surveys = generateWho5 ? generateWho5Data() : []
    const cgCahpsData = generateCgCahps ? generateCgCahpsData() : []
    
    // Upload to Firestore
    const results = await uploadToFirestore(who5Surveys, cgCahpsData)
    
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  Done!')
    if (results) {
      console.log(`  WHO-5: ${results.totalWho5} surveys`)
      console.log(`  CG-CAHPS: ${results.totalCgCahps} records`)
    }
    console.log('═══════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
