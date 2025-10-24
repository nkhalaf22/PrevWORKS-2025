// src/lib/surveys.ts
import { getAuth } from 'firebase/auth'
import {
    getFirestore, doc, getDoc, collection, writeBatch, serverTimestamp
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

export function calcWho5Score(a: {q1:number;q2:number;q3:number;q4:number;q5:number}) {
    return a.q1 + a.q2 + a.q3 + a.q4 + a.q5
}

export function isoWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - day + 3)
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
    const week =
        1 + Math.round(((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Client-side submit:
 * 1) writes resident survey under resident_info/{uid}/surveys
 * 2) writes anonymous mirror under programs/{programId}/anon_surveys/{sameId}
 */
export async function submitResidentWho5(answers: {q1:number;q2:number;q3:number;q4:number;q5:number}) {
    const user = auth.currentUser
    if (!user) throw new Error('not-authenticated')

    // Get resident profile to derive program/department
    const profRef = doc(db, `resident_info/${user.uid}`)
    const profSnap = await getDoc(profRef)
    if (!profSnap.exists()) throw new Error('missing-profile')
    const programId = String(profSnap.get('program_id') || '')
    const department = String(profSnap.get('department') || '')
    if (!programId || !department) throw new Error('missing-program-or-department')

    const score = calcWho5Score(answers)
    const weekKey = isoWeekKey()

    // Use one batch so IDs match and writes are atomic
    const batch = writeBatch(db)

    const surveysCol = collection(db, `resident_info/${user.uid}/surveys`)
    const surveyRef = doc(surveysCol) // auto-id
    batch.set(surveyRef, {
        who5: answers,
        score,
        weekKey,
        createdAt: serverTimestamp(),
    })

    const anonRef = doc(db, `programs/${programId}/anon_surveys/${surveyRef.id}`)
    batch.set(anonRef, {
        department,
        score,
        weekKey,
        createdAt: serverTimestamp(), // rules will enforce timestamp integrity
    })

    await batch.commit()
    return { score, surveyId: surveyRef.id, programId, department }
}
