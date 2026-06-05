import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
const db = getFirestore(app);

const COL_ROOT = "ConstructionControlData";
const ROOT_DOC = "root";

const col = (subCollectionName: string) => {
    return collection(db, COL_ROOT, ROOT_DOC, subCollectionName);
};

async function testMigration() {
    const oldProjectNo = "PRJ-2026-J-72";
    const newProjectId = "PRJ-2026-J-072";

    console.log("Searching for old project with no:", oldProjectNo);
    const q = query(col("projects"), where("no", "==", oldProjectNo));
    const qs = await getDocs(q);
    
    if (qs.empty) {
        console.log("Old project not found!");
        return;
    }
    
    const oldProjectId = qs.docs[0].id;
    console.log(`Found old project ID: ${oldProjectId} for no: ${oldProjectNo}`);

    const collectionsToUpdate = [
        "project_supervisors",
        "project_equipments",
        "project_worker_teams",
        "site_work_orders",
        "daily_reports",
        "daily_manpower_equipment",
        "users"
    ];

    let totalDocs = 0;

    for (const c of collectionsToUpdate) {
        let cq;
        if (c === "users") {
            cq = query(col(c), where("assigned_projects", "array-contains", oldProjectId));
        } else {
            cq = query(col(c), where("project_id", "==", oldProjectId));
        }
        const cqs = await getDocs(cq);
        console.log(`- ${c}: found ${cqs.size} docs linked to old project.`);
        totalDocs += cqs.size;
    }

    console.log(`Total documents to migrate: ${totalDocs}`);
    console.log("If migrated, these documents will have their project_id updated to " + newProjectId);
    process.exit(0);
}

testMigration().catch(console.error);
