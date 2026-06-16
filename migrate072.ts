import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
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

const col = (subCollectionName: string) => {
    return collection(db, COL_ROOT, ROOT_DOC, subCollectionName);
};
const getDocRef = (subCollectionName: string, id: string) => {
    return doc(db, COL_ROOT, ROOT_DOC, subCollectionName, id);
};

async function migrate() {
    const targetProjectNo = "PRJ-2026-J-072";

    console.log("Searching for OLD project ID in users assigned_projects...");
    const uqAll = query(col("users"));
    const usersSnap = await getDocs(uqAll);
    let potentialOldIds = new Set<string>();
    
    for (const u of usersSnap.docs) {
        const ap = u.data().assigned_projects || [];
        for (const pid of ap) {
            potentialOldIds.add(pid);
        }
    }
    
    let oldProjectId = "";
    // Check which of these potentialOldIds do NOT exist in the local projects collection
    for (const pid of Array.from(potentialOldIds)) {
        const pDoc = await getDocs(query(col("projects"), where("__name__", "==", pid)));
        if (pDoc.empty) {
            // It's an orphan ID! Is it the one for 072? We can check if site_work_orders exist for it.
            const swoQ = query(col("site_work_orders"), where("project_id", "==", pid));
            const swoSnap = await getDocs(swoQ);
            if (!swoSnap.empty) {
                 oldProjectId = pid;
                 console.log("Found orphan project ID with SWOs:", oldProjectId);
                 break;
            }
        }
    }

    if (!oldProjectId) {
         console.log("Could not find orphan oldProjectId");
         return;
    }

    console.log("Searching for NEW master project with no/jobNo:", targetProjectNo);
    const masterCol = collection(masterDb, "artifacts", "cmg-budget-control-default", "public", "data", "projects");
    let newProjectId = "";
    const mq = await getDocs(masterCol);
    for (const d of mq.docs) {
        const data = d.data();
        if (data.jobNo === targetProjectNo || data.no === targetProjectNo) {
            newProjectId = d.id;
            break;
        }
    }

    if (!newProjectId) {
        console.log("New project not found in MasterDb!");
        return;
    }

    console.log(`Found new project ID: ${newProjectId}`);

    if (oldProjectId === newProjectId) {
         console.log("IDs are the same. Nothing to do.");
         return;
    }

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
