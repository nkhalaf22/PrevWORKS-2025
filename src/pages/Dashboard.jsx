import React, { useState, useMemo } from 'react'
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
  BarChart
} from '@cloudscape-design/components'
import Brand from '../components/Brand'

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
    if (!segmentMap[seg]) segmentMap[seg] = { segment: seg, n: 0, responded: 0, totalScore: 0 }
    segmentMap[seg].n++
    if (r.responded) segmentMap[seg].responded++
    segmentMap[seg].totalScore += r.score

    if (seg === 'Above Average') bySegment.above.push(r)
    else if (seg === 'Average') bySegment.average.push(r)
    else bySegment.below.push(r)
  })

  const segmentAgg = Object.values(segmentMap).map(o => ({
    segment: o.segment,
    n: o.n,
    responseRate: o.n ? Math.round((o.responded / o.n) * 100) : 0,
    avgScore: o.n ? Math.round(o.totalScore / o.n) : 0
  })).sort((a, b) => a.segment.localeCompare(b.segment))

  // Department breakdown helper per segment
  function deptBreakdown(list) {
    const total = list.length || 1
    const m = {}
    list.forEach(r => {
      if (!m[r.dept]) m[r.dept] = { dept: r.dept, n: 0, sum: 0 }
      m[r.dept].n++
      m[r.dept].sum += r.score
    })
    return Object.values(m)
      .map(d => ({ dept: d.dept, n: d.n, pct: Math.round((d.n / total) * 100), avg: Math.round(d.sum / d.n) }))
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
const DriverMetricBars = ({ driverMetrics }) => (
  <SpaceBetween size="s">
    {driverMetrics.map(m => {
      const valuePct = Math.round(m.value * 100)
      const benchPct = Math.round(m.benchmark * 100)
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
                background: m.highlight ? '#facc15' : '#3b82f6',
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

// Update Heatmap to accept filtered months/values via props
const Heatmap = ({ months, values }) => {
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
        {months.map(m => (
          <Box key={m} fontSize="body-xs" textAlign="center">{m}</Box>
        ))}
        {departments.map((dept, row) => (
          <React.Fragment key={dept}>
            <Box fontSize="body-s">{dept}</Box>
            {values[row].map((v, i) => (
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

const DistributionTable = ({ segmentAgg, avgWellness }) => (
  <Table
    items={segmentAgg}
    columnDefinitions={[
      { id:'segment', header:'Segment', cell:i=>i.segment },
      { id:'n', header:'N', cell:i=>i.n },
      { id:'response', header:'Response Rate', cell:i=> i.responseRate + '%' },
      { id:'avg', header:'Avg Score', cell:i=> i.avgScore }
    ]}
    variant="embedded"
    header={<Header variant="h3" description={`Mean Wellness: ${Math.round(avgWellness)}`}>Distribution</Header>}
    stripedRows
  />
)

const BelowAverageBreakdown = ({ items }) => (
  <Table
    items={items}
    columnDefinitions={[
      { id:'dept', header:'Department', cell:i=>i.dept },
      { id:'n', header:'N', cell:i=>i.n },
      { id:'pct', header:'% of Below Avg', cell:i=> i.pct + '%' },
      { id:'avg', header:'Avg Score', cell:i=> i.avg }
    ]}
    variant="container"
    header={<Header variant="h3" description="Departments within Below Average segment (sorted by avg score)">Below Average Detail</Header>}
    stripedRows
  />
)

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

// ---------------- Page ------------------------------------------------------
export default function DashboardPage() {
  const [metricOption, setMetricOption] = useState({ label: 'CG-CAHPS', value: 'CG-CAHPS' })
  const [cohort, setCohort] = useState({ label: 'All Cohorts', value: 'all' })
  const [range, setRange] = useState({ label: 'Last 12 Months', value: '12m' })

  // ...existing state and derived "active"...
  const active = metricConfigs[metricOption.value]
  const wellnessTrend = active.trend
  const driverMetrics = active.driverMetrics
  const residents = active.residents

  // Apply time range to trend and heatmap columns
  const trendWindow = computeSliceWindow(range.value, wellnessTrend.length)
  const filteredTrend = useMemo(
    () => wellnessTrend.slice(trendWindow.start, trendWindow.end),
    [wellnessTrend, trendWindow.start, trendWindow.end]
  )

  const monthsWindow = computeSliceWindow(range.value, months.length)
  const filteredMonths = useMemo(
    () => months.slice(monthsWindow.start, monthsWindow.end),
    [monthsWindow.start, monthsWindow.end]
  )
  const filteredHeatmapValues = useMemo(
    () => heatmapValues.map(row => row.slice(monthsWindow.start, monthsWindow.end)),
    [monthsWindow.start, monthsWindow.end]
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
              <MetricCard title="Response Rate" value="87 %" />
              <MetricCard title="N" value={residents.length} />
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
                <Heatmap months={filteredMonths} values={filteredHeatmapValues} />
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
  const getSeg = name => segmentAgg.find(s => s.segment === name) || { n: 0, responseRate: 0, avgScore: 0 }
  const above = getSeg('Above Average')
  const average = getSeg('Average')
  const below = getSeg('Below Average')

  const Card = ({ title, data, nearCount, color }) => (
    <Container header={<Header variant="h3">{title}</Header>}>
      <SpaceBetween size="xs">
        <Box>
          <Box variant="awsui-key-label">N</Box>
          <Box>{data.n}</Box>
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
            { id: 'n', header: 'N', cell: i => i.n },
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
              { id: 'n', header: 'N', cell: i => i.n },
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
              { id: 'n', header: 'N', cell: i => i.n },
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