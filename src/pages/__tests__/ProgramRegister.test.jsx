import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {screen, waitFor} from '@testing-library/react'
import { renderWithRouter } from '../../test/utils.jsx'
import userEvent from '@testing-library/user-event'
import ProgramRegister from '../ProgramRegister'

// mock API: always return a known Program ID
vi.mock('../../lib/api', () => ({
    registerProgram: vi.fn().mockResolvedValue({ programId: 'PW-TEST12' })
}))

import { registerProgram } from '../../lib/api'

// react-router bits used by AuthCard etc.
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

describe('ProgramRegister (frontend-only)', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        vi.clearAllMocks()
    })

    it('shows validation errors for required fields and password mismatch', async () => {
        renderWithRouter(<ProgramRegister />)
        const user = userEvent.setup()

        // Click submit with everything empty
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        expect(screen.getByText(/program name and location are required/i)).toBeInTheDocument()

        // Fill name/location; leave username/email empty
        await user.type(screen.getAllByLabelText(/program name/i)[0], 'UCSF IM')
        await user.type(screen.getAllByLabelText(/location/i)[0], 'San Francisco, CA')
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        expect(screen.getByText(/program username is required/i)).toBeInTheDocument()

        // Fill username; leave email empty
        await user.type(screen.getAllByLabelText(/program username/i)[0], 'ucsf_im')
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        expect(screen.getByText(/manager email is required/i)).toBeInTheDocument()

        // Fill email; bad passwords
        await user.type(screen.getAllByLabelText(/manager email/i)[0], 'manager@ucsf.edu')
        await user.type(screen.getAllByLabelText(/^password/i)[0], 'short')
        await user.type(screen.getAllByLabelText(/confirm password/i)[0], 'short2')
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        expect(screen.getByText(/password must be at least 6/i)).toBeInTheDocument()

        // Fix length, still mismatch
        const pwd = screen.getAllByLabelText(/^password/i)[0]
        await user.clear(pwd)
        await user.type(pwd, 'secret1')
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('does not show validation errors on happy path', async () => {
        renderWithRouter(<ProgramRegister />)
        const user = userEvent.setup()

        // Fill all required inputs
        await user.type(screen.getAllByLabelText(/program name/i)[0], 'UCSF IM')
        await user.type(screen.getAllByLabelText(/location/i)[0], 'San Francisco, CA')
        await user.type(screen.getAllByLabelText(/program username/i)[0], 'ucsf_im')
        await user.type(screen.getAllByLabelText(/manager email/i)[0], 'manager@ucsf.edu')
        await user.type(screen.getAllByLabelText(/^password/i)[0], 'secret1!')
        await user.type(screen.getAllByLabelText(/confirm password/i)[0], 'secret1!')

        // Click submit (if you added a testid, prefer that)
        await user.click(screen.getAllByRole('button', { name: /create program/i })[0])
        // await user.click(screen.getByTestId('program-register-submit'))

        // After submit, none of the validation errors should be present
        await waitFor(() => {
            expect(screen.queryByText(/program name and location are required/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/program username is required/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/manager email is required/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/password must be at least 6/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
        })
    })
})
