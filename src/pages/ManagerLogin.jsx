import React from 'react'
import { Button, Form, FormField, Input, SpaceBetween } from '@cloudscape-design/components'
import AuthCard from '../components/AuthCard'

export default function ManagerLogin() {
    const [form, setForm] = React.useState({ programId:'', password:'' })
    const onChange = key => e => setForm({ ...form, [key]: e.detail.value })

    return (
        <AuthCard title="Director Login" backTo="/">
            <Form
                actions={
                    <SpaceBetween size="xs" direction="horizontal" className="auth-actions">
                        <Button href="/manager/dashboard" variant="primary">Sign In</Button>
                    </SpaceBetween>
                }
            >
                <SpaceBetween size="l">
                    <FormField label="Program ID">
                        <Input value={form.programId} onChange={onChange('programId')} />
                    </FormField>
                    <FormField label="Password">
                        <Input type="password" value={form.password} onChange={onChange('password')} />
                    </FormField>
                </SpaceBetween>
            </Form>
            <div className="auth-subtle-link">
                <a href="#" onClick={e => e.preventDefault()}>Forgot password?</a>
            </div>
        </AuthCard>
    )
}
