// FRONT-END STUBS ONLY — replace these with real Firebase/Firestore calls.
// Each function should throw an Error on failure and return a simple object on success.
import { auth, db } from './firebase';
import {createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; 

export async function registerProgram({ name, city, state, departments = [], managerFirstName, managerLastName, managerEmail, password }) {
    // TODO: replace with real backend call
    await sleep(600);
    createUserWithEmailAndPassword(auth, managerEmail, password)
    .then((userCredential) => {
        // Signed up 
        const user = userCredential.user;
        // ...
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // ..
    });
    // Pretend the backend generates a unique programId (e.g., 'PW-ABC123')
    const programId = 'PW-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    //set up Firestore documents 
    await setDoc(doc(db, "manager_info", auth.currentUser.uid), {
        hospital_name: name,
        hospital_city: city,
        hospital_state: state,
        departments: departments,
        first_name: managerFirstName,
        last_name: managerLastName,
        email: managerEmail,
        program_id: programId,
        manager_id: auth.currentUser.uid
    });

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
