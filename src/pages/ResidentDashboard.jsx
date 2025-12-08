// src/pages/ResidentDashboard.jsx
import React from 'react'
import {
    Box, Button, Container, Header, SpaceBetween, LineChart, Spinner,
    ColumnLayout, Badge, Checkbox
} from '@cloudscape-design/components'
import { useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'

import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
    getFirestore, collection, query, orderBy, limit, getDocs, Timestamp,
    doc, getDoc
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

// Presets only
const PRESETS = [
    { id: '1w',  label: '1 week',   days: 7 },
    { id: '1m',  label: '1 month',  days: 30 },
    { id: '3m',  label: '3 months', days: 90 },
    { id: '6m',  label: '6 months', days: 180 },
    { id: '1y',  label: '1 year',   days: 365 },
    { id: 'all', label: 'All',      days: null },
]

// helpers
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x }
const dayKey = (d = new Date()) => {
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`
}

// Placeholder plan average (swap with Firestore later)
const NATIONAL_WHO5_AVG_BY_REGION = { US: 16.05 }

export default function ResidentDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = React.useState(true)
    const [profile, setProfile] = React.useState(null)
    const [points, setPoints] = React.useState([])
    const [alreadyToday, setAlreadyToday] = React.useState(false)
    const [programLocation, setProgramLocation] = React.useState('US')

    // filters
    const [preset, setPreset] = React.useState('all')
    const [showPlan, setShowPlan] = React.useState(false)

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { setPoints([]); setAlreadyToday(false); setLoading(false); return }
            try {
                // profile → program
                const profRef = doc(db, `resident_info/${user.uid}`)
                const profSnap = await getDoc(profRef)
                let programId = null
                if (profSnap.exists()) programId = profSnap.get('program_id') || null
                if (profSnap.exists()) {
                    const data = profSnap.data()
                    setProfile({
                        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.email || 'Resident',
                        department: data.department || 'Unknown',
                        programId: data.program_id || programId || 'N/A',
                        email: data.email || user.email
                    })
                } else {
                    setProfile({
                        name: user.email || 'Resident',
                        department: 'Unknown',
                        programId: programId || 'N/A',
                        email: user.email
                    })
                }

                // program → location (normalize to region key)
                if (programId) {
                    const programRef = doc(db, `programs/${programId}`)
                    const programSnap = await getDoc(programRef)
                    if (programSnap.exists()) setProgramLocation('US')
                }

                // history
                const q = query(
                    collection(db, `resident_info/${user.uid}/surveys`),
                    orderBy('createdAt', 'asc'),
                    limit(1000)
                )
                const snap = await getDocs(q)
                setPoints(
                    snap.docs.map(d => {
                        const data = d.data()
                        const ts = data.createdAt
                        const x = ts instanceof Timestamp ? ts.toDate() : (ts?.toDate?.() ?? new Date())
                        return { x, y: Number(data.score || 0) }
                    })
                )

                // already today?
                const todayRef = doc(db, `resident_info/${user.uid}/surveys/${dayKey()}`)
                const todaySnap = await getDoc(todayRef)
                setAlreadyToday(todaySnap.exists())
            } catch (e) {
                console.error('Fetch resident series failed', e)
                setAlreadyToday(false)
            } finally {
                setLoading(false)
            }
        })
        return () => unsub && unsub()
    }, [])

    // derive inclusive [start,end] from preset
    const [start, end] = React.useMemo(() => {
        if (!points.length) return [null, null]
        if (preset === 'all') return [null, null]
        const p = PRESETS.find(p => p.id === preset)
        if (!p?.days) return [null, null]
        const maxDate = endOfDay(points[points.length - 1].x)
        const minDate = startOfDay(new Date(maxDate))
        minDate.setDate(minDate.getDate() - (p.days - 1))
        return [minDate, maxDate]
    }, [preset, points])

    // filter points by range
    const filtered = React.useMemo(() => {
        if (!points.length) return []
        if (!start || !end) return points
        const s = start.getTime(), e = end.getTime()
        return points.filter(p => {
            const t = p.x.getTime()
            return t >= s && t <= e
        })
    }, [points, start, end])

    // stats
    const stats = React.useMemo(() => {
        if (!filtered.length) return { avg: 0, min: 0, max: 0, count: 0 }
        const ys = filtered.map(p => p.y)
        const sum = ys.reduce((a,b)=>a+b,0)
        return { avg: sum/ys.length, min: Math.min(...ys), max: Math.max(...ys), count: ys.length }
    }, [filtered])

    // plan overlay (flat line for now)
    const planAvg = NATIONAL_WHO5_AVG_BY_REGION[programLocation] ?? 15
    const planSeries = showPlan && filtered.length
        ? [{ title: 'Plan (national avg)', type: 'line', data: filtered.map(p => ({ x: p.x, y: planAvg })) }]
        : []

    // y-domain
    const allY = filtered.map(p => p.y).concat(showPlan ? [planAvg] : [])
    const yMin = allY.length ? Math.max(0, Math.min(...allY) - 1) : 0
    const yMax = allY.length ? Math.min(25, Math.max(...allY) + 1) : 25

    const series = [{ title: 'WHO-5 score', type: 'line', data: filtered }, ...planSeries]

    return (
        <div style={{ display:'flex', justifyContent:'center', padding:'24px 16px' }}>
            <div style={{ width:'min(1100px, 96vw)' }}>
                <Container
                    header={
                        <Header
                            variant="h1"
                            actions={
                                <Button variant="primary" disabled={alreadyToday} onClick={() => navigate('/resident/survey')}>
                                    {alreadyToday ? 'Already submitted today' : 'Take new WHO-5 survey'}
                                </Button>
                            }
                        >
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <Brand size="lg" center={false} />
                                <span style={{ fontWeight:700, fontSize:22 }}>Resident Dashboard</span>
                                {alreadyToday && <Badge color="blue">Submitted today</Badge>}
                                {filtered.length > 0 && <Badge color="green">{filtered.length} results</Badge>}
                            </div>
                        </Header>
                    }
                >
                    <SpaceBetween size="l">
                        {profile && (
                            <Container variant="stacked">
                                <Header variant="h3">Welcome, {profile.name}</Header>
                                <ColumnLayout columns={3} variant="text-grid">
                                    <ProfileItem label="Email" value={profile.email || '—'} />
                                    <ProfileItem label="Department" value={profile.department || '—'} />
                                    <ProfileItem label="Program ID" value={profile.programId || '—'} />
                                </ColumnLayout>
                            </Container>
                        )}

                        {/* Presets + Plan */}
                        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                            <Box variant="awsui-key-label">Range</Box>
                            <div style={{ display:'inline-flex', gap:8, flexWrap:'wrap' }}>
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

                            <Checkbox checked={showPlan} onChange={({ detail }) => setShowPlan(detail.checked)}>
                                Show plan (national average)
                            </Checkbox>
                        </div>

                        {/* Stats */}
                        <ColumnLayout columns={4} variant="text-grid">
                            <Stat label="Average" value={stats.count ? stats.avg.toFixed(1) : '–'} />
                            <Stat label="Min"     value={stats.count ? stats.min : '–'} />
                            <Stat label="Max"     value={stats.count ? stats.max : '–'} />
                            <Stat label="Count"   value={stats.count} />
                        </ColumnLayout>

                        <Box variant="p" color="text-body-secondary">
                            WHO-5 scores (0–25). Higher is better.
                            {start && end && <> Showing <strong>{start.toLocaleDateString()}</strong> – <strong>{end.toLocaleDateString()}</strong> (inclusive).</>}
                        </Box>

                        {loading ? (
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <Spinner /> <span>Loading your data…</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <Box variant="p">No surveys in this range. Try another preset.</Box>
                        ) : (
                            <LineChart
                                series={series}
                                xScaleType="time"
                                yDomain={[yMin, yMax]}
                                ariaLabel="WHO-5 Score Time Series"
                                height={360}
                                hideLegend={series.length === 1}
                                hideFilter
                                xTitle="Date"
                                yTitle="Score (0–25)"
                                horizontalGridLines
                                verticalGridLines
                                emphasizeBaselineAxis
                                i18nStrings={{
                                    filterLabel: 'Filter displayed series',
                                    filterPlaceholder: 'Filter series',
                                    filterSelectedAriaLabel: 'selected',
                                    detailPopoverDismissAriaLabel: 'Dismiss',
                                    legendAriaLabel: 'Legend',
                                    chartAriaRoleDescription: 'line chart',
                                    xTickFormatter: d => d.toLocaleDateString(),
                                    yTickFormatter: v => `${v}`,
                                }}
                                detailPopoverFooter={(x, d) =>
                                    d && d.length ? d.map(s => `${s.series.title}: ${s.y}`).join(' • ') : null}
                            />
                        )}
                    </SpaceBetween>
                </Container>
            </div>
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div>
            <Box variant="awsui-key-label">{label}</Box>
            <Box variant="strong">{value}</Box>
        </div>
    )
}

function ProfileItem({ label, value }) {
    return (
        <div>
            <Box variant="awsui-key-label">{label}</Box>
            <Box>{value}</Box>
        </div>
    )
}
