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
  const avg = residents.reduce((a,r)=>a+r.score,0)/residents.length
  const segmentOf = score => score > avg ? 'Above Average' : score < avg ? 'Below Average' : 'Average'
  const map = {}
  residents.forEach(r=>{
    const seg = segmentOf(r.score)
    if(!map[seg]) map[seg] = { segment: seg, n:0, responded:0, totalScore:0 }
    map[seg].n++
    if(r.responded) map[seg].responded++
    map[seg].totalScore += r.score
  })
  const segmentAgg = Object.values(map).map(o=>({
    segment:o.segment,
    n:o.n,
    responseRate:o.n? Math.round(o.responded/o.n*100):0,
    avgScore:Math.round(o.totalScore/o.n)
  })).sort((a,b)=> a.segment.localeCompare(b.segment))
  const belowResidents = residents.filter(r=> segmentOf(r.score)==='Below Average')
  const totalBelow = belowResidents.length || 1
  const deptMap = {}
  belowResidents.forEach(r=>{
    if(!deptMap[r.dept]) deptMap[r.dept]={ dept:r.dept, n:0, sum:0 }
    deptMap[r.dept].n++
    deptMap[r.dept].sum += r.score
  })
  const belowAvgDeptBreakdown = Object.values(deptMap)
    .map(d=>({ dept:d.dept, n:d.n, pct:Math.round(d.n/totalBelow*100), avg:Math.round(d.sum/d.n) }))
    .sort((a,b)=> a.avg - b.avg)
  return { avgWellness: avg, segmentAgg, belowAvgDeptBreakdown }
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

const Heatmap = () => {
  // New buckets: broader 10-point middle ranges
  const buckets = [
    { max: 40, label: '<40',    color: '#dc2626' }, // red
    { max: 50, label: '40-49',  color: '#f97316' }, // orange
    { max: 60, label: '50-59',  color: '#facc15' }, // yellow
    { max: 70, label: '60-69',  color: '#22c55e' }, // green
    { max: Infinity, label: '70+', color: '#065f46' } // dark green
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
            {heatmapValues[row].map((v, i) => (
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

      {/* Legend */}
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

// ---------------- Page ------------------------------------------------------
export default function DashboardPage() {
  const [metricOption, setMetricOption] = useState({ label: 'CG-CAHPS', value: 'CG-CAHPS' })
  const [cohort, setCohort] = useState({ label: 'All Cohorts', value: 'all' })
  const [range, setRange] = useState({ label: 'Last 12 Months', value: '12m' })

  const active = metricConfigs[metricOption.value]
  const wellnessTrend = active.trend
  const driverMetrics = active.driverMetrics
  const residents = active.residents

  const { avgWellness, segmentAgg, belowAvgDeptBreakdown } = useMemo(
    () => buildDistribution(residents),
    [residents]
  )

  const latestWellness = wellnessTrend[wellnessTrend.length - 1].y
  const wellnessDelta = latestWellness - wellnessTrend[wellnessTrend.length - 2].y
  const wellnessClass = classifyScore(latestWellness)

  return (
    <AppLayout
      content={
        <ContentLayout header={<Header variant="h1">General Overview</Header>}>
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
                  <Box variant="awsui-key-label">Filter.p By</Box>
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
                    options={[{ label: 'Last 12 Months', value: '12m' }]}
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

            {/* Trend + Distribution */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 6 } },
                { colspan: { default: 12, s: 6 } }
              ]}
            >
              <Container header={<Header variant="h3">{metricOption.label} Trend</Header>}>
                <LineChart
                  xScaleType="categorical"
                  series={[{ title: metricOption.label, type: 'line', data: wellnessTrend }]}
                  xDomain={wellnessTrend.map(p => p.x)}
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
              <Container>
                <DistributionTable segmentAgg={segmentAgg} avgWellness={avgWellness} />
              </Container>
            </Grid>

            {/* Heatmap + Alternate Driver Bars */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 6 } },
                { colspan: { default: 12, s: 6 } }
              ]}
            >
              <Container header={<Header variant="h3">Wellness Score by Department</Header>}>
                <Heatmap />
              </Container>
              <Container header={<Header variant="h3">Driver Metrics (Alt List)</Header>}>
                <DriverMetricBars driverMetrics={driverMetrics} />
              </Container>
            </Grid>

            {/* Below Average Detail */}
            <BelowAverageBreakdown items={belowAvgDeptBreakdown} />
          </SpaceBetween>
        </ContentLayout>
      }
      navigationHide
      toolsHide
    />
  )
}