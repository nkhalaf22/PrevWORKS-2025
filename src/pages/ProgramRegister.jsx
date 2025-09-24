import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween, Box, StatusIndicator } from '@cloudscape-design/components'
import { registerProgram } from '../lib/mock-db'
import AuthCard from '../components/AuthCard'

export default function ProgramRegister() {
    const [form, setForm] = React.useState({ name:'', location:'', username:'', password:'' })
    const [programId, setProgramId] = React.useState(null)
    const onChange = key => e => setForm({ ...form, [key]: e.detail.value })

    function onSubmit(e) {
        e?.preventDefault()
        const id = registerProgram({ name: form.name, location: form.location, username: form.username })
        setProgramId(id)
    }

    return (
        <AuthCard title="Register Residency Program" backTo="/">
            <Form
                actions={<Button variant="primary" onClick={onSubmit}>Create Program</Button>}
            >
                <SpaceBetween size="l">
                    <FormField label="Program Name"><Input value={form.name} onChange={onChange('name')} /></FormField>
                    <FormField label="Location"><Input value={form.location} onChange={onChange('location')} /></FormField>
                    <FormField label="Program Username"><Input value={form.username} onChange={onChange('username')} /></FormField>
                    <FormField label="Program Password (mock)"><Input type="password" value={form.password} onChange={onChange('password')} /></FormField>
                    {programId &&
                        <StatusIndicator type="success">
                            Program created — Program ID: <strong>{programId}</strong>
                        </StatusIndicator>
                    }
                    <Box variant="p" color="text-body-secondary">
                        Share the Program ID with residents for sign-up.
                    </Box>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}
