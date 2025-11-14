# CG-CAHPS Integration Guide

## Overview
This system allows managers to upload CG-CAHPS (Clinician & Group Consumer Assessment of Healthcare Providers and Systems) driver metrics data via CSV file. The data is stored in Firestore and automatically displayed in the main Dashboard.

## How It Works

### 1. Data Flow
```
Manager uploads CSV → Parse & validate → Save to Firestore → Dashboard reads & displays
```

### 2. Firestore Structure
```
programs/
  {programId}/
    cgcahps/
      latest: {
        drivers: [
          { name: "Access to Care", value: 0.74, benchmark: 0.50 },
          { name: "Communication", value: 0.81, benchmark: 0.80 },
          ...
        ],
        uploadedAt: Timestamp,
        fileName: "cgcahps-2025-01.csv"
      }
```

### 3. CSV File Format

**Required columns:**
- `Driver` - Name of the CG-CAHPS dimension (e.g., "Access to Care")
- `Score` - Your program's score (0-100)
- `Benchmark` - Comparison benchmark (0-100)

**Example CSV:**
```csv
Driver,Score,Benchmark
Access to Care,74,50
Communication,81,80
Office Staff,79,80
Provider Rating,72,70
Care Coordination,77,80
```

**Download the template:** Available in the Manager Dashboard at `/cgcahps-template.csv`

## Using the System

### As a Manager:

1. **Navigate to Manager Dashboard** (`/manager/dashboard` or `/dashboard`)
   - Both routes work - `/manager/dashboard` redirects to `/dashboard`
   - The unified dashboard has two tabs: "Analytics Overview" and "Manage Data"
2. **Switch to the "Manage Data" tab** to access the CG-CAHPS upload interface
3. **Download the CSV template** (optional, if you need the format)
4. **Prepare your CSV file** with driver metrics data
5. **Upload the file:**
   - Click "Choose file" or drag & drop
   - Click "Upload & Save to Firestore"
6. **View the data** in the table below the upload form
7. **Switch to "Analytics Overview" tab** to see the metrics visualized in charts

### What Shows Up in Dashboard:

When you switch to "CG-CAHPS" metric in the Dashboard:
- ✅ **Driver Metrics Chart** - Horizontal bar chart with benchmark lines
- ✅ **Driver Metrics List** - Compact color-coded bars
- ✅ **All metrics show uploaded data** instead of mock data

## Technical Details

### Manager Dashboard Implementation
- **File:** `src/pages/ManagerDashboard.jsx`
- **Parser:** `parseCgCahpsCsv()` - Converts CSV rows to driver objects
- **Upload Handler:** `handleUploadCgCahps()` - Validates, parses, saves to Firestore
- **Security:** Uses authenticated user's program_id from manager profile

### Main Dashboard Integration
- **File:** `src/pages/Dashboard.jsx`
- **Data Loading:** Queries `programs/{programId}/cgcahps/latest` on mount
- **Display Logic:** Uses real data when available, falls back to mock if not
- **Transform Function:** `transformFirestoreData()` checks for CG-CAHPS data

### Firestore Security Rules
```javascript
// Managers can read and write CG-CAHPS data for their program only
match /programs/{programId}/cgcahps/{docId} {
  allow read, write: if request.auth != null && 
                       exists(/databases/$(database)/documents/manager_info/$(request.auth.uid)) &&
                       get(/databases/$(database)/documents/manager_info/$(request.auth.uid)).data.program_id == programId;
}
```

## Deployment

1. **Deploy Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **Test the workflow:**
   - Log in as a manager
   - You'll be at `/dashboard` (or `/manager/dashboard` which redirects there)
   - Switch to the "Manage Data" tab
   - Upload the sample CSV
   - Switch to "Analytics Overview" tab
   - Verify CG-CAHPS data appears in the driver metrics sections

## Common CG-CAHPS Dimensions

Standard CG-CAHPS driver metrics include:
- **Access to Care** - Appointment availability, wait times
- **Communication** - Provider clarity, listening, respect
- **Office Staff** - Courtesy, helpfulness
- **Provider Rating** - Overall provider assessment (0-10 scale)
- **Care Coordination** - Information sharing, follow-up
- **Shared Decision Making** - Patient involvement in care decisions
- **Health Promotion** - Preventive care discussions

## Troubleshooting

### CSV Upload Fails
- Check CSV format matches template exactly
- Ensure no special characters or extra columns
- Score and Benchmark should be numbers 0-100

### Data Doesn't Appear in Dashboard
- Refresh the Dashboard page after upload
- Check browser console for errors
- Verify you're logged in as the same manager
- Confirm program_id matches

### Permission Denied Error
- Ensure Firestore rules are deployed
- Verify manager profile has program_id field
- Check authentication state (logged in?)

## Future Enhancements

Potential improvements:
- **History tracking** - Store multiple uploads with timestamps
- **Trend analysis** - Show driver metric changes over time
- **Bulk import** - Upload multiple survey cycles at once
- **Data validation** - Enforce driver name standards
- **Export functionality** - Download current metrics as CSV
