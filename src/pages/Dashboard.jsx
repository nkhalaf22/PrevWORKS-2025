import React, { useState, useMemo, useEffect } from 'react'
import {
  AppLayout,
  ContentLayout,
  Header,
  Container,
  Grid,
  SpaceBetween,
  Box,
  Button,
  Select,
  Table,
  StatusIndicator,
  LineChart,
  BarChart,
  Spinner,
  Alert,
  FileUpload,
  FormField,
  Tabs
} from '@cloudscape-design/components'
import Brand from '../components/Brand'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import CgCahpsDrivers from '../components/CgCahps'

const auth = getAuth()
const db = getFirestore()

// ---------------- Metric-Specific Mock Data ---------------------------------
// CG-CAHPS trend (0–100 composite)
const cgCahpsTrend = [
  { x: 'May', y: 28 },
  { x: 'Feb', y: 38 },
  { x: 'Mar', y: 31 },
  { x: 'Apr', y: 47 },
  { x: 'May2', y: 45 },
  { x: 'Jun', y: 53 },
  { x: 'Sept', y: 49 },
  { x: 'Apr2', y: 57 },
  { x: 'April', y: 68 }
]
const cgCahpsDriverMetrics = [
  { name: 'Access to Care', value: 0.74, benchmark: 0.50 },
  { name: 'Communication', value: 0.81, benchmark: 0.80, highlight: true },
  { name: 'Office Staff', value: 0.79, benchmark: 0.80 },
  { name: 'Provider Rating', value: 0.72, benchmark: 0.70 },
  { name: 'Care Coordination', value: 0.77, benchmark: 0.80 }
]
const cgCahpsResidents = [
  { id: 1, dept: 'Emergency', score: 32, responded: true },
  { id: 2, dept: 'Emergency', score: 48, responded: true },
  { id: 3, dept: 'Internal Med', score: 60, responded: true },
  { id: 4, dept: 'Internal Med', score: 57, responded: false },
  { id: 5, dept: 'Pediatrics', score: 55, responded: true },
  { id: 6, dept: 'Pediatrics', score: 63, responded: true },
  { id: 7, dept: 'Surgery', score: 70, responded: true },
  { id: 8, dept: 'Surgery', score: 66, responded: false },
  { id: 9, dept: 'Surgery', score: 58, responded: true },
  { id:10, dept: 'Emergency', score: 39, responded: false },
  { id:11, dept: 'Pediatrics', score: 61, responded: true },
  { id:12, dept: 'Internal Med', score: 51, responded: true }
]

// WHO-5 trend (example upward improvement)
const who5Trend = [
  { x: 'May', y: 42 },
  { x: 'Feb', y: 45 },
  { x: 'Mar', y: 47 },
  { x: 'Apr', y: 49 },
  { x: 'May2', y: 51 },
  { x: 'Jun', y: 55 },
  { x: 'Sept', y: 58 },
  { x: 'Apr2', y: 60 },
  { x: 'April', y: 63 }
]
// WHO-5 “drivers” (individual item domains)
const who5DriverMetrics = [
  { name: 'Positive Mood', value: 0.62, benchmark: 0.60 },
  { name: 'Calm / Relaxed', value: 0.58, benchmark: 0.62 },
  { name: 'Active / Energetic', value: 0.55, benchmark: 0.57, highlight: true },
  { name: 'Rested / Refreshed', value: 0.49, benchmark: 0.55 },
  { name: 'Daily Life Interest', value: 0.64, benchmark: 0.60 }
]
const who5Residents = [
  { id: 101, dept: 'Emergency', score: 41, responded: true },
  { id: 102, dept: 'Emergency', score: 37, responded: true },
  { id: 103, dept: 'Internal Med', score: 55, responded: true },
  { id: 104, dept: 'Internal Med', score: 58, responded: true },
  { id: 105, dept: 'Pediatrics', score: 66, responded: true },
  { id: 106, dept: 'Pediatrics', score: 61, responded: false },
  { id: 107, dept: 'Surgery', score: 72, responded: true },
  { id: 108, dept: 'Surgery', score: 69, responded: true },
  { id: 109, dept: 'Surgery', score: 63, responded: true },
  { id: 110, dept: 'Emergency', score: 44, responded: false },
  { id: 111, dept: 'Pediatrics', score: 59, responded: true },
  { id: 112, dept: 'Internal Med', score: 47, responded: true }
]

// Map for active metric selection
const metricConfigs = {
  'CG-CAHPS': {
    label: 'CG-CAHPS',
    trend: cgCahpsTrend,
    driverMetrics: cgCahpsDriverMetrics,
    residents: cgCahpsResidents
  },
  'WHO-5': {
    label: 'WHO-5',
    trend: who5Trend,
    driverMetrics: who5DriverMetrics,
    residents: who5Residents
  }
}

// Shared heatmap mock (static for now)
const months = ['May', 'Feb', 'Mar', 'Apr', 'May2', 'Jun', 'Sept', 'Apr2', 'April']
const departments = ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery']
const heatmapValues = [
  [32, 48, 55, 61, 58, 52, 49, 44, 39],
  [60, 62, 59, 57, 56, 54, 53, 51, 50],
  [55, 58, 60, 63, 65, 61, 59, 58, 56],
  [70, 68, 66, 64, 62, 60, 58, 55, 50]
]

// ---------------- Helpers ---------------------------------------------------
function classifyScore(score) {
  if (score >= 70) return { label: 'Thriving', color: 'positive' }
  if (score >= 50) return { label: 'Watch Zone', color: 'warning' }
  if (score < 28) return { label: 'Critical', color: 'error' }
  return { label: 'At-Risk', color: 'error' }
}

function buildDistribution(residents) {
  const avg = residents.reduce((a, r) => a + r.score, 0) / (residents.length || 1)
  const segmentOf = score => (score > avg ? 'Above Average' : score < avg ? 'Below Average' : 'Average')

  const segmentMap = {}
  const bySegment = { above: [], average: [], below: [] }

  residents.forEach(r => {
    const seg = segmentOf(r.score)
    if (!segmentMap[seg]) segmentMap[seg] = { segment: seg, cohortSize: 0, respondents: 0, totalScore: 0 }
    segmentMap[seg].cohortSize++
    if (r.responded) segmentMap[seg].respondents++
    segmentMap[seg].totalScore += r.score

    if (seg === 'Above Average') bySegment.above.push(r)
    else if (seg === 'Average') bySegment.average.push(r)
    else bySegment.below.push(r)
  })

  const segmentAgg = Object.values(segmentMap).map(o => ({
    segment: o.segment,
    cohortSize: o.cohortSize,
    respondents: o.respondents,
    responseRate: o.cohortSize ? Math.round((o.respondents / o.cohortSize) * 100) : 0,
    avgScore: o.cohortSize ? Math.round(o.totalScore / o.cohortSize) : 0
  })).sort((a, b) => a.segment.localeCompare(b.segment))

  // Department breakdown helper per segment
  function deptBreakdown(list) {
    const total = list.length || 1
    const m = {}
    list.forEach(r => {
      if (!m[r.dept]) m[r.dept] = { dept: r.dept, cohortSize: 0, sum: 0 }
      m[r.dept].cohortSize++
      m[r.dept].sum += r.score
    })
    return Object.values(m)
      .map(d => ({ dept: d.dept, cohortSize: d.cohortSize, pct: Math.round((d.cohortSize / total) * 100), avg: Math.round(d.sum / d.cohortSize) }))
      .sort((a, b) => a.avg - b.avg)
  }

  const aboveDeptBreakdown = deptBreakdown(bySegment.above)
  const avgDeptBreakdown = deptBreakdown(bySegment.average)
  const belowAvgDeptBreakdown = deptBreakdown(bySegment.below)

  // Near-threshold counts (within ±5 of the overall mean boundary)
  const nearAboveCount = bySegment.above.filter(r => r.score <= avg + 5).length
  const nearAvgCount = bySegment.average.filter(r => Math.abs(r.score - avg) <= 5).length
  const nearBelowCount = bySegment.below.filter(r => r.score >= avg - 5).length

  return {
    avgWellness: avg,
    segmentAgg,
    aboveDeptBreakdown,
    avgDeptBreakdown,
    belowAvgDeptBreakdown,
    nearAboveCount,
    nearAvgCount,
    nearBelowCount
  }
}

// ---------------- UI Subcomponents -----------------------------------------
const MetricCard = ({ title, value, status }) => (
  <Container header={<Header variant="h3">{title}</Header>}>
    <Box fontSize="display-l" fontWeight="bold" display="inline-block">
      {value}
    </Box>
    {status && (
      <Box float="right">
        <StatusIndicator type={status.color}>{status.label}</StatusIndicator>
      </Box>
    )}
  </Container>
)

// Primary BarChart with popovers
const DriverMetricsChart = ({ driverMetrics }) => {
  // Data uses category (driver name) on X axis, numeric percent on Y axis.
  // Previous version inverted domains (numeric xDomain, categorical yDomain) so nothing rendered.
  const categories = driverMetrics.map(m => m.name)
  const series = [
    {
      title: 'Driver Score (%)',
      type: 'bar',
      data: driverMetrics.map(m => ({
        x: m.name,
        y: Math.round(m.value * 100),
        benchmark: Math.round(m.benchmark * 100),
        highlight: !!m.highlight
      }))
    }
  ]
  return (
    <BarChart
      series={series}
      horizontalBars
      xDomain={categories}          // categories
      yDomain={[0, 100]}            // numeric range (0–100%)
      height={260}
      ariaLabel="Driver metrics scores"
      yTitle="Percent"
      xTitle="Driver"
      valueFormatter={v => `${v}%`}
      detailPopoverContent={e => {
        const d = e.datum
        if (!d) return null
        const driver = series[0].data.find(pt => pt.x === d.x)
        if (!driver) return null
        const delta = driver.y - driver.benchmark
        return (
          <SpaceBetween size="xxs">
            <Box fontWeight="bold">{driver.x}</Box>
            <Box>Score: {driver.y}%</Box>
            <Box>Benchmark: {driver.benchmark}%</Box>
            <Box color={delta >= 0 ? 'text-status-success' : 'text-status-error'}>
              Delta: {delta >= 0 ? '+' : ''}{delta}%
            </Box>
            {driver.highlight && <StatusIndicator type="info">Focus Driver</StatusIndicator>}
          </SpaceBetween>
        )
      }}
      i18nStrings={{
        filterLabel: 'Filter',
        filterPlaceholder: 'Find driver',
        detailPopoverDismissAriaLabel: 'Dismiss',
        legendAriaLabel: 'Legend',
        chartAriaRoleDescription: 'bar chart'
      }}
    />
  )
}

// Alternate compact list visualization
const DriverMetricBars = ({ driverMetrics }) => {
  // Reuse heatmap color scheme for consistency
  const buckets = [
    { max: 40, color: '#dc2626' },
    { max: 50, color: '#f97316' },
    { max: 60, color: '#facc15' },
    { max: 70, color: '#22c55e' },
    { max: Infinity, color: '#065f46' }
  ]
  const colorFor = v => {
    for (const b of buckets) {
      if (v < b.max) return b.color
    }
    return '#6b7280'
  }
  
  return (
    <SpaceBetween size="s">
      {driverMetrics.map(m => {
        const valuePct = Math.round(m.value * 100)
        const benchPct = Math.round(m.benchmark * 100)
        const barColor = colorFor(valuePct)
        return (
          <div key={m.name}>
            <Box fontSize="body-s" margin={{ bottom: 'xxs' }}>{m.name}</Box>
            <div
              style={{
                position: 'relative',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                height: 16,
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${valuePct}%`,
                  background: barColor,
                  transition: 'width .35s'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${benchPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#111827'
                }}
                title={`Benchmark ${benchPct}%`}
              />
            </div>
            <Box fontSize="body-xxs" color="text-body-secondary" margin={{ top: 'xxs' }}>
              {valuePct}% (benchmark {benchPct}%)
            </Box>
          </div>
        )
      })}
    </SpaceBetween>
  )
}

// Update Heatmap to accept filtered months/values and departments via props
const Heatmap = ({ months, values, departments: depts }) => {
  // 10-point middle increments
  const buckets = [
    { max: 40, label: '<40',    color: '#dc2626' },
    { max: 50, label: '40-49',  color: '#f97316' },
    { max: 60, label: '50-59',  color: '#facc15' },
    { max: 70, label: '60-69',  color: '#22c55e' },
    { max: Infinity, label: '70+', color: '#065f46' }
  ]

  const colorFor = v => {
    for (const b of buckets) {
      if (v < b.max) return b.color
    }
    return '#6b7280'
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${months.length}, 1fr)`, gap: 4 }}>
        <div />
        {months.map((m, idx) => (
          <Box key={`${m}-${idx}`} fontSize="body-xs" textAlign="center">{m}</Box>
        ))}
        {depts.map((dept, row) => (
          <React.Fragment key={dept}>
            <Box fontSize="body-s">{dept}</Box>
            {values[row] && values[row].map((v, i) => (
              <div
                key={i}
                title={`${dept} ${months[i]}: ${v}`}
                style={{
                  background: colorFor(v),
                  height: 34,
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: v >= 70 ? 'inset 0 0 0 2px rgba(255,255,255,0.25)' : 'none',
                  transition: 'transform .15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {v}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <Box margin={{ top: 's' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {buckets.map((b, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 14,
                  borderRadius: 3,
                  background: b.color,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15)'
                }}
              />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  )
}

// Helper: transform Firestore data into dashboard format
function transformFirestoreData(firestoreData, metricType) {
  const { surveys, weeklyData, departments: deptList, cgcahpsDrivers } = firestoreData
  
  // Build trend from weekly aggregates
  const trend = weeklyData
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .slice(-12) // last 12 weeks
    .map(w => ({
      x: w.weekKey,
      y: Math.round(w.avg || 0)
    }))

  // Build residents list from surveys (simulate for heatmap)
  const residents = surveys.map((s, idx) => ({
    id: idx + 1,
    dept: s.department,
    score: s.score,
    responded: true
  }))

  // Use real CG-CAHPS drivers from Firestore if available, otherwise mock
  let driverMetrics
  if (metricType === 'CG-CAHPS' && cgcahpsDrivers && cgcahpsDrivers.length > 0) {
    driverMetrics = cgcahpsDrivers
  } else {
    driverMetrics = metricType === 'WHO-5' ? who5DriverMetrics : cgCahpsDriverMetrics
  }

  // Build heatmap data from weekly aggregates grouped by department
  const heatmapMonths = []
  const heatmapDepts = deptList && deptList.length > 0 ? deptList : ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery']
  const heatmapValues = []
  
  // Get unique weeks (sorted)
  const weeks = [...new Set(weeklyData.map(w => w.weekKey))].sort().slice(-9) // last 9 weeks
  heatmapMonths.push(...weeks)
  
  // For each department, build array of scores by week
  heatmapDepts.forEach(dept => {
    const deptScores = weeks.map(week => {
      const weekData = weeklyData.find(w => w.weekKey === week && w.department === dept)
      return weekData ? Math.round(weekData.avg || 0) : 0
    })
    heatmapValues.push(deptScores)
  })

  // Calculate response rate from weekly data
  // Sum up all counts and total possible responses
  const totalResponses = weeklyData.reduce((sum, w) => sum + (w.count || 0), 0)
  const totalPossible = surveys.length // This is a rough estimate
  const responseRate = totalPossible > 0 ? Math.round((totalResponses / totalPossible) * 100) : 0

  return {
    label: metricType,
    trend: trend.length > 0 ? trend : [{ x: 'No data', y: 0 }],
    driverMetrics,
    residents: residents.length > 0 ? residents : [],
    heatmapMonths: heatmapMonths.length > 0 ? heatmapMonths : ['No data'],
    heatmapDepts,
    heatmapValues: heatmapValues.length > 0 ? heatmapValues : [[0]],
    responseRate: surveys.length > 0 ? 100 : 0, // All surveys in anon_surveys are completed responses
    totalSurveys: surveys.length
  }
}

// Helper: compute slice window for a selected time range
function computeSliceWindow(rangeValue, total) {
  // half split for survey cycles
  if (rangeValue === 'cycle-prev') return { start: 0, end: Math.max(1, Math.floor(total / 2)) }
  if (rangeValue === 'cycle-cur')  return { start: Math.floor(total / 2), end: total }

  // counts for rolling/calendar/cohort ranges mapped to "last N points"
  const countMap = {
    '4w': 4, '8w': 8, '12w': 12,
    '6m': 6, '12m': 12, '24m': 24,
    'mtd': 1, 'lm': 1, 'qtd': 3, 'lq': 3,
    'ytd': 12, 'ly': 12,
    'cohort-std': total, 'cohort-90': 3,
    'custom': total
  }
  const cnt = Math.max(1, Math.min(total, countMap[rangeValue] ?? total))
  return { start: Math.max(0, total - cnt), end: total }
}

// Helper: parse CG-CAHPS CSV
function parseCgCahpsCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row')
  
  const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()))
  return rows.map(([name, value, benchmark]) => ({
    name,
    value: Number(value) / 100,
    benchmark: Number(benchmark || value) / 100
  }))
}

// ---------------- Page ------------------------------------------------------
export default function DashboardPage() {
  const [metricOption, setMetricOption] = useState({ label: 'CG-CAHPS', value: 'CG-CAHPS' })
  const [cohort, setCohort] = useState({ label: 'All Cohorts', value: 'all' })
  const [range, setRange] = useState({ label: 'Last 12 Months', value: '12m' })
  
  // Auth & Firestore state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [programId, setProgramId] = useState(null)
  const [firestoreData, setFirestoreData] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  
  // CG-CAHPS upload state
  const [uploadFile, setUploadFile] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [activeTab, setActiveTab] = useState('analytics')

  // Fetch manager's program and survey data from Firestore
  useEffect(() => {
    let unsubscribe
    
    const loadData = async (user) => {
      if (!user) {
        setError('Please log in to view the dashboard')
        setLoading(false)
        setUseMockData(true)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Get manager profile to find their program_id
        const managerDoc = await getDoc(doc(db, 'manager_info', user.uid))
        
        if (!managerDoc.exists()) {
          setError('Manager profile not found. Using mock data.')
          setUseMockData(true)
          setLoading(false)
          return
        }

        const managerData = managerDoc.data()
        const manageProgramId = managerData.program_id
        
        if (!manageProgramId) {
          setError('No program ID found in your profile. Using mock data.')
          setUseMockData(true)
          setLoading(false)
          return
        }

        setProgramId(manageProgramId)

        // Query anonymized surveys from Firestore
        // programs/{programId}/anon_surveys - written by Cloud Function
        const surveysQuery = query(
          collection(db, `programs/${manageProgramId}/anon_surveys`),
          orderBy('createdAt', 'desc'),
          limit(500)
        )
        
        const surveysSnap = await getDocs(surveysQuery)
        const surveys = surveysSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate()
        }))

        // Query weekly aggregates
        const weeklyQuery = query(
          collection(db, `programs/${manageProgramId}/dept_weekly`),
          orderBy('weekKey', 'asc'),
          limit(100)
        )
        
        const weeklySnap = await getDocs(weeklyQuery)
        const weeklyData = weeklySnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))

        // Query CG-CAHPS driver metrics if available
        let cgcahpsDrivers = null
        try {
          const cgcahpsDoc = await getDoc(doc(db, `programs/${manageProgramId}/cgcahps/latest`))
          if (cgcahpsDoc.exists()) {
            cgcahpsDrivers = cgcahpsDoc.data().drivers || null
          }
        } catch (err) {
          console.log('No CG-CAHPS data found (this is okay):', err)
        }

        setFirestoreData({
          surveys,
          weeklyData,
          programId: manageProgramId,
          departments: managerData.departments || [],
          cgcahpsDrivers
        })
        
        setUseMockData(false)
        setLoading(false)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError(`Failed to load data: ${err.message}. Using mock data.`)
        setUseMockData(true)
        setLoading(false)
      }
    }

    unsubscribe = onAuthStateChanged(auth, loadData)
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Handle CG-CAHPS upload
  const handleUploadCgCahps = async () => {
    if (!uploadFile[0] || !programId) return
    
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)
    
    try {
      const text = await uploadFile[0].text()
      const parsedDrivers = parseCgCahpsCsv(text)
      
      await setDoc(doc(db, `programs/${programId}/cgcahps/latest`), {
        drivers: parsedDrivers,
        uploadedAt: serverTimestamp(),
        fileName: uploadFile[0].name
      })
      
      setUploadSuccess('CG-CAHPS data uploaded successfully! Refresh to see changes.')
      setUploadFile([])
      
      // Reload data to show new CG-CAHPS metrics
      const cgcahpsDoc = await getDoc(doc(db, `programs/${programId}/cgcahps/latest`))
      if (cgcahpsDoc.exists() && firestoreData) {
        setFirestoreData({
          ...firestoreData,
          cgcahpsDrivers: cgcahpsDoc.data().drivers || null
        })
      }
    } catch (err) {
      console.error('Error uploading CG-CAHPS data:', err)
      setUploadError(err.message || 'Failed to upload CG-CAHPS data')
    } finally {
      setUploading(false)
    }
  }

  // Use Firestore data if available, otherwise fall back to mock
  const active = useMockData || !firestoreData 
    ? metricConfigs[metricOption.value]
    : transformFirestoreData(firestoreData, metricOption.value)
  
  const wellnessTrend = active.trend
  const driverMetrics = active.driverMetrics
  const residents = active.residents
  
  // Get response rate from active source
  const responseRate = useMockData || !firestoreData 
    ? '87' 
    : (active.responseRate || 0).toString()
  
  // Get heatmap data from active source (Firestore or mock)
  const heatmapMonths = useMockData || !firestoreData ? months : active.heatmapMonths
  const heatmapDepts = useMockData || !firestoreData ? departments : active.heatmapDepts
  const heatmapVals = useMockData || !firestoreData ? heatmapValues : active.heatmapValues

  // Apply time range to trend and heatmap columns
  const trendWindow = computeSliceWindow(range.value, wellnessTrend.length)
  const filteredTrend = useMemo(
    () => wellnessTrend.slice(trendWindow.start, trendWindow.end),
    [wellnessTrend, trendWindow.start, trendWindow.end]
  )

  const monthsWindow = computeSliceWindow(range.value, heatmapMonths.length)
  const filteredMonths = useMemo(
    () => heatmapMonths.slice(monthsWindow.start, monthsWindow.end),
    [heatmapMonths, monthsWindow.start, monthsWindow.end]
  )
  const filteredHeatmapValues = useMemo(
    () => heatmapVals.map(row => row.slice(monthsWindow.start, monthsWindow.end)),
    [heatmapVals, monthsWindow.start, monthsWindow.end]
  )

  // Distribution (unchanged, resident data has no time stamps in mock)
  const {
    avgWellness,
    segmentAgg,
    aboveDeptBreakdown,
    avgDeptBreakdown,
    belowAvgDeptBreakdown,
    nearAboveCount,
    nearAvgCount,
    nearBelowCount
  } = useMemo(() => buildDistribution(residents), [residents])

  // KPIs reflect filtered range
  const latestWellness = filteredTrend[filteredTrend.length - 1]?.y ?? 0
  const prevWellness = filteredTrend.length >= 2 ? filteredTrend[filteredTrend.length - 2].y : latestWellness
  const wellnessDelta = latestWellness - prevWellness
  const wellnessClass = classifyScore(latestWellness)

  // Show loading state
  if (loading) {
    return (
      <AppLayout
        content={
          <ContentLayout>
            <Container>
              <SpaceBetween size="m" alignItems="center">
                <Spinner size="large" />
                <Box variant="p">Loading dashboard data...</Box>
              </SpaceBetween>
            </Container>
          </ContentLayout>
        }
        navigationHide
        toolsHide
      />
    )
  }

  return (
    <AppLayout
      content={
        <ContentLayout
          header={
            <Header variant="h1">
              <div className="brand-title">
                <Brand size="lg" center={false} />
                <span className="title-text">General Overview</span>
              </div>
            </Header>
          }
        >
          <SpaceBetween size="l">
            
            {/* Show error/warning banner */}
            {error && (
              <Alert type={useMockData ? "warning" : "error"} header={useMockData ? "Using Mock Data" : "Error"}>
                {error}
              </Alert>
            )}
            
            {/* Show program ID if connected */}
            {programId && !useMockData && (
              <Alert type="success" dismissible>
                Connected to program: <strong>{programId}</strong>
              </Alert>
            )}
            
            {uploadSuccess && (
              <Alert type="success" dismissible onDismiss={() => setUploadSuccess(null)}>
                {uploadSuccess}
              </Alert>
            )}
            
            {uploadError && (
              <Alert type="error" dismissible onDismiss={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}

            {/* Tab Navigation */}
            <Tabs
              activeTabId={activeTab}
              onChange={({ detail }) => setActiveTab(detail.activeTabId)}
              tabs={[
                {
                  id: 'analytics',
                  label: 'Analytics Overview',
                  content: (
                    <SpaceBetween size="l">
                      {/* Filters Row */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xs: 12, s: 3 } },
                { colspan: { default: 12, xs: 12, s: 3 } },
                { colspan: { default: 12, xs: 12, s: 2 } },
                { colspan: { default: 12, xs: 12, s: 2 } },
                { colspan: { default: 12, xs: 12, s: 2 } }
              ]}
            >
              <Container>
                <SpaceBetween size="xs">
                  <Box variant="awsui-key-label">Metric</Box>
                  <Select
                    selectedOption={metricOption}
                    onChange={e => setMetricOption(e.detail.selectedOption)}
                    options={[
                      { label: 'WHO-5', value: 'WHO-5' },
                      { label: 'CG-CAHPS', value: 'CG-CAHPS' }
                    ]}
                  />
                </SpaceBetween>
              </Container>
              <Container>
                <SpaceBetween size="xs">
                  <Box variant="awsui-key-label">Filter By</Box>
                  <Select
                    selectedOption={cohort}
                    onChange={e => setCohort(e.detail.selectedOption)}
                    options={[{ label: 'All Cohorts', value: 'all' }]}
                  />
                </SpaceBetween>
              </Container>
              <Container>
                <SpaceBetween size="xs">
                  <Box variant="awsui-key-label">Time Range</Box>
                  <Select
                    selectedOption={range}
                    onChange={e => setRange(e.detail.selectedOption)}
                    options={[
                      { label: 'Relative — Last 4 weeks', value: '4w' },
                      { label: 'Relative — Last 8 weeks', value: '8w' },
                      { label: 'Relative — Last 12 weeks', value: '12w' },
                      { label: 'Relative — Last 6 months', value: '6m' },
                      { label: 'Relative — Last 12 months', value: '12m' },
                      { label: 'Calendar — MTD', value: 'mtd' },
                      { label: 'Calendar — Last month', value: 'lm' },
                      { label: 'Calendar — QTD', value: 'qtd' },
                      { label: 'Calendar — Last quarter', value: 'lq' },
                      { label: 'Calendar — YTD', value: 'ytd' },
                      { label: 'Calendar — Last year', value: 'ly' },
                      { label: 'Cohort — Since cohort start', value: 'cohort-std' },
                      { label: 'Cohort — First 90 days', value: 'cohort-90' },
                      { label: 'Survey — Current cycle', value: 'cycle-cur' },
                      { label: 'Survey — Previous cycle', value: 'cycle-prev' },
                      { label: 'Custom range…', value: 'custom' }
                    ]}
                  />
                </SpaceBetween>
              </Container>
              <Container>
                <SpaceBetween size="xs">
                  <Button>Export CSV</Button>
                  <Button>Export PDF</Button>
                </SpaceBetween>
              </Container>
              <Container>
                <Box fontSize="body-s" color="text-body-secondary">Cohort Selector</Box>
              </Container>
            </Grid>

            {/* Top Metrics + Driver Metrics */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 3 } },
                { colspan: { default: 12, s: 3 } },
                { colspan: { default: 12, s: 2 } },
                { colspan: { default: 12, s: 4 } }
              ]}
            >
              <MetricCard
                title="Wellness Score"
                value={
                  <span>
                    {latestWellness}
                    <Box as="span" color="text-status-success" fontSize="body-s" margin={{ left: 'xs' }}>
                      ↑ {wellnessDelta}
                    </Box>
                  </span>
                }
                status={wellnessClass}
              />
              <MetricCard title="Response Rate" value={`${responseRate} %`} />
              <MetricCard title="Cohort Size" value={residents.length} />
              <Container header={<Header variant="h3">Driver Metrics</Header>}>
                <DriverMetricsChart driverMetrics={driverMetrics} />
                <Box margin={{ top: 'xs' }} fontSize="body-xxs" color="text-body-secondary">
                  Hover for benchmark & delta. Highlight = focus driver.
                </Box>
              </Container>
            </Grid>

            {/* Trend (filtered by time range) */}
            <Grid gridDefinition={[{ colspan: { default: 12 } }]}>
              <Container header={<Header variant="h3">{metricOption.label} Trend</Header>}>
                <LineChart
                  xScaleType="categorical"
                  series={[{ title: metricOption.label, type: 'line', data: filteredTrend }]}
                  xDomain={filteredTrend.map(p => p.x)}
                  yDomain={[0, 100]}
                  i18nStrings={{
                    filterLabel: 'Filter',
                    filterPlaceholder: 'Filter',
                    detailPopoverDismissAriaLabel: 'Dismiss',
                    legendAriaLabel: 'Legend',
                    chartAriaRoleDescription: 'line chart'
                  }}
                  ariaLabel="Metric score trend"
                  height={260}
                />
              </Container>
            </Grid>

            {/* Heatmap with filtered columns */}
            <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
              <Container header={<Header variant="h3">Wellness Score by Department</Header>}>
                <Heatmap months={filteredMonths} values={filteredHeatmapValues} departments={heatmapDepts} />
              </Container>
              <Container header={<Header variant="h3">Driver Metrics (Alt List)</Header>}>
                <DriverMetricBars driverMetrics={driverMetrics} />
              </Container>
            </Grid>

            {/* Distribution at bottom */}
            <Container>
              <DistributionSection
                avgWellness={avgWellness}
                segmentAgg={segmentAgg}
                aboveDeptBreakdown={aboveDeptBreakdown}
                avgDeptBreakdown={avgDeptBreakdown}
                belowAvgDeptBreakdown={belowAvgDeptBreakdown}
                nearAboveCount={nearAboveCount}
                nearAvgCount={nearAvgCount}
                nearBelowCount={nearBelowCount}
                wellnessDelta={wellnessDelta}
              />
            </Container>
                    </SpaceBetween>
                  )
                },
                {
                  id: 'manage',
                  label: 'Manage Data',
                  content: (
                    <SpaceBetween size="l">
                      <CgCahpsDrivers programId={programId}></CgCahpsDrivers>
                      
                      <Container header={<Header variant="h2">Upload CG-CAHPS Driver Metrics</Header>}>
                        <SpaceBetween size="m">
                          <Alert type="info">
                            Upload CG-CAHPS survey results to populate driver metrics in the Analytics tab.
                          </Alert>
                          
                          <FormField 
                            label="CSV File Upload" 
                            description={
                              <span>
                                CSV format: Driver,Score,Benchmark (scores 0-100).{' '}
                                <a href="/cgcahps-template.csv" download>Download template</a>
                              </span>
                            }
                            secondaryControl={
                              <Button 
                                variant="primary" 
                                onClick={handleUploadCgCahps}
                                disabled={uploadFile.length === 0 || uploading || !programId}
                                loading={uploading}
                              >
                                Upload & Save
                              </Button>
                            }
                          >
                            <FileUpload
                              onChange={({ detail }) => setUploadFile(detail.value)}
                              value={uploadFile}
                              showFileLastModified
                              showFileSize
                              accept=".csv"
                              i18nStrings={{
                                uploadButtonText: e => e ? "Choose files" : "Choose file",
                                dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
                                removeFileAriaLabel: e => `Remove file ${e + 1}`,
                                limitShowFewer: "Show fewer files",
                                limitShowMore: "Show more files",
                                errorIconAriaLabel: "Error"
                              }}
                            />
                          </FormField>
                          
                          {!useMockData && firestoreData && firestoreData.cgcahpsDrivers && firestoreData.cgcahpsDrivers.length > 0 && (
                            <Box>
                              <Header variant="h3">Current CG-CAHPS Driver Metrics</Header>
                              <Table
                                columnDefinitions={[
                                  { id: 'name', header: 'Driver', cell: i => i.name },
                                  { id: 'value', header: 'Score (%)', cell: i => Math.round(i.value * 100) },
                                  { id: 'benchmark', header: 'Benchmark (%)', cell: i => Math.round(i.benchmark * 100) },
                                  { 
                                    id: 'delta', 
                                    header: 'Δ', 
                                    cell: i => {
                                      const delta = Math.round((i.value - i.benchmark) * 100)
                                      return (
                                        <Box color={delta >= 0 ? 'text-status-success' : 'text-status-error'}>
                                          {delta >= 0 ? '+' : ''}{delta}
                                        </Box>
                                      )
                                    }
                                  }
                                ]}
                                items={firestoreData.cgcahpsDrivers}
                                variant="embedded"
                                stripedRows
                              />
                            </Box>
                          )}
                          
                          {(useMockData || !firestoreData || !firestoreData.cgcahpsDrivers || firestoreData.cgcahpsDrivers.length === 0) && (
                            <Box variant="p" color="text-body-secondary">
                              No CG-CAHPS data uploaded yet. Upload a CSV file to populate driver metrics in the Analytics tab.
                            </Box>
                          )}
                        </SpaceBetween>
                      </Container>
                      
                      <Container header={<Header variant="h2">Data Management Tips</Header>}>
                        <SpaceBetween size="s">
                          <Box variant="p">
                            <strong>CG-CAHPS Dimensions:</strong> Standard metrics include Access to Care, Communication, 
                            Office Staff, Provider Rating, Care Coordination, and Shared Decision Making.
                          </Box>
                          <Box variant="p">
                            <strong>Score Format:</strong> Scores should be 0-100 (will be converted to 0.00-1.00 for display).
                          </Box>
                          <Box variant="p">
                            <strong>Benchmarks:</strong> Provide comparison scores (national, regional, or historical).
                          </Box>
                          <Box variant="p">
                            <strong>Updating Data:</strong> Upload a new CSV file to replace existing CG-CAHPS metrics.
                          </Box>
                        </SpaceBetween>
                      </Container>
                    </SpaceBetween>
                  )
                }
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      }
      navigationHide
      toolsHide
    />
  )
}

// ADD this new DistributionSection component (below other subcomponents)
const DistributionSection = ({
  avgWellness,
  segmentAgg,
  aboveDeptBreakdown,
  avgDeptBreakdown,
  belowAvgDeptBreakdown,
  nearAboveCount,
  nearAvgCount,
  nearBelowCount,
  wellnessDelta
}) => {
  const getSeg = name => segmentAgg.find(s => s.segment === name) || { cohortSize: 0, respondents: 0, responseRate: 0, avgScore: 0 }
  const above = getSeg('Above Average')
  const average = getSeg('Average')
  const below = getSeg('Below Average')

  const Card = ({ title, data, nearCount, color }) => (
    <Container header={<Header variant="h3">{title}</Header>}>
      <SpaceBetween size="xs">
        <Box>
          <Box variant="awsui-key-label">Cohort Size</Box>
          <Box>{data.cohortSize}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Respondents</Box>
          <Box>{data.respondents}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Response rate</Box>
          <Box>{data.responseRate}%</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Avg score</Box>
          <Box>{data.avgScore}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Near threshold (±5)</Box>
          <Box>{nearCount}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Overall Δ</Box>
          <Box color={wellnessDelta >= 0 ? 'text-status-success' : 'text-status-error'}>
            {wellnessDelta >= 0 ? '+' : ''}{wellnessDelta}
          </Box>
        </Box>
      </SpaceBetween>
    </Container>
  )

  return (
    <SpaceBetween size="l">
      <Header variant="h2" description={`Mean Wellness: ${Math.round(avgWellness)}`}>Distribution</Header>

      {/* Summary cards */}
      <Grid gridDefinition={[
        { colspan: { default: 12, s: 4 } },
        { colspan: { default: 12, s: 4 } },
        { colspan: { default: 12, s: 4 } }
      ]}>
        <Card title="Above Average" data={above} nearCount={nearAboveCount} color="positive" />
        <Card title="Average" data={average} nearCount={nearAvgCount} color="normal" />
        <Card title="Below Average" data={below} nearCount={nearBelowCount} color="warning" />
      </Grid>

      {/* Below Average details (moved here, replaces separate section) */}
      <Container header={<Header variant="h3">Below Average by Department</Header>}>
        <Table
          items={belowAvgDeptBreakdown}
          columnDefinitions={[
            { id: 'dept', header: 'Department', cell: i => i.dept },
            { id: 'cohortSize', header: 'Cohort Size', cell: i => i.cohortSize },
            { id: 'pct', header: '% of Below Avg', cell: i => i.pct + '%' },
            { id: 'avg', header: 'Avg Score', cell: i => i.avg }
          ]}
          variant="embedded"
          stripedRows
        />
      </Container>

      {/* Optional: quick glance for other segments (top/bottom 3 by avg) */}
      <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
        <Container header={<Header variant="h3">Average by Department (lowest 5)</Header>}>
          <Table
            items={avgDeptBreakdown.slice(0, 5)}
            columnDefinitions={[
              { id: 'dept', header: 'Department', cell: i => i.dept },
              { id: 'cohortSize', header: 'Cohort Size', cell: i => i.cohortSize },
              { id: 'avg', header: 'Avg Score', cell: i => i.avg }
            ]}
            variant="embedded"
            stripedRows
          />
        </Container>
        <Container header={<Header variant="h3">Above Average by Department (lowest 5)</Header>}>
          <Table
            items={aboveDeptBreakdown.slice(0, 5)}
            columnDefinitions={[
              { id: 'dept', header: 'Department', cell: i => i.dept },
              { id: 'cohortSize', header: 'Cohort Size', cell: i => i.cohortSize },
              { id: 'avg', header: 'Avg Score', cell: i => i.avg }
            ]}
            variant="embedded"
            stripedRows
          />
        </Container>
      </Grid>
    </SpaceBetween>
  )
}