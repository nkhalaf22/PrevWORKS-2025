import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import ProgramRegister from './pages/ProgramRegister'
import ResidentRegister from './pages/ResidentRegister'
import ManagerLogin from './pages/ManagerLogin'
import ResidentLogin from './pages/ResidentLogin'
import ResidentSurvey from './pages/ResidentSurvey'
import ManagerDashboard from './pages/ManagerDashboard'
import AuthChoose from "./pages/AuthChoose.jsx";
import DashboardPage from './pages/Dashboard'

export default function Router() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/program/register" element={<ProgramRegister />} />
            <Route path="/manager/login" element={<ManagerLogin />} />
            <Route path="/resident/login" element={<ResidentLogin />} />
            <Route path="/resident/register" element={<ResidentRegister />} />
            <Route path="/resident/survey" element={<ResidentSurvey />} />
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auth/choose" element={<AuthChoose />} />
            <Route path="*" element={<Landing />} />
        </Routes>
    )
}
