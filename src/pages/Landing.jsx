// src/pages/Landing.jsx
import React from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
    Box, Button, Container, Header, SpaceBetween, ColumnLayout, Link
} from '@cloudscape-design/components'
import Brand from '../components/Brand'
import heroImg from '../assets/hero-wellness.jpg' // replace with your image

export default function Landing() {
    const navigate = useNavigate()

    return (
        <div className="landing-min">
            {/* Top bar (brand + quick portal buttons) */}
            <div className="landing-min__nav">
                <RouterLink to="/" className="landing-min__brand">
                    <Brand size="lg" center={false} />
                </RouterLink>
                <div className="landing-min__nav-actions">
                    <Button onClick={() => navigate('/resident/login')} variant="primary">Resident Portal</Button>
                    <Button onClick={() => navigate('/manager/login')}>Program Portal</Button>
                </div>
            </div>

            {/* Hero: text left, image right */}
            <Container
                       header={<Header variant="h1">Innovative tools for residency wellness</Header>}
            >
                <div className="landing-hero">
                    <div className="landing-hero__copy">
                        <Box variant="p" color="text-body-secondary" fontSize="body-l">
                            PrevWORKS helps programs monitor well-being, spot trends, and take action—while preserving privacy
                            with anonymized reporting.
                        </Box>

                        {/* Big split CTAs */}
                        <div className="landing-cta-grid">
                            <div className="landing-cta">
                                <Box variant="strong" fontSize="heading-s">For Residents</Box>
                                <Box variant="p" color="text-body-secondary">
                                    Register with your Program ID, take quick WHO-5 check-ins, and see your own trend over time.
                                </Box>
                                <div className="landing-cta__buttons">
                                    <Button variant="primary" onClick={() => navigate('/resident/register')}>
                                        Get started — Residents
                                    </Button>
                                    <Box>
                                        Already a member?{' '}
                                        <Link onFollow={e => { e.preventDefault(); navigate('/resident/login') }}>Log in</Link>
                                    </Box>
                                </div>
                            </div>

                            <div className="landing-cta">
                                <Box variant="strong" fontSize="heading-s">For Program Managers</Box>
                                <Box variant="p" color="text-body-secondary">
                                    Create your program, share the Program ID, view weekly anonymized averages, and compare with CG-CAHPS.
                                </Box>
                                <div className="landing-cta__buttons">
                                    <Button onClick={() => navigate('/program/register')}>
                                        Get started — Managers
                                    </Button>
                                    <Box>
                                        Already a member?{' '}
                                        <Link onFollow={e => { e.preventDefault(); navigate('/manager/login') }}>Log in</Link>
                                    </Box>
                                </div>
                            </div>
                        </div>

                        <Box color="text-status-success" variant="p" margin={{ top: 's' }}>
                            Privacy note: residents are anonymous in program-level reporting.
                        </Box>
                    </div>

                    <div className="landing-hero__image">
                        <img src={heroImg} alt="Friendly clinician with clipboard" />
                    </div>
                </div>
            </Container>

            {/* Requirements recap as simple cards */}
            <Container header={<Header variant="h2">What you can do with PrevWORKS</Header>}>
                <ColumnLayout columns={3} variant="text-grid" borders="horizontal">
                    <Feature title="Program Registration" points={[
                        'Create a program (name, location, admin credentials).',
                        'Receive a unique Program ID for resident sign-ups.'
                    ]}/>
                    <Feature title="Resident Registration" points={[
                        'Join with Program ID.',
                        'Create login to access surveys & history.'
                    ]}/>
                    <Feature title="WHO-5 Survey" points={[
                        '5 questions (score 0–25), weekly cadence.',
                        'Resident sees personal trend line.'
                    ]}/>
                    <Feature title="Anonymous Database" points={[
                        'Stored as [programId, score, date]—no identity.',
                        'Built for aggregate program insights.'
                    ]}/>
                    <Feature title="Program Dashboard" points={[
                        'View weekly averages by department.',
                        'Upload CG-CAHPS (.csv) to compare.'
                    ]}/>
                    <Feature title="Standardized UI" points={[
                        'Amazon Cloudscape components.',
                        'Cohesive, accessible design.'
                    ]}/>
                </ColumnLayout>
            </Container>
        </div>
    )
}

function Feature({ title, points }) {
    return (
        <SpaceBetween size="s">
            <Box variant="awsui-key-label">{title}</Box>
            <ul className="landing-min__list">
                {points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
        </SpaceBetween>
    )
}
