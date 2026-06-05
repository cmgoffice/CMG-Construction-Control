import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection, doc } from "firebase/firestore";
import {
    initializeAuth,
    browserLocalPersistence,
    browserSessionPersistence,
    indexedDBLocalPersistence,
    browserPopupRedirectResolver
} from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAPtyxReFV0QrSoMcoIih2yMs11BbaLc1w",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "constructioncontrol-37f21.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "constructioncontrol-37f21",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "constructioncontrol-37f21.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "311636692270",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:311636692270:web:74374b162e19bf339d3ebf",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-WLJKTML880"
};

const masterFirebaseConfig = {
    apiKey: process.env.REACT_APP_MASTER_FIREBASE_API_KEY || "AIzaSyDOqRqNW06Lu5fIQ_2Whr02tg6sn8zltw8",
    authDomain: process.env.REACT_APP_MASTER_FIREBASE_AUTH_DOMAIN || "cmg-budget-control.firebaseapp.com",
    projectId: process.env.REACT_APP_MASTER_FIREBASE_PROJECT_ID || "cmg-budget-control",
    storageBucket: process.env.REACT_APP_MASTER_FIREBASE_STORAGE_BUCKET || "cmg-budget-control.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_MASTER_FIREBASE_MESSAGING_SENDER_ID || "106345631455",
    appId: process.env.REACT_APP_MASTER_FIREBASE_APP_ID || "1:106345631455:web:f96f15b024e8c65334e36a",
    measurementId: process.env.REACT_APP_MASTER_FIREBASE_MEASUREMENT_ID || "G-YSPY0MTZG1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const masterApp = initializeApp(masterFirebaseConfig, "masterApp");
export const masterDb = getFirestore(masterApp);
export const auth = initializeAuth(app, {
    persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence
    ],
    popupRedirectResolver: browserPopupRedirectResolver
});
export const storage = getStorage(app);

/** Base path: ConstructionControlData/root (all app data lives under this) */
export const COL_ROOT = "ConstructionControlData" as const;
export const ROOT_DOC = "root" as const;

/** Collection reference under ConstructionControlData/root/{name} */
export function col(name: string) {
    return collection(db, COL_ROOT, ROOT_DOC, name);
}

/** Document reference under ConstructionControlData/root/{collectionName}/{docId} */
export function docRef(collectionName: string, docId: string) {
    return doc(db, COL_ROOT, ROOT_DOC, collectionName, docId);
}

export const logActivity = async (params: {
    uid: string;
    name: string;
    role: string;
    action: string;
    menu?: string;
    detail?: string;
}) => {
    try {
        await addDoc(col("activity_logs"), {
            ...params,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split("T")[0],
        });
    } catch {
        // Silent fail — logging should never break the app
    }
};
