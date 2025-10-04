import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import {renderWithRouter} from "../../test/utils.jsx";
import userEvent from '@testing-library/user-event'
import ManagerLogin from '../ManagerLogin'

vi.mock('../../lib/api', () => ({
    loginManager: vi.fn().mockResolvedValue({ ok: true, role: 'manager' })
}))
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

describe('ManagerLogin (frontend-only)', () => {
    beforeEach(() => mockNavigate.mockReset())

    it('requires username and a valid email', async () => {
        renderWithRouter(<ManagerLogin />)
        const user = userEvent.setup()

        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()

        await user.type(screen.getAllByLabelText(/username/i)[0], 'director')
        await user.type(screen.getAllByLabelText(/email/i)[0], 'bad-email')
        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])
        expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
    })

    it('navigates on successful login', async () => {
        const { loginManager } = await import('../../lib/api')
        renderWithRouter(<ManagerLogin />)
        const user = userEvent.setup()

        await user.type(screen.getAllByLabelText(/username/i)[0], 'director')
        await user.type(screen.getAllByLabelText(/email/i)[0], 'dir@example.com')
        await user.click(screen.getAllByRole('button', { name: /continue|log in|sign in/i })[0])

        expect(loginManager).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/manager/dashboard', { replace: true })
    })
})
