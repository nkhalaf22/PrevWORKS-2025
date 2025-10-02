import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import { auth, db } from '../lib/firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate, Link } from 'react-router-dom'

export default function ResidentRegister() {
    const [form, setForm] = React.useState({ programId:'', username:'', email:'', password:'', confirm:'' })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const navigate = useNavigate()
    const onChange = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)

        const pid = form.programId.trim().toUpperCase()
        if (!pid) return setError('Program ID is required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirm) return setError('Passwords do not match.')

        setLoading(true)
        try {
            // Validate program ID exists
            const progSnap = await getDoc(doc(db, 'programs', pid))
            if (!progSnap.exists()) throw new Error('Invalid Program ID.')

            // Create resident account
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
            if (form.username.trim()) await updateProfile(cred.user, { displayName: form.username.trim() })

            // Store profile
            await setDoc(doc(db, 'profiles', cred.user.uid), {
                role: 'resident',
                programId: pid,
                username: form.username.trim() || null,
                email: form.email.toLowerCase(),
                createdAt: serverTimestamp(),
            })

            navigate('/resident/survey', { replace: true })
        } catch (err) {
            setError(pretty(err))
        } finally { setLoading(false) }
    }

    return (
        <AuthCard title="Resident Registration" backTo="/resident/login">
            {error && <Alert type="error">{error}</Alert>}
            <Form actions={<Button variant="primary" loading={loading} onClick={onSubmit}>Create Account</Button>}>
                <SpaceBetween size="l">
                    <FormField label="Program ID *"><Input value={form.programId} onChange={onChange('programId')} /></FormField>
                    <FormField label="Username (optional)"><Input value={form.username} onChange={onChange('username')} /></FormField>
                    <FormField label="Email"><Input value={form.email} onChange={onChange('email')} /></FormField>
                    <FormField label="Password"><Input type="password" value={form.password} onChange={onChange('password')} /></FormField>
                    <FormField label="Confirm password"><Input type="password" value={form.confirm} onChange={onChange('confirm')} /></FormField>
                    <div className="auth-subtle-link">Already have an account? <Link to="/resident/login">Log in</Link></div>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}

function pretty(err) {
    const code = (err?.code || '').replace('auth/', '')
    const map = {
        'email-already-in-use': 'An account already exists with that email.',
        'invalid-email': 'That email looks invalid.',
        'weak-password': 'Password is too weak.'
    }
    return map[code] || err?.message || 'Sign-up failed. Please try again.'
}
