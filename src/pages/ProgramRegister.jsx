import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert, StatusIndicator, Box } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import { auth, db } from '../lib/firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

function genId() {
    const part = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `PW-${part}`
}
async function createUniqueProgramId() {
    for (let i = 0; i < 6; i++) {
        const id = genId()
        const snap = await getDoc(doc(db, 'programs', id))
        if (!snap.exists()) return id
    }
    throw new Error('Could not generate a unique Program ID. Try again.')
}

export default function ProgramRegister() {
    const [form, setForm] = React.useState({ name:'', location:'', email:'', password:'' })
    const [programId, setProgramId] = React.useState(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const navigate = useNavigate()
    const onChange = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)

        if (!form.name.trim() || !form.location.trim()) return setError('Program name and location are required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')

        setLoading(true)
        try {
            // 1) Create manager account (signs them in)
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
            await updateProfile(cred.user, { displayName: form.name + ' (Manager)' })

            // 2) Generate Program ID and create program doc
            const id = await createUniqueProgramId()
            await setDoc(doc(db, 'programs', id), {
                name: form.name.trim(),
                location: form.location.trim(),
                createdBy: cred.user.uid,
                createdAt: serverTimestamp(),
            })

            // 3) Create profile for manager
            await setDoc(doc(db, 'profiles', cred.user.uid), {
                role: 'manager',
                programId: id,
                email: form.email.toLowerCase(),
                displayName: cred.user.displayName || null,
                createdAt: serverTimestamp(),
            })

            setProgramId(id)             // show success w/ ID
            // navigate('/manager/dashboard') // uncomment to auto-forward
        } catch (err) {
            setError(pretty(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCard title="Register Residency Program" backTo="/">
            {error && <Alert type="error">{error}</Alert>}
            <Form actions={<Button variant="primary" loading={loading} onClick={onSubmit}>Create Program & Account</Button>}>
                <SpaceBetween size="l">
                    <FormField label="Program name"><Input value={form.name} onChange={onChange('name')} /></FormField>
                    <FormField label="Location"><Input value={form.location} onChange={onChange('location')} /></FormField>
                    <FormField label="Manager email"><Input value={form.email} onChange={onChange('email')} /></FormField>
                    <FormField label="Password (min 6)"><Input type="password" value={form.password} onChange={onChange('password')} /></FormField>

                    {programId && (
                        <StatusIndicator type="success">
                            Program created. <strong>Program ID: {programId}</strong>
                        </StatusIndicator>
                    )}
                    <Box variant="p" color="text-body-secondary">
                        Share this Program ID with residents so they can register.
                    </Box>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}

function pretty(err) {
    const code = (err?.code || '').replace('auth/', '')
    const map = {
        'email-already-in-use': 'That manager email already has an account.',
        'invalid-email': 'Email looks invalid.',
        'weak-password': 'Password is too weak.',
    }
    return map[code] || err?.message || 'Could not create program.'
}
