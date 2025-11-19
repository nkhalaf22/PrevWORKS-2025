// src/lib/surveys.ts
import { getAuth } from 'firebase/auth'
import {
    getFirestore, doc, collection, getDoc, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { dayKey } from './dateKeys'

const auth = getAuth()
const db = getFirestore()

export function calcWho5Score(a:{q1:number;q2:number;q3:number;q4:number;q5:number}) {
    return (a.q1 + a.q2 + a.q3 + a.q4 + a.q5)
}


export async function submitResidentWho5(answers: {
    q1: number
    q2: number
    q3: number
    q4: number
    q5: number
}) {
    const user = auth.currentUser
    if (!user) throw new Error('not-authenticated')

    // profile → program/department
    const profRef = doc(db, `resident_info/${user.uid}`)
    const profSnap = await getDoc(profRef)
    if (!profSnap.exists()) throw new Error('missing-profile')
    const programId = String(profSnap.get('program_id') || '')
    const department = String(profSnap.get('department') || '')
    if (!programId || !department) throw new Error('missing-program-or-department')

    const score = calcWho5Score(answers)
    const id = dayKey(new Date()) // fixed per day per resident

    const batch = writeBatch(db)

    // 1) resident daily survey (enforces "once per day per resident")
    const residentSurveyRef = doc(db, `resident_info/${user.uid}/surveys/${id}`)
    batch.set(
        residentSurveyRef,
        {
            who5: answers,
            score,
            dayKey: id,
            createdAt: serverTimestamp(),
        },
        { merge: false } // create-only semantics
    )

    // 2) anonymous mirror – one doc per response (auto-id)
    const anonCollectionRef = collection(db, `programs/${programId}/anon_surveys`)
    const anonRef = doc(anonCollectionRef)

    batch.set(
        anonRef,
        {
            program_id: programId,
            department,
            resident_id: user.uid, // <-- needed for unique counting
            score,
            dayKey: id,
            createdAt: serverTimestamp(),
        },
        { merge: false }
    )

    try {
        await batch.commit()
    } catch (e: any) {
        // Firestore returns ALREADY_EXISTS if resident_survey doc exists and rules forbid update
        if (String(e?.code).includes('already-exists')) {
            throw new Error('already-today')
        }
        throw e
    }

    return { score, surveyId: id, programId, department }
}
