import {
    collection,
    query,
    where,
    getDocs,
    setDoc,
    serverTimestamp, getFirestore, doc,
} from 'firebase/firestore'

import { getDepartments } from './api.js'
const db = getFirestore()

function deptDocRef(programId: string, department: string) {
    // optionally sanitize department for use as a path segment
    return doc(db, `programs/${programId}/departments/${department}`)
}
async function initCohortSizeForDept(opts: {
    programId: string
    department: string
}) {
    const { programId, department } = opts

    // 1) Count matching residents
    const residentsRef = collection(db, 'resident_info')
    const q = query(
        residentsRef,
        where('program_id', '==', programId),
        where('department', '==', department)
    )

    const snap = await getDocs(q)
    const cohortSize = snap.size

    // 2) Store in programs/{programId}/departments/{department}
    const ref = deptDocRef(programId, department)
    await setDoc(
        ref,
        {
            program_id: programId,
            department,
            cohortSize,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    )

    return cohortSize
}

type ResponseRateStats = {
    numResponded: number
    cohortSize: number
    responseRate: number // 0–100
}

type ResponseRatesByDept = Record<string, ResponseRateStats>

export function computeResponseRatesByDept(
    surveys,
    cohortSizesByDept,
    opts?: {
        startDayKey?: string // e.g. "2025-11-01"
        endDayKey?: string   // e.g. "2025-11-30"
    }
): ResponseRatesByDept {
    const { startDayKey, endDayKey } = opts || {}

    // 1) optional date-range filter
    const filtered = surveys.filter(s => {
        if (!s.dayKey) return false
        if (startDayKey && s.dayKey < startDayKey) return false
        if (endDayKey && s.dayKey > endDayKey) return false
        return true
    })

    // 2) group unique resident_ids per department
    const respondersByDept: Record<string, Set<string>> = {}

    for (const s of filtered) {
        const dept = s.department || 'Unknown'
        const rid = s.resident_id
        if (!rid) continue

        if (!respondersByDept[dept]) {
            respondersByDept[dept] = new Set()
        }
        respondersByDept[dept].add(rid)
    }

    // 3) compute stats per department
    const result: ResponseRatesByDept = {}

    // Use all departments known from cohort sizes so depts with 0 responses still show up
    const allDepts = new Set([
        ...Object.keys(cohortSizesByDept),
        ...Object.keys(respondersByDept),
    ])

    for (const dept of allDepts) {
        const responders = respondersByDept[dept] ?? new Set<string>()
        const numResponded = responders.size
        const cohortSize = cohortSizesByDept[dept] ?? 0

        const responseRate =
            cohortSize > 0 ? (numResponded / cohortSize) * 100 : 0

        result[dept] = { numResponded, cohortSize, responseRate }
    }

    return result
}


export async function initCohortSizesForProgram(programId: string) {
    // 1) Get all departments for this program
    const departments = await getDepartments(programId) // e.g. ["IM", "Surgery", "Peds"]

    if (!departments || departments.length === 0) {
        return {}
    }

    // 2) Init cohort size for each department in parallel
    const results = await Promise.all(
        departments.map(async (department) => {
            const cohortSize = await initCohortSizeForDept({ programId, department })
            return { department, cohortSize }
        })
    )

    // 3) Return as a lookup map: { [department]: cohortSize }
    const cohortSizesByDept: Record<string, number> = {}
    for (const { department, cohortSize } of results) {
        cohortSizesByDept[department] = cohortSize
    }

    return cohortSizesByDept
}
