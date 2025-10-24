// src/lib/surveys.ts
import { getAuth } from 'firebase/auth'
import {
    getFirestore, collection, addDoc, serverTimestamp
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

export function calcWho5Score(a: number[]) {
    return a[0] + a[1] + a[2] + a[3] + a[4]
}
export function isoWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - day + 3)
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(),0,4))
    const week = 1 + Math.round(((d.getTime()-firstThu.getTime())/86400000 - 3 + ((firstThu.getUTCDay()+6)%7))/7)
    return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`
}

export async function submitResidentWho5(answers: number[]) {
    const user = auth.currentUser
    if (!user) throw new Error('not-authenticated')

    const score = calcWho5Score(answers)
    const col = collection(db, `resident_info/${user.uid}/surveys`)
    await addDoc(col, {
        who5: answers,        // optional: raw answers
        score,                // 0..25
        createdAt: serverTimestamp(),
        weekKey: isoWeekKey(), // for weekly rollups
    })
    return { score }
}
