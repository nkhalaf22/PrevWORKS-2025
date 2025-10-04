import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert, StatusIndicator, Box } from '@cloudscape-design/components'
import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'
import { registerProgram } from '../lib/api'

export default function ProgramRegister() {
    const [form, setForm] = React.useState({
        name:'', location:'', programUsername:'', managerEmail:'', password:'', confirm:''
    })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [programId, setProgramId] = React.useState(null)

    const on = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)

        // simple client-side validation
        if (!form.name.trim() || !form.location.trim()) return setError('Program name and location are required.')
        if (!form.programUsername.trim()) return setError('Program username is required.')
        if (!form.managerEmail.trim()) return setError('Manager email is required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirm) return setError('Passwords do not match.')

        setLoading(true)
        try {
            const { programId } = await registerProgram({
                name: form.name.trim(),
                location: form.location.trim(),
                programUsername: form.programUsername.trim(),
                managerEmail: form.managerEmail.trim().toLowerCase(),
                password: form.password
            })
            setProgramId(programId)
        } catch (err) {
            setError(err?.message || 'Could not register program.')
        } finally { setLoading(false) }
    }

    async function copyId() {
        if (!programId) return
        try { await navigator.clipboard.writeText(programId) } catch {}
    }

    return (
        <AuthCard title="Register Residency Program" backTo="/">
            {error && <Alert type="error">{error}</Alert>}
            <Form actions={
                <SpaceBetween size="xs" direction="horizontal" className="auth-actions">
                    <Button variant="primary" loading={loading} onClick={onSubmit}>Create Program</Button>
                </SpaceBetween>
            }>
                <SpaceBetween size="l">
                    <FormField label="Program name *"><Input value={form.name} onChange={on('name')}/></FormField>
                    <FormField label="Location *"><Input value={form.location} onChange={on('location')}/></FormField>
                    <FormField label="Program username *" description="Shown to residents; not for login.">
                        <Input value={form.programUsername} onChange={on('programUsername')}/>
                    </FormField>
                    <FormField label="Manager email *">
                        <Input value={form.managerEmail} onChange={on('managerEmail')} autoComplete="email"/>
                    </FormField>

                    <PasswordField label="Password *" value={form.password} onChange={on('password')}
                                   autoComplete="new-password"/>
                    <PasswordField label="Confirm password *" value={form.confirm} onChange={on('confirm')}
                                   autoComplete="new-password"/>

                    {programId && (
                        <>
                            <StatusIndicator type="success">
                                Program created — Program ID:&nbsp;<strong>{programId}</strong>
                            </StatusIndicator>
                            <div style={{display: 'flex', gap: 8}}>
                                <Button onClick={copyId} iconName="copy">Copy ID</Button>
                                <Box variant="p" color="text-body-secondary">
                                    Share this Program ID with residents for sign-up.
                                </Box>
                            </div>
                        </>
                    )}
                    <div className="auth-subtle-link">
                        Not a new manager? <Link to="/manager/login">Log in</Link>
                    </div>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}
