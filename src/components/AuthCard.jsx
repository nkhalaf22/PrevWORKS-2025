import React from 'react'
import { Container, SpaceBetween, Box } from '@cloudscape-design/components'
import Brand from './Brand'
import BackLink from './BackLink'

export default function AuthCard({ title, children, footer, backTo }) {
    return (
        <div className="page-center">
            <BackLink to={backTo} />
            <Container className="auth-card">
                <SpaceBetween size="l">
                    <div className="auth-brand">
                        <Brand size="xl" to="/" />
                    </div>
                    <Box variant="h1" className="auth-title">{title}</Box>
                    <hr className="auth-divider" />
                    {children}
                    {footer && <div className="auth-footer">{footer}</div>}
                </SpaceBetween>
            </Container>
        </div>
    )
}
