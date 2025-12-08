# seed-program-complete.js

Complete program seeder that creates a realistic data structure with residents, managers, surveys, departments, and CG-CAHPS metrics.

## Overview

This is the **most complete** mock data generator, combining:
- ✅ Manager hierarchy (`manager_info`)
- ✅ Resident structure (`resident_info` with nested surveys)
- ✅ WHO-5 surveys with day-level granularity
- ✅ Department cohort tracking (`programs/{programId}/departments`)
- ✅ CG-CAHPS metrics (`cgcahps_programdata`)
- ✅ Automatic response rate calculation from resident participation

## Usage

**Preview without writing:**
```bash
npm run seed:dry
```

**Seed with defaults (52 weeks, default cohort sizes):**
```bash
npm run seed
```

**Seed with custom parameters:**
```bash
npm run seed -- --program=PW-DEMO2 --weeks=26 --residents=20
```

**Using the Firestore emulator (no quotas):**
```bash
# Terminal 1: Start emulator
npm run emulators:firestore

# Terminal 2: Add to .env
FIRESTORE_EMULATOR_HOST=localhost:8080

# Terminal 3: Seed
npm run seed -- --weeks=52
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--program=ID` | `PW-DEMO1` | Program ID |
| `--weeks=N` | `52` | Number of weeks of historical data |
| `--residents=N` | varies per dept | Override cohort size for all departments |
| `--surveys=N` | `12` | Surveys per resident |
| `--who5-dist` | `uniform` | WHO-5 distribution: `uniform` or `balanced` |
| `--cgcahps-dist` | `uniform` | CG-CAHPS distribution: `uniform` or `realistic` |
| `--who5-min=N` | `0` | WHO-5 minimum score (0-25) |
| `--who5-max=N` | `25` | WHO-5 maximum score (0-25) |
| `--cgcahps-min=N` | `0.3` | CG-CAHPS minimum (0-1) |
| `--cgcahps-max=N` | `0.9` | CG-CAHPS maximum (0-1) |
| `--dry-run` | - | Preview without writing |

## Examples

**Generate full year with balanced WHO-5 distribution:**
```bash
npm run seed -- --weeks=52 --who5-dist=balanced
```

**Generate 6 months with realistic CG-CAHPS:**
```bash
npm run seed -- --weeks=26 --cgcahps-dist=realistic
```

**Generate with larger cohorts:**
```bash
npm run seed -- --residents=25 --surveys=20
```

**Custom program with specific ranges:**
```bash
npm run seed -- --program=PW-HOSPITAL1 --weeks=52 --who5-min=10 --cgcahps-min=0.5
```

## Data Structure

### Collections Created

1. **manager_info/{managerId}**
   - Manager account with program association
   - Contains department list for this program

2. **resident_info/{residentId}**
   - Individual resident records
   - Sub-collection: `surveys/{dayKey}` with WHO-5 scores

3. **programs/{programId}/anon_surveys**
   - Anonymous mirror of resident surveys
   - Mirrors data from resident_info/surveys
   - Used by dashboard for analytics

4. **programs/{programId}/departments**
   - Department cohort sizes
   - Allows accurate response rate calculation

5. **cgcahps_programdata**
   - Global CG-CAHPS metrics per department
   - Covers the entire seeding period

### Response Rate Calculation

Response rates are **naturally derived** from actual participation:

```
Response Rate = (Residents with ≥1 survey) / (Total residents per department)
```

For example, with 12 residents and 8 with surveys = **67% response rate**

## Default Department Configuration

| Department | Cohort Size | Default Response Rate |
|------------|-------------|----------------------|
| Emergency | 12 | 65% |
| Internal Med | 18 | 75% |
| Pediatrics | 10 | 80% |
| Surgery | 15 | 70% |

Override with `--residents=N` to use same cohort for all departments.

## WHO-5 Score Distribution

**Uniform (default):**
- Evenly distributed between min and max
- Good for testing UI with varied scores

**Balanced:**
- 15% Critical (0-6)
- 50% At-Risk/Watch (10-17)
- 25% Improving (18-23)
- 10% Thriving (24-25)

## CG-CAHPS Score Distribution

**Uniform (default):**
- Evenly distributed between min and max
- Default range: 0.3-0.9 (30%-90%)

**Realistic:**
- Clusters around 0.75 (75%)
- Variance ±0.15
- More realistic program performance pattern

## Batch Processing

- Uses batch writes with 200 operations per batch (safely under 500 limit)
- Automatically chunks surveys to avoid quota issues
- Each survey creates 2 writes (resident + anon mirror)

## Example Output

```
═══════════════════════════════════════════════════
  Complete Program Seeder (Residents + Surveys + CG-CAHPS)
═══════════════════════════════════════════════════

📋 Configuration:
   Program ID: PW-DEMO1
   Departments: Emergency, Internal Med, Pediatrics, Surgery
   Weeks back: 52
   Surveys per resident: 12
   WHO-5 distribution: uniform
   CG-CAHPS distribution: uniform

📊 Generated:
   Manager: 1
   Residents: 55
   Surveys: 660
   Departments: 4
   CG-CAHPS records: 4

🔄 Uploading to Firestore...

1️⃣  Writing manager and residents...
   ✓ Created manager + 55 residents

2️⃣  Writing department documents...
   ✓ Created 4 department documents

3️⃣  Writing surveys...
   ✓ Batch 1: surveys 1-200
   ✓ Batch 2: surveys 201-400
   ✓ Batch 3: surveys 401-600
   ✓ Batch 4: surveys 601-660

4️⃣  Writing CG-CAHPS metrics...
   ✓ Created 4 CG-CAHPS records

✅ Complete! Program PW-DEMO1 is seeded and ready.

💾 Collections:
   • manager_info
   • resident_info/{residentId}/surveys
   • programs/PW-DEMO1/departments
   • programs/PW-DEMO1/anon_surveys
   • cgcahps_programdata
```

## Tips

- **For production-like testing**: Use realistic distributions and full 52 weeks
- **For quick testing**: Use `--weeks=4 --surveys=3` to generate minimal data
- **For quota-free development**: Add `FIRESTORE_EMULATOR_HOST=localhost:8080` to `.env`
- **For performance testing**: Use `--residents=50 --surveys=50 --weeks=52`

## Related Scripts

- `generate-mock-data-simple.js` - Lightweight WHO-5 + CG-CAHPS (no manager/resident structure)
- `delete-anon-surveys.js` - Delete all mock data
- `seed-program-with-surveys.js` - Original (WHO-5 only, no CG-CAHPS)
