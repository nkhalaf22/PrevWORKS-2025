// FRONT-END STUBS ONLY — replace these with real Firebase/Firestore calls.
// Each function should throw an Error on failure and return a simple object on success.
import { auth, db } from './firebase';
import {createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore"; 

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
        console.error("Authentication failed:", errorCode, errorMessage);

        throw new Error(errorMessage);
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

export async function registerResident({ programId, email, password, department, firstName, lastName }) {
    // TODO: replace with real backend call
    await sleep(450);
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed up 
        const user = userCredential.user;
        // ...
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Authentication failed:", errorCode, errorMessage);

        throw new Error(errorMessage);
        // ..
    });
    //set up Firestore documents 
    await setDoc(doc(db, "resident_info", auth.currentUser.uid), {
        department: department,
        email: email,
        first_name: firstName,
        last_name: lastName,
        program_id: programId,
        resident_id: auth.currentUser.uid
    });

    return { ok: true };
}

// --- add these to your existing stubs --- //
export async function loginResident({ email, password }) {
    await sleep(400);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        // Signed in
        const user = userCredential.user
        return { ok: true, role: 'resident', uid: user?.uid }
    } catch (error) {
        const errorCode = error.code
        const errorMessage = error.message
        return { ok: false }
    }
}

export async function loginManager({ email, password }) {
    await sleep(400);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        // Signed in
        const user = userCredential.user
        return { ok: true, role: 'manager', uid: user?.uid }
    } catch (error) {
        const errorCode = error.code
        const errorMessage = error.message
        return { ok: false }
    }
}

export async function getDepartments(programId) {
    // Query Firestore for the manager_info document that has this program_id and return its departments
    await sleep(100)
    if (!programId || typeof programId !== 'string' || !programId.trim()) {
        throw new Error('Invalid programId')
    }
    try {
        const q = query(collection(db, 'manager_info'), where('program_id', '==', programId))
        const snap = await getDocs(q)
        if (snap.empty) return []
        const docSnap = snap.docs[0]
        const data = docSnap.data() || {}
        return Array.isArray(data.departments) ? data.departments : []
    } catch (err) {
        console.error('getDepartments error:', err)
        throw err
    }
}

// utility
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
