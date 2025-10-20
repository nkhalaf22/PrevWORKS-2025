import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert, Select } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'
import { registerResident, getDepartments } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

export default function ResidentRegister() {
    const [form, setForm] = React.useState({ programId:'', email:'', firstName:'', lastName:'', password:'', confirm:'', department: '' })
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [done, setDone] = React.useState(false)
    const navigate = useNavigate()

    const on = k => e => setForm({ ...form, [k]: e.detail.value })

    const [deptOptions, setDeptOptions] = React.useState([])
    const [deptLoading, setDeptLoading] = React.useState(false)
    const [programIdError, setProgramIdError] = React.useState(null)

    async function fetchDepartments() {
        const pid = (form.programId || '').trim().toUpperCase()
        if (!pid) return
        setDeptLoading(true)
        try {
            const depts = await getDepartments(pid)
            if (!depts || depts.length === 0) {
                setDeptOptions([])
                setForm(cur => ({ ...cur, department: '' }))
                setProgramIdError('Program ID not found.')
                return
            }
            setDeptOptions((depts || []).map(d => ({ label: d, value: d })))
            setProgramIdError(null)
        } catch (err) {
            console.error('fetchDepartments error', err)
            setDeptOptions([])
            setForm(cur => ({ ...cur, department: '' }))
            setProgramIdError('Failed to fetch departments. Please try again.')
        } finally { setDeptLoading(false) }
    }

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)

        const pid = form.programId.trim().toUpperCase()
        if (!pid) return setError('Program ID is required.')
        if (!form.firstName || !form.firstName.trim()) return setError('First name is required.')
        if (!form.lastName || !form.lastName.trim()) return setError('Last name is required.')
        if (!form.email || !form.email.trim()) return setError('Email is required.')
        if (deptOptions.length === 0) return setError('Program ID Not Found.')
        if (deptOptions.length > 0 && (!form.department || !form.department.trim())) return setError('Please select your department.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirm) return setError('Passwords do not match.')

        setLoading(true)
        try {
            await registerResident({
                programId: pid,
                email: form.email.trim(),
                password: form.password,
                department: form.department,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim()
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
                        <Input value={form.programId} onChange={e => { setProgramIdError(null); on('programId')(e) }} onBlur={fetchDepartments} placeholder="PW-ABC123" />
                        {programIdError && <div style={{color: '#b3261e', marginTop: 8}}>{programIdError}</div>}
                    </FormField>
                    {deptOptions.length > 0 && (
                        <FormField label="Department *">
                            <Select
                                options={deptOptions}
                                selectedOption={deptOptions.find(o => o.value === form.department) || null}
                                onChange={e => setForm({ ...form, department: e.detail.selectedOption.value })}
                                loading={deptLoading}
                                placeholder={deptLoading ? 'Loading departments' : 'Select department'}
                            />
                        </FormField>
                    )}
                    <FormField label="First name *">
                        <Input value={form.firstName} onChange={on('firstName')} autoComplete="given-name" />
                    </FormField>
                    <FormField label="Last name *">
                        <Input value={form.lastName} onChange={on('lastName')} autoComplete="family-name" />
                    </FormField>
                    <FormField label="Email *">
                        <Input value={form.email} onChange={on('email')} autoComplete="email" />
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
