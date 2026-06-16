import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { config } from "dotenv";
config();

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
const db = getFirestore(app);

const masterApp = initializeApp(masterFirebaseConfig, "masterApp");
const masterDb = getFirestore(masterApp);

const COL_ROOT = "ConstructionControlData";
const ROOT_DOC = "root";

const col = (subCollectionName: string) => collection(db, COL_ROOT, ROOT_DOC, subCollectionName);

async function check() {
    const targets = [
        { local: "PRJ-2026-J-074", master: "PRJ-2026-J-074" },
        { local: "PRJ-2026-J-75", master: "PRJ-2026-J-075" },
        { local: "PRJ-2026-J-73", master: "PRJ-2026-J-073" }
    ];

    const masterCol = collection(masterDb, "artifacts", "cmg-budget-control-default", "public", "data", "projects");
    const mq = await getDocs(masterCol);
    const masterProjects = mq.docs.map(d => ({ id: d.id, ...d.data() }));

    const localProjectsSnap = await getDocs(col("projects"));
    const localProjects = localProjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const t of targets) {
        console.log(`\n=== Checking Mapping: ${t.local} -> ${t.master} ===`);
        
        // Find local
        const lFound = localProjects.filter(p => p.no === t.local);
        if (lFound.length > 0) {
            console.log(`LOCAL: Found ${lFound.length} project(s) matching NO = ${t.local}`);
            lFound.forEach(p => console.log(`  -> ID: ${p.id}, Name: ${p.name}`));
        } else {
            console.log(`LOCAL: Could NOT find project matching NO = ${t.local}. Looking for orphans...`);
            // Check orphans in site_work_orders? They don't have projectNo directly, but we can list orphan IDs
        }

        // Find master
        const mFound = masterProjects.filter(p => p.no === t.master || p.jobNo === t.master);
        if (mFound.length > 0) {
            console.log(`MASTER: Found ${mFound.length} project(s) matching NO/JOBNO = ${t.master}`);
            mFound.forEach(p => console.log(`  -> ID: ${p.id}, Name: ${p.name || p.projectName}`));
        } else {
            console.log(`MASTER: Could NOT find project matching NO/JOBNO = ${t.master}`);
        }
    }
    process.exit(0);
}

check().catch(console.error);
