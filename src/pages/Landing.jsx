import React from 'react'
import { Box, Button, Container, Header, SpaceBetween, Grid, Link } from '@cloudscape-design/components'

export default function Landing() {
    return (
        <Container header={<Header variant="h1">Welcome to PrevWORKS</Header>}>
            <SpaceBetween size="l">
                <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                    <Box>
                        <Header variant="h2">For Residents</Header>
                        <SpaceBetween size="s">
                            <Button href="/resident/login" variant="primary">Resident Login</Button>
                            <Button href="/resident/register">Resident Registration</Button>
                            <Box variant="p">Take the WHO-5 survey after logging in.</Box>
                        </SpaceBetween>
                    </Box>
                    <Box>
                        <Header variant="h2">For Program Managers</Header>
                        <SpaceBetween size="s">
                            <Button href="/manager/login" variant="primary">Manager Login</Button>
                            <Button href="/program/register">Register a Program</Button>
                            <Box variant="p">Upload CG-CAHPS and view weekly wellness averages.</Box>
                        </SpaceBetween>
                    </Box>
                </Grid>
                <Box variant="p">* All survey responses are anonymized. This is a mock UI.</Box>
                <Link external href="https://cloudscape.design/">Built with Amazon Cloudscape</Link>
            </SpaceBetween>
        </Container>
    )
}
