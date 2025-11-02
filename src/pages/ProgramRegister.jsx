import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Alert, StatusIndicator, Box, Select } from '@cloudscape-design/components'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'
import { registerProgram, programRegistered } from '../lib/api'

export default function ProgramRegister() {
    const [form, setForm] = React.useState({
        name:'', city:'', state:'', departments:[], managerFirstName:'', managerLastName:'', managerEmail:'', password:'', confirm:''
    })
    const [deptInput, setDeptInput] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [programId, setProgramId] = React.useState(null)
    const [mode, setMode] = React.useState('new') // 'new' or 'existing'
    const [existingId, setExistingId] = React.useState('')
    const [existingData, setExistingData] = React.useState(null)
    const [lookupLoading, setLookupLoading] = React.useState(false)
    const [lookupError, setLookupError] = React.useState(null)
    const navigate = useNavigate()

    // robust onChange handler: Cloudscape Select uses e.detail.selectedOption, Inputs use e.detail.value
    const on = k => e => {
        const v = e?.detail?.value ?? e?.detail?.selectedOption?.value ?? (Array.isArray(e?.detail?.selected) && e.detail.selected[0]?.value) ?? e?.target?.value ?? ''
        setForm({ ...form, [k]: v })
    }

    const STATE_OPTIONS = [
        { label: 'Alabama', value: 'AL' },{ label: 'Alaska', value: 'AK' },{ label: 'Arizona', value: 'AZ' },{ label: 'Arkansas', value: 'AR' },
        { label: 'California', value: 'CA' },{ label: 'Colorado', value: 'CO' },{ label: 'Connecticut', value: 'CT' },{ label: 'Delaware', value: 'DE' },
        { label: 'District of Columbia', value: 'DC' },{ label: 'Florida', value: 'FL' },{ label: 'Georgia', value: 'GA' },{ label: 'Hawaii', value: 'HI' },
        { label: 'Idaho', value: 'ID' },{ label: 'Illinois', value: 'IL' },{ label: 'Indiana', value: 'IN' },{ label: 'Iowa', value: 'IA' },
        { label: 'Kansas', value: 'KS' },{ label: 'Kentucky', value: 'KY' },{ label: 'Louisiana', value: 'LA' },{ label: 'Maine', value: 'ME' },
        { label: 'Maryland', value: 'MD' },{ label: 'Massachusetts', value: 'MA' },{ label: 'Michigan', value: 'MI' },{ label: 'Minnesota', value: 'MN' },
        { label: 'Mississippi', value: 'MS' },{ label: 'Missouri', value: 'MO' },{ label: 'Montana', value: 'MT' },{ label: 'Nebraska', value: 'NE' },
        { label: 'Nevada', value: 'NV' },{ label: 'New Hampshire', value: 'NH' },{ label: 'New Jersey', value: 'NJ' },{ label: 'New Mexico', value: 'NM' },
        { label: 'New York', value: 'NY' },{ label: 'North Carolina', value: 'NC' },{ label: 'North Dakota', value: 'ND' },{ label: 'Ohio', value: 'OH' },
        { label: 'Oklahoma', value: 'OK' },{ label: 'Oregon', value: 'OR' },{ label: 'Pennsylvania', value: 'PA' },{ label: 'Rhode Island', value: 'RI' },
        { label: 'South Carolina', value: 'SC' },{ label: 'South Dakota', value: 'SD' },{ label: 'Tennessee', value: 'TN' },{ label: 'Texas', value: 'TX' },
        { label: 'Utah', value: 'UT' },{ label: 'Vermont', value: 'VT' },{ label: 'Virginia', value: 'VA' },{ label: 'Washington', value: 'WA' },
        { label: 'West Virginia', value: 'WV' },{ label: 'Wisconsin', value: 'WI' },{ label: 'Wyoming', value: 'WY' }
    ]

    function addDepartment() {
        const v = (deptInput || '').trim()
        if (!v) return
        setForm(cur => {
            if (cur.departments.includes(v)) return cur
            return { ...cur, departments: [...cur.departments, v] }
        })
        setDeptInput('')
    }

    function removeDepartment(value) {
        setForm(cur => ({ ...cur, departments: cur.departments.filter(d => d !== value) }))
    }

    async function onSubmit(e) {
        e?.preventDefault()
        setError(null)
        // if registering for an existing program, require that we fetched the program data
        if (mode === 'existing') {
            if (!existingData) return setError('Please enter a valid Program ID and confirm it.')
        }

        // simple client-side validation
        // If new program, require program fields; if existing, hospital fields come from existingData
        if (mode === 'new' && (!form.name.trim() || !form.city.trim() || !form.state.trim())) return setError('Program name, city, and state are required.')
        if (!form.managerFirstName.trim()) return setError('Manager first name is required.')
        if (!form.managerLastName.trim()) return setError('Manager last name is required.')
        if (!form.managerEmail.trim()) return setError('Manager email is required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirm) return setError('Passwords do not match.')
        if (mode === 'new' && form.departments.length === 0) return setError('At least one department is required.')

        setLoading(true)
        try {
            // If existing, copy the hospital/program fields from existingData
            const payload = mode === 'existing' && existingData ? {
                name: existingData.hospital_name || form.name.trim(),
                city: existingData.hospital_city || form.city.trim(),
                state: existingData.hospital_state || form.state.trim(),
                departments: Array.isArray(existingData.departments) ? existingData.departments : form.departments,
                managerFirstName: form.managerFirstName.trim(),
                managerLastName: form.managerLastName.trim(),
                managerEmail: form.managerEmail.trim().toLowerCase(),
                password: form.password,
                programId: (existingId || '').trim().toUpperCase()
            } : {
                name: form.name.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                departments: form.departments,
                managerFirstName: form.managerFirstName.trim(),
                managerLastName: form.managerLastName.trim(),
                managerEmail: form.managerEmail.trim().toLowerCase(),
                password: form.password,
                programId: 'PW-' + Math.random().toString(36).slice(2, 8).toUpperCase()
            }

            const { programId } = await registerProgram(payload)
            setProgramId(programId)
        } catch (err) {
            setError(err?.message || 'Could not register program.')
        } finally { setLoading(false) }
    }

    async function checkExistingProgram() {
        const pid = (existingId || '').trim().toUpperCase()
        setLookupError(null)
        setExistingData(null)
        if (!pid) return setLookupError('Program ID is required.')
        setLookupLoading(true)
        try {
            const data = await programRegistered(pid)
            if (!data || Object.keys(data).length === 0) {
                setLookupError('Program not found.')
            } else {
                setExistingData(data)
                // populate visible form fields with fetched data (optional)
                setForm(cur => ({ ...cur, name: data.hospital_name || cur.name, city: data.hospital_city || cur.city, state: data.hospital_state || cur.state, departments: Array.isArray(data.departments) ? data.departments : cur.departments }))
            }
        } catch (err) {
            setLookupError('Lookup failed. Try again.')
        } finally { setLookupLoading(false) }
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
                    {programId ? (
                        <div style={{display: 'flex', gap: 8}}>
                            <Button variant="primary" onClick={() => navigate('/manager/dashboard', { replace: true })}>
                                Go to dashboard
                            </Button>
                            <Button
                                variant="primary"
                                loading={loading}
                                onClick={onSubmit}
                                disabled={!!programId}
                                aria-disabled={!!programId}
                            >
                                    {mode === 'existing' ? 'Manager Registered' : 'Program Created'}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            loading={loading}
                            onClick={onSubmit}
                        >
                            {mode === 'existing' ? 'Register Manager' : 'Create Program'}
                        </Button>
                    )}
                </SpaceBetween>
            }>
                <SpaceBetween size="l">
                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                        <Button variant={mode === 'new' ? 'primary' : 'normal'} onClick={() => { setMode('new'); setExistingData(null); setExistingId(''); setLookupError(null) }}>Register new program</Button>
                        <Button variant={mode === 'existing' ? 'primary' : 'normal'} onClick={() => { setMode('existing'); setProgramId(null); setError(null) }}>Register for existing program</Button>
                    </div>

                    {mode === 'existing' && (
                        <>
                            <FormField label="Program ID to join">
                                <div style={{display: 'flex', gap: 8}}>
                                    <Input value={existingId} onChange={e => { setLookupError(null); setExistingId(e?.detail?.value ?? e?.target?.value ?? '') }} placeholder="PW-ABC123" />
                                    <Button variant="primary" loading={lookupLoading} onClick={checkExistingProgram}>Check</Button>
                                </div>
                                {lookupError && <div style={{color: '#b3261e', marginTop: 8}}>{lookupError}</div>}
                            </FormField>
                            {existingData && (
                                <Box variant="p" color="text-body-secondary">Found program: <strong>{existingData.hospital_name}</strong> — {existingData.hospital_city}, {existingData.hospital_state}</Box>
                            )}
                        </>
                    )}

                    {mode === 'new' && (
                        <FormField label="Hospital Name *"><Input value={form.name} onChange={on('name')}/></FormField>
                    )}
                    {mode === 'new' && (
                        <>
                            <FormField label="Hospital City *"><Input value={form.city} onChange={on('city')}/></FormField>
                            <FormField label="Hospital State *">
                                <Select
                                    options={STATE_OPTIONS}
                                    selectedOption={STATE_OPTIONS.find(o => o.value === form.state) || null}
                                    onChange={on('state')}
                                    placeholder="Select state"
                                />
                            </FormField>
                        </>
                    )}
                    {mode === 'new' && (
                        <FormField label="Hospital Departments (add your own) *">
                        <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
                            <Input placeholder="e.g. Emergency / ER" value={deptInput} onChange={e => setDeptInput(e?.detail?.value ?? e?.target?.value ?? '')} />
                            <Button variant="primary" onClick={addDepartment}>Add</Button>
                        </div>
                        {form.departments.length > 0 && (
                            <div style={{marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                                {form.departments.map(d => (
                                    <div key={d} style={{display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 16, background: '#f3f4f6', border: '1px solid #e5e7eb'}}>
                                        <span>{d}</span>
                                        <button type="button" onClick={() => removeDepartment(d)} aria-label={`Remove ${d}`} style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        </FormField>
                    )}
                    <FormField label="Manager First Name *"><Input value={form.managerFirstName} onChange={on('managerFirstName')}/></FormField>
                    <FormField label="Manager Last Name *"><Input value={form.managerLastName} onChange={on('managerLastName')}/></FormField>
                    <FormField label="Manager Email *">
                        <Input value={form.managerEmail} onChange={on('managerEmail')} autoComplete="email"/>
                    </FormField>

                    <PasswordField label="Password *" value={form.password} onChange={on('password')}
                                   autoComplete="new-password"/>
                    <PasswordField label="Confirm password *" value={form.confirm} onChange={on('confirm')}
                                   autoComplete="new-password"/>

                    {programId && (
                        <>
                            <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 12}}>
                                <StatusIndicator type="success">
                                    {mode === 'existing' ? (
                                        <>Program Details — Program ID:&nbsp;<strong>{programId}</strong></>
                                    ) : (
                                        <>Program Created — Program ID:&nbsp;<strong>{programId}</strong></>
                                    )}
                                </StatusIndicator>
                            </div>
                            <div style={{display: 'flex', gap: 8, marginTop: 8, alignItems: 'center'}}>
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
