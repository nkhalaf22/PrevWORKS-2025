/**
 * Delete all documents in programs/{programId}/anon_surveys
 * 
 * Usage:
 *   node scripts/delete-anon-surveys.js --program=PW-12345
 *   node scripts/delete-anon-surveys.js --program=PW-12345 --dry-run
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore'
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

const programId = args.program
const dryRun = args['dry-run'] === true

if (!programId) {
  console.error('\n❌ Error: Missing --program flag')
  console.error('Usage: node scripts/delete-anon-surveys.js --program=PW-12345\n')
  process.exit(1)
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

// Main function
async function deleteAnonSurveys() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Delete Anon Surveys')
  console.log('═══════════════════════════════════════════════════')
  console.log(`\n📂 Program: ${programId}`)
  console.log(`   Collection: programs/${programId}/anon_surveys`)
  
  if (dryRun) {
    console.log('   🔍 DRY RUN - No data will be deleted\n')
  } else {
    console.log('   ⚠️  LIVE MODE - Documents will be deleted!\n')
  }
  
  try {
    // Get all documents
    const collectionRef = collection(db, `programs/${programId}/anon_surveys`)
    const snapshot = await getDocs(collectionRef)
    
    console.log(`📊 Found ${snapshot.size} documents to delete\n`)
    
    if (snapshot.empty) {
      console.log('✅ No documents to delete\n')
      return
    }
    
    if (dryRun) {
      console.log('Sample documents:')
      snapshot.docs.slice(0, 5).forEach((doc, i) => {
        const data = doc.data()
        console.log(`   ${i + 1}. ${doc.id} - ${data.weekKey} ${data.department} (score: ${data.score})`)
      })
      
      if (snapshot.size > 5) {
        console.log(`   ... and ${snapshot.size - 5} more`)
      }
      
      console.log('\n🔍 Dry run complete. Run without --dry-run to delete.\n')
      return
    }
    
    // Delete in batches (500 per batch)
    const batchSize = 500
    const batches = []
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = snapshot.docs.slice(i, i + batchSize)
      
      chunk.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      batches.push(batch)
    }
    
    console.log(`🔄 Deleting ${batches.length} batch(es)...\n`)
    
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit()
      const deletedSoFar = Math.min((i + 1) * batchSize, snapshot.size)
      console.log(`   ✓ Batch ${i + 1}/${batches.length} - ${deletedSoFar}/${snapshot.size} deleted`)
    }
    
    console.log('\n✅ All documents deleted!')
    console.log(`   Collection: programs/${programId}/anon_surveys`)
    console.log(`   Deleted: ${snapshot.size} documents\n`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

deleteAnonSurveys()
