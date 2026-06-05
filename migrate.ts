import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

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
const getDocRef = (subCollectionName: string, id: string) => {
    return doc(db, COL_ROOT, ROOT_DOC, subCollectionName, id);
};

async function migrate() {
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
        "daily_manpower_equipment"
    ];

    let totalUpdated = 0;

    for (const c of collectionsToUpdate) {
        const cq = query(col(c), where("project_id", "==", oldProjectId));
        const cqs = await getDocs(cq);
        console.log(`- ${c}: found ${cqs.size} docs to update.`);
        for (const document of cqs.docs) {
            await updateDoc(getDocRef(c, document.id), {
                project_id: newProjectId
            });
            totalUpdated++;
        }
    }

    // Update users assigned_projects array
    const uq = query(col("users"), where("assigned_projects", "array-contains", oldProjectId));
    const uqs = await getDocs(uq);
    console.log(`- users: found ${uqs.size} docs to update.`);
    for (const userDoc of uqs.docs) {
        const userData = userDoc.data();
        let assigned_projects: string[] = userData.assigned_projects || [];
        assigned_projects = assigned_projects.filter(id => id !== oldProjectId);
        if (!assigned_projects.includes(newProjectId)) {
            assigned_projects.push(newProjectId);
        }
        await updateDoc(getDocRef("users", userDoc.id), {
            assigned_projects
        });
        totalUpdated++;
    }

    console.log(`Migration complete! Successfully updated ${totalUpdated} documents.`);
    process.exit(0);
}

migrate().catch(console.error);
