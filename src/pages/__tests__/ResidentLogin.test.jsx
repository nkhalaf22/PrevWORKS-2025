import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import {renderWithRouter} from "../../test/utils.jsx";
import userEvent from '@testing-library/user-event'
import ResidentLogin from '../ResidentLogin'

vi.mock('../../lib/api', () => ({
    loginResident: vi.fn().mockResolvedValue({ ok: true, role: 'resident' })
}))
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

describe('ResidentLogin (frontend-only)', () => {
    beforeEach(() => mockNavigate.mockReset())

    it('requires username and a valid email', async () => {
        renderWithRouter(<ResidentLogin />)
        const user = userEvent.setup()

        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()

        await user.type(screen.getAllByLabelText(/username/i)[0], 'alice')
        await user.type(screen.getAllByLabelText(/email/i)[0], 'not-an-email')
        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])
        expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
    })

    it('navigates on successful login', async () => {
        const { loginResident } = await import('../../lib/api')
        renderWithRouter(<ResidentLogin />)
        const user = userEvent.setup()

        await user.type(screen.getAllByLabelText(/username/i)[0], 'alice')
        await user.type(screen.getAllByLabelText(/email/i)[0], 'alice@example.com')
        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])

        expect(loginResident).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/resident/survey', { replace: true })
    })
})
