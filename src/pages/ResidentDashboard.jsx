// src/pages/ResidentDashboard.jsx
import React from 'react'
import {
    Box, Button, Container, Header, SpaceBetween, LineChart, Spinner
} from '@cloudscape-design/components'
import { useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'

// Firebase
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
    getFirestore, collection, query, orderBy, limit, getDocs, Timestamp
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

export default function ResidentDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = React.useState(true)
    const [points, setPoints] = React.useState([])

    React.useEffect(() => {
        let unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setPoints([]); setLoading(false)
                return
            }
            try {
                const q = query(
                    collection(db, `resident_info/${user.uid}/surveys`),
                    orderBy('createdAt', 'asc'),     // chronological
                    limit(180)                        // ~3 years if weekly
                )
                const snap = await getDocs(q)
                const rows = snap.docs.map(d => {
                    const data = d.data()
                    const ts = data.createdAt
                    const x = ts instanceof Timestamp ? ts.toDate() : new Date()
                    return { x, y: Number(data.score || 0) }
                })
                setPoints(rows)
            } catch (e) {
                console.error('Fetch resident series failed', e)
            } finally {
                setLoading(false)
            }
        })
        return () => unsub && unsub()
    }, [])

    const series = [{ title: 'WHO-5 score', type: 'line', data: points }]
    const allY = points.map(p => p.y)
    const yMin = allY.length ? Math.max(0, Math.min(...allY) - 1) : 0
    const yMax = allY.length ? Math.min(25, Math.max(...allY) + 1) : 25

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: 'min(1100px, 96vw)' }}>
                <Container
                    header={
                        <Header
                            variant="h1"
                            actions={<Button variant="primary" onClick={() => navigate('/resident/survey')}>Take new WHO-5 survey</Button>}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Brand size="lg" center={false} />
                                <span style={{ fontWeight: 700, fontSize: 22 }}>Resident Dashboard</span>
                            </div>
                        </Header>
                    }
                >
                    <SpaceBetween size="m">
                        <Box variant="p" color="text-body-secondary">
                            Your WHO-5 scores over time (0–25). Higher is better.
                        </Box>

                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Spinner /> <span>Loading your data…</span>
                            </div>
                        ) : points.length === 0 ? (
                            <Box variant="p">No surveys yet. Click <strong>“Take new WHO-5 survey”</strong> to get started.</Box>
                        ) : (
                            <LineChart
                                series={series}
                                xScaleType="time"
                                yDomain={[yMin, yMax]}
                                ariaLabel="WHO-5 Score Time Series"
                                height={340}
                                hideLegend
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
                                detailPopoverFooter={(x, d) => (d && d.length ? `Score: ${d[0].y}` : null)}
                            />
                        )}
                    </SpaceBetween>
                </Container>
            </div>
        </div>
    )
}