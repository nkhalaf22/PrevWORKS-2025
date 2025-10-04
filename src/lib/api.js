// FRONT-END STUBS ONLY — replace these with real Firebase/Firestore calls.
// Each function should throw an Error on failure and return a simple object on success.

export async function registerProgram({ name, location, programUsername, managerEmail, password }) {
    // TODO: replace with real backend call
    await sleep(600);
    // Pretend the backend generates a unique programId (e.g., 'PW-ABC123')
    const programId = 'PW-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    return { programId };
}

export async function registerResident({ programId, username, password }) {
    // TODO: replace with real backend call
    await sleep(450);
    return { ok: true };
}

// --- add these to your existing stubs --- //
export async function loginResident({ username, email }) {
    await sleep(400);
    // TODO: replace with real auth; throw on failure
    return { ok: true, role: 'resident' };
}

export async function loginManager({ username, email }) {
    await sleep(400);
    // TODO: replace with real auth; throw on failure
    return { ok: true, role: 'manager' };
}

// utility
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
