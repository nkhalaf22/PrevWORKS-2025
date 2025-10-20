import React from 'react'
import { FormField, Input, Button } from '@cloudscape-design/components'

export default function PasswordField({ label = 'Password', value, onChange, description, autoComplete, testId }) {
    const [show, setShow] = React.useState(false)
    return (
        <FormField label={label} description={description}>
            <div style={{ display:'flex', gap:8 }}>
                <Input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    {...(testId ? {'data-testid': testId} : {})}
                />
                <Button onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</Button>
            </div>
        </FormField>
    )
}
