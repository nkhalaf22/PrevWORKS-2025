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
  Tabs, Checkbox
} from '@cloudscape-design/components'
import Brand from '../components/Brand'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import CgCahpsDrivers from '../components/CgCahps'
import {computeResponseRatesByDept, initCohortSizesForProgram} from "../lib/utils.js";

const auth = getAuth()
const db = getFirestore()

// ---------------- Metric-Specific Mock Data ---------------------------------
const PRESETS = [
  { id: '1w',  label: '1 week',   days: 1 },
  { id: '1m',  label: '1 month',  days: 4 },
  { id: '3m',  label: '3 months', days: 4*3 },
  { id: '6m',  label: '6 months', days: 4*6 },
  { id: '1y',  label: '1 year',   days: 52 },
  { id: 'all', label: 'All',      days: null },
]

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
  { name: 'Access to Care', value: 0.74, benchmark: 0.70 },
  { name: 'Care Coordination', value: 0.77, benchmark: 0.75 },
  { name: 'Emotional Support', value: 0.81, benchmark: 0.78, highlight: true },
  { name: 'Information & Education', value: 0.79, benchmark: 0.76 },
  { name: 'Respect for Patient Preferences', value: 0.72, benchmark: 0.70 }
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
// Note: Mock capabilities mirror what we support in Firestore-backed mode
// WHO-5 -> KPIs/Trend/Heatmap/Distribution; CG-CAHPS -> Driver metrics only
const metricConfigs = {
  'CG-CAHPS': {
    label: 'CG-CAHPS',
    trend: [], // not applicable for CG-CAHPS
    driverMetrics: cgCahpsDriverMetrics,
    residents: [],
    capabilities: { metricType: 'CG-CAHPS', kpis: false, trend: false, heatmap: false, distribution: false, drivers: true }
  },
  'WHO-5': {
    label: 'WHO-5',
    trend: who5Trend,
    driverMetrics: [], // WHO-5 item-level drivers not collected in current data model
    residents: who5Residents,
    capabilities: { metricType: 'WHO-5', kpis: true, trend: true, heatmap: true, distribution: true, drivers: false }
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

function buildDistribution(residents, cohortSizesByDept = {}) {
  // Calculate score range and divide into equal thirds
  const scores = residents.map(r => r.score)
  const minScore = Math.min(...scores, 0)
  const maxScore = Math.max(...scores, 100)
  const range = maxScore - minScore
  const thirdSize = range / 3
  
  // Define boundaries for equal thirds
  const lowerThreshold = minScore + thirdSize
  const upperThreshold = minScore + (2 * thirdSize)
  
  const segmentOf = score => {
    if (score < lowerThreshold) return 'Below Average'
    if (score < upperThreshold) return 'Average'
    return 'Above Average'
  }

  const segmentMap = {}
  const bySegment = { above: [], average: [], below: [] }

  residents.forEach(r => {
    const seg = segmentOf(r.score)
    if (!segmentMap[seg]) segmentMap[seg] = { segment: seg, numResidents: 0, respondents: 0, totalScore: 0 }
    segmentMap[seg].numResidents++
    if (r.responded) segmentMap[seg].respondents++
    segmentMap[seg].totalScore += r.score

    if (seg === 'Above Average') bySegment.above.push(r)
    else if (seg === 'Average') bySegment.average.push(r)
    else bySegment.below.push(r)
  })
  
  // Calculate average for display
  const avg = residents.reduce((a, r) => a + r.score, 0) / (residents.length || 1)

  const segmentAgg = Object.values(segmentMap).map(o => ({
    segment: o.segment,
    numResidents: o.numResidents,
    respondents: null,
    responseRate: null, // intentionally omitted to avoid misleading % against cohort
    avgScore: o.numResidents ? Math.round(o.totalScore / o.numResidents) : 0
  })).sort((a, b) => a.segment.localeCompare(b.segment))

  // Department breakdown helper per segment
  function deptBreakdown(list) {
    const seenDepts = new Set()
    const totalCohort = list.reduce((sum, r) => {
      const k = r.dept || 'Unknown'
      if (seenDepts.has(k)) return sum
      seenDepts.add(k)
      const c = Number(cohortSizesByDept[k]) || 0
      return sum + c
    }, 0) || list.length || 1
    const m = {}
    list.forEach(r => {
      if (!m[r.dept]) m[r.dept] = { dept: r.dept, numResidents: 0, respondents: 0, sum: 0 }
      m[r.dept].numResidents++
      if (r.responded) m[r.dept].respondents++
      m[r.dept].sum += r.score
    })
    return Object.values(m)
      .map(d => ({ 
        dept: d.dept, 
        numResidents: Number(cohortSizesByDept[d.dept]) || d.numResidents, 
        respondents: null,
        responseRate: null,
        pct: Math.round(((Number(cohortSizesByDept[d.dept]) || d.numResidents) / totalCohort) * 100), 
        avg: Math.round(d.sum / d.numResidents) 
      }))
      .sort((a, b) => a.avg - b.avg)
  }

  const aboveDeptBreakdown = deptBreakdown(bySegment.above)
  const avgDeptBreakdown = deptBreakdown(bySegment.average)
  const belowAvgDeptBreakdown = deptBreakdown(bySegment.below)

  // Near-threshold counts (within ±5 of segment boundaries)
  const nearAboveCount = bySegment.above.filter(r => r.score <= upperThreshold + 5).length
  const nearAvgCount = bySegment.average.filter(r => 
    Math.abs(r.score - lowerThreshold) <= 5 || Math.abs(r.score - upperThreshold) <= 5
  ).length
  const nearBelowCount = bySegment.below.filter(r => r.score >= lowerThreshold - 5).length

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
  console.log('🔄 transformFirestoreData called:', { metricType, surveysCount: firestoreData.surveys?.length })
  const {
    surveys,
    weeklyData,
    departments: deptList,
    cgcahpsDrivers,
    cohortSizesByDept,
    responseRatesByDept
  } = firestoreData

  // Scale WHO-5 raw scores (0-25) to standardized 0-100 range
  const scaleScore = (raw) => metricType === 'WHO-5' ? Math.round(raw * 4) : Math.round(raw)

  // Build residents list from surveys (used for WHO-5 distribution)
  const residents = (() => {
    const latestByResident = new Map()
    ;(surveys || []).forEach((s, idx) => {
      const residentId = s.resident_id || `anon-${idx}`
      const ts = s.createdAt instanceof Date ? s.createdAt.getTime() : (s.createdAt?.toMillis?.() ?? 0)
      const prev = latestByResident.get(residentId)
      if (!prev || ts >= prev._ts) {
        latestByResident.set(residentId, {
          id: residentId,
          dept: s.department,
          score: scaleScore(s.score || 0),
          responded: true,
          _ts: ts
        })
      }
    })
    return Array.from(latestByResident.values())
  })()

  // Capability flags per metric
  const caps = metricType === 'WHO-5'
    ? { metricType: 'WHO-5', kpis: true, trend: true, heatmap: true, distribution: true, drivers: false }
    : { metricType: 'CG-CAHPS', kpis: false, trend: false, heatmap: false, distribution: false, drivers: true }

  // For WHO-5, derive weekly aggregates from anon_surveys if dept_weekly is absent
  let _weekly = Array.isArray(weeklyData) ? [...weeklyData] : []
  if (metricType === 'WHO-5' && (!_weekly || _weekly.length === 0) && Array.isArray(surveys) && surveys.length > 0) {
    const byWeekDept = new Map()
    const byWeek = new Map()
    const getKey = (wk, dept) => `${wk}__${dept}`

    surveys.forEach(s => {
      const wk = s.weekKey || (s.createdAt ? deriveIsoWeekKey(s.createdAt) : 'unknown')
      const dept = s.department || 'Unknown'
      const score = scaleScore(Number(s.score) || 0)

      const ovr = byWeek.get(wk) || { sum: 0, count: 0 }
      ovr.sum += score; ovr.count += 1; byWeek.set(wk, ovr)

      const key = getKey(wk, dept)
      const cur = byWeekDept.get(key) || { weekKey: wk, department: dept, sum: 0, count: 0 }
      cur.sum += score; cur.count += 1; byWeekDept.set(key, cur)
    })

    _weekly = Array.from(byWeekDept.values()).map(v => ({
      weekKey: v.weekKey,
      department: v.department,
      avg: v.count ? v.sum / v.count : 0,
      count: v.count
    }))
  }

  // Trend (WHO-5 only)
  let trend = []
  if (caps.trend) {
    // Build weekly trends per department and overall (for filtering)
    const trendAgg = new Map() // dept -> Map(weekKey -> { sum, count })
    const addPoint = (dept, weekKey, value, count) => {
      const deptMap = trendAgg.get(dept) || new Map()
      const cur = deptMap.get(weekKey) || { sum: 0, count: 0 }
      cur.sum += value * count
      cur.count += count
      deptMap.set(weekKey, cur)
      trendAgg.set(dept, deptMap)
    }

    _weekly.forEach(w => {
      // If weekly data came from dept_weekly (pre-aggregated), scale avg; if derived above, already scaled
      const avgScaled = (weeklyData && weeklyData.length > 0) ? scaleScore(Number(w.avg || 0)) : Number(w.avg || 0)
      const count = Number(w.count) || 1
      const deptKey = w.department || 'Unknown'
      addPoint(deptKey, w.weekKey, avgScaled, count)
      addPoint('all', w.weekKey, avgScaled, count)
    })
    const buildTrend = (deptKey) => {
      const m = deptKey && trendAgg.get(deptKey)
      if (!m) return []
      const weeksSorted = Array.from(m.keys()).sort()
      // keep full history; slicing happens later based on selected time range
      return weeksSorted.map(wk => {
        const o = m.get(wk)
        const avg = o.count ? (o.sum / o.count) : 0
        return { x: wk, y: Math.round(avg * 10) / 10, department: deptKey, dept: deptKey }
      })
    }

    // Overall trend first, then department-specific trends for filtering
    trend = buildTrend('all')
    Array.from(trendAgg.keys())
      .filter(k => k !== 'all')
      .forEach(k => {
        trend = trend.concat(buildTrend(k))
      })

    // Compute segment-specific deltas using last two weeks
    const byWeekOverall = trendAgg.get('all') || new Map()
    const weeksSorted = Array.from(byWeekOverall.keys()).sort()
    const lastTwo = weeksSorted.slice(-2)
    let segmentDeltas = null
    if (lastTwo.length === 2) {
      // Derive thresholds from current residents distribution (equal thirds)
      const scores = residents.map(r => r.score)
      const minScore = Math.min(...scores, 0)
      const maxScore = Math.max(...scores, 100)
      const third = (maxScore - minScore) / 3
      const lowerT = minScore + third
      const upperT = minScore + 2 * third
      const segOf = (v) => (v < lowerT ? 'below' : (v < upperT ? 'average' : 'above'))

      const aggForWeek = (wk) => {
        const acc = { above: { sum: 0, count: 0 }, average: { sum: 0, count: 0 }, below: { sum: 0, count: 0 } }
        _weekly.filter(w => w.weekKey === wk).forEach(w => {
          const avgScaled = (weeklyData && weeklyData.length > 0) ? scaleScore(Number(w.avg || 0)) : Number(w.avg || 0)
          const cnt = Number(w.count) || 1
          const seg = segOf(avgScaled)
          acc[seg].sum += avgScaled * cnt
          acc[seg].count += cnt
        })
        const avg = (o) => (o.count ? (o.sum / o.count) : 0)
        return { above: avg(acc.above), average: avg(acc.average), below: avg(acc.below) }
      }

      const prev = aggForWeek(lastTwo[0])
      const cur = aggForWeek(lastTwo[1])
      segmentDeltas = {
        above: Math.round((cur.above - prev.above) * 10) / 10,
        average: Math.round((cur.average - prev.average) * 10) / 10,
        below: Math.round((cur.below - prev.below) * 10) / 10
      }
    }

    // Attach segment deltas to local state for return
    // We temporarily stash it on trend object scope; will include in return payload below
    trend._segmentDeltas = segmentDeltas
  }

  // Heatmap (WHO-5 only)
  let heatmapMonths = [], heatmapDepts = [], heatmapValues = []
  if (caps.heatmap) {
    // Always extract unique departments from actual data (not from manager profile)
    // This ensures we show all departments present in the surveys
    let depts = Array.from(new Set((surveys || []).map(s => s.department).filter(d => d)))
    
    // If no surveys, try extracting from weekly data
    if (depts.length === 0 && _weekly.length > 0) {
      depts = Array.from(new Set(_weekly.map(w => w.department).filter(d => d)))
    }
    
    // Fallback to deptList only if we still have no departments
    if (depts.length === 0 && deptList && deptList.length > 0) {
      depts = deptList
    }
    
    // Sort departments alphabetically for consistent display
    heatmapDepts = depts.sort()

    const weeks = [...new Set((_weekly || []).map(w => w.weekKey))].sort().slice(-9)
    heatmapMonths.push(...weeks)

    heatmapDepts.forEach(dept => {
      const row = weeks.map(week => {
        const wd = (_weekly || []).find(w => w.weekKey === week && w.department === dept)
        if (!wd) return 0
        // Scale if source is dept_weekly (raw); if derived above, already scaled
        const val = (weeklyData && weeklyData.length > 0) ? scaleScore(wd.avg || 0) : (wd.avg || 0)
        return Math.round(val)
      })
      heatmapValues.push(row)
    })
  }

  // Driver metrics (CG-CAHPS only)
  let driverMetrics = []
  if (caps.drivers) {
    driverMetrics = Array.isArray(cgcahpsDrivers) && cgcahpsDrivers.length > 0
      ? cgcahpsDrivers
      : cgCahpsDriverMetrics
  }

  // Response rate not reliably computable without denominator; only show for WHO-5 if desired
  const responseRate = caps.kpis ? null : null

  return {
    label: metricType,
    capabilities: caps,
    trend,
    driverMetrics,
    residents: caps.distribution ? residents : [],
    heatmapMonths,
    heatmapDepts,
    heatmapValues,
    responseRate,
    responseRatesByDept,
    cohortSizesByDept,
    surveys,
    totalSurveys: surveys?.length || 0,
    segmentDeltas: (caps.trend && trend && trend._segmentDeltas) ? trend._segmentDeltas : null
  }
}

// Fallback: derive ISO year-week key like 2025-W43
function deriveIsoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Thursday in current week decides the year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  const y = d.getUTCFullYear()
  const ww = String(weekNo).padStart(2, '0')
  return `${y}-W${ww}`
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

// ---------------- Export Functions ------------------------------------------

/**
 * Export dashboard data as CSV
 */
function exportToCsv(data) {
  const {
    metricType,
    programId,
    department,
    timeRange,
    kpis,
    trend,
    distribution,
    heatmap,
    driverMetrics
  } = data

  const lines = []
  
  // Header section
  lines.push('PrevWORKS Dashboard Export')
  lines.push(`Metric,${metricType}`)
  lines.push(`Program ID,${programId || 'N/A'}`)
  lines.push(`Department,${department}`)
  lines.push(`Time Range,${timeRange}`)
  lines.push(`Export Date,${new Date().toLocaleString()}`)
  lines.push('')
  
  // KPIs section
  if (kpis) {
    lines.push('KEY PERFORMANCE INDICATORS')
    lines.push('Metric,Value')
    lines.push(`Wellness Score,${kpis.latestWellness}`)
    lines.push(`Wellness Delta,${kpis.wellnessDelta >= 0 ? '+' : ''}${kpis.wellnessDelta}`)
    lines.push(`Number of Residents,${kpis.numResidents}`)
    if (kpis.responseRate != null) {
      lines.push(`Response Rate,${kpis.responseRate}%`)
    }
    lines.push('')
  }
  
  // Trend section
  if (trend && trend.length > 0) {
    lines.push('TREND DATA')
    lines.push('Period,Score')
    trend.forEach(point => {
      lines.push(`${point.x},${point.y}`)
    })
    lines.push('')
  }
  
  // Driver Metrics section
  if (driverMetrics && driverMetrics.length > 0) {
    lines.push('DRIVER METRICS')
    lines.push('Driver,Score (%),Benchmark (%),Delta')
    driverMetrics.forEach(driver => {
      const score = Math.round(driver.value * 100)
      const benchmark = Math.round(driver.benchmark * 100)
      const delta = score - benchmark
      lines.push(`${driver.name},${score},${benchmark},${delta >= 0 ? '+' : ''}${delta}`)
    })
    lines.push('')
  }
  
  // Distribution section
  if (distribution) {
    lines.push('DISTRIBUTION BY SEGMENT')
    lines.push('Segment,Number of Residents,Respondents,Response Rate (%),Avg Score')
    distribution.segmentAgg.forEach(seg => {
      lines.push(`${seg.segment},${seg.numResidents},${seg.respondents},${seg.responseRate},${seg.avgScore}`)
    })
    lines.push('')
    
    // Department breakdowns
    lines.push('BELOW AVERAGE BY DEPARTMENT')
    lines.push('Department,Number of Residents,Respondents,Response Rate (%),% of Below Avg,Avg Score')
    distribution.belowAvgDeptBreakdown.forEach(dept => {
      lines.push(`${dept.dept},${dept.numResidents},${dept.respondents},${dept.responseRate},${dept.pct},${dept.avg}`)
    })
    lines.push('')
    
    lines.push('AVERAGE BY DEPARTMENT')
    lines.push('Department,Number of Residents,Respondents,Response Rate (%),Avg Score')
    distribution.avgDeptBreakdown.forEach(dept => {
      lines.push(`${dept.dept},${dept.numResidents},${dept.respondents},${dept.responseRate},${dept.avg}`)
    })
    lines.push('')
    
    lines.push('ABOVE AVERAGE BY DEPARTMENT')
    lines.push('Department,Number of Residents,Respondents,Response Rate (%),Avg Score')
    distribution.aboveDeptBreakdown.forEach(dept => {
      lines.push(`${dept.dept},${dept.numResidents},${dept.respondents},${dept.responseRate},${dept.avg}`)
    })
    lines.push('')
  }
  
  // Heatmap section
  if (heatmap && heatmap.depts && heatmap.months && heatmap.values) {
    lines.push('HEATMAP DATA')
    lines.push(['Department', ...heatmap.months].join(','))
    heatmap.depts.forEach((dept, deptIdx) => {
      const row = [dept]
      heatmap.months.forEach((_, monthIdx) => {
        const value = heatmap.values[deptIdx]?.[monthIdx]
        row.push(value != null ? value : '')
      })
      lines.push(row.join(','))
    })
  }
  
  // Create blob and download
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `prevworks-dashboard-${metricType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export dashboard data as PDF
 */
function exportToPdf(data) {
  const {
    metricType,
    programId,
    department,
    timeRange,
    kpis,
    trend,
    distribution,
    heatmap,
    driverMetrics
  } = data

  // Create a styled HTML document
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PrevWORKS Dashboard Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #0073bb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #0073bb;
      margin: 0;
      font-size: 28px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    h2 {
      color: #0073bb;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
      margin-top: 30px;
      font-size: 20px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .kpi-card {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 8px;
      background: #f9f9f9;
    }
    .kpi-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: bold;
      color: #0073bb;
    }
    .positive {
      color: #1d8102;
    }
    .warning {
      color: #ff9900;
    }
    .error {
      color: #d13212;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th {
      background: #0073bb;
      color: white;
      text-align: left;
      padding: 10px;
      font-weight: normal;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(even) td {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { margin: 20px; }
      .kpi-grid { break-inside: avoid; }
      table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PrevWORKS Dashboard Report</h1>
    <div class="meta">
      <strong>Metric:</strong> ${metricType} &nbsp;|&nbsp;
      <strong>Program:</strong> ${programId || 'N/A'} &nbsp;|&nbsp;
      <strong>Department:</strong> ${department} &nbsp;|&nbsp;
      <strong>Time Range:</strong> ${timeRange}<br>
      <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
  </div>

  ${kpis ? `
  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Wellness Score</div>
      <div class="kpi-value ${kpis.latestWellness >= 70 ? 'positive' : kpis.latestWellness >= 50 ? 'warning' : 'error'}">${kpis.latestWellness}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Wellness Delta</div>
      <div class="kpi-value ${kpis.wellnessDelta >= 0 ? 'positive' : 'error'}">${kpis.wellnessDelta >= 0 ? '+' : ''}${kpis.wellnessDelta}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Number of Residents</div>
      <div class="kpi-value">${kpis.numResidents}</div>
    </div>
    ${kpis.responseRate != null ? `
    <div class="kpi-card">
      <div class="kpi-label">Response Rate</div>
      <div class="kpi-value">${kpis.responseRate}%</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${trend && trend.length > 0 ? `
  <h2>Trend Data</h2>
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      ${trend.map(point => `
        <tr>
          <td>${point.x}</td>
          <td>${point.y}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${driverMetrics && driverMetrics.length > 0 ? `
  <h2>Driver Metrics</h2>
  <table>
    <thead>
      <tr>
        <th>Driver</th>
        <th>Score (%)</th>
        <th>Benchmark (%)</th>
        <th>Delta</th>
      </tr>
    </thead>
    <tbody>
      ${driverMetrics.map(driver => {
        const score = Math.round(driver.value * 100)
        const benchmark = Math.round(driver.benchmark * 100)
        const delta = score - benchmark
        return `
        <tr>
          <td>${driver.name}</td>
          <td>${score}</td>
          <td>${benchmark}</td>
          <td class="${delta >= 0 ? 'positive' : 'error'}">${delta >= 0 ? '+' : ''}${delta}</td>
        </tr>
        `
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  ${distribution ? `
  <h2>Distribution by Segment</h2>
  <table>
    <thead>
      <tr>
        <th>Segment</th>
        <th>Number of Residents</th>
        <th>Respondents</th>
        <th>Response Rate (%)</th>
        <th>Avg Score</th>
      </tr>
    </thead>
    <tbody>
      ${distribution.segmentAgg.map(seg => `
        <tr>
          <td>${seg.segment}</td>
          <td>${seg.numResidents}</td>
          <td>${seg.respondents}</td>
          <td>${seg.responseRate}</td>
          <td>${seg.avgScore}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Below Average by Department</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>Number of Residents</th>
        <th>Respondents</th>
        <th>Response Rate (%)</th>
        <th>% of Below Avg</th>
        <th>Avg Score</th>
      </tr>
    </thead>
    <tbody>
      ${distribution.belowAvgDeptBreakdown.map(dept => `
        <tr>
          <td>${dept.dept}</td>
          <td>${dept.numResidents}</td>
          <td>${dept.respondents}</td>
          <td>${dept.responseRate}</td>
          <td>${dept.pct}</td>
          <td>${dept.avg}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Average by Department</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>Number of Residents</th>
        <th>Respondents</th>
        <th>Response Rate (%)</th>
        <th>Avg Score</th>
      </tr>
    </thead>
    <tbody>
      ${distribution.avgDeptBreakdown.map(dept => `
        <tr>
          <td>${dept.dept}</td>
          <td>${dept.numResidents}</td>
          <td>${dept.respondents}</td>
          <td>${dept.responseRate}</td>
          <td>${dept.avg}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Above Average by Department</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>Number of Residents</th>
        <th>Respondents</th>
        <th>Response Rate (%)</th>
        <th>Avg Score</th>
      </tr>
    </thead>
    <tbody>
      ${distribution.aboveDeptBreakdown.map(dept => `
        <tr>
          <td>${dept.dept}</td>
          <td>${dept.numResidents}</td>
          <td>${dept.respondents}</td>
          <td>${dept.responseRate}</td>
          <td>${dept.avg}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${heatmap && heatmap.depts && heatmap.months && heatmap.values ? `
  <h2>Heatmap Data</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        ${heatmap.months.map(month => `<th>${month}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${heatmap.depts.map((dept, deptIdx) => `
        <tr>
          <td>${dept}</td>
          ${heatmap.months.map((_, monthIdx) => {
            const value = heatmap.values[deptIdx]?.[monthIdx]
            return `<td>${value != null ? value : '-'}</td>`
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <p>PrevWORKS Dashboard Report | Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `

  // Open in new window and trigger print dialog
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  // Wait for content to load then print
  printWindow.onload = function() {
    printWindow.focus()
    printWindow.print()
  }
}

// ---------------- Page ------------------------------------------------------
export default function DashboardPage() {
  const [metricOption, setMetricOption] = useState({ label: 'CG-CAHPS', value: 'CG-CAHPS' })
  const [departmentFilter, setDepartmentFilter] = useState({ label: 'All Departments', value: 'all' })
  const [range, setRange] = useState({ label: 'Last 12 Months', value: '12m' })
  const [preset, setPreset] = React.useState('all')
  
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
        
        console.log('🔍 Loading dashboard data for user:', user.uid)
        
        // Get manager profile to find their program_id
        const managerDoc = await getDoc(doc(db, 'manager_info', user.uid))
        
        if (!managerDoc.exists()) {
          console.warn('❌ Manager profile not found for user:', user.uid)
          setError('Manager profile not found. Using mock data.')
          setUseMockData(true)
          setLoading(false)
          return
        }

        const managerData = managerDoc.data()
        const manageProgramId = managerData.program_id
        console.log('✅ Manager profile found:', { uid: user.uid, programId: manageProgramId, departments: managerData.departments })
        
        if (!manageProgramId) {
          console.warn('❌ No program_id in manager profile')
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
        console.log(`📊 Loaded ${surveys.length} surveys from programs/${manageProgramId}/anon_surveys`)

        const cohortSizesByDept = await initCohortSizesForProgram(manageProgramId)
        const responseRatesByDept = computeResponseRatesByDept(
            surveys,
            cohortSizesByDept,
            {
              // or derive these from your preset/date filter
              // startDayKey: '2025-11-01',
              // endDayKey: '2025-11-18',
            }
        )
        console.log("response rate by dept", responseRatesByDept)
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
        console.log(`📈 Loaded ${weeklyData.length} weekly aggregates from programs/${manageProgramId}/dept_weekly`)

        // Query CG-CAHPS driver metrics from new collections
        let cgcahpsDrivers = null
        try {
          // Fetch program data for this program
          const programDataQuery = query(
            collection(db, 'cgcahps_programdata'),
            where('program_id', '==', manageProgramId),
            orderBy('start_date', 'desc'),
            limit(1)
          )
          const programDataSnap = await getDocs(programDataQuery)
          
          // Fetch latest NRC benchmark data
          const nrcDataQuery = query(
            collection(db, 'cgcahps_nrcdata'),
            orderBy('start_date', 'desc'),
            limit(1)
          )
          const nrcDataSnap = await getDocs(nrcDataQuery)
          
          console.log(`🏥 CG-CAHPS program data: ${programDataSnap.empty ? 'NOT FOUND' : 'FOUND'}`)
          console.log(`📋 CG-CAHPS NRC data: ${nrcDataSnap.empty ? 'NOT FOUND' : 'FOUND'}`)
          
          if (!programDataSnap.empty) {
            const programData = programDataSnap.docs[0].data()
            const nrcData = nrcDataSnap.empty ? null : nrcDataSnap.docs[0].data()
            
            console.log('✅ CG-CAHPS program data:', programData)
            console.log('✅ CG-CAHPS NRC data:', nrcData)
            
            // Transform the domain data into driver metrics format
            // Domain mapping: access_care, coord_care, emotional_support, information_education, respect_patient_prefs
            const domainNames = {
              'access_care': 'Access to Care',
              'coord_care': 'Care Coordination',
              'emotional_support': 'Emotional Support',
              'information_education': 'Information & Education',
              'respect_patient_prefs': 'Respect for Patient Preferences'
            }
            
            // Normalize any percent-like inputs to ratios 0-1
            const toRatio = (val) => {
              if (val == null) return 0
              const num = typeof val === 'string' ? parseFloat(val) : Number(val)
              if (!isFinite(num) || isNaN(num)) return 0
              if (num > 1) return num / 100
              if (num < 0) return 0
              return num
            }

            cgcahpsDrivers = Object.entries(domainNames).map(([key, name]) => ({
              name,
              value: toRatio(programData[key]),
              benchmark: toRatio(nrcData ? nrcData[key] : programData[key])
            }))
          }
        } catch (err) {
          console.log('⚠️ No CG-CAHPS data found (this is okay):', err)
        }

        console.log('💾 Setting Firestore data:', { 
          surveysCount: surveys.length, 
          weeklyCount: weeklyData.length,
          hasCgCahps: !!cgcahpsDrivers,
          programId: manageProgramId 
        })

        setFirestoreData({
          surveys,
          weeklyData,
          programId: manageProgramId,
          departments: managerData.departments || [],
          cgcahpsDrivers,
          cohortSizesByDept,
          responseRatesByDept
        })
        
        setUseMockData(false)
        setLoading(false)
        console.log('✅ Dashboard data loaded successfully - using real data')
      } catch (err) {
        console.error('❌ Error loading dashboard data:', err)
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

  // Export handlers
  const handleExportCsv = () => {
    const exportData = {
      metricType: metricOption.label,
      programId: programId,
      department: departmentFilter.label,
      timeRange: range.label,
      kpis: caps.kpis ? {
        latestWellness,
        wellnessDelta,
        numResidents,
        responseRate
      } : null,
      trend: filteredTrend,
      driverMetrics: caps.drivers ? driverMetrics : null,
      distribution: caps.distribution ? {
        segmentAgg,
        belowAvgDeptBreakdown,
        avgDeptBreakdown,
        aboveDeptBreakdown
      } : null,
      heatmap: caps.heatmap ? {
        depts: heatmapDepts,
        months: heatmapMonths,
        values: heatmapValues
      } : null
    }
    exportToCsv(exportData)
  }

  const handleExportPdf = () => {
    const exportData = {
      metricType: metricOption.label,
      programId: programId,
      department: departmentFilter.label,
      timeRange: range.label,
      kpis: caps.kpis ? {
        latestWellness,
        wellnessDelta,
        numResidents,
        responseRate
      } : null,
      trend: filteredTrend,
      driverMetrics: caps.drivers ? driverMetrics : null,
      distribution: caps.distribution ? {
        segmentAgg,
        belowAvgDeptBreakdown,
        avgDeptBreakdown,
        aboveDeptBreakdown
      } : null,
      heatmap: caps.heatmap ? {
        depts: heatmapDepts,
        months: heatmapMonths,
        values: heatmapValues
      } : null
    }
    exportToPdf(exportData)
  }

  // Use Firestore data if available, otherwise fall back to mock
  const active = useMockData || !firestoreData 
    ? metricConfigs[metricOption.value]
    : transformFirestoreData(firestoreData, metricOption.value)
  
  // Apply department filter
  const filterByDepartment = (data) => {
    if (departmentFilter.value === 'all') return data
    return data.filter(item => item.dept === departmentFilter.value || item.department === departmentFilter.value)
  }
  
  const wellnessTrend = active.trend || []
  const driverMetrics = active.driverMetrics || []
  const allResidents = active.residents || []
  const residents = filterByDepartment(allResidents)
  const caps = active.capabilities || metricConfigs[metricOption.value]?.capabilities || { kpis: true, trend: true, heatmap: true, distribution: true, drivers: false }
  const segmentDeltas = active.segmentDeltas || null
  
  // Get unique departments for filter dropdown
  const availableDepartments = useMemo(() => {
    const depts = Array.from(new Set(allResidents.map(r => r.dept).filter(d => d)))
    return [
      { label: 'All Departments', value: 'all' },
      ...depts.sort().map(d => ({ label: d, value: d }))
    ]
  }, [allResidents])
  
  // Use cohort sizes when available; fall back to resident list length
  const numResidents = useMemo(() => {
    const map = active.cohortSizesByDept
    if (map && typeof map === 'object') {
      if (departmentFilter.value === 'all') {
        return Object.values(map).reduce((sum, n) => sum + (Number(n) || 0), 0)
      }
      return Number(map[departmentFilter.value]) || 0
    }
    return residents.length
  }, [active.cohortSizesByDept, departmentFilter.value, residents.length])

  // Get heatmap data from active source (Firestore or mock)
  const heatmapMonths = (useMockData || !firestoreData) ? (metricOption.value === 'WHO-5' ? months : []) : (active.heatmapMonths || [])
    const allHeatmapDepts = (useMockData || !firestoreData) ? (metricOption.value === 'WHO-5' ? departments : []) : (active.heatmapDepts || [])
    const allHeatmapVals = (useMockData || !firestoreData) ? (metricOption.value === 'WHO-5' ? heatmapValues : []) : (active.heatmapValues || [])
  
    // Filter heatmap by department
    const { heatmapDepts, heatmapVals } = useMemo(() => {
      if (departmentFilter.value === 'all') {
        return { heatmapDepts: allHeatmapDepts, heatmapVals: allHeatmapVals }
      }
      const deptIndex = allHeatmapDepts.indexOf(departmentFilter.value)
      if (deptIndex === -1) {
        return { heatmapDepts: [], heatmapVals: [] }
      }
      return {
        heatmapDepts: [departmentFilter.value],
        heatmapVals: [allHeatmapVals[deptIndex]]
      }
    }, [departmentFilter.value, allHeatmapDepts, allHeatmapVals])

  // Apply department filter before slicing trend/time range
  const deptFilteredTrend = useMemo(() => {
    if (departmentFilter.value === 'all') {
      return wellnessTrend.filter(p =>
        (p.department === 'all' || p.dept === 'all' || (!p.department && !p.dept))
      )
    }
    return wellnessTrend.filter(p => p.department === departmentFilter.value || p.dept === departmentFilter.value)
  }, [departmentFilter.value, wellnessTrend])

  // Apply time range to trend and heatmap columns
  const trendWindow = useMemo(
    () => computeSliceWindow(range.value, deptFilteredTrend.length || 0),
    [range.value, deptFilteredTrend.length]
  )
  const filteredTrend = useMemo(
    () => deptFilteredTrend.slice(trendWindow.start, trendWindow.end),
    [deptFilteredTrend, trendWindow.start, trendWindow.end]
  )

  // Get response rate from active source (precomputed if available)
  const responseRate = useMemo(() => {
    if (!caps.kpis) return null

    const deptKey = departmentFilter.value

    // Prefer precomputed map from Firestore
    const fromMap = active.responseRatesByDept
    if (fromMap) {
      if (deptKey === 'all') {
        const stats = Object.values(fromMap)
        if (stats.length === 0) return null
        const totalResponded = stats.reduce((sum, s) => sum + (s?.numResponded || 0), 0)
        const totalCohort = stats.reduce((sum, s) => sum + (s?.cohortSize || 0), 0)
        if (totalCohort === 0) return null
        return (totalResponded / totalCohort) * 100
      }
      const stat = fromMap[deptKey]
      if (stat && stat.responseRate != null) return stat.responseRate
    }

    // Fallback to any aggregate provided on the active metric
    if (active.responseRate != null) return Number(active.responseRate)

    // Fallback compute from surveys + cohort sizes limited to visible trend range
    const surveys = active.surveys
    const cohortSizesByDept = active.cohortSizesByDept
    if (!surveys || !cohortSizesByDept) return null

    const cohortSize = deptKey === 'all'
      ? Object.values(cohortSizesByDept).reduce((sum, n) => sum + (Number(n) || 0), 0)
      : (Number(cohortSizesByDept[deptKey]) || 0)
    if (cohortSize === 0) return null

    const visibleDays = new Set(filteredTrend.map(p => String(p.x)))
    const uniqueResidentIds = new Set()

    for (const s of surveys) {
      if (deptKey !== 'all' && s.department !== deptKey) continue
      if (!s.dayKey || !visibleDays.has(String(s.dayKey))) continue
      if (!s.resident_id) continue
      uniqueResidentIds.add(String(s.resident_id))
    }

    if (uniqueResidentIds.size === 0) return 0

    return (uniqueResidentIds.size / cohortSize) * 100
  }, [caps.kpis, departmentFilter.value, active.responseRatesByDept, active.responseRate, active.surveys, active.cohortSizesByDept, filteredTrend])
  const responseRateDisplay = responseRate != null ? responseRate.toFixed(1) : null

  const monthsWindow = computeSliceWindow(range.value, heatmapMonths.length || 0)
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
  } = useMemo(() => buildDistribution(residents, active.cohortSizesByDept || {}), [residents, active.cohortSizesByDept])

  // KPIs reflect filtered range
  const latestWellness = filteredTrend[filteredTrend.length - 1]?.y ?? 0
  const prevWellness = filteredTrend.length >= 2 ? filteredTrend[filteredTrend.length - 2].y : latestWellness
  const wellnessDelta = Math.round(((latestWellness - prevWellness) || 0) * 10) / 10
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
                { colspan: { default: 12, xs: 12, s: 4 } },
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
                      selectedOption={departmentFilter}
                      onChange={e => setDepartmentFilter(e.detail.selectedOption)}
                      options={availableDepartments}
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
                      { label: 'Last Week', value: '1w' },
                      { label: 'Last Month', value: '4w' },
                      { label: 'Last 3 Months', value: '12w' },
                      { label: 'Last 6 Months', value: '6m' },
                      { label: 'Last 12 Months', value: '12m' },
                      { label: 'All', value: 'cohort-std' },
                    ]}
                  />
                </SpaceBetween>
              </Container>
              <Container>
                <SpaceBetween size="xs">
                  <Button onClick={handleExportCsv}>Export CSV</Button>
                  <Button onClick={handleExportPdf}>Export PDF</Button>
                </SpaceBetween>
              </Container>
            </Grid>

            {/* KPIs (WHO-5 only) */}
            {caps.kpis && (
              <Grid
                gridDefinition={[
                  { colspan: { default: 12, s: 4 } },
                  { colspan: { default: 12, s: 4 } },
                  { colspan: { default: 12, s: 4 } }
                ]}
              >
                <MetricCard
                  title="Wellness Score"
                  value={
                    <span>
                      {latestWellness}
                      <Box as="span" color="text-status-success" fontSize="body-s" margin={{ left: 'xs' }}>
                        ↑ {wellnessDelta.toFixed(1)}
                      </Box>
                    </span>
                  }
                  status={wellnessClass}
                />
                <MetricCard title="Number of Residents" value={numResidents} />
                {responseRateDisplay != null && (
                  <MetricCard title="Response Rate" value={`${responseRateDisplay}%`} />
                )}
              </Grid>
            )}

            {/* Driver Metrics (CG-CAHPS only) */}
            {caps.drivers && (
              <Container header={<Header variant="h3">Driver Metrics</Header>}>
                <DriverMetricsChart driverMetrics={driverMetrics} />
                <Box margin={{ top: 'xs' }} fontSize="body-xxs" color="text-body-secondary">
                  Hover for benchmark & delta. Highlight = focus driver.
                </Box>
              </Container>
            )}

            {/* Trend (WHO-5 only, filtered by time range) */}
            {caps.trend && (
              <Grid gridDefinition={[{ colspan: { default: 12 } }]}>
                <Container
                    header={
                      <Header
                          variant="h3"
                          // optional: add description under the title
                          description={
                            responseRateDisplay != null
                              ? `Response rate: ${responseRateDisplay}%`
                              : 'Response rate: n/a'
                          }
                      >
                        {metricOption.label} Trend
                      </Header>
                    }
                >
                  <Box margin={{bottom: 's'}}>
                    <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
                      <Box variant="awsui-key-label">Range</Box>
                      <div style={{display: 'inline-flex', gap: 8, flexWrap: 'wrap'}}>
                        {PRESETS.map(p => (
                            <Button
                                key={p.id}
                                variant={preset === p.id ? 'primary' : 'normal'}
                                onClick={() => setPreset(p.id)}
                            >
                              {p.label}
                            </Button>
                        ))}
                      </div>
                    </div>
                  </Box>
                  <LineChart
                      xScaleType="categorical"
                      series={[{title: metricOption.label, type: 'line', data: filteredTrend}]}
                      xDomain={filteredTrend.map(p => p.x)}
                      yDomain={[0, 100]}
                      hideFilter
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
            )}

                      {/* Heatmap and/or compact driver bars */}
                      {(caps.heatmap || caps.drivers) && (
                          <Grid
                              gridDefinition={
                                caps.heatmap && caps.drivers
                                    ? [{colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]
                    : [{ colspan: { default: 12 } }]
                }
              >
                {caps.heatmap && (
                  <Container header={<Header variant="h3">Wellness Score by Department</Header>}>
                    <Heatmap months={filteredMonths} values={filteredHeatmapValues} departments={heatmapDepts} />
                  </Container>
                )}
                {caps.drivers && (
                  <Container header={<Header variant="h3">Driver Metrics (Alt List)</Header>}>
                    <DriverMetricBars driverMetrics={driverMetrics} />
                  </Container>
                )}
              </Grid>
            )}

            {/* Distribution at bottom (WHO-5 only) */}
            {caps.distribution && (
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
                  segmentDeltas={segmentDeltas}
                />
              </Container>
            )}
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
  wellnessDelta,
  segmentDeltas
}) => {
  const getSeg = name => segmentAgg.find(s => s.segment === name) || { numResidents: 0, respondents: 0, responseRate: 0, avgScore: 0 }
  const above = getSeg('Above Average')
  const average = getSeg('Average')
  const below = getSeg('Below Average')

  const Card = ({ title, data, nearCount, color, delta }) => (
    <Container header={<Header variant="h3">{title}</Header>}>
      <SpaceBetween size="xs">
        <Box>
          <Box variant="awsui-key-label">Number of Residents</Box>
          <Box>{data.numResidents}</Box>
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
          <Box color={(delta ?? wellnessDelta) >= 0 ? 'text-status-success' : 'text-status-error'}>
            {formatSignedDelta(delta ?? wellnessDelta)}
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
        <Card title="Above Average" data={above} nearCount={nearAboveCount} color="positive" delta={segmentDeltas?.above} />
        <Card title="Average" data={average} nearCount={nearAvgCount} color="normal" delta={segmentDeltas?.average} />
        <Card title="Below Average" data={below} nearCount={nearBelowCount} color="warning" delta={segmentDeltas?.below} />
      </Grid>

      {/* Below Average details (moved here, replaces separate section) */}
      <Container header={<Header variant="h3">Below Average by Department</Header>}>
        <Table
          items={belowAvgDeptBreakdown}
          columnDefinitions={[
            { id: 'dept', header: 'Department', cell: i => i.dept },
            { id: 'numResidents', header: 'Number of Residents', cell: i => i.numResidents },
            { id: 'pct', header: '% of Below Avg', cell: i => i.pct + '%' },
            { id: 'avg', header: 'Avg Score', cell: i => i.avg }
          ]}
          variant="embedded"
          stripedRows
        />
      </Container>

      {/* Department breakdowns for all segments */}
      <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
        <Container header={<Header variant="h3">Average by Department</Header>}>
          <Table
            items={avgDeptBreakdown}
            columnDefinitions={[
              { id: 'dept', header: 'Department', cell: i => i.dept },
              { id: 'numResidents', header: 'Number of Residents', cell: i => i.numResidents },
              { id: 'avg', header: 'Avg Score', cell: i => i.avg }
            ]}
            variant="embedded"
            stripedRows
          />
        </Container>
        <Container header={<Header variant="h3">Above Average by Department</Header>}>
          <Table
            items={aboveDeptBreakdown}
            columnDefinitions={[
              { id: 'dept', header: 'Department', cell: i => i.dept },
              { id: 'numResidents', header: 'Number of Residents', cell: i => i.numResidents },
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

// Nicely format signed deltas with fixed decimals and plus sign
function formatSignedDelta(n, decimals = 1) {
  const p = Math.pow(10, decimals)
  const rounded = Math.round((Number(n) || 0) * p) / p
  const value = rounded.toFixed(decimals)
  return `${rounded >= 0 ? '+' : ''}${value}`
}
