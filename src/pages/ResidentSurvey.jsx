import React from 'react'
import { Box, Button, Container, FormField, Header, SpaceBetween } from '@cloudscape-design/components'
import BackLink from '../components/BackLink'
import Brand from '../components/Brand'
import { addWellnessScore } from '../lib/mock-db'

const QUESTIONS = [
    'I have felt cheerful and in good spirits',
    'I have felt calm and relaxed',
    'I have felt active and vigorous',
    'I woke up feeling fresh and rested',
    'My daily life has been filled with things that interest me'
]

// Left→right like your spec (5 → 0)
const SCALE = [
    { label: 'All of the time', value: 5 },
    { label: 'Most of the time', value: 4 },
    { label: 'More than half of the time', value: 3 },
    { label: 'Less than half of the time', value: 2 },
    { label: 'Some of the time', value: 1 },
    { label: 'At no time', value: 0 }
]

export default function ResidentSurvey() {
    const [programId, setProgramId] = React.useState('')
    const [answers, setAnswers] = React.useState(Array(5).fill(null))
    const [submitted, setSubmitted] = React.useState(false)
    const raw = answers.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)

    const canSubmit = programId.trim() && answers.every(v => typeof v === 'number')

    const setAnswer = (idx, value) => {
        const next = answers.slice()
        next[idx] = value
        setAnswers(next)
        setSubmitted(false)
    }

    const submit = () => {
        if (!canSubmit) return
        addWellnessScore({ programId: programId.trim(), score: raw })
        setSubmitted(true)
    }

    return (
        <div className="page-content">
            <BackLink label="Back to resident home" to="/resident/login" />

            <Container
                header={
                    <Header variant="h1">
                        <div className="brand-title">
                            <Brand size="lg" center={false} />
                            <span className="title-text">Resident Survey (WHO-5)</span>
                        </div>
                    </Header>
                }
            >
                <SpaceBetween size="m">
                    <FormField label="Program ID">
                        <input
                            className="cloudscape-input"
                            placeholder="Enter your Program ID"
                            value={programId}
                            onChange={e => setProgramId(e.target.value)}
                        />
                    </FormField>

                    {/* Matrix */}
                    <div className="who-matrix" role="table" aria-label="WHO-5 Well-Being Index">
                        {/* Header row */}
                        <div className="who-row who-head" role="row">
                            <div className="who-cell who-idx" role="columnheader">#</div>
                            <div className="who-cell who-question-h" role="columnheader">WHO-5 Well-Being Index</div>
                            {SCALE.map(s => (
                                <div className="who-cell who-hdr" role="columnheader" key={s.value}>
                                    <div className="who-hdr-label">{s.label}</div>
                                    <div className="who-hdr-num">{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Question rows */}
                        {QUESTIONS.map((q, i) => (
                            <div className="who-row" role="row" key={i}>
                                <div className="who-cell who-idx" role="cell">{i + 1}</div>
                                <div className="who-cell who-question" role="cell">{q}</div>
                                {SCALE.map(s => (
                                    <label className="who-cell who-radio-cell" role="cell" key={s.value}>
                                        <input
                                            type="radio"
                                            name={`q${i}`}
                                            value={s.value}
                                            checked={answers[i] === s.value}
                                            onChange={() => setAnswer(i, s.value)}
                                        />
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="who-actions">
                        <div className="who-score">Raw WHO-5 score: <strong>{raw}</strong> / 25</div>
                        <Button variant="primary" disabled={!canSubmit} onClick={submit}>Submit (mock)</Button>
                    </div>

                    <Box variant="p" color="text-body-secondary">Responses are anonymous.</Box>
                    {submitted && <Box variant="status-success">Recorded mock score for Program {programId}</Box>}
                </SpaceBetween>
            </Container>
        </div>
    )
}
