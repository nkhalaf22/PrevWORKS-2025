import React from 'react'
import { Button, Container, Form, FormField, Header, RadioGroup, SpaceBetween, Box } from '@cloudscape-design/components'
import { addWellnessScore } from '../lib/mock-db'
import BackLink from '../components/BackLink'
import Brand from '../components/Brand'

const QUESTIONS = [
    'I have felt cheerful and in good spirits',
    'I have felt calm and relaxed',
    'I have felt active and vigorous',
    'I woke up feeling fresh and rested',
    'My daily life has been filled with things that interest me'
]

const OPTIONS = [
    { value: '0', label: 'At no time' },
    { value: '1', label: 'Some of the time' },
    { value: '2', label: 'Less than half the time' },
    { value: '3', label: 'More than half the time' },
    { value: '4', label: 'Most of the time' },
    { value: '5', label: 'All of the time' },
]

export default function ResidentSurvey() {
    const [programId, setProgramId] = React.useState('')
    const [answers, setAnswers] = React.useState(Array(5).fill(''))
    const [submitted, setSubmitted] = React.useState(false)
    const [raw, setRaw] = React.useState(0)

    function setAnswer(idx, value) {
        const next = answers.slice()
        next[idx] = value
        setAnswers(next)
    }

    function submit() {
        const complete = answers.every(v => v !== '') && programId
        if (!complete) return
        const score = answers.reduce((sum, v) => sum + Number(v), 0) // 0..25
        setRaw(score)
        addWellnessScore({ programId, score })
        setSubmitted(true)
    }

    return (
        <div className="page-content">
            <BackLink label="Back to resident home" to="/resident/login" />
            <Container header={<Header variant="h1"><Brand size="lg" center={false} /> Resident Survey (WHO-5)</Header>}>
                <SpaceBetween size="l">
                    <FormField label="Program ID">
                        <input
                            className="cloudscape-input"
                            placeholder="Enter your Program ID"
                            value={programId}
                            onChange={e => setProgramId(e.target.value)}
                        />
                    </FormField>

                    {QUESTIONS.map((q, i) => (
                        <FormField key={i} label={`${i+1}. ${q}`}>
                            <RadioGroup
                                value={answers[i]}
                                onChange={e => setAnswer(i, e.detail.value)}
                                items={OPTIONS}
                            />
                        </FormField>
                    ))}

                    <Form actions={<Button variant="primary" onClick={submit}>Submit (mock)</Button>} />

                    {submitted && (
                        <Box variant="h3">Raw WHO-5 score: <strong>{raw}</strong> (0–25)</Box>
                    )}
                    <Box variant="p">Responses are anonymous.</Box>
                </SpaceBetween>
            </Container>
        </div>
    )
}
