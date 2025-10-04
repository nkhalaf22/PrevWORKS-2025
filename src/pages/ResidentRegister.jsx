import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'
import { registerResident } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

export default function ResidentRegister() {
    const [form, setForm] = React.useState({ programId:'', username:'', password:'', confirm:'' })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [done, setDone] = React.useState(false)
    const navigate = useNavigate()

    const on = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)

        const pid = form.programId.trim().toUpperCase()
        if (!pid) return setError('Program ID is required.')
        if (!form.username.trim()) return setError('Username is required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirm) return setError('Passwords do not match.')

        setLoading(true)
        try {
            await registerResident({
                programId: pid,
                username: form.username.trim(),
                password: form.password
            })
            setDone(true)
            // if you want to push them to login immediately:
            // navigate('/resident/login', { replace: true })
        } catch (err) {
            setError(err?.message || 'Could not create account.')
        } finally { setLoading(false) }
    }

    return (
        <AuthCard title="Resident Registration" backTo="/">
            {error && <Alert type="error">{error}</Alert>}
            {done && (
                <Alert type="success" header="Account created">
                    You can now log in with your credentials.
                </Alert>
            )}

            <Form actions={<Button variant="primary" loading={loading} onClick={onSubmit}>Create Account</Button>}>
                <SpaceBetween size="l">
                    <FormField label="Program ID *" description="Provided by your program director.">
                        <Input value={form.programId} onChange={on('programId')} placeholder="PW-ABC123" />
                    </FormField>
                    <FormField label="Username *">
                        <Input value={form.username} onChange={on('username')} autoComplete="username" />
                    </FormField>
                    <PasswordField label="Password *" value={form.password} onChange={on('password')} autoComplete="new-password" />
                    <PasswordField label="Confirm password *" value={form.confirm} onChange={on('confirm')} autoComplete="new-password" />

                    <div className="auth-subtle-link">
                        Already have an account? <Link to="/resident/login">Log in</Link>
                    </div>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}
