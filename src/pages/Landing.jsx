// src/pages/Landing.jsx
import React from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
    Box, Button, Container, Header, SpaceBetween, ColumnLayout, Link, Alert
} from '@cloudscape-design/components'
import Brand from '../components/Brand'
import heroImg from '../assets/hero-wellness.jpg' // replace with your image
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

// Use shared Firebase instance so initializeApp has run

export default function Landing() {
    const navigate = useNavigate()
    const [user, setUser] = React.useState(null)
    const [role, setRole] = React.useState(null) // 'manager' | 'resident' | null
    const [loadingRole, setLoadingRole] = React.useState(true)

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u || null)
            setRole(null)
            setLoadingRole(true)
            try {
                if (!u) return
                // Detect role by existence of a profile doc
                const mgrSnap = await getDoc(doc(db, 'manager_info', u.uid))
                if (mgrSnap.exists()) { setRole('manager'); return }
                const resSnap = await getDoc(doc(db, 'resident_info', u.uid))
                if (resSnap.exists()) { setRole('resident'); return }
            } finally {
                setLoadingRole(false)
            }
        })
        return () => unsub && unsub()
    }, [])

    const handleGoToPortal = () => {
        if (role === 'manager') navigate('/dashboard')
        else if (role === 'resident') navigate('/resident/dashboard')
        else navigate('/auth/choose')
    }

    const handleSignOut = async () => {
        await signOut(auth)
        navigate('/')
    }

    const handleRoleLogin = async (target) => {
        // If already signed in and switching roles, sign out first
        if (user) {
            try { await signOut(auth) } catch {}
        }
        if (target === 'resident') navigate('/resident/login')
        else if (target === 'manager') navigate('/manager/login')
    }

    return (
        <div className="landing-min">
            {/* Top bar (brand + quick portal buttons) */}
            <div className="landing-min__nav">
                <div className="landing-min__brand">
                    <Brand size="lg" center={false} />
                </div>
                <div className="landing-min__nav-actions">
                    {!user && (
                        <>
                            <Button onClick={() => navigate('/resident/login')} variant="primary">Resident Portal</Button>
                            <Button onClick={() => navigate('/manager/login')}>Program Portal</Button>
                        </>
                    )}
                    {user && (
                        <>
                            <Button variant="primary" onClick={handleGoToPortal}>
                                {loadingRole ? 'Go to Portal' : role === 'manager' ? 'Go to Manager Dashboard' : role === 'resident' ? 'Go to Resident Dashboard' : 'Choose Portal'}
                            </Button>
                            <Button onClick={handleSignOut}>Sign out</Button>
                        </>
                    )}
                </div>
            </div>

            {user && (
                <div style={{ margin: '12px 0' }}>
                    <Alert type="success">
                        Signed in as <strong>{user.email || user.uid}</strong>
                        {loadingRole ? '' : role ? ` · Role: ${role}` : ' · Role: not set'}
                    </Alert>
                </div>
            )}

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

                        {/* Big split CTAs (hide login/register if already signed in) */}
                        <div className="landing-cta-grid">
                            <div className="landing-cta">
                                <Box variant="strong" fontSize="heading-s">For Residents</Box>
                                <Box variant="p" color="text-body-secondary">
                                    Register with your Program ID, take quick WHO-5 check-ins, and see your own trend over time.
                                </Box>
                                {!user ? (
                                    <div className="landing-cta__buttons">
                                        <Button variant="primary" onClick={() => navigate('/resident/register')}>
                                            Get started — Residents
                                        </Button>
                                        <Box>
                                            Already a member?{' '}
                                            <Link onFollow={e => { e.preventDefault(); navigate('/resident/login') }}>Log in</Link>
                                        </Box>
                                    </div>
                                ) : (
                                    <div className="landing-cta__buttons">
                                        {role === 'resident' ? (
                                            <Button variant="primary" onClick={() => navigate('/resident/dashboard')}>
                                                Go to your dashboard
                                            </Button>
                                        ) : (
                                            <Button variant="primary" onClick={() => handleRoleLogin('resident')}>
                                                Log in as Resident
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="landing-cta">
                                <Box variant="strong" fontSize="heading-s">For Program Managers</Box>
                                <Box variant="p" color="text-body-secondary">
                                    Create your program, share the Program ID, view weekly anonymized averages, and compare with CG-CAHPS.
                                </Box>
                                {!user ? (
                                    <div className="landing-cta__buttons">
                                        <Button onClick={() => navigate('/program/register')}>
                                            Get started — Managers
                                        </Button>
                                        <Box>
                                            Already a member?{' '}
                                            <Link onFollow={e => { e.preventDefault(); navigate('/manager/login') }}>Log in</Link>
                                        </Box>
                                    </div>
                                ) : (
                                    <div className="landing-cta__buttons">
                                        {role === 'manager' ? (
                                            <Button variant="primary" onClick={() => navigate('/dashboard')}>
                                                Go to your dashboard
                                            </Button>
                                        ) : (
                                            <Button variant="primary" onClick={() => handleRoleLogin('manager')}>
                                                Log in as Program Manager
                                            </Button>
                                        )}
                                    </div>
                                )}
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
