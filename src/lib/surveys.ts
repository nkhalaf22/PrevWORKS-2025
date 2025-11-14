// src/lib/surveys.ts
import { getAuth } from 'firebase/auth'
import {
    getFirestore, doc, getDoc, collection, writeBatch, serverTimestamp, Timestamp, addDoc
} from 'firebase/firestore'
import { dayKey } from './dateKeys'

const auth = getAuth()
const db = getFirestore()

export function calcWho5Score(a:{q1:number;q2:number;q3:number;q4:number;q5:number}) {
    return (a.q1 + a.q2 + a.q3 + a.q4 + a.q5)
}

export async function submitResidentWho5(answers:{q1:number;q2:number;q3:number;q4:number;q5:number}) {
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
    const id = dayKey(new Date()) // ← fixed per day

    const batch = writeBatch(db)

    // 1) resident daily survey
    const residentSurveyRef = doc(db, `resident_info/${user.uid}/surveys/${id}`)
    batch.set(residentSurveyRef, {
        who5: answers,
        score,
        dayKey: id,
        createdAt: serverTimestamp(),
    }, { merge: false }) // ensure create-only semantics

    // 2) anonymous mirror (same id)
    const anonRef = doc(db, `programs/${programId}/anon_surveys/${id}`)
    batch.set(anonRef, {
        department,
        score,
        dayKey: id,
        createdAt: serverTimestamp(),
    }, { merge: false })

    try {
        await batch.commit()
    } catch (e:any) {
        // Firestore returns ALREADY_EXISTS if doc exists and rules forbid update
        if (String(e?.code).includes('already-exists')) {
            throw new Error('already-today')
        }
        throw e
    }
    return { score, surveyId: id, programId, department }
}

export interface ProgramData {
    access_care: number;
    coord_care: number;
    department: string;
    end_date: Timestamp; 
    information_education: number;
    program_id: string;
    respect_patient_prefs: number;
    sample_size: number;
    start_date: Timestamp;
    emotional_support: number;
}

/**
 * Writes a new program data record to the /cgcahps_programdata collection.
 * * @param data The structured program data to be saved.
 * @returns The ID of the newly created document.
 */
export async function addProgramData(data: ProgramData): Promise<string> {
    const programDataCollection = collection(db, 'cgcahps_programdata');

    const docRef = await addDoc(programDataCollection, {
        ...data,
    });

    return docRef.id;
}


/**
 * Interface representing the structure of a single NRC data record.
 */
export interface NrcData {
    access_care: number;
    coord_care: number;
    emotional_support: number;
    end_date: Timestamp;
    information_education: number;
    program_id: string;
    respect_patient_prefs: number;
    start_date: Timestamp;
}

/**
 * Writes a new NRC data record to the /cgcahps_nrcdata collection.
 * @param data The structured NRC data to be saved.
 * @returns The ID of the newly created document.
 */
export async function addNrcData(data: NrcData): Promise<string> {
    // Corrected collection path as requested: /cgcahps_nrcdata
    const nrcDataCollection = collection(db, 'cgcahps_nrcdata');

    // Use the spread operator to save all properties from the 'data' object
    const docRef = await addDoc(nrcDataCollection, {
        ...data,
    });

    return docRef.id;
}