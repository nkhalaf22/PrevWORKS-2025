import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import { loginManager } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function ManagerLogin() {
    const [form, setForm] = React.useState({ username:'', email:'' })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const navigate = useNavigate()
    const on = k => e => setForm({ ...form, [k]: e.detail.value })

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)
        if (!form.password.trim()) return setError('Password is required.')
        if (!isEmail(form.email))   return setError('Enter a valid email address.')

        setLoading(true)
        try {
            const res = await loginManager({email: form.email.trim().toLowerCase(), password: form.password.trim() })
            console.log(res)
            if (res?.ok) navigate('/manager/dashboard', { replace: true })
            else throw new Error('Login failed.')
        } catch (err) {
            setError(err?.message || 'Login failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCard title="Director / Manager Login" backTo="/">
            {error && <Alert type="error">{error}</Alert>}
            <Form actions={
                <SpaceBetween size="xs" direction="horizontal" className="auth-actions">
                    <Button variant="primary" loading={loading} onClick={onSubmit}>Continue</Button>
                </SpaceBetween>
            }>
                <SpaceBetween size="l">
                    <FormField label="Email">
                        <Input value={form.email} onChange={on('email')} autoComplete="email" />
                    </FormField>
                    <FormField label="Password">
                        <Input value={form.password} onChange={on('password')} autoComplete="current-password" type="password" />
                    </FormField>
                    <div className="auth-subtle-link">
                        New program or manager? <Link to="/program/register">Create your program/manager</Link>
                    </div>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}
