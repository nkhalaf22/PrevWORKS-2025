// functions/src/index.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore' // <-- add this

admin.initializeApp()
const db = admin.firestore()

export const onResidentSurveyCreate = onDocumentCreated(
    'resident_info/{uid}/surveys/{sid}',
    async (event) => {
        const snap = event.data
        if (!snap) return

        const { uid, sid } = event.params as { uid: string; sid: string }
        const data = snap.data() as { score: number; weekKey?: string }

        const profile = await db.doc(`resident_info/${uid}`).get()
        if (!profile.exists) return
        const programId = String(profile.get('program_id') || '')
        const department = String(profile.get('department') || '')
        if (!programId || !department) return

        const score = data.score
        const weekKey = data.weekKey ?? isoWeekKey(new Date())

        // 1) anonymized mirror
        await db.doc(`programs/${programId}/anon_surveys/${sid}`).set(
            {
                department,
                score,
                weekKey,
                createdAt: FieldValue.serverTimestamp(), // <-- now defined
            },
            { merge: true }
        )

        // 2) weekly rollup
        const rollRef = db.doc(`programs/${programId}/dept_weekly/${department}_${weekKey}`)
        await db.runTransaction(async (tx) => {
            const cur = await tx.get(rollRef)
            const r = cur.exists
                ? (cur.data() as any)
                : { department, weekKey, sum: 0, count: 0, min: 999, max: -999 }
            const sum = (r.sum || 0) + score
            const count = (r.count || 0) + 1
            const min = Math.min(r.min ?? 999, score)
            const max = Math.max(r.max ?? -999, score)
            tx.set(
                rollRef,
                {
                    department,
                    weekKey,
                    sum,
                    count,
                    avg: sum / count,
                    min,
                    max,
                    updatedAt: FieldValue.serverTimestamp(), // <-- same here
                },
                { merge: true }
            )
        })
    }
)

function isoWeekKey(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - day + 3)
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
    const week =
        1 +
        Math.round(
            ((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) /
            7
        )
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
