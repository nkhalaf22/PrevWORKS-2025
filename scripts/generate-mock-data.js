/**
 * Mock Data Generator for PrevWORKS Firestore
 * 
 * Generates realistic WHO-5 survey data for testing dashboards and analytics.
 * Populates: programs/{programId}/anon_surveys
 * 
 * Usage:
 *   node scripts/generate-mock-data.js
 * 
 * Configuration: Edit the CONFIG object below
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore'

// ============================================================================
// CONFIGURATION - Edit these values for your needs
// ============================================================================
const CONFIG = {
  // Your Firebase config from firebase.js
  firebaseConfig: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  },

  // Program ID to populate
  programId: 'PW-6II1D3',

  // Departments to generate data for
  departments: ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery'],

  // Number of weeks to generate (going backwards from today)
  weeksToGenerate: 12,

  // Surveys per department per week (range)
  surveysPerDeptPerWeek: { min: 3, max: 8 },

  // Score distribution (0-25 raw WHO-5 scale)
  // Adjust these to simulate different wellness states
  scoreDistribution: {
    // Most residents in Watch Zone to Thriving (50-100 on 0-100 scale = 12.5-25 raw)
    thriving: { min: 18, max: 25, weight: 0.25 },      // >=70 scaled
    watchZone: { min: 13, max: 17, weight: 0.40 },     // 50-69 scaled
    atRisk: { min: 7, max: 12, weight: 0.25 },         // 28-49 scaled
    critical: { min: 0, max: 6, weight: 0.10 }         // <28 scaled
  },

  // Add some variance by department (multiplier on base score)
  departmentVariance: {
    'Emergency': 0.85,      // More stress
    'Internal Med': 0.95,
    'Pediatrics': 1.05,     // Better wellness
    'Surgery': 0.90
  },

  // Trend: improve scores over time (add this much per week)
  weeklyImprovement: 0.3,

  // Dry run mode (logs data without writing to Firestore)
  dryRun: false
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get ISO week key (e.g., "2025-W43")
 */
function getIsoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Get a date N weeks ago
 */
function weeksAgo(n) {
  const date = new Date()
  date.setDate(date.getDate() - (n * 7))
  return date
}

/**
 * Generate a random WHO-5 score based on distribution
 */
function generateScore(weekIndex) {
  const { scoreDistribution, weeklyImprovement } = CONFIG
  
  // Pick a segment based on weights
  const rand = Math.random()
  let cumWeight = 0
  let segment = scoreDistribution.thriving
  
  for (const [key, dist] of Object.entries(scoreDistribution)) {
    cumWeight += dist.weight
    if (rand <= cumWeight) {
      segment = dist
      break
    }
  }
  
  // Random score within segment range
  const baseScore = segment.min + Math.random() * (segment.max - segment.min)
  
  // Apply weekly improvement (earlier weeks = lower scores)
  const improvement = weekIndex * weeklyImprovement
  
  // Clamp to 0-25 range
  return Math.max(0, Math.min(25, Math.round(baseScore + improvement)))
}

/**
 * Apply department variance to score
 */
function applyDepartmentVariance(score, department) {
  const variance = CONFIG.departmentVariance[department] || 1.0
  return Math.max(0, Math.min(25, Math.round(score * variance)))
}

/**
 * Generate random timestamp within a given week
 */
function randomTimestampInWeek(weekDate) {
  const start = new Date(weekDate)
  const randomHours = Math.random() * 7 * 24 // Random time within 7 days
  const timestamp = new Date(start.getTime() + randomHours * 60 * 60 * 1000)
  return Timestamp.fromDate(timestamp)
}

// ============================================================================
// DATA GENERATION
// ============================================================================

/**
 * Generate all mock survey data
 */
function generateMockData() {
  const { programId, departments, weeksToGenerate, surveysPerDeptPerWeek } = CONFIG
  const surveys = []
  
  console.log(`\n📊 Generating mock data for program: ${programId}`)
  console.log(`   Departments: ${departments.join(', ')}`)
  console.log(`   Weeks: ${weeksToGenerate}`)
  console.log(`   Surveys per dept per week: ${surveysPerDeptPerWeek.min}-${surveysPerDeptPerWeek.max}\n`)
  
  let totalCount = 0
  
  for (let weekIndex = 0; weekIndex < weeksToGenerate; weekIndex++) {
    const weekDate = weeksAgo(weeksToGenerate - weekIndex - 1)
    const weekKey = getIsoWeekKey(weekDate)
    
    for (const department of departments) {
      const surveyCount = Math.floor(
        surveysPerDeptPerWeek.min + 
        Math.random() * (surveysPerDeptPerWeek.max - surveysPerDeptPerWeek.min + 1)
      )
      
      for (let i = 0; i < surveyCount; i++) {
        const baseScore = generateScore(weekIndex)
        const score = applyDepartmentVariance(baseScore, department)
        
        surveys.push({
          department,
          score,
          weekKey,
          createdAt: randomTimestampInWeek(weekDate)
        })
        
        totalCount++
      }
    }
    
    console.log(`   Week ${weekKey}: ${surveys.length - totalCount + surveys.length} surveys`)
  }
  
  console.log(`\n✅ Generated ${totalCount} total surveys\n`)
  
  // Score distribution summary
  const bySegment = { thriving: 0, watchZone: 0, atRisk: 0, critical: 0 }
  surveys.forEach(s => {
    const scaled = s.score * 4
    if (scaled >= 70) bySegment.thriving++
    else if (scaled >= 50) bySegment.watchZone++
    else if (scaled >= 28) bySegment.atRisk++
    else bySegment.critical++
  })
  
  console.log('📈 Score Distribution (0-100 scale):')
  console.log(`   Thriving (≥70):     ${bySegment.thriving} (${Math.round(bySegment.thriving/totalCount*100)}%)`)
  console.log(`   Watch Zone (50-69): ${bySegment.watchZone} (${Math.round(bySegment.watchZone/totalCount*100)}%)`)
  console.log(`   At-Risk (28-49):    ${bySegment.atRisk} (${Math.round(bySegment.atRisk/totalCount*100)}%)`)
  console.log(`   Critical (<28):     ${bySegment.critical} (${Math.round(bySegment.critical/totalCount*100)}%)`)
  
  return surveys
}

// ============================================================================
// FIRESTORE UPLOAD
// ============================================================================

/**
 * Upload surveys to Firestore in batches
 */
async function uploadToFirestore(surveys) {
  const { programId, dryRun, firebaseConfig } = CONFIG
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data written to Firestore')
    console.log('Sample surveys:')
    console.log(JSON.stringify(surveys.slice(0, 3), null, 2))
    return
  }
  
  console.log('\n🔄 Uploading to Firestore...')
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  
  const batchSize = 500 // Firestore batch limit
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
  
  console.log(`   Writing ${batches.length} batch(es)...`)
  
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
    // Generate data
    const surveys = generateMockData()
    
    // Upload to Firestore
    await uploadToFirestore(surveys)
    
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  Done! Check your Firestore console.')
    console.log('═══════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
