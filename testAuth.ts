// testAuth.ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const app = initializeApp({
    apiKey: 'AIzaSyAPtyxReFV0QrSoMcoIih2yMs11BbaLc1w',
    projectId: 'constructioncontrol-37f21'
});
const auth = getAuth(app);
const db = getFirestore(app);

signInWithEmailAndPassword(auth, 'noppadon.ppe@gmail.com', '123456').then(async (userCredential) => {
    const user = userCredential.user;
    console.log('Successfully logged in to Firebase Auth. UID:', user.uid);

    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log('User document found:', docSnap.data());
    } else {
        console.log('User document MISSING. This is why login fails.');
        console.log('Fixing it by recreating the document as an Administrator so we can gain access...');

        await setDoc(docRef, {
            email: 'noppadon.ppe@gmail.com',
            firstName: 'Noppadon',
            lastName: 'PPE',
            position: 'User',
            role: 'Administrator',
            status: 'Approved'
        });

        console.log('Created Admin record successfully!');
    }
}).catch(console.error);
