import React from 'react'
import { Container, Header } from '@cloudscape-design/components'
import BackLink from '../components/BackLink'
import Brand from '../components/Brand'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { signInWithGoogle } from '../lib/googleSignIn'   // from earlier; see note below

export default function AuthChoose() {
    const navigate = useNavigate()
    const { search } = useLocation()
    const params = new URLSearchParams(search)

    // Allow reuse for Resident/Manager flows via query params:
    // /auth/choose?emailTo=/resident/login&next=/resident/survey
    const emailTo = params.get('emailTo') || '/resident/login'
    const next    = params.get('next')    || '/resident/survey'

    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)

    async function handleGoogle() {
        setError(null); setLoading(true)
        try {
            const result = await signInWithGoogle()
            if (result) navigate(next, { replace: true }) // popup path
            // redirect path: onAuthStateChanged will fire and you can route globally if desired
        } catch (e) {
            setError('Google sign-in failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-shell">
            <div className="content-wrap">
                <BackLink to="/" />
                <Container className="auth-card auth-choice-card"
                           header={
                               <Header variant="h1">
                                   <div className="brand-title">
                                       <Brand size="lg" center={false} />
                                       <span className="title-text">Choose how to continue</span>
                                   </div>
                               </Header>
                           }
                >
                    {/* Google */}
                    <button className="choice-btn choice-google" onClick={handleGoogle} disabled={loading}>
                        <GoogleG className="g-icon" />
                        <span>Continue with Google</span>
                    </button>

                    {/* Divider */}
                    <div className="choice-divider"><span>OR</span></div>

                    {/* Email */}
                    <Link className="choice-btn choice-email" to={emailTo}>
                        Continue with Email
                    </Link>

                    <div className="choice-footer">
                        <span>Already have an account? </span>
                        <Link to={emailTo} className="choice-login-link">Log in</Link>
                        {error && <div className="choice-error">{error}</div>}
                    </div>
                </Container>
            </div>
        </div>
    )
}

// Inline Google "G" (official colors, scalable)
function GoogleG(props) {
    return (
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden {...props}>
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.927 31.91 29.369 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.31 0 6.32 1.23 8.607 3.243l5.657-5.657C34.938 3.053 29.7 1 24 1 11.85 1 2 10.85 2 23s9.85 22 22 22c12.15 0 22-9.85 22-22 0-1.486-.163-2.936-.389-4.417z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.422 16.016 18.83 13 24 13c3.31 0 6.32 1.23 8.607 3.243l5.657-5.657C34.938 7.053 29.7 5 24 5c-7.509 0-13.912 4.142-17.694 9.691z"/>
            <path fill="#4CAF50" d="M24 45c5.3 0 10.23-2.04 13.93-5.364l-6.437-5.444C29.311 35.861 26.774 37 24 37c-5.342 0-9.88-3.613-11.509-8.533l-6.56 5.053C9.682 40.545 16.316 45 24 45z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.121 3.31-3.575 5.81-6.773 7.05l6.437 5.444C37.164 41.08 41 37.455 41 31c0-1.486-.163-2.936-.389-4.417z"/>
        </svg>
    )
}
