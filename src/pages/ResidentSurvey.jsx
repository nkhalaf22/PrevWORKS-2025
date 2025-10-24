import React from 'react'
import { Box, Button, Container, FormField, Header, SpaceBetween } from '@cloudscape-design/components'
import BackLink from '../components/BackLink'
import Brand from '../components/Brand'
import styles from './ResidentSurvey.module.css'
import {submitResidentWho5} from "../lib/surveys.js";
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
    'I have felt cheerful and in good spirits',
    'I have felt calm and relaxed',
    'I have felt active and vigorous',
    'I woke up feeling fresh and rested',
    'My daily life has been filled with things that interest me'
]

// Left → right (5 → 0)
const SCALE = [
    { label: 'All of the time', value: 5 },
    { label: 'Most of the time', value: 4 },
    { label: 'More than half of the time', value: 3 },
    { label: 'Less than half of the time', value: 2 },
    { label: 'Some of the time', value: 1 },
    { label: 'At no time', value: 0 }
]

export default function ResidentSurvey() {
    const [answers, setAnswers] = React.useState(Array(5).fill(null))
    const [submitted, setSubmitted] = React.useState(false)
    const navigate = useNavigate()

    const raw = answers.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
    const canSubmit = answers.every(v => typeof v === 'number')

    const setAnswer = (idx, value) => {
        const next = answers.slice()
        next[idx] = value
        setAnswers(next)
        setSubmitted(false)
    }

    const submit = async () => {
        if (!canSubmit) return
        await submitResidentWho5({
            q1: answers[0], q2: answers[1], q3: answers[2], q4: answers[3], q5: answers[4]
        })
        setSubmitted(true)
        navigate('/resident/dashboard', {replace: true})
    }

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <BackLink label="Back to resident home" to="/resident/dashboard" />

                <Container
                    header={
                        <Header variant="h1">
                            <div className={styles.brandTitle}>
                                <Brand size="lg" center={false} />
                                <span className={styles.titleText}>Resident Survey (WHO-5)</span>
                            </div>
                        </Header>
                    }
                >
                    <SpaceBetween size="m">
                        {/* Matrix */}
                        <div className={styles.whoMatrix} role="table" aria-label="WHO-5 Well-Being Index">

                            {/* Header: index | question | scale headers (wrapping) */}
                            <div className={`${styles.whoRow} ${styles.whoHead}`} role="row">
                                <div className={`${styles.whoCell} ${styles.whoIdx}`} role="columnheader">#</div>
                                <div className={`${styles.whoCell} ${styles.whoQuestionH}`} role="columnheader">WHO-5 Well-Being Index</div>

                                <div className={`${styles.whoCell} ${styles.scaleHead}`} role="columnheader">
                                    {SCALE.map(s => (
                                        <div className={styles.scaleHeadCell} key={s.value}>
                                            <div className={styles.whoHdrLabel}>{s.label}</div>
                                            <div className={styles.whoHdrNum}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Question rows */}
                            {QUESTIONS.map((q, i) => (
                                <div className={styles.whoRow} role="row" key={i}>
                                    <div className={`${styles.whoCell} ${styles.whoIdx}`} role="cell">{i + 1}</div>
                                    <div className={`${styles.whoCell} ${styles.whoQuestion}`} role="cell">{q}</div>

                                    <div className={`${styles.whoCell} ${styles.scaleRow}`} role="cell">
                                        {SCALE.map(s => (
                                            <label className={styles.scaleChoice} key={s.value}>
                                                <input
                                                    type="radio"
                                                    name={`q${i}`}
                                                    value={s.value}
                                                    checked={answers[i] === s.value}
                                                    onChange={() => setAnswer(i, s.value)}
                                                />
                                                <span className={styles.scaleNum}>{s.value}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className={styles.whoActions}>
                            <div className={styles.whoScore}>Raw WHO-5 score: <strong>{raw}</strong> / 25</div>
                            <Button variant="primary" disabled={!canSubmit} onClick={submit}>Submit (mock)</Button>
                        </div>

                        <Box variant="p" color="text-body-secondary">Responses are anonymous.</Box>
                        {submitted && <Box variant="status-success">Recorded score for Program</Box>}
                    </SpaceBetween>
                </Container>
            </div>
        </div>
    )
}
