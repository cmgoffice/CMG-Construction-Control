import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection as fsCollection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAPtyxReFV0QrSoMcoIih2yMs11BbaLc1w",
    authDomain: "constructioncontrol-37f21.firebaseapp.com",
    projectId: "constructioncontrol-37f21",
    storageBucket: "constructioncontrol-37f21.firebasestorage.app",
    messagingSenderId: "311636692270",
    appId: "1:311636692270:web:74374b162e19bf339d3ebf",
    measurementId: "G-WLJKTML880"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const logActivity = async (params: {
    uid: string;
    name: string;
    role: string;
    action: string;
    menu?: string;
    detail?: string;
}) => {
    try {
        await addDoc(fsCollection(db, "activity_logs"), {
            ...params,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
        });
    } catch {
        // Silent fail — logging should never break the app
    }
};
