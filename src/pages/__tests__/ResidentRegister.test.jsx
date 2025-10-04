import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../../test/utils.jsx'
import userEvent from '@testing-library/user-event'
import ResidentRegister from '../ResidentRegister'

vi.mock('../../lib/api', () => ({
    registerResident: vi.fn().mockResolvedValue({ ok: true })
}))

// Import the mocked function so we assert against the exact spy the component uses
import { registerResident } from '../../lib/api'

describe('ResidentRegister (frontend-only)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('validates required fields and password mismatch', async () => {
        renderWithRouter(<ResidentRegister />)
        const user = userEvent.setup()

        await user.click(screen.getAllByRole('button', { name: /create account/i })[0])
        expect(screen.getByText(/program id is required/i)).toBeInTheDocument()

        await user.type(screen.getAllByLabelText(/program id/i)[0], 'PW-ABCD12')
        await user.click(screen.getAllByRole('button', { name: /create account/i })[0])
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()

        await user.type(screen.getAllByLabelText(/username/i)[0], 'resident1')
        await user.type(screen.getAllByLabelText(/^password/i)[0], 'short')
        await user.type(screen.getAllByLabelText(/confirm password/i)[0], 'short2')
        await user.click(screen.getAllByRole('button', { name: /create account/i })[0])
        expect(screen.getAllByText(/password must be at least 6/i)[0]).toBeInTheDocument()

        const pwd = screen.getAllByLabelText(/^password/i)[0]
        await user.clear(pwd)
        await user.type(pwd, 'secret1')
        await user.click(screen.getAllByRole('button', { name: /create account/i })[0])
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('submits and shows success banner', async () => {
        renderWithRouter(<ResidentRegister />)
        const user = userEvent.setup()

        await user.type(screen.getAllByLabelText(/program id/i)[0], 'PW-ABCD12')
        await user.type(screen.getAllByLabelText(/username/i)[0], 'resident1')
        await user.type(screen.getAllByLabelText(/^password/i)[0], 'secret1!')
        await user.type(screen.getAllByLabelText(/confirm password/i)[0], 'secret1!')

        await user.click(screen.getAllByRole('button', { name: /create account/i })[0])

        // Wait for async submit to hit the mocked API
        await waitFor(() => {
            expect(screen.queryByText(/program id is required/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/password must be at least 6/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
        })

        // Success banner appears
        expect(await screen.findByText(/account created/i)).toBeInTheDocument()
    })
})