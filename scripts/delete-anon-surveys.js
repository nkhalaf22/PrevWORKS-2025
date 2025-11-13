/**
 * Delete Mock Data - Unified Version
 * 
 * Deletes both WHO-5 and CG-CAHPS mock data.
 * 
 * Usage:
 *   node scripts/delete-anon-surveys.js [options]
 * 
 * Options:
 *   --program=PW-6II1D3     Program ID (default: PW-6II1D3)
 *   --who5-only             Delete only WHO-5 data
 *   --cgcahps-only          Delete only CG-CAHPS data
 *   --dry-run               Preview without deleting
 * 
 * Examples:
 *   node scripts/delete-anon-surveys.js --dry-run
 *   node scripts/delete-anon-surveys.js --program=MY-PROG
 *   node scripts/delete-anon-surveys.js --who5-only
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, writeBatch, query, where } from 'firebase/firestore'
import { config } from 'dotenv'

// Load environment variables
config()

// Parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=')
    acc[key] = val || true
  }
  return acc
}, {})

const CONFIG = {
  programId: args.program || 'PW-6II1D3',
  deleteWho5: !args['cgcahps-only'],
  deleteCgCahps: !args['who5-only'],
  dryRun: args['dry-run'] === true
}

// Firebase setup
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.projectId) {
  console.error('\n❌ Error: Missing Firebase configuration in .env\n')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ============================================================================
// DELETE WHO-5 DATA
// ============================================================================

async function deleteWho5Surveys() {
  const { programId, dryRun } = CONFIG
  const collectionPath = `programs/${programId}/anon_surveys`
  
  console.log(`\n📊 Deleting WHO-5 surveys from: ${collectionPath}`)
  
  const collectionRef = collection(db, collectionPath)
  const snapshot = await getDocs(collectionRef)
  
  console.log(`   Found ${snapshot.size} documents`)
  
  if (snapshot.empty) {
    console.log('   ℹ️  No WHO-5 surveys to delete')
    return 0
  }
  
  if (dryRun) {
    console.log('   🔍 DRY RUN - Would delete these documents:')
    snapshot.docs.slice(0, 5).forEach((doc, i) => {
      const data = doc.data()
      console.log(`   ${i + 1}. ID: ${doc.id}`)
      console.log(`      Department: ${data.department}`)
      console.log(`      Week: ${data.weekKey}`)
      console.log(`      Score: ${data.score}`)
    })
    if (snapshot.size > 5) {
      console.log(`   ... and ${snapshot.size - 5} more`)
    }
    return snapshot.size
  }
  
  // Delete in batches
  const batchSize = 500
  let totalDeleted = 0
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db)
    const chunk = snapshot.docs.slice(i, i + batchSize)
    
    chunk.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    totalDeleted += chunk.length
    console.log(`   ✓ Deleted ${totalDeleted}/${snapshot.size} documents`)
  }
  
  console.log(`✅ WHO-5 deletion complete: ${totalDeleted} documents`)
  return totalDeleted
}

// ============================================================================
// DELETE CG-CAHPS DATA
// ============================================================================

async function deleteCgCahpsData() {
  const { programId, dryRun } = CONFIG
  
  console.log(`\n🏥 Deleting CG-CAHPS program data for: ${programId}`)
  
  const collectionRef = collection(db, 'cgcahps_programdata')
  const q = query(collectionRef, where('program_id', '==', programId))
  const snapshot = await getDocs(q)
  
  console.log(`   Found ${snapshot.size} documents`)
  
  if (snapshot.empty) {
    console.log('   ℹ️  No CG-CAHPS data to delete')
    return 0
  }
  
  if (dryRun) {
    console.log('   🔍 DRY RUN - Would delete these documents:')
    snapshot.docs.forEach((doc, i) => {
      const data = doc.data()
      console.log(`   ${i + 1}. ID: ${doc.id}`)
      console.log(`      Department: ${data.department}`)
      console.log(`      Sample size: ${data.sample_size}`)
      console.log(`      Period: ${data.start_date?.toDate().toISOString().split('T')[0]} to ${data.end_date?.toDate().toISOString().split('T')[0]}`)
    })
    return snapshot.size
  }
  
  // Delete all documents
  const batch = writeBatch(db)
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })
  
  await batch.commit()
  
  console.log(`✅ CG-CAHPS deletion complete: ${snapshot.size} documents`)
  return snapshot.size
}

// Main function
async function deleteAnonSurveys() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  PrevWORKS Unified Mock Data Deletion')
  console.log('═══════════════════════════════════════════════════')
  
  const { programId, deleteWho5, deleteCgCahps, dryRun } = CONFIG
  
  console.log(`\n📋 Configuration:`)
  console.log(`   Program ID: ${programId}`)
  console.log(`   WHO-5: ${deleteWho5 ? '✓ Delete' : '✗ Keep'}`)
  console.log(`   CG-CAHPS: ${deleteCgCahps ? '✓ Delete' : '✗ Keep'}`)
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`)
  
  try {
    let totalWho5 = 0
    let totalCgCahps = 0
    
    if (deleteWho5) {
      totalWho5 = await deleteWho5Surveys()
    }
    
    if (deleteCgCahps) {
      totalCgCahps = await deleteCgCahpsData()
    }
    
    console.log('\n═══════════════════════════════════════════════════')
    if (dryRun) {
      console.log('  DRY RUN Complete - No data was deleted')
      console.log(`  Would delete: ${totalWho5} WHO-5, ${totalCgCahps} CG-CAHPS`)
    } else {
      console.log('  Done!')
      console.log(`  Deleted: ${totalWho5} WHO-5, ${totalCgCahps} CG-CAHPS`)
    }
    console.log('═══════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

deleteAnonSurveys()
