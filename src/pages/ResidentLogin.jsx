import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import { auth } from '../lib/firebase'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
// after successful sign-in:
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { signOut } from 'firebase/auth'


export default function ResidentLogin() {
    const [form, setForm] = React.useState({ programId:'', email:'', password:'' })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const navigate = useNavigate()
    const onChange = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null); setLoading(true)
        try {
            await signInWithEmailAndPassword(auth, form.email, form.password)
            const profile = await getDoc(doc(db, 'profiles', auth.currentUser.uid))
            if (form.programId && profile.exists() && profile.data().programId !== form.programId.trim().toUpperCase()) {
                await signOut(auth)
                setError('Program ID does not match your account.')
                return
            }
            navigate('/resident/survey', { replace: true })
        } catch (err) {
            setError(prettyFirebase(err))
        } finally { setLoading(false) }
    }

    async function onReset(e) {
        e.preventDefault()
        if (!form.email) return setError('Enter your email above to reset your password.')
        try { await sendPasswordResetEmail(auth, form.email) }
        catch (err) { setError(prettyFirebase(err)) }
    }

    return (
        <AuthCard title="Resident Login" backTo="/">
            {error && <Alert type="error">{error}</Alert>}
            <Form actions={
                <SpaceBetween size="xs" direction="horizontal" className="auth-actions">
                    <Button variant="primary" loading={loading} onClick={onSubmit}>Log In</Button>
                </SpaceBetween>
            }>
                <SpaceBetween size="l">
                    <FormField label="Program ID (optional)">
                        <Input value={form.programId} onChange={onChange('programId')} />
                    </FormField>
                    <FormField label="Email">
                        <Input value={form.email} onChange={onChange('email')} />
                    </FormField>
                    <FormField label="Password">
                        <Input type="password" value={form.password} onChange={onChange('password')} />
                    </FormField>
                    <div className="auth-subtle-link">
                        <a href="#" onClick={onReset}>Forgot password?</a>
                    </div>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}

function prettyFirebase(err) {
    const code = (err?.code || '').replace('auth/', '')
    const map = {
        'invalid-email': 'That email looks invalid.',
        'user-disabled': 'This account is disabled.',
        'user-not-found': 'No user found with that email.',
        'wrong-password': 'Incorrect password.',
        'too-many-requests': 'Too many attempts—try again later.',
    }
    return map[code] || 'Sign-in failed. Please try again.'
}
