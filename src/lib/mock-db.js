// In-memory mock “database”: anonymous wellness records and program registry.
// Replace with real cloud storage later.

export const mockPrograms = new Map(); // programId -> { name, location, username }
export const mockScores = []; // { programId, score, date: ISO }

export function generateProgramId() {
    return 'PW-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function registerProgram({ name, location, username }) {
    const id = generateProgramId();
    mockPrograms.set(id, { name, location, username });
    return id;
}

export function addWellnessScore({ programId, score, date = new Date().toISOString() }) {
    mockScores.push({ programId, score, date });
}

export function getWeeklyAverages(programId) {
    // group ISO dates by ISO week; simple grouping for mock purposes
    const byWeek = {};
    mockScores.filter(r => r.programId === programId).forEach(r => {
        const d = new Date(r.date);
        const y = d.getUTCFullYear();
        // ISO week calc (rough for mock): week = floor((dayOfYear + 6 - weekday)/7)
        const start = new Date(Date.UTC(y,0,1));
        const day = Math.floor((d - start)/86400000) + 1;
        const weekday = (d.getUTCDay() + 6) % 7; // Mon=0
        const week = Math.floor((day + weekday) / 7) + 1;
        const key = `${y}-W${String(week).padStart(2,'0')}`;
        byWeek[key] ||= [];
        byWeek[key].push(r.score);
    });
    return Object.entries(byWeek).map(([week, arr]) => ({
        week,
        avg: Math.round((arr.reduce((a,b)=>a+b,0)/arr.length) * 10) / 10
    })).sort((a,b)=>a.week.localeCompare(b.week));
}
