import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 'assigned' | 'rejected' | 'pending_cm' | 'pending_pm' | 'change_request' | 'closure_review' | 'closure_rejected';

export interface NotificationItem {
    id: string;
    label: string;
    path: string;
    type: NotificationType;
    step: string;
    targetId: string;  // SWO doc id for daily-report page, Report doc id for approvals page
}

export interface NotificationState {
    count: number;
    items: NotificationItem[];
}

/**
 * Returns pending task count and details for the current user based on their role
 * and assigned projects.
 */
export const useNotifications = (user: {
    uid?: string;
    name?: string;
    role?: string;
    assigned_projects?: string[];
} | null): NotificationState => {
    const [swos, setSwos] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        if (!user?.role) return;

        const unsub1 = onSnapshot(query(collection(db, 'site_work_orders')), snap => {
            setSwos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsub2 = onSnapshot(query(collection(db, 'daily_reports')), snap => {
            setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsub1(); unsub2(); };
    }, [user?.role, user?.uid]);

    if (!user?.role) return { count: 0, items: [] };

    const role = user.role;
    const uid = user.uid || '';
    const userName = user.name || '';
    const assignedProjects = user.assigned_projects || [];
    const isAdminOrMD = role === 'Admin' || role === 'MD';

    // Filter helpers
    const swoInScope = (swo: any) =>
        isAdminOrMD || assignedProjects.includes(swo.project_id);

    const reportInScope = (r: any) =>
        isAdminOrMD || assignedProjects.includes(r.project_id);

    // Match SWO assigned to this supervisor:
    // - by supervisor_name (stored since latest fix) OR
    // - by supervisor_id === uid (legacy ClosureWorkflows pattern)
    const swoIsMineSupervisor = (swo: any) =>
        (userName && swo.supervisor_name === userName) ||
        (uid && swo.supervisor_id === uid);

    // Match daily report submitted by this supervisor (by supervisor_name)
    const reportIsMine = (r: any) =>
        userName && r.supervisor_name === userName;

    const items: NotificationItem[] = [];

    // --- Supervisor: closure rejected by PM (closure_status=null, pm_reject_reason set) ---
    if (role === 'Supervisor') {
        const closureRejected = swos.filter(s =>
            !s.closure_status &&
            s.pm_reject_reason &&
            swoIsMineSupervisor(s)
        );
        closureRejected.forEach(s => items.push({
            id: `closure-rej-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''} — PM Rejected closure`,
            path: '/closures',
            type: 'closure_rejected',
            step: 'คำขอปิด SWO ถูก Reject โดย PM',
            targetId: s.id
        }));
    }

    // --- Supervisor: SWOs assigned but not yet accepted ---
    if (role === 'Supervisor') {
        const pending = swos.filter(s =>
            s.status === 'Assigned' &&
            swoIsMineSupervisor(s)
        );
        pending.forEach(s => items.push({
            id: `swo-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''}`,
            path: '/daily-report',
            type: 'assigned',
            step: 'รอรับงาน',
            targetId: s.id
        }));

        // Rejected daily reports: match by supervisor_name OR swo_id belongs to my SWO
        const mySwoIds = new Set(swos.filter(s => swoIsMineSupervisor(s)).map(s => s.id));
        const rejected = reports.filter(r =>
            r.status === 'Rejected' &&
            (reportIsMine(r) || (r.swo_id && mySwoIds.has(r.swo_id)))
        );
        rejected.forEach(r => {
            const reason = r.reject_reason ? ` – "${r.reject_reason}"` : '';
            items.push({
                id: `report-rej-${r.id}`,
                label: `รายงาน ${r.swo_no || r.swo || ''} วันที่ ${r.date || ''}${reason}`,
                path: '/daily-report',
                type: 'rejected',
                step: 'Rejected – รอ Resubmit',
                targetId: r.swo_id || ''
            });
        });
    }

    // --- CM: reports Pending CM ---
    if (role === 'CM') {
        const pendingCM = reports.filter(r =>
            r.status === 'Pending CM' && reportInScope(r)
        );
        pendingCM.forEach(r => items.push({
            id: `report-cm-${r.id}`,
            label: `รายงาน ${r.swo_no || ''} วันที่ ${r.date || ''}`,
            path: '/approvals',
            type: 'pending_cm',
            step: 'Pending CM อนุมัติ',
            targetId: r.id
        }));

        // SWOs with Request Change waiting for CM review
        const changeReq = swos.filter(s =>
            s.status === 'Request Change' && swoInScope(s)
        );
        changeReq.forEach(s => items.push({
            id: `swo-chg-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''}`,
            path: '/swo-creation',
            type: 'change_request',
            step: 'ขอแก้ไข',
            targetId: s.id
        }));
    }

    // --- PM: SWOs waiting for closure review ---
    if (role === 'PM') {
        const closurePending = swos.filter(s =>
            s.closure_status === 'PM Review' &&
            swoInScope(s)
        );
        closurePending.forEach(s => items.push({
            id: `closure-pm-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''} — รอ PM อนุมัติปิด SWO`,
            path: '/closures',
            type: 'closure_review',
            step: 'รอ PM Review',
            targetId: s.id
        }));
    }

    // --- CD: SWOs waiting for closure review ---
    if (role === 'CD') {
        const closurePending = swos.filter(s => s.closure_status === 'CD Review');
        closurePending.forEach(s => items.push({
            id: `closure-cd-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''} — รอ CD Review`,
            path: '/closures',
            type: 'closure_review',
            step: 'รอ CD Review',
            targetId: s.id
        }));
    }

    // --- MD: SWOs waiting for closure review ---
    if (role === 'MD') {
        const closurePending = swos.filter(s => s.closure_status === 'MD Review');
        closurePending.forEach(s => items.push({
            id: `closure-md-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''} — รอ MD อนุมัติปิด SWO`,
            path: '/closures',
            type: 'closure_review',
            step: 'รอ MD Review',
            targetId: s.id
        }));
    }

    // --- PM: reports Pending CM (hand-on) or Pending PM (final approve) ---
    if (role === 'PM') {
        const pendingPM = reports.filter(r =>
            r.status === 'Pending CM' && reportInScope(r)
        );
        pendingPM.forEach(r => items.push({
            id: `report-pm-cm-${r.id}`,
            label: `รายงาน ${r.swo_no || ''} วันที่ ${r.date || ''}`,
            path: '/approvals',
            type: 'pending_cm',
            step: 'Pending CM (Hand-on)',
            targetId: r.id
        }));

        const pendingFinal = reports.filter(r =>
            r.status === 'Pending PM' && reportInScope(r)
        );
        pendingFinal.forEach(r => items.push({
            id: `report-pm-${r.id}`,
            label: `รายงาน ${r.swo_no || ''} วันที่ ${r.date || ''}`,
            path: '/approvals',
            type: 'pending_pm',
            step: 'Pending PM อนุมัตดขั้นสุดท้าย',
            targetId: r.id
        }));

        const changeReq = swos.filter(s =>
            s.status === 'Request Change' && swoInScope(s)
        );
        changeReq.forEach(s => items.push({
            id: `swo-chg-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''}`,
            path: '/swo-creation',
            type: 'change_request',
            step: 'ขอแก้ไข',
            targetId: s.id
        }));
    }

    // --- Admin: all pending approvals + change requests ---
    if (role === 'Admin') {
        const pendingCM = reports.filter(r => r.status === 'Pending CM');
        pendingCM.forEach(r => items.push({
            id: `report-admin-cm-${r.id}`,
            label: `รายงาน ${r.swo_no || ''} วันที่ ${r.date || ''}`,
            path: '/approvals',
            type: 'pending_cm',
            step: 'Pending CM',
            targetId: r.id
        }));

        const pendingPM = reports.filter(r => r.status === 'Pending PM');
        pendingPM.forEach(r => items.push({
            id: `report-admin-pm-${r.id}`,
            label: `รายงาน ${r.swo_no || ''} วันที่ ${r.date || ''}`,
            path: '/approvals',
            type: 'pending_pm',
            step: 'Pending PM',
            targetId: r.id
        }));

        const changeReq = swos.filter(s => s.status === 'Request Change');
        changeReq.forEach(s => items.push({
            id: `swo-chg-${s.id}`,
            label: `SWO ${s.swo_no || s.id}: ${s.work_name || ''}`,
            path: '/swo-creation',
            type: 'change_request',
            step: 'ขอแก้ไข',
            targetId: s.id
        }));
    }

    // Deduplicate by id
    const unique = Array.from(new Map(items.map(i => [i.id, i])).values());

    return { count: unique.length, items: unique };
};
