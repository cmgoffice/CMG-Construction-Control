import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COL_ROOT = "ConstructionControlData";
const ROOT_DOC = "root";

const col = (subCollectionName: string) => collection(db, COL_ROOT, ROOT_DOC, subCollectionName);
const getDocRef = (subCollectionName: string, id: string) => doc(db, COL_ROOT, ROOT_DOC, subCollectionName, id);

const MAPPINGS = [
    { localId: "SKms1n2PBbhxRRtQENjs", masterId: "J-74", localNo: "PRJ-2026-J-074", masterNo: "PRJ-2026-J-074 MasterData" },
    { localId: "u9SCSZOjund7CqCOcTHK", masterId: "J-75", localNo: "PRJ-2026-J-75", masterNo: "PRJ-2026-J-075 MasterData" },
    { localId: "97pbOwH3Bs5RCXjay3WC", masterId: "J-73", localNo: "PRJ-2026-J-73", masterNo: "PRJ-2026-J-073 MasterData" }
];

const COLLECTIONS_TO_UPDATE = [
    "project_supervisors",
    "project_equipments",
    "project_worker_teams",
    "site_work_orders",
    "daily_reports",
    "daily_manpower_equipment"
];

const BACKUP_FILE = path.join(__dirname, "migration-backup.json");

async function migrate() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");
    const isExecute = args.includes("--execute");
    const isRollback = args.includes("--rollback");

    if (!isDryRun && !isExecute && !isRollback) {
        console.log("Usage: npx tsx migrate-projects.ts [--dry-run | --execute | --rollback]");
        process.exit(1);
    }

    if (isRollback) {
        await doRollback();
        return;
    }

    console.log(`Starting Migration Mode: ${isDryRun ? 'DRY-RUN' : 'EXECUTE'}`);
    
    // Structure to hold our backup if we want to rollback
    let backupData: any = {
        collections: {},
        users: {}
    };

    let totalDocsToUpdate = 0;

    for (const mapping of MAPPINGS) {
        console.log(`\n--- Planning Migration: ${mapping.localNo} -> ${mapping.masterNo} (${mapping.localId} -> ${mapping.masterId}) ---`);
        
        for (const c of COLLECTIONS_TO_UPDATE) {
            const cq = query(col(c), where("project_id", "==", mapping.localId));
            const cqs = await getDocs(cq);
            
            if (cqs.size > 0) {
                console.log(`[${c}] Found ${cqs.size} document(s) pointing to old project ID`);
                
                if (!backupData.collections[c]) backupData.collections[c] = {};
                
                for (const document of cqs.docs) {
                    backupData.collections[c][document.id] = mapping.localId;
                    totalDocsToUpdate++;
                    
                    if (isExecute) {
                        await updateDoc(getDocRef(c, document.id), {
                            project_id: mapping.masterId
                        });
                    }
                }
            }
        }

        // Handle users assigned_projects
        const uq = query(col("users"), where("assigned_projects", "array-contains", mapping.localId));
        const uqs = await getDocs(uq);
        if (uqs.size > 0) {
            console.log(`[users] Found ${uqs.size} user(s) assigned to old project ID`);
            
            for (const userDoc of uqs.docs) {
                const userData = userDoc.data();
                
                // Save original assigned_projects array for this user
                if (!backupData.users[userDoc.id]) {
                    backupData.users[userDoc.id] = userData.assigned_projects || [];
                }
                
                let assigned_projects: string[] = backupData.users[userDoc.id] || [];
                
                // Only modify if we are in execute mode
                if (isExecute) {
                    // Update array: remove localId, add masterId if not exists
                    let new_assigned_projects = assigned_projects.filter(id => id !== mapping.localId);
                    if (!new_assigned_projects.includes(mapping.masterId)) {
                        new_assigned_projects.push(mapping.masterId);
                    }
                    
                    await updateDoc(getDocRef("users", userDoc.id), {
                        assigned_projects: new_assigned_projects
                    });
                }
                totalDocsToUpdate++;
            }
        }
    }

    if (isDryRun) {
        console.log(`\n[DRY RUN SUMMARY]`);
        console.log(`A total of ${totalDocsToUpdate} documents would be updated.`);
        console.log(`Writing backup file to ${BACKUP_FILE} (can be used for reference).`);
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));
    } else if (isExecute) {
        console.log(`\n[EXECUTE SUMMARY]`);
        console.log(`A total of ${totalDocsToUpdate} documents were successfully updated.`);
        console.log(`Writing rollback data to ${BACKUP_FILE} (use --rollback to revert).`);
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));
    }
}

async function doRollback() {
    console.log("Starting Rollback Mode...");
    if (!fs.existsSync(BACKUP_FILE)) {
        console.error(`Backup file ${BACKUP_FILE} not found. Cannot rollback.`);
        process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
    let totalRestored = 0;

    // Restore standard collections
    for (const collectionName of Object.keys(backupData.collections)) {
        const docs = backupData.collections[collectionName];
        const docIds = Object.keys(docs);
        if (docIds.length > 0) {
            console.log(`Rolling back ${docIds.length} document(s) in [${collectionName}]...`);
            for (const docId of docIds) {
                const originalProjectId = docs[docId];
                await updateDoc(getDocRef(collectionName, docId), {
                    project_id: originalProjectId
                });
                totalRestored++;
            }
        }
    }

    // Restore users
    const userIds = Object.keys(backupData.users);
    if (userIds.length > 0) {
        console.log(`Rolling back ${userIds.length} user(s)...`);
        for (const userId of userIds) {
            const originalAssignedProjects = backupData.users[userId];
            await updateDoc(getDocRef("users", userId), {
                assigned_projects: originalAssignedProjects
            });
            totalRestored++;
        }
    }

    console.log(`\n[ROLLBACK SUMMARY]`);
    console.log(`Successfully restored ${totalRestored} document(s) to their original state.`);
}

migrate().catch(console.error);
