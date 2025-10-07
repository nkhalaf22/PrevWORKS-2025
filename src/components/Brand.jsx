import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/prevworks-logo.png'

export default function Brand({ to = '/', size = 'lg', center = true }) {
    return (
        <Link to={to} className={`brand ${center ? 'brand-center' : ''} brand-${size}`}>
            <img className="brand-mark" src={logo} alt="PrevWORKS logo" />
            <span className="brand-text">PrevWORKS</span>
        </Link>
    )
}
