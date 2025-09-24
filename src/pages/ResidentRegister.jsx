import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'

export default function ResidentRegister() {
    const [form, setForm] = React.useState({ username:'', programId:'', password:'' })
    const onChange = key => e => setForm({ ...form, [key]: e.detail.value })

    return (
        <AuthCard title="Resident Registration" backTo="/">
            <Form actions={<Button variant="primary">Create Account (mock)</Button>}>
                <SpaceBetween size="l">
                    <FormField label="Program ID"><Input value={form.programId} onChange={onChange('programId')} /></FormField>
                    <FormField label="Username"><Input value={form.username} onChange={onChange('username')} /></FormField>
                    <FormField label="Password"><Input type="password" value={form.password} onChange={onChange('password')} /></FormField>
                </SpaceBetween>
            </Form>
        </AuthCard>
    )
}
