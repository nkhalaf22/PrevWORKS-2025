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

// ---------------- Mock Data -------------------------------------------------
const wellnessTrend = [
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

const driverMetrics = [
  { name: 'Access to Care', value: 0.74, benchmark: 0.50 },
  { name: 'Communication', value: 0.81, benchmark: 0.80, highlight: true },
  { name: 'Office Staff', value: 0.79, benchmark: 0.80 },
  { name: 'Provider Rating', value: 0.72, benchmark: 0.70 },
  { name: 'Care Coordination', value: 0.77, benchmark: 0.80 }
]

const months = ['May', 'Feb', 'Mar', 'Apr', 'May2', 'Jun', 'Sept', 'Apr2', 'April']
const departments = ['Emergency', 'Internal Med', 'Pediatrics', 'Surgery']
const heatmapValues = [
  [32, 48, 55, 61, 58, 52, 49, 44, 39],
  [60, 62, 59, 57, 56, 54, 53, 51, 50],
  [55, 58, 60, 63, 65, 61, 59, 58, 56],
  [70, 68, 66, 64, 62, 60, 58, 55, 50]
]

// Resident-level mock data for Distribution
const residents = [
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

// ---------------- Helpers ---------------------------------------------------
function classifyScore(score) {
  if (score >= 70) return { label: 'Thriving', color: 'positive' }
  if (score >= 50) return { label: 'Watch Zone', color: 'warning' }
  if (score < 28)  return { label: 'Critical', color: 'error' }
  return { label: 'At-Risk', color: 'error' }
}

const latestWellness = wellnessTrend[wellnessTrend.length - 1].y
const wellnessDelta = latestWellness - wellnessTrend[wellnessTrend.length - 2].y
const wellnessClass = classifyScore(latestWellness)

const avgWellness = residents.reduce((a,r)=>a+r.score,0)/residents.length
function segmentOf(score){
  if (score > avgWellness) return 'Above Average'
  if (score < avgWellness) return 'Below Average'
  return 'Average'
}

const segmentAgg = (() => {
  const map = {}
  residents.forEach(r=>{
    const seg = segmentOf(r.score)
    if(!map[seg]) map[seg] = { segment: seg, n:0, responded:0, totalScore:0 }
    map[seg].n++
    if(r.responded) map[seg].responded++
    map[seg].totalScore += r.score
  })
  return Object.values(map).map(o=>({
    segment: o.segment,
    n: o.n,
    responseRate: o.n? Math.round(o.responded/o.n*100):0,
    avgScore: Math.round(o.totalScore/o.n)
  })).sort((a,b)=> a.segment.localeCompare(b.segment))
})()

const belowAvgDeptBreakdown = (() => {
  const below = residents.filter(r=> segmentOf(r.score)==='Below Average')
  const totalBelow = below.length || 1
  const deptMap = {}
  below.forEach(r=>{
    if(!deptMap[r.dept]) deptMap[r.dept]={ dept:r.dept, n:0, sum:0 }
    deptMap[r.dept].n++
    deptMap[r.dept].sum += r.score
  })
  return Object.values(deptMap)
    .map(d=>({
      dept:d.dept,
      n:d.n,
      pct: Math.round(d.n/totalBelow*100),
      avg: Math.round(d.sum/d.n)
    }))
    .sort((a,b)=> a.avg - b.avg) // worst first
})()

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

const DriverBenchmarksOverlay = () => (
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
              height: 18,
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${valuePct}%`,
                background: m.highlight ? '#facc15' : '#3b82f6',
                transition: 'width .4s',
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

const DriverMetricBars = () => {
  const series = driverMetrics.map(m => ({
    title: m.name,
    type: 'bar',
    data: [{ x: m.name, y: m.value }],
    color: m.highlight ? '#facc15' : '#3b82f6'
  }))
  return (
    <BarChart
      series={series}
      hideFilter
      horizontalBars
      stacked={false}
      xDomain={driverMetrics.map(d => d.name)}
      yDomain={[0, 1]}
      detailPopoverContent={e => e.datum.x + ': ' + (e.datum.y * 100).toFixed(0) + '%'}
      ariaLabel="Driver Metrics"
      height={260}
      i18nStrings={{
        detailPopoverDismissAriaLabel: 'Dismiss',
        filterLabel: 'Filter',
        legendAriaLabel: 'Legend',
        chartAriaRoleDescription: 'chart'
      }}
    />
  )
}

const Heatmap = () => {
  const colorFor = v => {
    const min = 25, max = 75
    const pct = (v - min) / (max - min)
    const blue = Math.round(120 + pct * 100)
    return `rgb(60,${80 + pct * 60},${blue})`
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${months.length}, 1fr)`, gap: 4 }}>
      <div />
      {months.map(m => (
        <Box key={m} fontSize="body-xs" textAlign="center">{m}</Box>
      ))}
      {departments.map((dept, row) => (
        <React.Fragment key={dept}>
          <Box fontSize="body-s">{dept}</Box>
          {heatmapValues[row].map((v, i) => (
            <div key={i} title={`${dept} ${months[i]}: ${v}`} style={{
              background: colorFor(v),
              height: 32,
              borderRadius: 4,
              fontSize: 10,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>{v}</div>
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}

const DistributionTable = () => (
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

const BelowAverageBreakdown = () => (
  <Table
    items={belowAvgDeptBreakdown}
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
  const [whoOption, setWhoOption] = useState({ label: 'CG-CAHPS', value: 'CG-CAHPS' })
  const [cohort, setCohort] = useState({ label: 'All Cohorts', value: 'all' })
  const [range, setRange] = useState({ label: 'Last 12 Months', value: '12m' })
  const alertsRows = useMemo(() => [], []) // legacy placeholder

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
                  <Box variant="awsui-key-label">WHO-3</Box>
                  <Select
                    selectedOption={whoOption}
                    onChange={e => setWhoOption(e.detail.selectedOption)}
                    options={[{ label: 'CG-CAHPS', value: 'CG-CAHPS' }]}
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
              <MetricCard title="N" value="320" />
              <Container header={<Header variant="h3">Driver Metrics</Header>}>
                <DriverBenchmarksOverlay />
              </Container>
            </Grid>

            {/* Trend + Distribution */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 6 } },
                { colspan: { default: 12, s: 6 } }
              ]}
            >
              <Container header={<Header variant="h3">Wellness Score Trend</Header>}>
                <LineChart
                  series={[{ title: 'Wellness', type: 'line', data: wellnessTrend }]}
                  xDomain={wellnessTrend.map(p => p.x)}
                  yDomain={[0, 100]}
                  i18nStrings={{
                    filterLabel: 'Filter',
                    filterPlaceholder: 'Filter',
                    detailPopoverDismissAriaLabel: 'Dismiss',
                    legendAriaLabel: 'Legend',
                    chartAriaRoleDescription: 'line chart'
                  }}
                  ariaLabel="Wellness score trend"
                  height={260}
                />
              </Container>
              <Container>
                <DistributionTable />
              </Container>
            </Grid>

            {/* Heatmap + Driver Bars */}
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 6 } },
                { colspan: { default: 12, s: 6 } }
              ]}
            >
              <Container header={<Header variant="h3">Wellness Score by Department</Header>}>
                <Heatmap />
              </Container>
              <Container header={<Header variant="h3">Driver Metrics (Alt Chart)</Header>}>
                <DriverMetricBars />
              </Container>
            </Grid>

            {/* Below Average Detail */}
            <BelowAverageBreakdown />
          </SpaceBetween>
        </ContentLayout>
      }
      navigationHide
      toolsHide
    />
  )
}