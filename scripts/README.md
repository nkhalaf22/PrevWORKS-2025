# Mock Data Scripts

Unified scripts for generating and managing both WHO-5 and CG-CAHPS mock data with matching cohorts.

## Overview

The mock data generator creates **logically cohesive** data across both WHO-5 surveys and CG-CAHPS program metrics:
- **Shared cohorts**: Both datasets use the same departments (Emergency, Internal Med, Pediatrics, Surgery)
- **Matching quantities**: CG-CAHPS sample sizes match the number of WHO-5 surveys per department
- **Synchronized timeframes**: Both datasets cover the same time period

## Quick Start

**Generate both WHO-5 and CG-CAHPS data:**
```bash
npm run generate-mock
```

**Preview without writing:**
```bash
npm run generate-mock:dry
```

**Delete all mock data:**
```bash
npm run delete-surveys:dry  # Preview first
npm run delete-surveys      # Actually delete
```

## Scripts

### `generate-mock-data-simple.js`
Generates WHO-5 and/or CG-CAHPS mock data with matching cohorts.

**Default behavior**: Generates both WHO-5 and CG-CAHPS data

**Usage:**
```bash
# Generate both WHO-5 and CG-CAHPS (default)
npm run generate-mock

# Preview without writing
npm run generate-mock:dry

# Generate only WHO-5 data
npm run generate-mock:who5

# Generate only CG-CAHPS data
npm run generate-mock:cgcahps

# Custom program and settings
node scripts/generate-mock-data-simple.js --program=MY-PROG --weeks=24 --surveys=10
```

**Options:**
- `--program=PW-6II1D3` - Program ID (default: PW-6II1D3)
- `--weeks=12` - Number of weeks (default: 12)
- `--surveys=5` - Average surveys per department per week (default: 5)
- `--dist=uniform|balanced` - Apply one distribution to both datasets (default: `uniform`)
- `--who5-dist=uniform|balanced` - Override WHO-5 distribution (default: `uniform`)
- `--cgcahps-dist=uniform|realistic` - Override CG-CAHPS distribution (default: `uniform`)
- `--who5-min=0` / `--who5-max=25` - WHO-5 raw range inclusive (default: 0-25)
- `--cgcahps-min=0.3` / `--cgcahps-max=0.9` - CG-CAHPS range (0-1) (default: 0.3-0.9)
- `--who5-only` - Generate only WHO-5 data
- `--cgcahps-only` - Generate only CG-CAHPS data
- `--dry-run` - Preview without writing to Firestore

**Output:**
- **WHO-5**: `programs/{programId}/anon_surveys` subcollection
- **CG-CAHPS**: `cgcahps_programdata` collection with `program_id` field

**Score Distribution:**
- WHO-5: Balanced across wellness levels (20% Critical, 30% At-Risk, 30% Watch Zone, 20% Thriving)
- CG-CAHPS: Realistic scores clustered around 70-80% with variance

---

### `delete-anon-surveys.js`
Deletes WHO-5 and/or CG-CAHPS mock data.

**Default behavior**: Deletes both WHO-5 and CG-CAHPS data

**Usage:**
```bash
# Delete both WHO-5 and CG-CAHPS (with preview)
npm run delete-surveys:dry

# Delete both WHO-5 and CG-CAHPS (live)
npm run delete-surveys

# Delete only WHO-5 data
npm run delete-surveys:who5

# Delete only CG-CAHPS data
npm run delete-surveys:cgcahps

# Custom program
node scripts/delete-anon-surveys.js --program=MY-PROG --dry-run
```

**Options:**
- `--program=PW-6II1D3` - Program ID (default: PW-6II1D3)
- `--who5-only` - Delete only WHO-5 data
- `--cgcahps-only` - Delete only CG-CAHPS data
- `--dry-run` - Preview without deleting

**Safety:**
- Always shows preview of what will be deleted
- Supports dry-run mode to verify before deletion
- Batched deletion for large datasets

---

### `seed-program-with-surveys.js`
Creates a new program seed with a manager, resident roster (per department), and WHO-5 surveys that include `resident_id`, `dayKey`, and `weekKey` so response rates work.

**Usage:**
```bash
# Seed a new program with 8 residents/department and 12 surveys each across last 52 weeks
node scripts/seed-program-with-surveys.js --program=PW-DEMO1 --departments="Emergency,Internal Med,Pediatrics,Surgery" --residents=8 --surveys=12 --weeks=52

# Preview without writing
node scripts/seed-program-with-surveys.js --dry-run
```

**What it writes:**
- `manager_info/{managerId}` with `program_id` + departments
- `resident_info/{residentId}` docs for each department (cohort size derives from these)
- `programs/{programId}` (anchor doc with departments)
- `resident_info/{residentId}/surveys/{dayKey}` docs with `resident_id`, `department`, `dayKey`, `weekKey`, `score`, `createdAt`
- `programs/{programId}/anon_surveys/{residentId}_{dayKey}` mirror (same fields) to match production submission flow

If your Cloud Function is deployed, those resident surveys will be mirrored into `programs/{programId}/anon_surveys` and `dept_weekly`.

---

## Quick Reference

```bash
# Generate both datasets with preview
npm run generate-mock:dry

# Generate both datasets (live)
npm run generate-mock

# Delete both datasets with preview
npm run delete-surveys:dry

# Delete both datasets (live)
npm run delete-surveys

# Generate only WHO-5
npm run generate-mock:who5

# Delete only CG-CAHPS
npm run delete-surveys:cgcahps
```

## Data Cohesion

The generator ensures logical consistency between WHO-5 and CG-CAHPS:

1. **Same departments**: Both use Emergency, Internal Med, Pediatrics, Surgery
2. **Sample size matching**: CG-CAHPS `sample_size` = `weeks * surveysPerWeek` for each department
3. **Time period alignment**: CG-CAHPS `start_date` and `end_date` match the WHO-5 survey period
4. **Program ID**: Both datasets share the same `program_id`


### Example Output:

**WHO-5 Surveys** (12 weeks × 4 departments × ~5 surveys = ~240 total)
```
programs/PW-6II1D3/anon_surveys/
  - doc1: { department: "Emergency", score: 18, weekKey: "2025-W45", ... }
  - doc2: { department: "Internal Med", score: 12, weekKey: "2025-W45", ... }
  - doc3: { department: "Pediatrics", score: 8, weekKey: "2025-W45", ... }
  ...
```

**CG-CAHPS Program Data** (1 record per department = 4 total)
```
cgcahps_programdata/
  - docA: {
      program_id: "PW-6II1D3",
      department: "Emergency",
      sample_size: 60,  // 12 weeks × 5 surveys
      access_care: 0.74,
      coord_care: 0.77,
      emotional_support: 0.81,
      information_education: 0.79,
      respect_patient_prefs: 0.72,
      start_date: Timestamp(2025-01-01),
      end_date: Timestamp(2025-03-31)
    }
  - docB: { program_id: "PW-6II1D3", department: "Internal Med", sample_size: 60, ... }
  - docC: { program_id: "PW-6II1D3", department: "Pediatrics", sample_size: 60, ... }
  - docD: { program_id: "PW-6II1D3", department: "Surgery", sample_size: 60, ... }
```

## Configuration

Both scripts read Firebase configuration from your `.env` file:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Ensure your `.env` file is properly configured before running the scripts.

## Troubleshooting

**"Missing Firebase configuration in .env"**
- Make sure your `.env` file exists in the project root
- Verify all `VITE_FIREBASE_*` variables are set

**"No data showing in dashboard"**
- Check that you're using the correct `program_id`
- Verify data was generated (use `--dry-run` first)
- Check Firebase Console to confirm documents exist

**"Permission denied"**
- Ensure your Firebase security rules allow the operations
- For testing, you may need to adjust Firestore rules

**Need to regenerate data?**
```bash
# Delete old data
npm run delete-surveys

# Generate fresh data
npm run generate-mock
```
After generating data:

1. Open your Firebase Console → Firestore
2. Navigate to `programs/{programId}/anon_surveys`
3. Verify documents have `department`, `score`, `weekKey`, `createdAt`
4. Refresh your PrevWORKS dashboard to see the data visualized
5. Adjust CONFIG and regenerate if needed

## Advanced: Generate Weekly Aggregates

If you want to also populate `dept_weekly` (optional, dashboard derives it automatically):

```javascript
// TODO: Add dept_weekly generator
// For now, dashboard computes weekly averages from anon_surveys
```
