import React from 'react'
import { Box, Cards, Container, FileUpload, FormField, Grid, Header, LineChart, SpaceBetween, Table } from '@cloudscape-design/components'
import { getWeeklyAverages } from '../lib/mock-db'
import BackLink from '../components/BackLink'
import Brand from '../components/Brand'

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/)
    const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()))
    return rows.map(([driver, score]) => ({ driver, score: Number(score) }))
}

export default function ManagerDashboard() {
    const [programId, setProgramId] = React.useState('PW-DEMO')
    const [whoWeeks, setWhoWeeks] = React.useState([])
    const [drivers, setDrivers] = React.useState([])

    React.useEffect(() => { setWhoWeeks(getWeeklyAverages(programId)) }, [programId])

    return (
        <div className="page-content">
            <BackLink label="Back to manager login" to="/manager/login" />
            <Container header={<Header variant="h1"><Brand size="lg" center={false} /> Program Manager Dashboard</Header>}>
                <SpaceBetween size="l">
                    <FormField label="Program ID">
                        <input className="cloudscape-input" value={programId} onChange={e => setProgramId(e.target.value)} />
                    </FormField>

                    <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
                        <Container header={<Header variant="h2">WHO-5 Average by Week</Header>}>
                            <LineChart
                                series={[{ title: 'WHO-5 Avg', type: 'line', data: whoWeeks.map(w => ({ x: w.week, y: w.avg })) }]}
                                xDomain={whoWeeks.map(w => w.week)}
                                yDomain={[0, 25]}
                                i18nStrings={{ xTickFormatter: e => e, yTickFormatter: e => e.toString() }}
                                height={280}
                                hideFilter
                                hideLegend
                            />
                        </Container>

                        <Container header={<Header variant="h2">CG-CAHPS Drivers</Header>}>
                            <SpaceBetween size="s">
                                <FormField label="Upload CSV (driver,score)">
                                    <FileUpload
                                        onChange={async ({ detail }) => {
                                            const file = detail.value && detail.value[0]
                                            if (!file) return
                                            const text = await file.text()
                                            setDrivers(parseCsv(text))
                                        }}
                                        value={[]}
                                        showFileLastModified
                                        showFileSize
                                    />
                                </FormField>
                                <Cards
                                    cardDefinition={{ header: i => i.driver, sections: [{ id: 'score', content: i => <Box>{i.score}</Box> }] }}
                                    items={drivers}
                                    cardsPerRow={[{ cards: 1 }, { minWidth: 300, cards: 2 }]}
                                    empty={<Box variant="p">Upload a CSV to see driver scores.</Box>}
                                />
                            </SpaceBetween>
                        </Container>
                    </Grid>

                    <Container header={<Header variant="h2">Raw Data (mock)</Header>}>
                        <Table
                            columnDefinitions={[
                                { id: 'week', header: 'Week', cell: i => i.week },
                                { id: 'avg', header: 'WHO-5 Avg', cell: i => i.avg }
                            ]}
                            items={whoWeeks}
                            variant="embedded"
                            empty={<Box variant="p">No data yet. Submit a few WHO-5 surveys.</Box>}
                        />
                    </Container>
                </SpaceBetween>
            </Container>
        </div>
    )
}
