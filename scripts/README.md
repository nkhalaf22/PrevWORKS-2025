# Mock Data Generator

Generate realistic WHO-5 survey data for testing the PrevWORKS dashboard and analytics.

## Quick Start

1. **Configure your Firebase credentials**

   Open `scripts/generate-mock-data.js` and update the `firebaseConfig` object with your Firebase project settings (copy from `src/lib/firebase.js`):

   ```javascript
   firebaseConfig: {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   }
   ```

2. **Customize generation settings** (optional)

   Edit the `CONFIG` object in the script to adjust:
   - `programId`: Your program ID (default: `'PW-6II1D3'`)
   - `departments`: Array of department names
   - `weeksToGenerate`: How many weeks of historical data (default: 12)
   - `surveysPerDeptPerWeek`: Range of surveys per department per week
   - `scoreDistribution`: Wellness score distribution weights
   - `departmentVariance`: Department-specific score adjustments
   - `weeklyImprovement`: Score improvement trend over time

3. **Run the generator**

   ```powershell
   node scripts/generate-mock-data.js
   ```

## What It Generates

The script populates `programs/{programId}/anon_surveys` with documents containing:

```javascript
{
  department: "Emergency",
  score: 15,              // Raw WHO-5 score (0-25)
  weekKey: "2025-W43",    // ISO week
  createdAt: Timestamp    // Random time within that week
}
```

## Configuration Options

### Score Distribution

Adjust the `scoreDistribution` weights to simulate different wellness scenarios:

```javascript
scoreDistribution: {
  thriving: { min: 18, max: 25, weight: 0.25 },   // ≥70 on 0-100 scale
  watchZone: { min: 13, max: 17, weight: 0.40 },  // 50-69 scaled
  atRisk: { min: 7, max: 12, weight: 0.25 },      // 28-49 scaled
  critical: { min: 0, max: 6, weight: 0.10 }      // <28 scaled
}
```

**Example scenarios:**

- **Crisis scenario** (high burnout):
  ```javascript
  thriving: { min: 18, max: 25, weight: 0.10 },
  watchZone: { min: 13, max: 17, weight: 0.20 },
  atRisk: { min: 7, max: 12, weight: 0.40 },
  critical: { min: 0, max: 6, weight: 0.30 }
  ```

- **Healthy program** (strong wellness):
  ```javascript
  thriving: { min: 18, max: 25, weight: 0.50 },
  watchZone: { min: 13, max: 17, weight: 0.35 },
  atRisk: { min: 7, max: 12, weight: 0.10 },
  critical: { min: 0, max: 6, weight: 0.05 }
  ```

### Department Variance

Simulate different stress levels by department:

```javascript
departmentVariance: {
  'Emergency': 0.85,      // More stressful (lower scores)
  'Internal Med': 0.95,
  'Pediatrics': 1.05,     // Better wellness (higher scores)
  'Surgery': 0.90
}
```

### Weekly Improvement Trend

Add a positive or negative trend over time:

```javascript
weeklyImprovement: 0.3   // Scores improve by ~0.3 points per week
// or
weeklyImprovement: -0.2  // Declining wellness over time
```

## Dry Run Mode

Test your configuration without writing to Firestore:

```javascript
dryRun: true
```

This will:
- Generate all data
- Print statistics
- Show sample documents
- **Not write anything to Firestore**

## Output

The script provides detailed statistics:

```
📊 Generating mock data for program: PW-6II1D3
   Departments: Emergency, Internal Med, Pediatrics, Surgery
   Weeks: 12
   Surveys per dept per week: 3-8

   Week 2025-W31: 24 surveys
   Week 2025-W32: 26 surveys
   ...

✅ Generated 312 total surveys

📈 Score Distribution (0-100 scale):
   Thriving (≥70):     78 (25%)
   Watch Zone (50-69): 125 (40%)
   At-Risk (28-49):    78 (25%)
   Critical (<28):     31 (10%)

🔄 Uploading to Firestore...
   Writing 1 batch(es)...
   ✓ Batch 1/1 committed

✅ Upload complete!
   Collection: programs/PW-6II1D3/anon_surveys
   Documents: 312
```

## Tips

1. **Start with dry run** to verify your configuration generates the expected distribution
2. **Use realistic numbers**: 3-8 surveys per department per week matches typical biweekly check-ins
3. **Generate multiple program IDs** by running the script multiple times with different `programId` values
4. **Clear existing data** via Firestore console if you want to regenerate from scratch

## Troubleshooting

**Error: "Missing or insufficient permissions"**
- Ensure your Firestore security rules allow writes (currently open per your note)
- Check that Firebase config is correct

**Script hangs or times out**
- Reduce `weeksToGenerate` or `surveysPerDeptPerWeek`
- Firestore has batch size limits (500 docs per batch, handled automatically)

**Scores look wrong in dashboard**
- Remember: stored scores are 0-25 (raw), displayed as 0-100 (scaled by dashboard)
- Check `scoreDistribution` ranges match your expectations

## Next Steps

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
