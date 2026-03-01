/**
 * Firestore migration: COPY (never delete) all data from root collections
 * to ConstructionControlData/root/{collectionName}.
 *
 * Run once after ensuring you have a backup or are comfortable with the process.
 * Usage: npx tsx scripts/migrate-firestore-to-root.ts
 *        npx tsx scripts/migrate-firestore-to-root.ts --dry-run  (only count, no write)
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON
 *           with Firestore read/write, or run: gcloud auth application-default login
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "constructioncontrol-37f21";
const COL_ROOT = "ConstructionControlData";
const ROOT_DOC = "root";

const TOP_LEVEL_COLLECTIONS = [
    "activity_logs",
    "daily_reports",
    "project_equipments",
    "project_supervisors",
    "project_worker_teams",
    "projects",
    "site_work_orders",
    "users",
];

const DRY_RUN = process.argv.includes("--dry-run");

function initAdmin(): admin.firestore.Firestore {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
        console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set.");
        console.error("Set it first, e.g. in PowerShell:");
        console.error('  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\your-service-account.json"');
        process.exit(1);
    }
    const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    if (!fs.existsSync(resolved)) {
        console.error("ERROR: Credential file not found:", resolved);
        process.exit(1);
    }
    if (admin.apps.length === 0) {
        admin.initializeApp({ projectId: PROJECT_ID });
    }
    return admin.firestore();
}

function newDocPath(collectionName: string, docId: string): admin.firestore.DocumentReference {
    const db = admin.firestore();
    return db.collection(COL_ROOT).doc(ROOT_DOC).collection(collectionName).doc(docId);
}

async function copyCollection(
    db: admin.firestore.Firestore,
    collectionName: string
): Promise<{ count: number; errors: string[] }> {
    const snap = await db.collection(collectionName).get();
    const docs = snap.docs;
    let count = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 500;

    if (DRY_RUN) {
        return { count: docs.length, errors: [] };
    }

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + BATCH_SIZE);
        for (const d of chunk) {
            try {
                const ref = newDocPath(collectionName, d.id);
                batch.set(ref, d.data(), { merge: false });
                count++;
            } catch (e: any) {
                errors.push(`${collectionName}/${d.id}: ${e?.message || String(e)}`);
            }
        }
        await batch.commit();
    }
    return { count, errors };
}

async function copyDailyReportsWithSubcollections(
    db: admin.firestore.Firestore
): Promise<{ count: number; errors: string[] }> {
    const snap = await db.collection("daily_reports").get();
    const errors: string[] = [];
    let count = 0;

    if (DRY_RUN) {
        return { count: snap.size, errors: [] };
    }

    for (const d of snap.docs) {
        try {
            const data: Record<string, unknown> = { ...d.data() };

            try {
                const subNames = await d.ref.listCollections().then((cols) => cols.map((c) => c.id));
                for (const subName of subNames) {
                    const subSnap = await d.ref.collection(subName).get();
                    const arr = subSnap.docs.map((sd) => ({ id: sd.id, ...sd.data() }));
                    (data as any)[subName] = arr;
                }
            } catch {
                // no subcollections or listCollections failed; keep doc as-is
            }

            const ref = newDocPath("daily_reports", d.id);
            await ref.set(data, { merge: false });
            count++;
        } catch (e: any) {
            errors.push(`daily_reports/${d.id}: ${e?.message || String(e)}`);
        }
    }
    return { count, errors };
}

async function main() {
    console.log("Firestore migration: copy root collections → ConstructionControlData/root/...");
    if (DRY_RUN) console.log("*** DRY RUN: no writes will be performed ***\n");
    const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS || "(not set)";
    console.log("Using credentials:", cred);
    console.log("");

    let db: admin.firestore.Firestore;
    try {
        db = initAdmin();
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin:", e?.message || e);
        throw e;
    }

    for (const name of TOP_LEVEL_COLLECTIONS) {
        process.stdout.write(`  ${name} ... `);
        try {
            if (name === "daily_reports") {
                const { count, errors } = await copyDailyReportsWithSubcollections(db);
                console.log(DRY_RUN ? `(dry-run) ${count} docs` : `${count} docs copied`);
                if (errors.length) errors.forEach((e) => console.error("    ", e));
            } else {
                const { count, errors } = await copyCollection(db, name);
                console.log(DRY_RUN ? `(dry-run) ${count} docs` : `${count} docs copied`);
                if (errors.length) errors.forEach((e) => console.error("    ", e));
            }
        } catch (e: any) {
            console.error("FAILED:", e?.message || String(e));
        }
    }

    console.log("\nDone. Original root collections were NOT modified or deleted.");
}

main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
});
