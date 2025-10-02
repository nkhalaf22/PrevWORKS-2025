import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@cloudscape-design/components'

export default function BackLink({ to, label = 'Back' }) {
    const navigate = useNavigate()
    if (to) {
        return (
            <div className="back-link-wrap">
                <Button variant="link" iconName="angle-left" href={to}>{label}</Button>
            </div>
        )
    }
    return (
        <div className="back-link-wrap">
            <Button variant="link" iconName="angle-left" onClick={() => navigate(-1)}>
                {label}
            </Button>
        </div>
    )
}
